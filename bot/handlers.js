const { sleep, saveData, getLevelProgress, getRank, getMessageXP } = require('../utils');
const { sendServerInfo } = require('../utils');
const { KICK_THRESHOLD, ADMINS } = require('../config');
const { getTimeUntilNextRefill } = require('../utils');
const CommandHandler = require('./commands');
const ClanParser = require('../clanParser'); // ДОБАВЬ ЭТУ СТРОКУ
const STATS_TIMEOUT = 5000;
const STATS_DELAY = 1500;         // 1.5 сек между запросами /c stats
const KICK_DELAY = 500;           // 0.5 сек между киками
const START_DELAY = 2000;

function splitTelegramMessage(text, maxLength = 4000) {
    const parts = [];
    while (text.length > maxLength) {
        let splitIndex = text.lastIndexOf('\n', maxLength);
        if (splitIndex === -1) splitIndex = maxLength;
        parts.push(text.substring(0, splitIndex));
        text = text.substring(splitIndex);
    }
    if (text.length > 0) parts.push(text);
    return parts;
}


function setupMessageHandler(bot, state) {
    const commandHandler = new CommandHandler();
    const clanParser = new ClanParser(); // ДОБАВЬ ЭТУ СТРОКУ - СОЗДАЕМ ЭКЗЕМПЛЯР

    bot.on('message', async (jsonMsg) => {
        const msg = jsonMsg.toString();

        // Логируем только нужные чаты
        /*if (msg.startsWith('[ʟ]') || msg.startsWith('[ɢ]') || msg.startsWith('КЛАН:')) {
            console.log(`>>> [${state.config.username} MSG] ${msg}`);
        }*/

        console.log(`${msg}`);

        // Анти-тролль команда
        if (msg.includes('Freeze has been toggled!')) {
            console.log(`>>> [${state.config.username}] ТРОЛЛЬ КОМАНДА!`);
            setTimeout(() => {
                bot.quit();
            }, 1000);
            state.telegramBot?.sendLog(`🔄 СРАБОТАЛА ТРОЛЛЬ КОМАНДА FREEZETROLL! Перезапускаю на сервер <b>${config.username}</b>...`);
            return;
        }

        // Обработка ответов для команды #сервер
        if (state.pendingServerInfo) {
            const cleanMsg = msg.replace(/§[0-9a-fklmnor]/g, '').trim();

            // Парсим TPS
            if (!state.pendingServerInfo.tps) {
                const tpsMatch = cleanMsg.match(/TPS from last 1m, 5m, 15m:\s*([\d.]+)/i);
                if (tpsMatch) {
                    state.pendingServerInfo.tps = tpsMatch[1];
                    state.pendingServerInfo.responses++;
                }
            }

            // Парсим онлайн
            if (!state.pendingServerInfo.online) {
                const onlineMatch = cleanMsg.match(/› Сейчас (\d+)\/\d+ из (\d+) игроков на сервере\./i);
                if (onlineMatch) {
                    state.pendingServerInfo.online = onlineMatch[1];      // общее количество игроков
                    state.pendingServerInfo.maxOnline = onlineMatch[3];   // максимум
                    state.pendingServerInfo.responses++;
                }
            }

            // Если получили оба ответа, отправляем результат досрочно
            if (state.pendingServerInfo.responses >= state.pendingServerInfo.expected) {
                sendServerInfo(bot, state);
            }
        }

        if (msg.includes('ChertHouse') && !msg.startsWith('КЛАН: ')) {
            console.log(`>>> [${state.config.username} CLAN] Найдена строка клана: ${msg.substring(0, 100)}...`);

            // Проверяем что это статистика клана (содержит числа и ключевые слова)
            const isClanStats = (msg.includes('Убийств:') || msg.includes('Kills:')) ||
            (msg.includes('КДР:') || msg.includes('KDR:')) ||
            (msg.includes('Участников:') || msg.includes('Members:')) ||
            (msg.match(/\d+\.\s*Клан:\s*Resmayn/i));

            if (isClanStats) {
                console.log(`>>> [${state.config.username} CLAN] Определено как статистика клана`);

                const clanData = clanParser.parseClanLine(msg);

                if (clanData && clanData.place > 0) {
                    console.log(`>>> [${state.config.username} CLAN] Данные получены: место ${clanData.place}, kills: ${clanData.kills}`);

                    // Отправляем в телеграм бот если он есть
                    if (state.telegramBot && typeof state.telegramBot.updateClanData === 'function') {
                        console.log(`>>> [${state.config.username} TELEGRAM] Отправляю данные в Telegram бот для сервера ${state.config.targetServer}...`);
                        state.telegramBot.updateClanData(state.config.targetServer, clanData);
                    } else {
                        console.log(`>>> [${state.config.username} TELEGRAM] Telegram бот не инициализирован!`);
                    }

                    if (state.pendingTopRequest) {
                        const { chatId, userId } = state.pendingTopRequest;
                        if (state.telegramBot && state.telegramBot.bot) {
                            const message = `🏆 <b>Топ клана на сервере ${state.config.targetServer.toUpperCase()}</b>\n\n` +
                            `Место: #${clanData.place}\n` +
                            `👑 Глава: ${clanData.leader}\n` +
                            `⚔ Убийств: ${clanData.kills}\n` +
                            `📊 КДР: ${clanData.kdr}\n` +
                            `👥 Участников: ${clanData.members}`;
                            state.telegramBot.bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
                            .catch(e => console.error('[TELEGRAM] Ошибка отправки топа:', e.message));
                        }
                        delete state.pendingTopRequest;
                    }
                }
            }
        }

        if (state.collectingTop) {
            const cleanMsg = msg.replace(/§[0-9a-fklmnor]/g, '').trim();

            // Если встретили новую страницу или конец списка
            if (cleanMsg.startsWith('Список кланов') || cleanMsg.includes('Страница')) {
                // Начало новой страницы - игнорируем, продолжаем сбор
                return;
            }

            // Проверяем, не конец ли вывода (пустая строка или следующая команда)
            if (cleanMsg === '' || cleanMsg.startsWith('>>>') || cleanMsg.includes('помощь')) {
                // Завершаем сбор
                if (state.topLines && state.topLines.length > 0 && state.pendingTopRequest) {
                    const { chatId, userId } = state.pendingTopRequest;
                    const fullTop = state.topLines.join('\n');
                    // Отправляем в Telegram (разбиваем, если длинное)
                    if (state.telegramBot && state.telegramBot.bot) {
                        const messages = splitTelegramMessage(fullTop, 4000);
                        for (const part of messages) {
                            await state.telegramBot.bot.sendMessage(chatId, part, { parse_mode: 'HTML' })
                            .catch(e => console.error('[TELEGRAM] Ошибка отправки топа:', e.message));
                        }
                    }
                    delete state.pendingTopRequest;
                }
                state.collectingTop = false;
                state.topLines = [];
                return;
            }

            // Если строка похожа на строку клана (начинается с цифры и точки)
            if (/^\d+\./.test(cleanMsg)) {
                if (!state.topLines) state.topLines = [];
                state.topLines.push(cleanMsg);
            }
        }

        // Обработка подключения игрока (свои сообщения о других ботах)
        // Если мы в режиме проверки сервера
        if (state.serverCheck?.checking) {
            const cleanMsg = msg.toString().replace(/§[0-9a-fklmnor]/g, '').trim();

            // 1. Если пришло "Вы уже на сервере!" – значит мы на месте
            if (cleanMsg.includes('Вы уже на сервере!')) {
                console.log(`>>> [${state.config.username}] Проверка сервера: уже на месте.`);
                state.serverCheck.checking = false;
                clearTimeout(state.serverCheck.timer);
                state.serverCheck.timer = null;
                return;
            }

            // 2. Если пришло сообщение, содержащее ник бота и одно из ключевых слов – значит он переключился
            const lowerMsg = cleanMsg.toLowerCase();
            const botNameLower = state.config.username.toLowerCase();
            if (lowerMsg.includes(botNameLower) &&
                (lowerMsg.includes('подключился') || lowerMsg.includes('заехал'))) {
                console.log(`>>> [${state.config.username}] Проверка сервера: переключился на целевой сервер.`);
            if (state.telegramBot) {
                state.telegramBot.sendLog(`🔄 Бот <b>${state.config.username}</b> был переключён на сервер <b>${state.config.targetServer}</b> (возможно, админом).`);
            }
            state.serverCheck.checking = false;
            clearTimeout(state.serverCheck.timer);
            state.serverCheck.timer = null;
            return;
                }
        }


        // Обработка сообщения о балансе бота
        if (msg.includes('› Баланс: $')) {
            const balanceMatch = msg.match(/› Баланс: \$([\d,]+)/);
            if (balanceMatch) {
                const balanceStr = balanceMatch[1].replace(/,/g, '');
                const balance = parseInt(balanceStr);
                if (!isNaN(balance)) {
                    state.balance = balance;
                    state.lastBalanceCheck = Date.now();
                    console.log(`>>> [${state.config.username} BALANCE] Текущий баланс: ${balance}`);

                    // Проверяем, нужно ли пополнить баланс
                    checkAndRefillBalance(bot, state);
                }
            }
        }

        // Обработка ошибки недостатка средств
        if (msg.includes('› Ошибка: › У вас не достаточно монет.')) {
            const timeUntilRefill = getTimeUntilNextRefill(state);
            bot.chat(`/cc &fу боᴛᴀ нᴇдоᴄᴛᴀᴛочно ʍонᴇᴛ дᴧя ᴨᴇᴩᴇʙодᴀ. ᴄᴧᴇдующᴇᴇ ᴨоᴨоᴧнᴇниᴇ чᴇᴩᴇз ${timeUntilRefill}.`);
        }

        // Анализ смертей для анти-KDR
        const deathMatch = msg.match(/([а-яA-Яa-zA-Z0-9_]+) убил игрока ([а-яA-Яa-zA-Z0-9_]+)/i) ||
        msg.match(/([а-яА-Яa-zA-Z0-9_]+) убил игрока ([а-яА-Яa-zA-Z0-9_]+)/i);

        if (deathMatch) {
            const [, killer, victim] = deathMatch;
            console.log(`>>> [${state.config.username} KDR] Обнаружена смерть: ${killer} -> ${victim}`);

            state.clanData.deaths[victim] = (state.clanData.deaths[victim] || 0) + 1;
            saveData(state.clanData, state.config.dataFile);

            console.log(`>>> [${state.config.username} KDR] ${victim} умер(ла) ${state.clanData.deaths[victim]} раз`);
            await checkAndKickPlayer(bot, state, victim, `(убит ${killer})`);
        }

        // Выход из клана
        const leaveMatch = msg.match(/\[\*\] ([а-яA-Яa-zA-Z0-9_]+) покинул клан./);
        if (leaveMatch) {
            const playerName = leaveMatch[1];
            bot.chat(`/cc &b${playerName} &#ff0000ʙ&#ff0f0fы&#ff1e1eɯ&#ff2d2dᴇ&#ff3c3cл&f из ᴋлᴀнᴀ. обоᴄᴄᴀᴛь и нᴀ ʍоᴩоз!`);
            state.telegramBot?.sendLog(`Игрок <b>${playerName}</b> вышел из клана на ${state.config.targetServer}.`);
        }

        // Вступление в клан
        const joinMatch = msg.match(/\[\*\] ([^ ]+) присоединился к клану./);
        if (joinMatch) {
            const playerName = joinMatch[1];
            if (state.clanData.blacklist.includes(playerName)) {
                console.log(`>>> [${state.config.username} ANTI-KDR] Игрок ${playerName} из ЧС вступил в клан. Кикаю...`);
                bot.chat(`/c kick ${playerName} Автоматический кик: вы в черном списке за частые смерти`);
                await sleep(2000);
                state.telegramBot?.sendLog(`Игрок <b>${playerName}</b> кикнут из клана, потому что он в ЧС на подсервере ${state.config.targetServer}.`);
            } else {
                bot.chat(`/cc &fдобро пожᴀлоʙᴀᴛь ʙ ᴋлᴀн, &b${playerName}&f! Команды - #help`);
                state.telegramBot?.sendLog(`Игрок <b>${playerName}</b> присоединился к клану на подсервере ${state.config.targetServer}.`);
            }
        }

        // ========== СБОР ПОСТРАНИЧНОЙ СТАТИСТИКИ (анти-КДР) ==========
        if (state.statsGather && state.statsGather.active) {
            const cleanMsg = msg.replace(/§[0-9a-fklmnor]/g, '').trim();

            // Парсим заголовок страницы
            const pageMatch = cleanMsg.match(/Статистика участников \(страница (\d+) из (\d+)\)/i);
            if (pageMatch) {
                state.statsGather.currentPage = parseInt(pageMatch[1], 10);
                state.statsGather.totalPages = parseInt(pageMatch[2], 10);
                console.log(`>>> [${state.config.username}] Сбор страницы ${state.statsGather.currentPage}/${state.statsGather.totalPages}`);
                // Сбрасываем таймер для перехода на следующую страницу
                if (state.statsGather.timer) clearTimeout(state.statsGather.timer);
                state.statsGather.timer = setTimeout(() => {
                    requestNextStatsPage(bot, state);
                }, 2000);
                return;
            }

            // Парсим строку с игроком
            const playerMatch = cleanMsg.match(/- ([^:]+): Убийств:\s*(\d+),\s*Смертей:\s*(\d+)/i);
            if (playerMatch) {
                const nick = playerMatch[1].trim();
                const kills = parseInt(playerMatch[2], 10);
                const deaths = parseInt(playerMatch[3], 10);
                state.statsGather.data.push({ nick, kills, deaths });
                // Сбрасываем таймер после каждого игрока
                if (state.statsGather.timer) clearTimeout(state.statsGather.timer);
                state.statsGather.timer = setTimeout(() => {
                    requestNextStatsPage(bot, state);
                }, 2000);
                return;
            }

            // Если пришла пустая строка или служебное сообщение – тоже сбрасываем таймер
            if (cleanMsg === '' || cleanMsg.startsWith('>>>') || cleanMsg.includes('помощь')) {
                if (state.statsGather.timer) clearTimeout(state.statsGather.timer);
                state.statsGather.timer = setTimeout(() => {
                    requestNextStatsPage(bot, state);
                }, 2000);
            }
        }

        // Обработка клан-чата и команд
        const clanChatMatch = msg.match(/КЛАН: ([^:]+): (.+)/);
        if (clanChatMatch) {
            let [, sender, message] = clanChatMatch;
            sender = sender.replace(/§[0-9a-fklmnor]/g, '').trim();

            if (sender.includes(' ')) {
                const parts = sender.split(' ');
                sender = parts[parts.length - 1];
            }

            message = message.trim();

            // ===== СИСТЕМА УРОВНЕЙ =====
            // ✅ ВАЖНО: проверяем что отправитель НЕ сам бот!
            if (sender !== state.config.username) {
                if (!state.clanData.levels) {
                    state.clanData.levels = {};
                }

                if (!state.clanData.levels[sender]) {
                    state.clanData.levels[sender] = {
                        xp: 0,
                        messages: 0,
                        lastMsgTime: 0,
                        firstSeen: Date.now()
                    };
                    console.log(`>>> [${state.config.username} LEVELS] Новая запись: ${sender}`);
                    saveData(state.clanData, state.config.dataFile);
                }

                const player = state.clanData.levels[sender];
                const now = Date.now();

                // Кулдаун 10 секунд на XP
                if (now - player.lastMsgTime > 10000) {
                    const oldXP = player.xp;
                    const oldLvl = getLevelProgress(oldXP).level;
                    const oldRank = getRank(oldLvl).name;

                    // 1-3 XP за сообщение
                    const xpGain = 1 + Math.floor(Math.random() * 3);
                    player.xp += xpGain;
                    player.messages = (player.messages || 0) + 1;
                    player.lastMsgTime = now;

                    const newLvl = getLevelProgress(player.xp).level;
                    const newRank = getRank(newLvl).name;

                    // Проверяем повышение
                    if (newLvl > oldLvl || newRank !== oldRank) {
                        let msg = `/cc &b${sender}&f: `;
                        if (newLvl > oldLvl) msg += `лʙл ${oldLvl}->${newLvl}`;
                        if (newRank !== oldRank) msg += ` рᴀнг: ${newRank}`;

                        if (msg.length > 240) msg = msg.substring(0, 240) + '...';
                        bot.chat(msg);

                        // При повышении сразу сохраняем
                        saveData(state.clanData, state.config.dataFile);
                    }

                    // Логируем
                    console.log(`>>> [${state.config.username} XP] ${sender}: +${xpGain} XP (лвл: ${newLvl})`);

                    // Сохраняем каждые 10 сообщений
                    if (player.messages % 10 === 0) {
                        saveData(state.clanData, state.config.dataFile);
                    }
                }
            } else {
                // ❌ Это сообщение от самого бота - не начисляем XP
                console.log(`>>> [${state.config.username} LEVELS] Игнорируем сообщение от бота`);
            }
            // ============================

            // Передаем управление CommandHandler
            await commandHandler.handleCommand(bot, state, sender, message);
        }
    });
}

