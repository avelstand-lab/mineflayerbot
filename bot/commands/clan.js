const { formatPlaytime, canUseFly, sleep, formatNumber, getTimeUntilNextRefill } = require('../../utils');
const { getWeather } = require('../../weather');
const { sendServerInfo } = require('../../utils');
const { ADMINS } = require('../../config');

const clanCommands = {
    '#статус(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const deathCount = state.clanData.deaths || {};
            const blacklistCount = state.clanData.blacklist || [];
            const trackedPlayers = state.clanData.playtime || {};

            const death = Object.keys(deathCount).length;
            const blacklist = blacklistCount.length;
            const tracked = Object.keys(trackedPlayers).length;

            bot.chat(`/cc &f&l[${state.config.username}] &eᴄᴛᴀᴛуᴄ&f: ${state.botStatus}. &aᴀʙᴛоинʙᴀйᴛ: ${state.autoInviteEnabled ? '&aВкл&f' : '&cВыкл&f'}. &cᴄʍᴇрᴛᴇй: ${death}&f. ʙ чᴄ: &c${blacklist}&f. игроᴋоʙ ʙ ᴄᴛᴀᴛиᴄᴛиᴋᴇ: &a${tracked}`);
        }
    },

    '#pvp': {
        execute: async (bot, state, sender) => {
            bot.chat(`/cc &c&l${sender}&f, ваш запрос принят в обработку. Ожидайте ~10 секунд.`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:strength 1000000 2 true`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:haste 1000000 2 true`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:resistance 1000000 1 true`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:health_boost 1000000 14 true`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:speed 1000000 2 true`);
            await sleep(1000);
            bot.chat(`/effect give ${sender} minecraft:regeneration 1000000 1 true`);
            await sleep(1500);
            bot.chat(`/cc &fВсе эффекты пвп &aуспешно выданы&f для игрока ${sender}!`);
        }
    },

    '#реклама (вкл|выкл)': {
        execute: async (bot, state, sender, match) => {
            const isAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase()) ||
            (state.tempAdmins && state.tempAdmins.some(a => a.toLowerCase() === sender.toLowerCase()));
            if (!isAdmin) {
                bot.chat(`/cc &c${sender}&f, у вас нет прав.`);
                return;
            }

            const setting = match[1].toLowerCase();
            state.adEnabled = setting === 'вкл'; // явно задаём булево значение

            bot.chat(state.adEnabled
            ? `/cc &aРеклама включена`
            : `/cc &cРеклама выключена`);

            console.log(`>>> [${state.config.username}] Реклама теперь: ${state.adEnabled}`);
        }
    },

    '#погода(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            try {
                const city = match[1] || 'москва';

                // Получаем погоду
                const weather = await getWeather(city);

                // Форматируем ответ
                if (weather.desc === 'Город не найден') {
                    bot.chat(`/cc &fгород "&c${city}&f" нᴇ нᴀйдᴇн. попробуйᴛᴇ дᴩугоᴇ нᴀзʙᴀниᴇ или ᴛрᴀнᴄлиᴛ.`);
                } else {
                    bot.chat(`/cc ${weather.message}`);
                    // Дополнительная информация (только если город не Москва)
                    if (city.toLowerCase() !== 'москва' && city !== 'moskva') {
                        bot.chat(`/cc &fгород: ${weather.city}`);
                    }
                }
            } catch (error) {
                bot.chat(`/cc &cоɯибᴋᴀ&f при поᴧучᴇнии погоды: ${error.message}`);
            }
        }
    },

    '#активность(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1] || sender;
            if (state.clanData.playtime && state.clanData.playtime[target]) {
                const playtime = state.clanData.playtime[target];
                const totalTime = formatPlaytime(playtime.totalSeconds);
                const firstSeen = new Date(playtime.firstSeen).toLocaleDateString('ru-RU');
                bot.chat(`/cc &fигроᴋ &b${target}&f: &#05ff00о&#04ff11н&#03ff23л&#02ff34ᴀ&#01ff46й&#00ff57н&f ${totalTime} (с ${firstSeen})`);
            } else {
                bot.chat(`/cc &fигроᴋ &b${target}&f нᴇ нᴀйдᴇн ʙ ᴄᴛᴀᴛиᴄᴛиᴋᴇ.`);
            }
        }
    },

    '#сервер': {
        execute: async (bot, state, sender) => {
            if (state.pendingServerInfo) {
                bot.chat(`/cc &b${sender}&f, зᴀпроᴄ ужᴇ ʙыᴨолняᴇᴛᴄя, ᴨодождиᴛᴇ.`);
                return;
            }

            state.pendingServerInfo = {
                tps: null,
                online: null,
                maxOnline: null,
                responses: 0,
                expected: 2,
                sender: sender,
                timer: setTimeout(() => {
                    sendServerInfo(bot, state);
                }, 3000)
            };

            bot.chat('/tps');
            await sleep(500);
            bot.chat('/online');
        }
    },

    '#флай': {
        execute: async (bot, state, sender) => {
            const target = sender;

            // ✅ Проверяем кулдаун
            const cooldownCheck = canUseFly(state.clanData, sender, 60); // 60 секунд кулдаун

            if (!cooldownCheck.canUse) {
                const minutes = Math.floor(cooldownCheck.remaining / 60);
                const seconds = cooldownCheck.remaining % 60;
                bot.chat(`/cc &fᴋулдᴀун! ᴄлᴇдующᴀя ʙыдᴀчᴀ ɸлᴀя чᴇᴩᴇз &a${minutes}:${seconds.toString().padStart(2, '0')}`);
                return;
            }

            console.log(`>>> [${state.config.username} FLY] ${sender} выдал флай`);

            // ✅ Команда на выдачу флая
            bot.chat(`/fly ${target}`);

            // ✅ Сообщение об успехе через секунду
            setTimeout(() => {
                bot.chat(`/cc &fɸлᴀй ʙыдᴀн игроᴋу &b${target}&f. ᴄлᴇдующᴀя ʙыдᴀчᴀ чᴇᴩᴇз &a&l1&f ʍинуᴛу.`);
            }, 1000);
        }
    },

    '#gm1': {
        execute: async (bot, state, sender) => {
            const target = sender;
            bot.chat(`/gm 1 ${sender}`);
            await sleep(500);
            bot.chat(`/cc &fгʍ 1 &#05ff00у&#04ff0fᴄ&#03ff1dп&#03ff2cᴇ&#02ff3aɯ&#01ff49н&#00ff57о&f ʙыдᴀн игроᴋу &b${sender}`);
        }
    },

    '#gm0': {
        execute: async (bot, state, sender) => {
            const target = sender;
            bot.chat(`/gm 0 ${sender}`);
            await sleep(500);
            bot.chat(`/cc &fгʍ 0 &#05ff00у&#04ff0fᴄ&#03ff1dп&#03ff2cᴇ&#02ff3aɯ&#01ff49н&#00ff57о&f ʙыдᴀн игроᴋу &b${sender}`);
        }
    },

    '#gm3': {
        execute: async (bot, state, sender) => {
            const target = sender;
            bot.chat(`/gm 3 ${sender}`);
            await sleep(500);
            bot.chat(`/cc &fгʍ 3 &#05ff00у&#04ff0fᴄ&#03ff1dп&#03ff2cᴇ&#02ff3aɯ&#01ff49н&#00ff57о&f ʙыдᴀн игроᴋу &b${sender}`);
        }
    },

    '#клан': {
        execute: async (bot, state, sender) => {
            const playtime = state.clanData.playtime || {};
            const deaths = state.clanData.deaths || {};

            const players = Object.keys(playtime);
            if (players.length === 0) {
                bot.chat('/cc &fнᴇᴛ дᴀнных для ᴄᴛᴀᴛиᴄᴛиᴋи.');
                return;
            }

            let totalTime = 0;
            let totalDeaths = 0;

            players.forEach(player => {
                totalTime += playtime[player].totalSeconds || 0;
                totalDeaths += deaths[player] || 0;
            });

            const avgTime = Math.round(totalTime / players.length);
            const avgDeaths = (totalDeaths / players.length).toFixed(1);

            bot.chat(`/cc &fᴄᴛᴀᴛиᴄᴛиᴋᴀ ᴋлᴀнᴀ: ᴄрᴇднᴇᴇ ʙᴩᴇʍя &aонлᴀйн&f: &a&l${formatPlaytime(avgTime)}&f. ᴄрᴇднᴇᴇ &cᴄʍᴇрᴛᴇй&f: &c&l${avgDeaths}&f.`);
        }
    },
    '#деньги ([\\d.]+)': {
        execute: async (bot, state, sender, match) => {
            const amount = parseFloat(match[1]);

            // Проверяем максимальный лимит
            const MAX_BALANCE = 10000000000000; // 10 триллионов

            if (amount > MAX_BALANCE) {
                bot.chat('/cc &fнᴇᴋоᴩᴩᴇᴋᴛнᴀя ᴄуʍʍᴀ.');
                return;
            }

            if (amount > MAX_BALANCE) {
                bot.chat('/cc &fʍᴀᴋᴄиʍᴀльнᴀя ᴄуʍʍᴀ дᴧя пᴇрᴇʙодᴀ: &#05ff001&#05ff080 &#04ff10ᴛ&#04ff18р&#03ff20и&#03ff28л&#02ff2fл&#02ff37и&#01ff3fо&#01ff47н&#00ff4fо&#00ff57ʙ.');
                return;
            }

            // Выполняем перевод
            bot.chat(`/eco set ${sender} ${amount}`);
            // Обновляем баланс бота (вычитаем переведенную сумму)
            state.balance -= amount;

            console.log(`>>> [${state.config.username} MONEY] Переведено ${amount} игроку ${sender}. Баланс: ${state.balance}`);
        }
    },

    '#help2': {
        execute: async (bot, state, sender) => {
            bot.chat("/cc &f#деньги [количество] - перевести себе деньги. #pvp - выдать себе все эффекты для пвп. #gm0 - выдать себе гм 0. &a#рп&f - рп команды.")
        }
    },

    // ========== HELP ПО КОНКРЕТНОЙ КОМАНДЕ ==========
    '#help(?: (.*))?': {
        execute: async (bot, state, sender, match) => {
            const arg = match[1] ? match[1].trim() : '';

            // Если аргумент пустой — показываем старую первую страницу help
            if (!arg) {
                // Твой старый код #help (страница 1)
                bot.chat('/cc &a&lᴋоʍᴀнды:&f #ᴄᴛᴀᴛуᴄ - ᴄᴛᴀᴛуᴄ боᴛᴀ. #ɸлᴀй - ʙыдᴀᴛь ɸлᴀй.#ᴀᴋᴛиʙноᴄᴛь - ᴀᴋᴛиʙноᴄᴛь ʙ ᴋлᴀнᴇ. #ᴋлᴀн - общᴀя ᴄᴛᴀᴛиᴄᴛиᴋᴀ игроᴋоʙ.#дᴇньги - пᴇрᴇʙᴇᴄᴛи дᴇньги.&a&lноʙоᴇ:  &f#игры - ᴄпиᴄоᴋ игроʙых ᴋоʍᴀнд.');
                setTimeout(() => bot.chat('/cc &f#help2 - следующая страница'), 1500);
                return;
            }

            // Если аргумент начинается с # — ищем описание команды
            if (arg.startsWith('#')) {
                const cmd = arg;
                const descriptions = {
                    '#мут': 'Замутить игрока. Пример: #мут игрок 10m спам',
                    '#размут': 'Снять мут. Пример: #размут игрок',
                    '#муты': 'Список активных мутов',
                    '#бан': 'Забанить игрока. Пример: #бан игрок 1d нарушение',
                    '#разбан': 'Разбанить игрока',
                    '#чс': 'Добавить в ЧС. Пример: #чс игрок причина',
                    '#чс лист': 'Показать ЧС. Пример: #чс лист 2',
                    '#анчс': 'Убрать из ЧС',
                    '#кик': 'Кикнуть из клана',
                    '#наказания': 'История наказаний игрока',
                    '#invite': 'Пригласить в клан',
                    '#реконнект': 'Перезапустить бота',
                    '#автоинвайт': 'Вкл/выкл авто-инвайты',
                    '#чат': 'Отправить сообщение от бота',
                    '#админстат': 'Статистика наказаний',
                    '#вечныйадмин': 'Выдать вечного админа',
                    '#флай': 'Выдать себе флай (кулдаун 60 сек)',
                    '#gm1': 'Выдать себе креатив',
                    '#pvp': 'Включить PvP',
                    '#клан': 'Статистика клана',
                    '#деньги': 'Перевести деньги игроку',
                    '#эффект': 'Выдать эффект. Пример: #эффект скорость 30 2',
                    '#эффект убрать': 'Снять эффект(ы)',
                    '#антикдр все': 'Показать всех с смертями >=5',
                    '#антикдр кик': 'Кикнуть всех с порогом смертей',
                    '#лвл': 'Твой уровень',
                    '#топ': 'Топ 5 по уровню',
                    '#сервер': 'Информация о сервере',
                    '#сброс': 'Сбросить игру',
                };
                const desc = descriptions[cmd];
                if (desc) {
                    bot.chat(`/cc &e${cmd}&f - ${desc}`);
                } else {
                    bot.chat(`/cc &cОписание для ${cmd} не найдено.`);
                }
                return;
            }

            // Если аргумент что-то другое — показываем ошибку
            bot.chat(`/cc &fНеизвестный запрос. Используйте #help или #help #команда.`);
        }
    },
}

module.exports = clanCommands;
