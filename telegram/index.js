// telegram/index.js
const TelegramBot = require('node-telegram-bot-api');
const keyboards = require('./keyboards');
const setupCommands = require('./commands');
const setupCallbacks = require('./callbacks');
const DataManager = require('./dataManager');
const ADMIN_IDS = [8345826744]; // ID администратора (можно добавить ещё через запятую)

// ID чата для проверки подписки
const CLAN_CHAT_ID = '-1003826638157';
// (ADMIN_USER_ID пока не используется)

class TelegramClanBot {
    constructor(token, sendToBotsCallback = null, activeBots = [], logChatId = null, supportChatId = null) {
        console.log('[TELEGRAM] Инициализация...');
        console.log('[TELEGRAM] Токен:', token ? token.substring(0, 10) + '...' : 'НЕТ');
        this.adminIds = ADMIN_IDS;
        this.ticketMap = new Map(); // key: forwardedMessageId -> userId
        this.logChatId = logChatId;
        console.log('[TELEGRAM] logChatId =', this.logChatId);
        this.supportChatId = supportChatId;
        this.activeBots = activeBots;
        this.userStates = {};
        this.sendToBotsCallback = sendToBotsCallback;

        if (!token || token === 'ТВОЙ_ТОКЕН_ТУТ') {
            console.error('[TELEGRAM] Токен не указан!');
            return;
        }

        try {
            this.bot = new TelegramBot(token, { polling: true });
            this.clanData = { s1: null, s2: null, /*s3: null, s4: null, s5: null, s6: null, s7: null, s8: null*/ };
            this.subscribers = new Set();
            this.lastUpdate = {};

            // Подключаем модули
            this.keyboards = keyboards; // просто объект с функциями
            this.dataManager = new DataManager(this); // передаём себя для доступа к полям

            // Загружаем сохранённые данные
            this.dataManager.loadData();

            // Настраиваем команды и колбэки (передаём контекст через bind)
            this.setupCommands = setupCommands.bind(this);
            this.setupCallbacks = setupCallbacks.bind(this);
            console.log('[TELEGRAM] Перед setupCommands');
            this.setupCommands();
            this.setupCallbacks();

            console.log('[TELEGRAM] Бот успешно запущен!');
        } catch (error) {
            console.error('[TELEGRAM] Ошибка создания бота:', error.message);
            throw error;
        }
    }

    sendLog(message) {
        console.log(`[TELEGRAM] sendLog: попытка отправить сообщение в чат ${this.logChatId}`);
        if (this.logChatId) {
            this.bot.sendMessage(this.logChatId, message, { parse_mode: 'HTML' })
            .then(() => console.log('[TELEGRAM] Лог отправлен успешно'))
            .catch(e => console.error('[TELEGRAM] Ошибка отправки лога:', e.message));
        } else {
            console.log('[TELEGRAM] logChatId не задан, лог не отправлен');
        }
    }

    updateClanData(server, data) {
        this.dataManager.updateClanData(server, data);
    }

    // Рассылка всем подписчикам (пока не используется)
    sendToAll(message) {
        this.subscribers.forEach(chatId => {
            this.bot.sendMessage(chatId, message).catch(e => console.error('[TELEGRAM] Send error:', e.message));
        });
    }

    // Проверка, состоит ли пользователь в клановом чате
    async isUserInClanChat(userId) {
        try {
            const chatMember = await this.bot.getChatMember(CLAN_CHAT_ID, userId);
            const status = chatMember.status;
            return ['member', 'administrator', 'creator'].includes(status);
        } catch (error) {
            console.error('[TELEGRAM] Ошибка проверки подписки:', error.message);
            return false;
        }
    }
}

module.exports = TelegramClanBot;
