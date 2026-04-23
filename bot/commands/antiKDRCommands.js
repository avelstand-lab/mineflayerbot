// bot/commands/antiKDRCommands.js
const { sleep } = require('../../utils');

const antiKDRCommands = {
    // ========== #антикдр все ==========
    '^#антикдр все$': {
        admin: true,
        execute: async (bot, state, sender) => {
            if (state.statsGather && state.statsGather.active) {
                bot.chat(`/cc &b${sender}&f, уже выполняется сбор статистики. Подожди.`);
                return;
            }

            // Инициализируем сбор
            state.statsGather = {
                active: true,
                totalPages: 0,
                currentPage: 0,
                data: [],
                threshold: 5,
                mode: 'list', // 'list' или 'kick'
                sender: sender,
                timer: null
            };

            bot.chat(`/cc &fЗапрашиваю статистику всех участников...`);
            await sleep(500);
            bot.chat(`/c stats 1`);
        }
    },

    // ========== #антикдр кик [порог] ==========
    '^#антикдр кик(?: (\\d+))?$': {
        admin: true,
        execute: async (bot, state, sender, match) => {
            if (state.statsGather && state.statsGather.active) {
                bot.chat(`/cc &b${sender}&f, уже выполняется сбор статистики. Подожди.`);
                return;
            }

            const threshold = match[1] ? parseInt(match[1], 10) : 5;
            if (threshold < 1) {
                bot.chat(`/cc &b${sender}&f, порог должен быть ≥ 1.`);
                return;
            }

            state.statsGather = {
                active: true,
                totalPages: 0,
                currentPage: 0,
                data: [],
                threshold: threshold,
                mode: 'kick',
                sender: sender,
                timer: null
            };

            bot.chat(`/cc &fКикаю игроков с смертями ≥ ${threshold}. Запрашиваю статистику...`);
            bot.chat(`/c stats 1`);
        }
    },

    // ========== #антикдр [ник] ==========
    '^#антикдр ([a-zA-Z0-9_.-]+)$': {
        admin: true,
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            bot.chat(`/cc &fЗапрашиваю статистику для &b${target}...`);

            // Обработчик ответа на /c stats для одного игрока (оставляем старый механизм)
            let handled = false;
            const handler = (jsonMsg) => {
                if (handled) return;
                const msg = jsonMsg.toString();
                if (msg.includes(`КЛАН:  ${bot.username}:`)) return;

                if (msg.includes('Статистика игрока') && msg.includes(target)) {
                    handled = true;
                    const cleanMsg = msg.replace(/§[0-9a-fklmnor]/g, '').trim();
                    const killsMatch = cleanMsg.match(/Убийств:\s*(\d+)/i);
                    const deathsMatch = cleanMsg.match(/Смертей:\s*(\d+)/i);

                    if (killsMatch && deathsMatch) {
                        const kills = killsMatch[1];
                        const deaths = deathsMatch[1];
                        setTimeout(() => {
                            bot.chat(`/cc &b${target}&f: убийств &a${kills}&f, смертей &c${deaths}`);
                        }, 600);
                    } else {
                        bot.chat(`/cc &fНе удалось распарсить статистику для &b${target}`);
                    }
                    bot.removeListener('message', handler);
                }
            };

            bot.on('message', handler);
            await sleep(1000);
            bot.chat(`/c stats ${target}`);

            setTimeout(() => {
                if (!handled) {
                    bot.chat(`/cc &fСервер не ответил на запрос статистики для &b${target}`);
                    bot.removeListener('message', handler);
                }
            }, 8000);
        }
    },

    // ========== #антикдр стоп ==========
    '^#антикдр стоп$': {
        admin: true,
        execute: async (bot, state, sender) => {
            if (state.statsGather && state.statsGather.active) {
                if (state.statsGather.timer) clearTimeout(state.statsGather.timer);
                state.statsGather.active = false;
                state.statsGather.data = [];
                bot.chat(`/cc &fСбор статистики остановлен.`);
            } else {
                bot.chat(`/cc &fНет активного сбора.`);
            }
        }
    }
};

module.exports = antiKDRCommands;
