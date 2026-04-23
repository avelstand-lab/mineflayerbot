const { getLevelProgress, getRank, saveData } = require('../../utils');

const levelsCommands = {
    '#лвл(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1] || sender;

            // Гарантируем что levels существует
            if (!state.clanData.levels) {
                state.clanData.levels = {};
            }

            // Если игрока нет в системе - создаем запись
            if (!state.clanData.levels[target]) {
                state.clanData.levels[target] = {
                    xp: 0,
                    messages: 0,
                    lastSeen: Date.now()
                };
            }

            const data = state.clanData.levels[target];
            const prog = getLevelProgress(data.xp);
            const rank = getRank(prog.level);

            // Форматируем XP: текущий/нужный
            const xpStr = `${prog.currentXP}/${prog.neededXP}`;

            // Одно сообщение, коротко
            bot.chat(`/cc &b${target}&f: уроʙᴇнь ${prog.level} ${rank.name} | ${xpStr} xᴘ`);

            // Сохраняем данные на всякий случай
            saveData(state.clanData, state.config.dataFile);
        }
    },

    '#топ': {
        execute: async (bot, state) => {
            // Проверяем что levels есть
            if (!state.clanData.levels || Object.keys(state.clanData.levels).length === 0) {
                bot.chat('/cc &fнᴇᴛ дᴀнных об уроʙнях');
                return;
            }

            // Получаем топ 5
            const sorted = Object.entries(state.clanData.levels)
            .map(([player, data]) => ({
                player,
                level: getLevelProgress(data.xp || 0).level,
                                      xp: data.xp || 0
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 5);

            // Формируем одно сообщение
            let message = '/cc &fᴛоᴨ:';
            sorted.forEach((p, i) => {
                message += ` ${i+1}.${p.player}(${p.level})`;
            });

            // Обрезаем если слишком длинное
            if (message.length > 240) {
                message = message.substring(0, 240) + '...';
            }

            bot.chat(message);
        }
    },

    // Тестовая команда для админов - добавить XP
    '#xp (\\d+) (.+)': {
        execute: async (bot, state, sender, match) => {
            const xp = parseInt(match[1]);
            const target = match[2];

            // Проверка админ прав (пример)
            const admins = ['KoTiK_B_KeDaH_', 'marinettko', 'tcftft', 'tan4ikiast', 'ABOBA_23042013'];
            if (!admins.includes(sender)) {
                bot.chat(`/cc &b${sender}&f, &#ff0000н&#ff0a0aᴇ&#ff1414ᴛ &#ff1e1eᴨ&#ff2828ᴩ&#ff3232ᴀ&#ff3c3cʙ`);
                return;
            }

            // Гарантируем структуру
            if (!state.clanData.levels) state.clanData.levels = {};
            if (!state.clanData.levels[target]) {
                state.clanData.levels[target] = { xp: 0 };
            }

            const oldXP = state.clanData.levels[target].xp;
            const oldLvl = getLevelProgress(oldXP).level;
            const oldRank = getRank(oldLvl).name;

            // Добавляем XP
            state.clanData.levels[target].xp += xp;

            const newLvl = getLevelProgress(state.clanData.levels[target].xp).level;
            const newRank = getRank(newLvl).name;

            // Сообщение о повышении если есть
            if (newLvl > oldLvl || newRank !== oldRank) {
                let msg = `/cc &b${target}&f: `;
                if (newLvl > oldLvl) msg += `лʙл ${oldLvl}->${newLvl}`;
                if (newRank !== oldRank) msg += ` рᴀнг: ${newRank}`;
                bot.chat(msg);
            }
            await sleep(1500);
            bot.chat(`/cc &b${target}&f получил ${xp} xp`);
            saveData(state.clanData, state.config.dataFile);
        }
    }
};

module.exports = levelsCommands;
