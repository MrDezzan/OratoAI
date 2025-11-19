require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

// Инициализация ИИ
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

//  Middleware аутентификации 
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

//  РОУТЫ 

// Регистрация
app.post('/api/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, 
            [username, email, hashedPassword], 
            function(err) {
                if (err) return res.status(400).json({ error: 'Email уже занят' });
                res.status(201).json({ message: 'Пользователь создан' });
            }
        );
    } catch (e) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

// Логин
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Неверный логин или пароль' });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    });
});

//  ГЛАВНЫЙ РОУТ: АНАЛИЗ РЕЧИ 
app.post('/api/analyze', authenticateToken, async (req, res) => {
    const { transcript, durationSeconds } = req.body;

    if (!transcript || transcript.length < 5) {
        return res.status(400).json({ error: 'Слишком короткий текст для анализа' });
    }

    try {
        const wordCount = transcript.trim().split(/\s+/).length;
        const wpm = Math.round((wordCount / durationSeconds) * 60) || 0;

        // Промпт
        const prompt = `
        Ты — Orato AI, профессиональный, эмпатичный и строгий тренер по ораторскому мастерству.
        Твоя задача — помочь пользователю улучшить его навыки публичных выступлений.
        
        Проанализируй следующий текст речи на русском языке:
        
        "${transcript}"
        
        
        Контекст:
        - Длительность: ${durationSeconds} сек.
        - Темп речи: ${wpm} слов в минуту.

        Верни ответ СТРОГО в формате JSON без лишнего текста и markdown (без \`\`\`json).
        Структура JSON должна быть такой:
        {
            "clarityScore": <число 0-100>, // Оценка ясности и структурированности мысли.
            "fillerWords": [<массив строк>], // Список найденных конкретных слов-паразитов (например: "э", "ну", "типа", "короче", "как бы"). Если нет - пустой массив.
            "feedback": "<строка>", // Конкретная похвала: что пользователю удалось сделать хорошо (тон, структура, лексика). На русском.
            "tip": "<строка>" // Один самый важный совет для улучшения следующего раза. На русском.
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const analysis = JSON.parse(text);

        // Сохранение в БД
        const sql = `INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            req.user.id, 
            transcript, 
            analysis.clarityScore, 
            wpm, 
            JSON.stringify(analysis.fillerWords), 
            analysis.feedback, 
            analysis.tip
        ], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка сохранения в БД' });
            }
            
            // Отправляем клиенту
            res.json({
                ...analysis,
                pace: wpm
            });
        });

    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: 'Ошибка ИИ анализа. Попробуйте снова.' });
    }
});

// История
app.get('/api/history', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM speeches WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const history = rows.map(row => ({
            ...row,
            filler_words: JSON.parse(row.filler_words || '[]')
        }));
        res.json(history);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));