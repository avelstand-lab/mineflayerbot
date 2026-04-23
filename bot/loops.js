const { AD_TEXT, AD_CLAN } = require('../config');
const { saveData, sleep } = require('../utils');
const { getWeather } = require('../weather');
const { processExpiredPunishments } = require('../utils');

// запуск всех циклов
function startLoops(bot, state) {
    console.log(`>>> [${state.config.username} SYSTEM] Основные циклы запущены.`);

    const scannerState = {
        lastInviteSent: 0,
        nearbyPlayers: {}
    };

    const adminBotNames = ['__Zack__', 'KoTiK_B_KeDaH_'];

    // Предварительно отфильтрованные массивы рекламы (один раз при старте)
    const adsAll = AD_TEXT; // все пиары
    const adsSafe = AD_TEXT.filter(text => {
        const lower = text.toLowerCase();
        // Исключаем, если есть слова: гм1, гм 1, gm1, gm 1, эффект, effect
        return !/(гм\s?1|gm\s?1|эффект|effect)/i.test(lower);
    });

    // контроль позиции
    if (state.startPos) {
        const posInterval = setInterval(async () => {
            if (!bot.entity || !bot.entity.position) return;
            const distance = bot.entity.position.distanceTo(state.startPos);
            if (distance > 2.5) { // порог можно увеличить до 4-5
                console.log(`>>> [${state.config.username} POS] Смещение! Возврат на варп...`);
                bot.chat('/warp oilkanpvp');
                await sleep(300);
                bot.chat(`/${state.config.targetServer}`);

                // Увеличиваем счётчик смещений
                state.displacementCount = (state.displacementCount || 0) + 1;
                console.log(`>>> [${state.config.username}] Смещений подряд: ${state.displacementCount}/${state.maxDisplacements}`);

                // Если превышен лимит – перезапуск
                if (state.displacementCount >= state.maxDisplacements) {
                    console.log(`>>> [${state.config.username}] Слишком много смещений, перезапуск...`);
                    state.telegramBot?.sendLog(`⚠ Бот <b>${state.config.username}</b> перезапущен из-за частых смещений.`);
                    bot.quit();
                    return;
                }

                // Через 2 секунды обновляем стартовую позицию
                setTimeout(() => {
                    if (bot.entity && bot.entity.position) {
                        state.startPos = bot.entity.position.clone();
                        state.displacementCount = 0; // сбрасываем счётчик после успешного возврата
                        console.log(`>>> [${state.config.username}] Стартовая позиция обновлена.`);
                    }
                }, 2000);
            }
        }, 100);
        state.intervals.push(posInterval);
    }

    // Проверка нахождения на нужном сервере (каждые 60 секунд)
    const serverCheckInterval = setInterval(() => {
        if (!bot.entity) return;
        // Отправляем команду переключения на целевой сервер
        bot.chat(`/${state.config.targetServer}`);
        state.serverCheck.checking = true;

        // Таймаут на случай, если ничего не придёт
        if (state.serverCheck.timer) clearTimeout(state.serverCheck.timer);
        state.serverCheck.timer = setTimeout(() => {
            if (state.serverCheck.checking) {
                state.serverCheck.checking = false;
                console.log(`>>> [${state.config.username}] Таймаут проверки сервера.`);
            }
        }, 10000); // 10 секунд
    }, 60000);
    state.intervals.push(serverCheckInterval);

    const globalAdInterval = setInterval(() => {
        // Выбираем подходящий массив в зависимости от ника бота
        const ads = adminBotNames.includes(state.config.username) ? adsAll : adsSafe;
        const msg = ads[Math.floor(Math.random() * ads.length)];
        bot.chat(msg);
        console.log(`>>> [${state.config.username} SEND] Глобал реклама`);
        state.telegramBot?.sendLog(`Рассылка глобал рекламы <b>${state.config.username}</b>.`);
    }, 120000);
    state.intervals.push(globalAdInterval);

    // клан реклама
    const clanAdInterval = setInterval(() => {
        const msg = AD_CLAN[Math.floor(Math.random() * AD_CLAN.length)];
        bot.chat(`/cc ${msg}`);
        console.log(`>>> [${state.config.username} SEND] Клан реклама`);
        state.telegramBot?.sendLog(`Рассылка клан рекламы <b>${state.config.username}</b>.`);
    }, 210000);
    state.intervals.push(clanAdInterval);

    // Проверка просроченных наказаний каждые 30 секунд
    const punishmentInterval = setInterval(() => {
        processExpiredPunishments(bot, state);
    }, 30000);
    state.intervals.push(punishmentInterval);

    const invClearInterval = setInterval(() => {
        bot.chat('/ci');
        console.log('>>> [INVENTAR] Очищение инвентаря..')
    }, 300000);
    state.intervals.push(invClearInterval);

    // авто запрос топа кланов
    const clanTopInterval = setInterval(() => {
        if (state.isReady) {
            console.log(`>>> [${state.config.username} CLAN] Автоматический запрос /c top...`);
            bot.chat('/c top');

            setTimeout(() => {
                bot.chat('/c top');
            }, 3000);
        }
    }, 5 * 60 * 1000); // 5 минут
    state.intervals.push(clanTopInterval);

    const clanTopFirstInterval = setTimeout(() => {
        if (state.isReady) {
            console.log(`>>> [${state.config.username} CLAN] Первый запрос топа...`);
            bot.chat('/c top');
        }
    }, 30000);
    state.intervals.push(clanTopFirstInterval);

    // погода каждые 20 минут
    const weatherInterval = setInterval(async () => {
        try {
            console.log(`>>> [${state.config.username} WEATHER] Получаю погоду...`);
            const weather = await getWeather('москва');
            bot.chat(`!&fПогода в Москве: ${weather.message}`);
            console.log(`>>> [${state.config.username} WEATHER] Отправлено: ${weather.temp}°C`);
        } catch (error) {
            console.error(`>>> [${state.config.username} WEATHER] Ошибка:`, error.message);
        }
    }, 20 * 60 * 1000);
    state.intervals.push(weatherInterval);

    // сканер игроков
    const scannerInterval = setInterval(() => {
        if (!state.autoInviteEnabled) {
            return;
        }
        if (!bot.entity) return;

        const now = Date.now() / 1000;
        const activeNow = new Set();
        const currentTime = Date.now();

        for (const id in bot.entities) {
            const entity = bot.entities[id];
            if (entity && entity.type === 'player' && entity.username !== bot.username) {
                const dist = bot.entity.position.distanceTo(entity.position);
                if (dist < 15) {
                    const name = entity.username;
                    activeNow.add(name);

                    // пропускаем игроков из черного списка
                    if (state.clanData.blacklist.includes(name)) {
                        console.log(`>>> [${state.config.username} ANTI-KDR] Игрок ${name} в ЧС. Пропускаю инвайт.`);
                        continue;
                    }

                    if (state.clanData.deaths[name] >= state.KICK_THRESHOLD) {
                        console.log(`>>> [${state.config.username} ANTI-KDR] ${name} имеет ${state.clanData.deaths[name]} смертей. Добавляю в ЧС.`);
                        if (!state.clanData.blacklist.includes(name)) {
                            state.clanData.blacklist.push(name);
                            saveData(state.clanData, state.config.dataFile);
                        }
                        continue;
                    }

                    const lastSeen = scannerState.nearbyPlayers[name] || 0;
                    if (now - lastSeen > 60) {
                        if (currentTime - scannerState.lastInviteSent < 3000) {
                            console.log(`>>> [${state.config.username} COOLDOWN] Пропускаю ${name}, жду...`);
                            continue;
                        }

                        console.log(`>>> [${state.config.username} INVITE] ${name} (${dist.toFixed(1)}m)`);
                        bot.chat(`/clan invite ${name}`);
                        scannerState.nearbyPlayers[name] = now;
                        scannerState.lastInviteSent = Date.now();
                    }
                }
            }
        }

        for (const name in scannerState.nearbyPlayers) {
            if (!activeNow.has(name) && now - scannerState.nearbyPlayers[name] > 15) {
                delete scannerState.nearbyPlayers[name];
            }
        }
    }, 1000);
    state.intervals.push(scannerInterval);

    // анти афк
    const antiAfkInterval = setInterval(() => {
        if (bot.entity) {
            bot.look(bot.entity.yaw + (Math.random() - 0.5), bot.entity.pitch, true);
        }
    }, 30000);
    state.intervals.push(antiAfkInterval);

    setTimeout(() => {
        bot.chat('/balance');
    }, 10000);

    // автосохр. данных
    const saveInterval = setInterval(() => {
        saveData(state.clanData, state.config.dataFile);
    }, 300000);
    state.intervals.push(saveInterval);

    const restartInterval = setInterval(() => {
        if (!bot.entity) return;
        console.log(`>>> [${state.config.username}] Плановый реконнект (каждые 40 минут)`);
        state.telegramBot?.sendLog(`🔄 Бот <b>${state.config.username}</b> выполняет плановый реконнект.`);
        bot.quit();
    }, 40 * 60 * 1000);
    state.intervals.push(restartInterval);

    setInterval(() => {
        if (!bot.entity) return;
        for (const id in bot.entities) {
            const entity = bot.entities[id];
            if (entity && entity.type === 'player' && entity.username !== bot.username) {
                const name = entity.username;
                if (!state.clanData.playtime[name]) {
                    state.clanData.playtime[name] = {
                        firstSeen: Date.now(),
                totalSeconds: 0,
                lastUpdate: Date.now()
                    };
                } else {
                    const now = Date.now();
                    const lastUpdate = state.clanData.playtime[name].lastUpdate || now;
                    state.clanData.playtime[name].totalSeconds += Math.floor((now - lastUpdate) / 1000);
                    state.clanData.playtime[name].lastUpdate = now;
                }
            }
        }
    }, 5000);
}

module.exports = {
    startLoops
};
