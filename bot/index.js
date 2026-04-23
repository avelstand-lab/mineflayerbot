const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { loadData, saveData } = require('../utils');
const { setupMessageHandler, processNextPlayerStats } = require('./handlers');
const { startLoops } = require('./loops');
const { sleep } = require('../utils');
const consoleInput = require('../consoleInput');
const DebounceMap = require('../debounceMap');

// создание бота
function createBot(config, telegramBot, activeBots, botsMap) {
    console.log(`>>> [${config.username}] Подключение к ${config.host}...`);
    console.log(`>>> [${config.username}] TelegramBot получен:`, telegramBot ? 'ДА' : 'НЕТ');

    const bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        auth: config.auth,
        hideErrors: false,
        checkTimeoutInterval: 60000,
        viewDistance: 'tiny',
    });

    bot.loadPlugin(pathfinder);

    // состояние бота
    const state = {
        config,
        telegramBot,
        botsMap: botsMap,
        startPos: null,
        isReady: false,
        loginDone: false,
        nearbyPlayers: {},
        spawnTimeout: null,
        worldReceived: false,
        isLogicSequenceRunning: false,
        autoInviteEnabled: true,
        adEnabled: true,
        botStatus: 'Активен',
        clanData: loadData(config.dataFile),
        KICK_THRESHOLD: 5,
        commandCooldowns: {},
        commandHistory: {},
        balance: null,
        lastBalanceCheck: null,
        lastRefillTime: 0
    };
    state.intervals = [];
    state.statsGather = {
        active: false,
        pages: 0,
        currentPage: 0,
        data: [],          // сюда будем складывать { nick, kills, deaths }
        threshold: 5,      // порог смертей
        chatId: null,      // для отправки результата (если нужно)
        sender: null       // кто вызвал
    };
    bot.state = state;
    state.displacementCount = 0;
    state.maxDisplacements = 5;
    state.debouncer = new DebounceMap(3000);
    state.publicCommands = new Set();          // команды, доступные всем
    state.playerPermissions = new Map();       // Map<ник, Set<команда>>
    state.mb = {};
    state.tempAdmins = [];
    state.cityGames = {};
    state.checkingServer = false; // флаг, что мы отправили проверочный варп
    state.checkTimer = null;      // таймаут для сброса флага
    state.serverCheck = {
        checking: false,   // ожидаем ответ после отправки команды
        timer: null        // таймаут
    };

    bot.once('login', () => {
        consoleInput.addBot(bot, config.username);
    });

    // удален бота из консоли при отключении
    bot.on('end', () => {
        consoleInput.removeBot(config.username);
        // Безопасное удаление из массива
        if (state.intervals) {
            state.intervals.forEach(clearInterval);
            state.intervals = [];
        }
        if (activeBots && Array.isArray(activeBots)) {
            const index = activeBots.findIndex(b => b.username === config.username);
            if (index !== -1) activeBots.splice(index, 1);
        }
    });

    // Таймаут на зависание
    const setSpawnTimeout = () => {
        if (state.spawnTimeout) clearTimeout(state.spawnTimeout);
        state.spawnTimeout = setTimeout(() => {
            if (!state.isReady) {
                console.log(`>>> [${config.username} TIMEOUT] Бот завис. Перезапуск...`);
                bot.quit();
            }
        }, 25000);
    };

    setSpawnTimeout();

    // Настройка обработчиков событий
    setupMessageHandler(bot, state);

    // Обработка других событий
    bot.on('login', () => {
        console.log(`>>> [${config.username} NET] Соединение установлено.`);
        state.worldReceived = false;
    });

    bot.on('world', () => {
        console.log(`>>> [${config.username} WORLD] Данные мира получены. Можно действовать.`);
        state.worldReceived = true;
        startLogicSequence(bot, state);
    });

    bot.on('spawn', async () => {
        console.log(`>>> [${config.username} SPAWN] Событие spawn получено.`);
        state.telegramBot?.sendLog(`✅ Бот <b>${config.username}</b> зашёл на сервер.`);
        if (state.spawnTimeout) clearTimeout(state.spawnTimeout);
        if (!state.isReady) {
            startLogicSequence(bot, state);
        }
    });

    bot.on('error', (err) => console.log(`>>> [${config.username} ERR] ${err.message}`));

    bot.on('end', (reason) => {
        console.log(`>>> [${config.username} DISCONNECT] Причина: ${reason || 'неизвестна'}. Очистка и рестарт через 15с...`);

        // Очищаем все интервалы
        if (state.intervals) {
            state.intervals.forEach(clearInterval);
            state.intervals = [];
        }

        // Очищаем таймеры
        if (state.spawnTimeout) {
            clearTimeout(state.spawnTimeout);
            state.spawnTimeout = null;
        }
        if (state.serverCheck?.timer) {
            clearTimeout(state.serverCheck.timer);
            state.serverCheck.timer = null;
        }
        if (state.antiKDRScan?.currentTimeout) {
            clearTimeout(state.antiKDRScan.currentTimeout);
            state.antiKDRScan.currentTimeout = null;
        }

        // Удаляем из консоли и activeBots
        consoleInput.removeBot(config.username);
        if (activeBots && Array.isArray(activeBots)) {
            const index = activeBots.findIndex(b => b.username === config.username);
            if (index !== -1) activeBots.splice(index, 1);
        }

        // Очищаем старый таймер переподключения
        if (bot._reconnectTimer) {
            clearTimeout(bot._reconnectTimer);
            bot._reconnectTimer = null;
        }

        // Планируем переподключение
        bot._reconnectTimer = setTimeout(() => {
            console.log(`>>> [${config.username}] Попытка переподключения...`);
            const alreadyExists = activeBots && activeBots.some(b => b.username === config.username);
            if (!alreadyExists) {
                const newBot = createBot(config, telegramBot, activeBots, botsMap);
                if (newBot) {
                    activeBots.push(newBot); // ← ВАЖНО: добавляем нового бота в массив
                }
            } else {
                console.log(`>>> [${config.username}] Бот уже существует, пропускаю.`);
            }
            bot._reconnectTimer = null;
        }, 15000);
    });

    // Функция последовательности входа
    async function startLogicSequence(botInstance, state) {
        if (state.isReady || state.isLogicSequenceRunning) return;
        state.isLogicSequenceRunning = true;
        console.log(`>>> [${config.username} LOGIC] Начинаю последовательность входа...`);

        if (!state.loginDone) {
            console.log(`>>> [${config.username} 1/3] Отправляю пароль...`);
            botInstance.chat(`/l ${config.password}`);
            state.loginDone = true;
            await sleep(5000);
        }
        botInstance.chat('/unlock 2308');
        console.log(`>>> [${config.username} 2/3] Переход на ${config.targetServer}...`);
        botInstance.chat(`/${config.targetServer}`);
        await sleep(5000);

        console.log(`>>> [${config.username} 3/3] Варп и вступление в клан...`);
        botInstance.chat('/warp oilkanpvp');
        await sleep(2000);
        botInstance.chat('/c join ChertHouse');
        await sleep(3000);
        botInstance.chat('/gm 1');
        await sleep(1000);
        botInstance.chat('/chatcolor reset')
        await sleep(1000);
        bot.chat('/nick ChertHouse');

        if (botInstance.entity && botInstance.entity.position) {
            state.startPos = botInstance.entity.position.clone();
            state.isReady = true;
            console.log(`>>> [${config.username} SUCCESS] Бот готов! Точка: ${state.startPos.x.toFixed(1)}, ${state.startPos.y.toFixed(1)}`);
            state.telegramBot?.sendLog(`✅ Бот <b>${config.username}</b> готов к работе.`);
            if (state.spawnTimeout) clearTimeout(state.spawnTimeout);
            startLoops(botInstance, state);
        } else {
            state.isReady = true;
            console.log(`>>> [${config.username} SUCCESS] Бот готов (позиция не зафиксирована).`);
            if (state.spawnTimeout) clearTimeout(state.spawnTimeout);
            startLoops(botInstance, state);
        }
    }

    return bot;
}

module.exports = {
    createBot
};
