// telegram/dataManager.js
const fs = require('fs');
const path = require('path');
const { BOTS_CONFIG } = require('../config');
const { escapeMarkdown } = require('./utils');

class DataManager {
    constructor(main, cacheTTL = 60000) { // TTL по умолчанию 60 секунд
        this.main = main;
        this.cacheTTL = cacheTTL;
        this.cachedBlacklist = null;          // кеш объединённого чёрного списка
        this.lastBlacklistUpdate = 0;         // время последнего обновления кеша
    }

    // Получить объединённый чёрный список (с использованием кеша)
    getCombinedBlacklist(forceRefresh = false) {
        const now = Date.now();

        // Если кеш актуален и не запрошено принудительное обновление – возвращаем кеш
        if (!forceRefresh && this.cachedBlacklist && (now - this.lastBlacklistUpdate < this.cacheTTL)) {
            console.log('[DEBUG] Использую кеш чёрного списка');
            return this.cachedBlacklist;
        }

        console.log('[DEBUG] Обновляю кеш чёрного списка из файлов');
        const blacklistSet = new Set();

        BOTS_CONFIG.forEach(config => {
            if (!config.dataFile) return;
            const filePath = path.join(__dirname, '..', config.dataFile); // поднимаемся на уровень выше
            console.log(`[DEBUG] Читаю файл: ${filePath}`);

            try {
                if (fs.existsSync(filePath)) {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(fileContent);
                    if (data.blacklist && Array.isArray(data.blacklist)) {
                        data.blacklist.forEach(name => blacklistSet.add(name));
                    }
                } else {
                    console.log(`[DEBUG] Файл не существует: ${filePath}`);
                }
            } catch (error) {
                console.error(`[DEBUG] Ошибка чтения ${filePath}:`, error.message);
            }
        });

        const result = Array.from(blacklistSet).sort((a, b) => a.localeCompare(b));

        // Сохраняем в кеш
        this.cachedBlacklist = result;
        this.lastBlacklistUpdate = now;

        return result;
    }

    // Принудительно сбросить кеш (например, после обновления данных в игре)
    invalidateBlacklistCache() {
        this.cachedBlacklist = null;
        this.lastBlacklistUpdate = 0;
        console.log('[DEBUG] Кеш чёрного списка сброшен');
    }

    // Форматирование страницы чёрного списка (использует кешированный getCombinedBlacklist)
    formatBlacklistPage(page = 1, perPage = 10) {
        const blacklist = this.getCombinedBlacklist(); // теперь с кешем
        const total = blacklist.length;
        const totalPages = Math.ceil(total / perPage) || 1;
        page = Math.min(Math.max(page, 1), totalPages);

        const start = (page - 1) * perPage;
        const end = start + perPage;
        const pageItems = blacklist.slice(start, end);

        let text = `📋 <b>Черный список клана</b>\n\n`;
        if (total === 0) {
            text += 'Черный список пуст.';
        } else {
            text += `Всего: ${total} игроков\n\n`;
            pageItems.forEach((name, idx) => {
                text += `${start + idx + 1}. ${escapeMarkdown(name)}\n`;
            });
            text += `\nСтраница ${page} из ${totalPages}`;
        }

        const keyboard = {
            inline_keyboard: []
        };

        if (totalPages > 1) {
            const navRow = [];
            if (page > 1) {
                navRow.push({ text: '◀ Пред.', callback_data: `blacklist_page_${page - 1}` });
            }
            navRow.push({ text: `📄 ${page}/${totalPages}`, callback_data: 'blacklist_current' });
            if (page < totalPages) {
                navRow.push({ text: 'След. ▶', callback_data: `blacklist_page_${page + 1}` });
            }
            keyboard.inline_keyboard.push(navRow);
        }

        keyboard.inline_keyboard.push([
            { text: '🔙 Главное меню', callback_data: 'menu_main' }
        ]);

        return { text, keyboard, page, totalPages };
    }

    // telegram/dataManager.js (в конец класса, перед последней скобкой)
    formatServerTop(server) {
        const data = this.main.clanData[server];
        if (!data) return null;
        return `🏆 <b>Топ клана на сервере ${server.toUpperCase()}</b>\n\n` +
        `Место: #${data.place}\n` +
        `👑 Глава: ${data.leader}\n` +
        `⚔ Убийств: ${data.kills}\n` +
        `📊 КДР: ${data.kdr}\n` +
        `👥 Участников: ${data.members}`;
    }

    // Обновление данных клана с сервера (здесь можно сбросить кеш, если чёрный список мог измениться)
    updateClanData(server, data) {
        console.log(`[TELEGRAM] Обновление данных для ${server}:`, data);
        this.main.clanData[server] = data;
        this.main.lastUpdate[server] = Date.now();
        // При обновлении статистики клана чёрный список не меняется, но если захочешь сбрасывать – раскомментируй:
        // this.invalidateBlacklistCache();
        this.saveData();
        this.main.sendLog(`📊 Данные клана на сервере <b>${server.toUpperCase()}</b> обновлены. Место: #${data.place}, убийств: ${data.kills}`);
    }

    // Сохранение данных Telegram-бота
    saveData() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const data = {
                clanData: this.main.clanData,
                subscribers: Array.from(this.main.subscribers),
                lastUpdate: this.main.lastUpdate
            };
            fs.writeFileSync(path.join(dataDir, 'telegram_data.json'), JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[TELEGRAM] Ошибка сохранения:', error.message);
        }
    }

    // Загрузка данных Telegram-бота
    loadData() {
        try {
            const filePath = path.join(__dirname, '..', 'data', 'telegram_data.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.main.clanData = data.clanData || this.main.clanData;
                this.main.subscribers = new Set(data.subscribers || []);
                this.main.lastUpdate = data.lastUpdate || {};
            }
        } catch (error) {
            console.error('[TELEGRAM] Ошибка загрузки:', error.message);
        }
    }
}

module.exports = DataManager;