// Проверка и кик игрока
async function checkAndKickPlayer(bot, state, playerName, deathReason = '') {
    const deaths = state.clanData.deaths[playerName] || 0;

    if (deaths >= KICK_THRESHOLD) {
        console.log(`>>> [${state.config.username} ANTI-KDR] Игрок ${playerName} превысил лимит (${deaths}). Кикаю...`);

        bot.chat(`/c kick ${playerName}`);
        delete state.clanData.deaths[playerName];
        saveData(state.clanData, state.config.dataFile);

        return true;
    }
    return false;
}

function checkAndRefillBalance(bot, state) {
    const MAX_BALANCE = 10000000000000; // 10 триллионов
    const now = Date.now();

    // Проверяем, прошло ли 30 минут с последнего пополнения
    const lastRefill = state.lastRefillTime || 0;
    const shouldRefill = (now - lastRefill) >= (30 * 60 * 1000);

    if (shouldRefill && state.balance < MAX_BALANCE) {
        const amountToAdd = MAX_BALANCE - state.balance;
        bot.chat(`/eco give ${bot.username} ${amountToAdd}`);
        state.lastRefillTime = now;
        console.log(`>>> [${state.config.username} REFILL] Запрашиваю пополнение: ${amountToAdd}`);

        // Через 2 секунды проверяем баланс снова
        setTimeout(() => {
            bot.chat('/balance');
        }, 2000);
    }
}

