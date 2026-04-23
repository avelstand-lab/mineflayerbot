require('dotenv').config();

const { BOTS_CONFIG } = require('./config');
const { createBot } = require('./bot');
const consoleInput = require('./consoleInput');
const TelegramClanBot = require('./telegram');

console.log(`>>> [SYSTEM] Запуск системы...`);

const TELEGRAM_TOKEN = '8612049536:AAEtv_d8apxhfcO5aXvRi5ravOgeebp6u0Q';
const LOG_CHAT_ID = '-100'; // ID группы для логов
const SUPPORT_CHAT_ID = '-1';

// '-1003880921169'

const activeBots = []; // объявление

let telegramBot = null;

if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== 'ыу') {
    try {
        telegramBot = new TelegramClanBot(TELEGRAM_TOKEN, (command) => {
            console.log(`>>> [TELEGRAM] Отправка команды всем ботам: ${command}`);

            activeBots.forEach((bot, index) => {
                setTimeout(() => {
                    if (bot && bot.chat) {
                        bot.chat(command);
                        console.log(`>>> [BOT${index + 1}] Отправлена команда от Telegram: ${command}`);
                    }
                }, index * 1000);
            });
        }, activeBots, LOG_CHAT_ID, SUPPORT_CHAT_ID);
        console.log('>>> [SYSTEM] Telegram бот успешно запущен');
    } catch (error) {
        console.error('>>> [SYSTEM] Ошибка запуска Telegram бота:', error.message);
    }
} else {
    console.log('>>> [SYSTEM] Telegram бот не запущен (укажи токен в index.js)');
}

console.log(`>>> [SYSTEM] Запуск ${BOTS_CONFIG.length} ботов...`);

BOTS_CONFIG.forEach((config, index) => {
    setTimeout(() => {
        console.log(`>>> [SYSTEM] Запуск бота ${config.username} (сервер: ${config.targetServer})...`);
        try {
            const bot = createBot(config, telegramBot, activeBots, botsMap);
            activeBots.push(bot);

            bot.once('login', () => {
                consoleInput.addBot(bot, config.username);
            });
        } catch (error) {
            console.error(`>>> [SYSTEM] Ошибка создания бота ${config.username}:`, error.message);
        }
    }, index * 25000);
});

const botsMap = {};
BOTS_CONFIG.forEach(cfg => {
    botsMap[cfg.username] = cfg.targetServer;
});

setTimeout(() => {
    consoleInput.start();
}, 30000);

module.exports = { activeBots, telegramBot };
