const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Определение платформы для правильной команды npm
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    yellow: "\x1b[33m"
};

const log = (msg, color = colors.reset) => console.log(`${color}[Orato Installer] ${msg}${colors.reset}`);

const runCommand = (command, args, cwd, name) => {
    return new Promise((resolve, reject) => {
        log(`Запуск: ${command} ${args.join(' ')} в ${name}...`, colors.cyan);
        const child = spawn(command, args, { cwd, stdio: 'inherit', shell: true });
        
        child.on('close', (code) => {
            if (code !== 0) {
                log(`Ошибка в ${name} (код ${code})`, colors.red);
                reject(code);
            } else {
                log(`Успешно: ${name}`, colors.green);
                resolve();
            }
        });
    });
};

async function setupAndRun() {
    const serverPath = path.join(__dirname, 'server');
    const clientPath = path.join(__dirname, 'client');

    // 1. Проверка .env
    if (!fs.existsSync(path.join(serverPath, '.env'))) {
        log("⚠️ Файл server/.env не найден! Создайте его перед запуском.", colors.yellow);
        log("Пример содержания:", colors.yellow);
        console.log(`
PORT=5000
JWT_SECRET=mysecret
GEMINI_API_KEY=ваш_ключ
TELEGRAM_BOT_TOKEN=ваш_токен
        `);
        process.exit(1);
    }

    try {
        // 2. Установка зависимостей
        log("📦 Установка библиотек Сервера...", colors.bright);
        await runCommand(npmCmd, ['install'], serverPath, 'Server Install');

        log("📦 Установка библиотек Клиента...", colors.bright);
        await runCommand(npmCmd, ['install'], clientPath, 'Client Install');

        log("🚀 Запуск проекта...", colors.green);

        // 3. Параллельный запуск
        const server = spawn(npmCmd, ['start'], { cwd: serverPath, stdio: 'inherit', shell: true });
        const client = spawn(npmCmd, ['run', 'dev'], { cwd: clientPath, stdio: 'inherit', shell: true });

        // Обработка выхода
        const killAll = () => {
            server.kill();
            client.kill();
            process.exit();
        };
        
        process.on('SIGINT', killAll);
        process.on('SIGTERM', killAll);

    } catch (err) {
        log("Произошла ошибка при установке.", colors.red);
    }
}

setupAndRun();