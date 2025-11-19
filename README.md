# 🎙️ Orato AI

![React](https://img.shields.io/badge/Frontend-React_19-blue?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-purple?style=for-the-badge&logo=google)
![Security](https://img.shields.io/badge/Security-Telegram_2FA-blue?style=for-the-badge&logo=telegram)

**Orato AI** — это современный веб-тренажер для развития ораторского мастерства. Приложение слушает вашу речь, транскрибирует её в реальном времени и использует мощь **Google Gemini 2g.0** для глубокого анализа, подсчета слов-паразитов и выдачи персональных советов.

Проект выполнен в премиальном стиле **"Deep Glass / Cyberpunk"** с использованием современных анимаций и технологий безопасности.

---

## ✨ Ключевые возможности

### 🧠 Искусственный Интеллект и Аналитика
*   **Мгновенная транскрипция:** Преобразование голоса в текст прямо в браузере (Web Speech API).
*   **Умный анализ (Gemini AI):** Оценка речи по 100-балльной шкале сразу после окончания записи.
*   **Детектор паразитов:** Автоматический поиск слов "э-э", "ну", "типа", "короче" с интерактивным списком.
*   **Метрики:** Подсчет темпа речи (WPM - слов в минуту) и чистоты речи.
*   **Персональные советы:** ИИ выделяет сильные стороны и дает конкретные рекомендации для роста.

### 🛡️ Безопасность нового уровня
*   **Telegram 2FA (VerifyMe):** Собственная система двухфакторной аутентификации. Коды подтверждения приходят в ваш Telegram.
*   **Шкала силы пароля:** Визуальный индикатор сложности пароля при регистрации.
*   **Защищенные маршруты:** JWT-авторизация (Access Tokens).

### 🎨 UI/UX и Дизайн
*   **Deep Glass Design:** Эстетика матового стекла, неона и глубокого темного фона.
*   **Интерактивность:** Красивые всплывающие уведомления (`react-hot-toast`) вместо системных алертов.
*   **Плавные анимации:** Intro-загрузчик, пульсации при записи, плавные переходы между страницами.
*   **Адаптивность:** Удобно работает как на ПК, так и на мобильных устройствах.

### 💾 История и Данные
*   **Личный кабинет:** Сохранение всех выступлений в базу данных (SQLite).
*   **Детальный просмотр:** Модальное окно с полным транскриптом и анализом.
*   **Управление:** Возможность очистки всей истории одним кликом.

---

## 🛠️ Технологический стек

### Frontend (Клиент)
*   **Framework:** React 19 + Vite (SWC)
*   **Routing:** React Router DOM v6
*   **Styling:** CSS3 (Variables, Animations, Glassmorphism)
*   **Icons:** Lucide React
*   **Notifications:** React Hot Toast
*   **API Client:** Axios

### Backend (Сервер)
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** SQLite3
*   **AI:** Google Generative AI SDK (Gemini 1.5 Flash)
*   **Bot:** Node Telegram Bot API (Polling mode)
*   **Security:** Bcrypt, JsonWebToken, Express Validator

---

## 🚀 Установка и запуск

### Предварительные требования
*   Установленный [Node.js](https://nodejs.org/) (версия 18+).
*   Telegram аккаунт (для создания бота).
*   Google AI Studio API Key (бесплатно).

### 1. Настройка Сервера (Backend)

1.  Перейдите в папку сервера и установите зависимости:
    ```bash
    cd server
    npm install
    ```

2.  Создайте файл `.env` в папке `server` и заполните его своими ключами:
    ```env
    PORT=5000
    JWT_SECRET=придумай_сложный_секретный_ключ
    GEMINI_API_KEY=ТВОЙ_КЛЮЧ_ИЗ_GOOGLE_AI_STUDIO
    TELEGRAM_BOT_TOKEN=ТВОЙ_ТОКЕН_ОТ_BOTFATHER
    ```
    *(Чтобы получить токен бота, напиши @BotFather в Telegram команду `/newbot`)*

3.  Запустите сервер:
    ```bash
    node server.js
    ```

### 2. Настройка Клиента (Frontend)

1.  Откройте новый терминал, перейдите в папку клиента:
    ```bash
    cd client
    npm install
    ```

2.  Запустите режим разработки:
    ```bash
    npm run dev
    ```

3.  Откройте ссылку в браузере (обычно `http://localhost:5173`).

---

## 🤖 Как работает Telegram 2FA

1.  Найдите своего бота в Telegram и нажмите **START** (`/start`).
2.  Бот пришлет вам ваш **Chat ID**.
3.  При регистрации на сайте введите этот ID.
4.  Бот пришлет вам одноразовый код (OTP) для завершения регистрации.
5.  При последующих входах код также будет приходить в Telegram.

---

## 📂 Структура проекта

```text
orato-ai/
├── client/                 # React приложение
│   ├── src/
│   │   ├── components/     # Auth, Recorder, History, Navbar
│   │   ├── api.js          # Настройка Axios и эндпоинтов
│   │   ├── App.css         # Стили (Glassmorphism)
│   │   └── AuthContext.jsx # Управление состоянием входа
│   └── package.json
│
├── server/                 # Node.js сервер
│   ├── orato.db            # База данных (создается автоматически)
│   ├── server.js           # Основная логика, API, Бот
│   ├── db.js               # Конфигурация SQLite
│   └── .env                # Ключи (не забудь создать!)
└── README.md               # Этот файл