async function requestNextStatsPage(bot, state) {
    if (!state.statsGather || !state.statsGather.active) return;

    // Если собрали все страницы
    if (state.statsGather.currentPage >= state.statsGather.totalPages) {
        console.log(`>>> [${state.config.username}] Сбор статистики завершён. Всего игроков: ${state.statsGather.data.length}`);

        const threshold = state.statsGather.threshold || 5;
        const violators = state.statsGather.data
        .filter(p => p.deaths >= threshold)
        .sort((a, b) => b.deaths - a.deaths);

        if (state.statsGather.mode === 'list') {
            if (violators.length === 0) {
                bot.chat(`/cc &fИгроков с ${threshold}+ смертями нет. Все молодцы!`);
            } else {
                bot.chat(`/cc &fАнти-КДР (смертей ≥ ${threshold}):`);
                await sleep(1000);
                const names = violators.map(p => `${p.nick}(${p.deaths})`).join(', ');
                bot.chat(`/cc ${names}`);
            }
        } else if (state.statsGather.mode === 'kick') {
            if (violators.length === 0) {
                bot.chat(`/cc &fНет игроков для кика (смертей ≥ ${threshold}).`);
            } else {
                bot.chat(`/cc &fКикаю ${violators.length} игроков с смертями ≥ ${threshold}...`);
                for (const v of violators) {
                    bot.chat(`/c kick ${v.nick}`);
                    await sleep(300);
                }
                bot.chat(`/cc &fКик завершён.`);
            }
        }

        // Очищаем состояние
        state.statsGather.active = false;
        state.statsGather.data = [];
        if (state.statsGather.timer) clearTimeout(state.statsGather.timer);
        return;
    }

    // Запрашиваем следующую страницу
    const nextPage = state.statsGather.currentPage + 1;
    bot.chat(`/c stats ${nextPage}`);
}

module.exports = {
    setupMessageHandler,
    checkAndKickPlayer,
    requestNextStatsPage
};
