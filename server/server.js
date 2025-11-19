require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. НАСТРОЙКА TELEGRAM БОТА ---
// polling: true позволяет боту получать сообщения от пользователей
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Команда /start - Бот подсказывает Chat ID
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name;
    bot.sendMessage(chatId, `👋 Привет, ${name}!\n\nТвой Telegram Chat ID: ${chatId}\n\nСкопируй эти цифры и вставь их при регистрации на сайте Orato AI.`);
    console.log(`Пользователь ${name} начал диалог. ID: ${chatId}`);
});

// Лог ошибок бота (чтобы не крашил сервер при проблемах с сетью)
bot.on("polling_error", (err) => console.log("Telegram Polling Error:", err.code));

// Функция отправки кода
const sendTelegramCode = async (chatId, code, action) => {
    try {
        await bot.sendMessage(chatId, `🔐 <b>Orato AI</b>\n\nВаш код для ${action}: <code>${code}</code>\n\nНикому не сообщайте его.`, { parse_mode: 'HTML' });
        return true;
    } catch (error) {
        console.error(`Ошибка отправки в TG (ID: ${chatId}):`, error.message);
        return false;
    }
};

// --- 2. НАСТРОЙКА GEMINI AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 3. ХРАНИЛИЩЕ КОДОВ (В памяти) ---
const otpStore = new Map();

// Middleware авторизации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- 4. API РОУТЫ АВТОРИЗАЦИИ (2FA) ---

// Шаг 1: Регистрация (Инит)
app.post('/api/auth/register-init', async (req, res) => {
    const { username, email, password, telegramId } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (user) return res.status(400).json({ error: 'Email уже занят' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const sent = await sendTelegramCode(telegramId, code, "регистрации");

        if (!sent) {
            return res.status(400).json({ error: 'Бот не смог отправить сообщение. Напишите /start боту!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        otpStore.set(email, { 
            code, attempts: 0, type: 'REGISTER',
            tempUser: { username, email, password: hashedPassword, telegramId } 
        });

        res.json({ message: 'Код отправлен в Telegram', step: 'VERIFY' });
    });
});

// Шаг 1: Вход (Инит)
app.post('/api/auth/login-init', async (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        if (!user.telegram_chat_id) {
            // Если у старого юзера нет ID, пускаем без 2FA (или просим обновить)
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const sent = await sendTelegramCode(user.telegram_chat_id, code, "входа");
        
        if (!sent) return res.status(500).json({ error: 'Ошибка связи с Telegram' });

        otpStore.set(email, { 
            code, attempts: 0, type: 'LOGIN',
            userId: user.id, username: user.username
        });

        res.json({ message: 'Код отправлен', step: 'VERIFY' });
    });
});

// Шаг 2: Проверка кода
app.post('/api/auth/verify', (req, res) => {
    const { email, code } = req.body;
    const session = otpStore.get(email);

    if (!session) return res.status(400).json({ error: 'Код истек' });
    if (session.code !== code) {
        session.attempts++;
        if (session.attempts > 3) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'Много попыток. Повторите вход.' });
        }
        return res.status(400).json({ error: 'Неверный код' });
    }

    if (session.type === 'REGISTER') {
        const u = session.tempUser;
        db.run(`INSERT INTO users (username, email, password, telegram_chat_id) VALUES (?, ?, ?, ?)`,
            [u.username, u.email, u.password, u.telegramId],
            () => {
                otpStore.delete(email);
                res.json({ message: 'Регистрация успешна' });
            }
        );
    } else {
        const token = jwt.sign({ id: session.userId, username: session.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        otpStore.delete(email);
        res.json({ token });
    }
});

// --- 5. API АНАЛИЗА И ИСТОРИИ ---

app.post('/api/analyze', authenticateToken, async (req, res) => {
    const { transcript, durationSeconds } = req.body;
    if (!transcript || transcript.length < 2) return res.status(400).json({error: 'Нет текста'});

    try {
        const wpm = Math.round((transcript.trim().split(/\s+/).length / durationSeconds) * 60) || 0;
        const prompt = `
        Роль: Тренер по ораторскому искусству. Язык: Русский.
        Текст: "${transcript}"
        Задача: Верни валидный JSON (без markdown):
        {
            "clarityScore": (0-100),
            "fillerWords": ["слово1", "слово2"],
            "feedback": "Похвала (1 предложение)",
            "tip": "Совет (1 предложение)"
        }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(text);

        db.run(`INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, transcript, analysis.clarityScore, wpm, JSON.stringify(analysis.fillerWords), analysis.feedback, analysis.tip],
            () => res.json({ ...analysis, pace: wpm })
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка ИИ' });
    }
});

app.get('/api/history', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM speeches WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        const history = rows.map(row => ({ ...row, filler_words: JSON.parse(row.filler_words || '[]') }));
        res.json(history);
    });
});

app.delete('/api/history', authenticateToken, (req, res) => {
    db.run(`DELETE FROM speeches WHERE user_id = ?`, [req.user.id], () => res.json({msg: 'Deleted'}));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));