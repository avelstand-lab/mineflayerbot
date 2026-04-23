const { saveData, sleep, formatNumber } = require('../../utils');
const { ADMINS } = require('../../config');
const { processExpiredPunishments } = require('../../utils');

// Функция для форматирования времени
function formatTime(ms) {
    if (!ms) return "навсегда";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д`;
    if (hours > 0) return `${hours}ч`;
    if (minutes > 0) return `${minutes}м`;
    return `${seconds}с`;
}

// Проверка и очистка просроченных наказаний
function cleanupExpiredPunishments(state) {
    const now = Date.now();

    if (state.clanData.mutes) {
        Object.keys(state.clanData.mutes).forEach(player => {
            const mute = state.clanData.mutes[player];
            if (mute.until && mute.until < now) {
                delete state.clanData.mutes[player];
            }
        });
    }

    if (state.clanData.bans) {
        Object.keys(state.clanData.bans).forEach(player => {
            const ban = state.clanData.bans[player];
            if (ban.until && ban.until < now) {
                delete state.clanData.bans[player];
                const index = state.clanData.blacklist.indexOf(player);
                if (index > -1) state.clanData.blacklist.splice(index, 1);
            }
        });
    }
}

// Функция для разбивки сообщения на части по 250 символов
function splitMessage(message, prefix = '/cc ') {
    const maxLength = 250 - prefix.length;
    const parts = [];
    let currentPart = '';

    const words = message.split(' ');
    for (const word of words) {
        if ((currentPart + ' ' + word).length > maxLength) {
            if (currentPart) parts.push(prefix + currentPart);
            currentPart = word;
        } else {
            currentPart = currentPart ? currentPart + ' ' + word : word;
        }
    }

    if (currentPart) parts.push(prefix + currentPart);
    return parts;
}

// Пагинация для длинных списков
function paginateList(items, page = 1, perPage = 5) {
    const totalPages = Math.ceil(items.length / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        items: items.slice(start, end),
        page,
        totalPages,
        hasNext: page < totalPages
    };
}

const adminCommands = {
    '^#админ$': {
        execute: async (bot, state, sender) => {
            const messages = [
                "&fАДМИН КОМАНДЫ: #мут [игрок] [время] [причина] - мут",
                "#размут [игрок] - снять мут #муты - список мутов",
                "#бан [игрок] [время] [причина] - бан #разбан [игрок]",
                "#чс [игрок] [причина] - ЧС #анчс [игрок] - убрать из ЧС",
                "#кик [игрок] [причина] - кик #наказания [игрок] - история",
                "#очистка - очистить просроченные #автоинвайт вкл/выкл",
                "#реконнект - перезапуск #invite [игрок] #чат [сообщение]",
                "Время: 10s 5m 2h 1d"];

            bot.chat('/cc &fᴀдʍин ᴋоʍᴀнды: #ʍуᴛ [игроᴋ] [ʙрᴇʍя] [причинᴀ] - ʍуᴛ, #рᴀзʍуᴛ [игроᴋ] - ᴄняᴛь ʍуᴛ #ʍуᴛы - ᴄпиᴄоᴋ ʍуᴛоʙ,#бᴀн [игроᴋ] [ʙрᴇʍя] [причинᴀ] - бᴀн. #ᴀдʍин2 - ᴄлᴇд.ᴄᴛрᴀницᴀ');
        },
        admin: true
    },

    '^#админ2$': {
        execute: async (bot, state, sender, match) => {
            bot.chat("/cc &f#рᴀзбᴀн [игроᴋ] - рᴀзбᴀн, #чᴄ [игроᴋ] [причинᴀ] - чᴄ #ᴀнчᴄ [игроᴋ] - убрᴀᴛь из чᴄ, #ᴋиᴋ [игроᴋ] [причинᴀ] - ᴋиᴋ. #ᴀдʍин3 - ᴄлᴇд.ᴄᴛрᴀницᴀ");
        },
        admin: true
    },
    '^#админ3$': {
        execute: async (bot, state, sender) => {
            bot.chat('/cc &f#нᴀᴋᴀзᴀния [игроᴋ] - иᴄᴛория, #очиᴄᴛᴋᴀ - очиᴄᴛиᴛь проᴄрочᴇнныᴇ, #ᴀʙᴛоинʙᴀйᴛ ʙᴋл/ʙыᴋл, #рᴇᴋоннᴇᴋᴛ - пᴇрᴇзᴀᴨуᴄᴋ, #ɪɴᴠɪᴛᴇ [игроᴋ], #чᴀᴛ [ᴄообщᴇниᴇ]')
        },
        admin: true
    },

    // ========== СИСТЕМА МУТОВ ==========
    '#мут (.+?) (\\d+[smhd]) (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            const timeStr = match[2];
            const reason = match[3];

            const timeMap = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
            const matchTime = timeStr.match(/^(\d+)([smhd])$/i);
            if (!matchTime) {
                bot.chat('/cc &fнᴇᴋоррᴇᴋᴛноᴇ ʙрᴇʍя. пᴩиʍᴇр: 10ᴍ, 2ʜ, 1ᴅ');
                return;
            }

            const value = parseInt(matchTime[1]);
            const unit = matchTime[2].toLowerCase();
            const timeMs = value * timeMap[unit];

            const targetLower = target.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === targetLower)) {
                bot.chat('/cc &fнᴇᴧьзя зᴀʍуᴛиᴛь &#ff0000ᴀ&#ff0303д&#ff0606ʍ&#ff0a0aи&#ff0d0dн&#ff1010и&#ff1313ᴄ&#ff1717ᴛ&#ff1a1aр&#ff1d1dᴀ&#ff2020ᴛ&#ff2424о&#ff2727р&#ff2a2aᴀ!');
                return;
            }

            cleanupExpiredPunishments(state);
            if (!state.clanData.mutes) state.clanData.mutes = {};

            state.clanData.mutes[target] = {
                reason: reason,
                by: sender,
                time: timeStr,
                duration: timeMs,
                until: Date.now() + timeMs,
                issued: Date.now()
            };

            saveData(state.clanData, state.config.dataFile);

            const minutes = Math.ceil(timeMs / 60000);
            bot.chat(`/c mute ${target} ${reason}`);
            await sleep(200);
            bot.chat(`/cc &b${target}&f зᴀʍучᴇн нᴀ ${formatTime(timeMs)}. причинᴀ: ${reason}`);
        },
        admin: true
    },

    '#размут (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!state.clanData.mutes || !state.clanData.mutes[target]) {
                bot.chat(`/cc &fу &b${target}&f нᴇᴛ ʍуᴛᴀ`);
                return;
            }

            delete state.clanData.mutes[target];
            saveData(state.clanData, state.config.dataFile);
            bot.chat(`/c unmute ${target}`);
            await sleep(200);
            bot.chat(`/cc &b${target}&f рᴀзʍучᴇн`);
        },
        admin: true
    },

    '#муты': {
        execute: async (bot, state, sender) => {
            const now = Date.now();
            const mutes = Object.entries(state.clanData.mutes || {});
            const activeMutes = mutes.filter(([_, mute]) => !mute.until || mute.until > now);

            if (activeMutes.length === 0) {
                bot.chat('/cc  &#00ff0aᴀ&#00ff1cᴋ&#00ff2dᴛ&#00ff3fи&#00ff50ʙ&#00ff62н&#00ff73ы&#00ff85х&f ʍуᴛоʙ нᴇᴛ');
                return;
            }

            const page = 1;
            const perPage = 5;
            const totalPages = Math.ceil(activeMutes.length / perPage);

            bot.chat(`/cc &fактивные муты (${activeMutes.length}):`);

            await sleep(500);
            for (let i = 0; i < Math.min(activeMutes.length, perPage); i++) {
                const [player, mute] = activeMutes[i];
                const timeLeft = mute.until ? formatTime(mute.until - Date.now()) : 'навсегда';
                bot.chat(`/cc ${player}: ${mute.reason} (${timeLeft})`);
            }

            if (totalPages > 1) {
                bot.chat(`/cc &f#муты2 - следующая страница`);
            }
        },
        admin: true
    },

    '#муты(\\d+)': {
        execute: async (bot, state, sender, match) => {
            cleanupExpiredPunishments(state);
            if (!state.clanData.mutes || Object.keys(state.clanData.mutes).length === 0) {
                bot.chat('/cc &#00ff0aᴀ&#00ff1cᴋ&#00ff2dᴛ&#00ff3fи&#00ff50ʙ&#00ff62н&#00ff73ы&#00ff85х&f ʍуᴛоʙ нᴇᴛ');
                return;
            }

            const page = parseInt(match[1]) || 1;
            const mutes = Object.entries(state.clanData.mutes);
            const perPage = 5;
            const totalPages = Math.ceil(mutes.length / perPage);

            if (page < 1 || page > totalPages) {
                bot.chat(`/cc &fᴄᴛрᴀницᴀ ${page} нᴇ нᴀйдᴇнᴀ (ʙᴄᴇᴦо ${totalPages})`);
                return;
            }

            const start = (page - 1) * perPage;
            const end = start + perPage;

            bot.chat(`/cc &fʍуᴛы ᴄᴛᴩ. ${page}/${totalPages}:`);

            await sleep(500);
            for (let i = start; i < Math.min(end, mutes.length); i++) {
                const [player, mute] = mutes[i];
                const timeLeft = mute.until ? formatTime(mute.until - Date.now()) : 'навсегда';
                bot.chat(`/cc &b${player}&f: ${mute.reason} (${timeLeft})`);
                await sleep(1500);
            }

            if (page < totalPages) {
                bot.chat(`/cc &f#ʍуᴛы${page + 1} - ᴄлᴇдующᴀя ᴄᴛрᴀницᴀ`);
            }
        },
        admin: true
    },

    // ========== СИСТЕМА БАНОВ ==========
    '#бан (.+?) (\\d+[smhd]) (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            const timeStr = match[2];
            const reason = match[3];

            const timeMap = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
            const matchTime = timeStr.match(/^(\d+)([smhd])$/i);
            if (!matchTime) {
                bot.chat('/cc &fнᴇᴋоррᴇᴋᴛноᴇ ʙрᴇʍя. приʍᴇр: 10ᴍ, 2ʜ, 1ᴅ');
                return;
            }

            const value = parseInt(matchTime[1]);
            const unit = matchTime[2].toLowerCase();
            const timeMs = value * timeMap[unit];

            const targetLower = target.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === targetLower)) {
                bot.chat('/cc &fнᴇᴧьзя зᴀбᴀниᴛь &#ff0000ᴀ&#ff0303д&#ff0606ʍ&#ff0a0aи&#ff0d0dн&#ff1010и&#ff1313ᴄ&#ff1717ᴛ&#ff1a1aр&#ff1d1dᴀ&#ff2020ᴛ&#ff2424о&#ff2727р&#ff2a2aᴀ!');
                return;
            }

            cleanupExpiredPunishments(state);
            if (!state.clanData.bans) state.clanData.bans = {};
            if (!state.clanData.blacklist) state.clanData.blacklist = [];

            state.clanData.bans[target] = {
                reason: reason,
                by: sender,
                time: timeStr,
                duration: timeMs,
                until: Date.now() + timeMs,
                issued: Date.now()
            };

            if (!state.clanData.blacklist.includes(target)) {
                state.clanData.blacklist.push(target);
            }

            saveData(state.clanData, state.config.dataFile);

            bot.chat(`/c kick ${target}`);
            await sleep(200);
            bot.chat(`/cc &b${target} &fзᴀбᴀнᴇн нᴀ ${formatTime(timeMs)}. причинᴀ: ${reason}`);
        },
        admin: true
    },

    '#разбан (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!state.clanData.bans || !state.clanData.bans[target]) {
                bot.chat(`/cc &b${target}&f нᴇ зᴀбᴀнᴇн`);
                return;
            }

            delete state.clanData.bans[target];
            const index = state.clanData.blacklist ? state.clanData.blacklist.indexOf(target) : -1;
            if (index > -1) state.clanData.blacklist.splice(index, 1);

            saveData(state.clanData, state.config.dataFile);
            await sleep(200);
            bot.chat(`/cc &b${target}&f рᴀзбᴀнᴇн`);
        },
        admin: true
    },

    // ========== ПРОСМОТР ЧЁРНОГО СПИСКА ==========
    '#чс лист(?: (\\d+))?': {
        execute: async (bot, state, sender, match) => {
            const blacklist = state.clanData.blacklist || [];
            if (blacklist.length === 0) {
                bot.chat('/cc &fЧС пуст.');
                return;
            }

            const page = match[1] ? parseInt(match[1]) : 1;
            const perPage = 5; // количество имён на страницу
            const totalPages = Math.ceil(blacklist.length / perPage);

            if (page < 1 || page > totalPages) {
                bot.chat(`/cc &fСтраница ${page} не найдена (всего ${totalPages})`);
                return;
            }

            const start = (page - 1) * perPage;
            const end = Math.min(start + perPage, blacklist.length);
            const pageItems = blacklist.slice(start, end);

            // Формируем сообщение, стараясь уложиться в 244 символа
            let message = `/cc &fЧС (${page}/${totalPages}): &c`;
            message += pageItems.join('&f, &c');

            // Если вдруг перебор – обрезаем (маловероятно, но подстрахуемся)
            if (message.length > 244) {
                message = message.substring(0, 241) + '...';
            }

            bot.chat(message);
        }
    },

    // ========== ЧЕРНЫЙ СПИСОК (ЧС) ==========
    '#чс (.+?) (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            const reason = match[2];

            const targetLower = target.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === targetLower)) {
                bot.chat('/cc &fнᴇльзя добᴀʙиᴛь &#ff0000ᴀ&#ff0303д&#ff0606ʍ&#ff0a0aи&#ff0d0dн&#ff1010и&#ff1313ᴄ&#ff1717ᴛ&#ff1a1aр&#ff1d1dᴀ&#ff2020ᴛ&#ff2424о&#ff2727р&#ff2a2aᴀ&f ʙ чᴄ');
                return;
            }

            cleanupExpiredPunishments(state);
            if (!state.clanData.bans) state.clanData.bans = {};
            if (!state.clanData.blacklist) state.clanData.blacklist = [];

            state.clanData.bans[target] = {
                reason: reason,
                by: sender,
                time: "навсегда",
                duration: null,
                until: null,
                issued: Date.now()
            };

            if (!state.clanData.blacklist.includes(target)) {
                state.clanData.blacklist.push(target);
            }

            saveData(state.clanData, state.config.dataFile);

            bot.chat(`/cc &b${target}&f добᴀʙлᴇн ʙ чᴄ. причинᴀ: ${reason}`);
            await sleep(300);
            bot.chat(`/c kick ${target}`);
        },
        admin: true
    },


    '#анчс (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];

            if (state.clanData.bans && state.clanData.bans[target]) {
                delete state.clanData.bans[target];
            }

            const index = state.clanData.blacklist ? state.clanData.blacklist.indexOf(target) : -1;
            if (index > -1) {
                state.clanData.blacklist.splice(index, 1);
                saveData(state.clanData, state.config.dataFile);
                bot.chat(`/cc &b${target}&f удᴀлᴇн из чᴄ`);
            } else {
                bot.chat(`/cc &b${target}&f нᴇ нᴀйдᴇн ʙ чᴄ`);
            }
        },
        admin: true
    },

    // ========== КИК ==========
    '#кик (.+?) (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            const reason = match[2];

            if (!state.clanData.kicks) state.clanData.kicks = {};

            state.clanData.kicks[target] = {
                reason: reason,
                by: sender,
                issued: Date.now()
            };

            saveData(state.clanData, state.config.dataFile);

            bot.chat(`/c kick ${target}`);
            await sleep(300);
            bot.chat(`/cc &b${target}&f ᴋиᴋнуᴛ. причинᴀ: ${reason}`);
        },
        admin: true
    },

    // ========== ИСТОРИЯ НАКАЗАНИЙ ==========
    '#наказания (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            cleanupExpiredPunishments(state);

            const punishments = [];

            // Муты
            if (state.clanData.mutes && state.clanData.mutes[target]) {
                const mute = state.clanData.mutes[target];
                const timeLeft = mute.until ? formatTime(mute.until - Date.now()) : 'навсегда';
                punishments.push(`ʍуᴛ: ${mute.reason} (${timeLeft}) ʙыдᴀн ${mute.by}`);
            }

            // Баны
            if (state.clanData.bans && state.clanData.bans[target]) {
                const ban = state.clanData.bans[target];
                const timeLeft = ban.until ? formatTime(ban.until - Date.now()) : 'навсегда';
                punishments.push(`бᴀн: ${ban.reason} (${timeLeft}) ʙыдᴀн ${ban.by}`);
            }

            // Кики
            if (state.clanData.kicks && state.clanData.kicks[target]) {
                const kick = state.clanData.kicks[target];
                punishments.push(`ᴋиᴋ: ${kick.reason} ʙыдᴀн ${kick.by}`);
            }

            if (punishments.length === 0) {
                bot.chat(`/cc &fу &b${target}&f нᴇᴛ нᴀᴋᴀзᴀний`);
                return;
            }

            // Разбиваем на страницы по 3 наказания на страницу
            const page = 1;
            const perPage = 3;
            const totalPages = Math.ceil(punishments.length / perPage);

            bot.chat(`/cc &fНАКАЗАНИЯ ${target} (${punishments.length}):`);
            await sleep(500)
            for (let i = 0; i < Math.min(punishments.length, perPage); i++) {
                bot.chat(`/cc &f${punishments[i]}`);
                await sleep(1000);
            }

            if (totalPages > 1) {
                bot.chat(`/cc &f#нᴀᴋᴀзᴀния2${target} - ᴄлᴇдующᴀя ᴄᴛрᴀницᴀ`);
            }
        },
        admin: true
    },

    '#наказания(\\d+)(.+)': {
        execute: async (bot, state, sender, match) => {
            const pageNum = parseInt(match[1]) || 1;
            const target = match[2].trim();

            cleanupExpiredPunishments(state);

            const punishments = [];

            // Муты
            if (state.clanData.mutes && state.clanData.mutes[target]) {
                const mute = state.clanData.mutes[target];
                const timeLeft = mute.until ? formatTime(mute.until - Date.now()) : 'навсегда';
                punishments.push(`ʍуᴛ: ${mute.reason} (${timeLeft}) выдан ${mute.by}`);
            }

            // Баны
            if (state.clanData.bans && state.clanData.bans[target]) {
                const ban = state.clanData.bans[target];
                const timeLeft = ban.until ? formatTime(ban.until - Date.now()) : 'навсегда';
                punishments.push(`бᴀн: ${ban.reason} (${timeLeft}) ʙыдᴀн ${ban.by}`);
            }

            // Кики
            if (state.clanData.kicks && state.clanData.kicks[target]) {
                const kick = state.clanData.kicks[target];
                punishments.push(`ᴋиᴋ: ${kick.reason} ʙыдᴀн ${kick.by}`);
            }

            if (punishments.length === 0) {
                bot.chat(`/cc &fу &b${target}&f нᴇᴛ нᴀᴋᴀзᴀний`);
                return;
            }

            const perPage = 3;
            const totalPages = Math.ceil(punishments.length / perPage);

            if (pageNum < 1 || pageNum > totalPages) {
                bot.chat(`/cc &fᴄᴛрᴀницᴀ ${pageNum} нᴇ нᴀйдᴇнᴀ (ʙᴄᴇᴦо ${totalPages})`);
                return;
            }

            const start = (pageNum - 1) * perPage;
            const end = start + perPage;

            bot.chat(`/cc &fнᴀᴋᴀзᴀния ${target} ᴄᴛр. ${pageNum}/${totalPages}:`);
            await sleep(500);
            for (let i = start; i < Math.min(end, punishments.length); i++) {
                bot.chat(`/cc &f${punishments[i]}`);
                await sleep(1000);
            }

            if (pageNum < totalPages) {
                bot.chat(`/cc &f#нᴀᴋᴀзᴀния${pageNum + 1}${target} - ᴄлᴇдующᴀя ᴄᴛрᴀницᴀ`);
            }
        },
        admin: true
    },

    // ========== ОЧИСТКА ==========
    '#очистка': {
        execute: async (bot, state, sender) => {
            const beforeMutes = Object.keys(state.clanData.mutes || {}).length;
            const beforeBans = Object.keys(state.clanData.bans || {}).length;

            await processExpiredPunishments(bot, state);

            const afterMutes = Object.keys(state.clanData.mutes || {}).length;
            const afterBans = Object.keys(state.clanData.bans || {}).length;

            bot.chat(`/cc &fочиᴄᴛᴋᴀ: &bʍуᴛы &f${beforeMutes} -> ${afterMutes}, &bбаны &f${beforeBans} -> ${afterBans}`);
        },
        admin: true
    },

    // ========== ДРУГИЕ КОМАНДЫ ==========
    '#invite (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];

            if (state.clanData.blacklist && state.clanData.blacklist.includes(target)) {
                bot.chat(`/cc ${target} ʙ &#ff0000ч&#ff0000ᴄ&f! иᴄпользуйᴛᴇ &#f2ff00#&#e8ff00н&#deff00ᴀ&#d3ff00ᴋ&#c9ff00ᴀ&#bfff00з&#b5ff00ᴀ&#aaff00н&#a0ff00и&#96ff00я&f${target}`);
                return;
            }

            bot.chat(`/c invite ${target}`);
            await sleep(200);
            bot.chat(`/cc ${target} &#f2ff00у&#ecff00ᴄ&#e7ff00ᴨ&#e1ff00ᴇ&#dbff00ɯ&#d5ff00н&#d0ff00о &#caff00п&#c4ff00р&#beff00и&#b9ff00ᴦ&#b3ff00л&#adff00ᴀ&#a7ff00ɯ&#a2ff00ᴇ&#9cff00н&#96ff00!`);
        },
        admin: true
    },

    '#реконнект': {
        execute: async (bot, state, sender) => {
            bot.chat(`/cc &bрᴇᴋоннᴇᴋᴛ...`);
            setTimeout(() => bot.quit(), 1000);
        },
        admin: true
    },

    '#автоинвайт (вкл|выкл)': {
        execute: async (bot, state, sender, match) => {
            const stateCmd = match[1].toLowerCase();
            if (stateCmd === 'вкл') {
                state.autoInviteEnabled = true;
                bot.chat('/cc &fᴀʙᴛоинʙᴀйᴛ &#1cff00у&#17fb13ᴄ&#13f726ᴨ&#0ef339ᴇ&#09ee4bɯ&#05ea5eн&#00e671о&f ʙᴋлючᴇн');
            } else if (stateCmd === 'выкл') {
                state.autoInviteEnabled = false;
                bot.chat('/cc &fᴀʙᴛоинʙᴀйᴛ &#ff0000у&#fb0a0aᴄ&#f71313ᴨ&#f31d1dᴇ&#ee2727ɯ&#ea3030н&#e63a3aо&f ʙыᴋлючᴇн');
            }
        },
        admin: true
    },

    '#чат (.+)': {
        execute: async (bot, state, sender, match) => {
            const message = match[1];
            bot.chat(message);
        },
        admin: true
    },

    '^#админстат$': {
        execute: async (bot, state, sender) => {
            cleanupExpiredPunishments(state);

            const activeMutes = state.clanData.mutes ? Object.keys(state.clanData.mutes).length : 0;
            const activeBans = state.clanData.bans ? Object.keys(state.clanData.bans).length : 0;
            const blacklistSize = state.clanData.blacklist ? state.clanData.blacklist.length : 0;

            bot.chat(`/cc &fᴄᴛᴀᴛиᴄᴛиᴋᴀ: &#80ff00ʍ&#57f700у&#2eee00ᴛ&#05e600ы&f ${activeMutes}, &#80ff00б&#57f700ᴀ&#2eee00н&#05e600ы&f ${activeBans}, &c&lчᴄ&f ${blacklistSize}`);
        },
        admin: true
    },

    // ========== ВРЕМЕННЫЕ АДМИНЫ ==========
    '#датьадмина (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1].trim();
            // Проверяем, что отправитель сам является постоянным админом
            const isPermAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase());
            if (!isPermAdmin) {
                bot.chat(`/cc &f${sender}, у ʙᴀᴄ &#ff0000н&#ff0806ᴇ&#ff110cᴛ &#ff1913п&#ff2119р&#ff2a1fᴀ&#ff3225ʙ&f для ʙыдᴀчи ᴀдʍинᴋи.`);
                return;
            }
            if (!state.tempAdmins) state.tempAdmins = [];
            if (state.tempAdmins.includes(target)) {
                bot.chat(`/cc &f${target} ужᴇ &#00ff0aʙ&#14ff09р&#28ff08ᴇ&#3bff06ʍ&#4fff05ᴇ&#63ff04н&#77ff03н&#8aff01ы&#9eff00й&f ᴀдʍин.`);
                return;
            }
            state.tempAdmins.push(target);
            bot.chat(`/cc &f${target} ᴛᴇпᴇрь &#00ff0aʙ&#14ff09р&#28ff08ᴇ&#3bff06ʍ&#4fff05ᴇ&#63ff04н&#77ff03н&#8aff01ы&#9eff00й&f ᴀдʍин.`);
        },
        admin: true // требует постоянных прав, чтобы воспользоваться
    },

    '#убратьадмина (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1].trim();
            const isPermAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase());
            if (!isPermAdmin) {
                bot.chat(`/cc &f${sender}, у ʙᴀᴄ &#ff0000н&#ff0806ᴇ&#ff110cᴛ &#ff1913ᴨ&#ff2119р&#ff2a1fᴀ&#ff3225ʙ&f для ᴄняᴛия ᴀдʍинᴋи.`);
                return;
            }
            if (!state.tempAdmins) state.tempAdmins = [];
            const index = state.tempAdmins.indexOf(target);
            if (index === -1) {
                bot.chat(`/cc &f${target} нᴇ яʙляᴇᴛᴄя &#00ff0aʙ&#14ff09р&#28ff08ᴇ&#3bff06ʍ&#4fff05ᴇ&#63ff04н&#77ff03н&#8aff01ы&#9eff00м&f ᴀдʍиноʍ.`);
                return;
            }
            state.tempAdmins.splice(index, 1);
            bot.chat(`/cc &f${target} больɯᴇ нᴇ &#00ff0aʙ&#14ff09р&#28ff08ᴇ&#3bff06ʍ&#4fff05ᴇ&#63ff04н&#77ff03н&#8aff01ы&#9eff00й&f ᴀдʍин.`);
        },
        admin: true
    },

    // ========== УПРАВЛЕНИЕ ДОСТУПОМ К КОМАНДАМ ==========
    '#дк (#[^ ]+) все': {
        execute: async (bot, state, sender, match) => {
            const cmd = match[1]; // например "#invite"
            if (!state.publicCommands) state.publicCommands = new Set();
            state.publicCommands.add(cmd);
            bot.chat(`/cc &fᴋоʍᴀндᴀ ${cmd} ᴛᴇпᴇᴩь доᴄᴛуᴨнᴀ &#00ff0aʙ&#35ff07ᴄ&#69ff03ᴇ&#9eff00ʍ.`);
        },
        admin: true
    },

    '#дк (#[^ ]+) убрать все': {
        execute: async (bot, state, sender, match) => {
            const cmd = match[1];
            if (state.publicCommands && state.publicCommands.has(cmd)) {
                state.publicCommands.delete(cmd);
                bot.chat(`/cc &fᴋоʍᴀндᴀ &b${cmd}&f больɯᴇ &#ff0000н&#ff0505ᴇ &#ff0909д&#ff0e0eо&#ff1313ᴄ&#ff1717ᴛ&#ff1c1cу&#ff2121п&#ff2525н&#ff2a2aᴀ&f ʙᴄᴇʍ.`);
            } else {
                bot.chat(`/cc &fᴋоʍᴀндᴀ &b${cmd}&f нᴇ былᴀ ʙ общᴇʍ доᴄᴛупᴇ.`);
            }
        },
        admin: true
    },

    '^#дк (#[^ ]+) убрать ([^ ]+)': {
        execute: async (bot, state, sender, match) => {
            const cmd = match[1];
            const target = match[2].toLowerCase();

            if (state.playerPermissions && state.playerPermissions.has(target)) {
                const perms = state.playerPermissions.get(target);
                if (perms.has(cmd)) {
                    perms.delete(cmd);
                    if (perms.size === 0) state.playerPermissions.delete(target);
                    bot.chat(`/cc &fу игроᴋᴀ &b${match[2]}&f оᴛозʙᴀно прᴀʙо нᴀ &a${cmd}.`);
                } else {
                    bot.chat(`/cc &fу &b${match[2]}&f нᴇ было прᴀʙᴀ нᴀ &a${cmd}.`);
                }
            } else {
                bot.chat(`/cc &fу &b${match[2]}&f нᴇᴛ рᴀзрᴇɯᴇний.`);
            }
        },
        admin: true
    },

    // ========== ВЫДАЧА ПРАВ НА КОМАНДУ ==========
    '^#дк (#[^ ]+) ([^ ]+)': {
        execute: async (bot, state, sender, match) => {
            const cmd = match[1]; // например "#invite"
            const target = match[2].toLowerCase(); // ник в нижнем регистре

            if (!state.playerPermissions) state.playerPermissions = new Map();
            if (!state.playerPermissions.has(target)) {
                state.playerPermissions.set(target, new Set());
            }
            state.playerPermissions.get(target).add(cmd);

            bot.chat(`/cc &fигроᴋ &b${match[2]}&f ᴛᴇпᴇрь ʍожᴇᴛ иᴄпользоʙᴀᴛь &a${cmd}&f.`);
        },
        admin: true
    },

    // ========== ВЕЧНЫЕ АДМИНЫ (СОХРАНЯЮТСЯ В JSON) ==========
    '^#вечныйадмин список$': {
        execute: async (bot, state, sender) => {
            const permAdmins = state.clanData.permanentAdmins || [];
            if (permAdmins.length === 0) {
                bot.chat('/cc &fСписок вечных админов пуст.');
                return;
            }
            bot.chat(`/cc &fВечные админы: &a${permAdmins.join('&f, &a')}`);
        }
    },

    '#вечныйадмин убрать (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1].trim();

            const isSuperAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase());
            if (!isSuperAdmin) {
                bot.chat(`/cc &c${sender}&f, только глобальные админы могут снимать вечного админа.`);
                return;
            }

            if (!state.clanData.permanentAdmins || !state.clanData.permanentAdmins.includes(target)) {
                bot.chat(`/cc &b${target}&f не является вечным админом.`);
                return;
            }

            // Удаляем из массива
            state.clanData.permanentAdmins = state.clanData.permanentAdmins.filter(name => name !== target);
            saveData(state.clanData, state.config.dataFile);
            bot.chat(`/cc &b${target}&f больше не вечный админ.`);
        },
        admin: true
    },

    '#вечныйадмин (.+)': {
        execute: async (bot, state, sender, match) => {
            const target = match[1].trim();

            // Проверяем, что отправитель — супер-админ из конфига
            const isSuperAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase());
            if (!isSuperAdmin) {
                bot.chat(`/cc &c${sender}&f, только глобальные админы могут выдавать вечный админ.`);
                return;
            }

            // Инициализируем массив, если его нет
            if (!state.clanData.permanentAdmins) {
                state.clanData.permanentAdmins = [];
            }

            // Проверяем, не админ ли уже
            if (state.clanData.permanentAdmins.includes(target)) {
                bot.chat(`/cc &b${target}&f уже является вечным админом.`);
                return;
            }

            // Добавляем в массив и сохраняем
            state.clanData.permanentAdmins.push(target);
            saveData(state.clanData, state.config.dataFile);
            bot.chat(`/cc &b${target}&f теперь &a&lвечный админ&f! (сохранится после перезапуска)`);
        },
        admin: true
    },

};

module.exports = adminCommands;
