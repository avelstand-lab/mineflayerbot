const fs = require('fs');
const path = require('path');
const DebounceMap = require('./debounceMap');
const saveDebouncer = new DebounceMap(3000);


// Задержки
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Форматирование времени
function formatPlaytime(seconds) {
    if (!seconds) return "0с";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}ч ${minutes}м`;
    if (minutes > 0) return `${minutes}м ${secs}с`;
    return `${secs}с`;
}

// Загрузка данных с автосозданием файла если его нет
function loadData(filePath) {
    try {
        // Создаем папку если нет
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Структура по умолчанию
        const defaultData = {
            deaths: {},
            blacklist: [],
            playtime: {},
            games: {},
            flyCooldowns: {},
            levels: {}
        };

        if (!fs.existsSync(filePath)) {
            console.log(`>>> [DATA] Создаю файл: ${filePath}`);
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');

        if (!fileContent.trim()) {
            console.log(`>>> [DATA] Файл пустой, создаю заново: ${filePath}`);
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        const data = JSON.parse(fileContent);

        return {
            deaths: data.deaths || {},
            blacklist: data.blacklist || [],
            playtime: data.playtime || {},
            games: data.games || {},
            flyCooldowns: data.flyCooldowns || {},
            levels: data.levels || {},
            // Старые нестандартные поля сохраняем
            ...Object.fromEntries(
                Object.entries(data).filter(([key]) =>
                !['deaths', 'blacklist', 'playtime', 'games', 'flyCooldowns', 'levels'].includes(key)
                )
            )
        };

    } catch (error) {
        console.error(`>>> [DATA] Ошибка загрузки ${filePath}: ${error.message}`);

        const defaultData = {
            deaths: {},
            blacklist: [],
            playtime: {},
            games: {},
            flyCooldowns: {},
            levels: {}
        };

        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            console.log(`>>> [DATA] Восстановил файл после ошибки: ${filePath}`);
        } catch (writeError) {
            console.error(`>>> [DATA] Не могу создать файл: ${writeError.message}`);
        }

        return defaultData;
    }
}

function canUseFly(clanData, adminName, cooldownTime) {
    const now = Math.floor(Date.now() / 1000);
    const lastUsed = clanData.flyCooldowns?.[adminName] || 0;

    if (now - lastUsed < cooldownTime) {
        const remaining = cooldownTime - (now - lastUsed);
        return {
            canUse: false,
            remaining: remaining
        };
    }

    if (!clanData.flyCooldowns) clanData.flyCooldowns = {};
    clanData.flyCooldowns[adminName] = now;

    return { canUse: true, remaining: 0 };
}

// Сохранение данных
function saveData(data, filename, immediate = false) {
    // Если нужно немедленное сохранение (например, перед выключением)
    if (immediate) {
        try {
            const dir = path.dirname(filename);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`>>> [DATA ${filename}] Данные сохранены (immediate)`);
            return true;
        } catch (err) {
            console.error(`>>> [DATA ${filename}] Ошибка сохранения (immediate):`, err.message);
            return false;
        }
    }

    // Обычное сохранение с дебаунсом
    saveDebouncer.debounce(filename, () => {
        try {
            const dir = path.dirname(filename);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`>>> [DATA ${filename}] Данные сохранены (debounced)`);
        } catch (err) {
            console.error(`>>> [DATA ${filename}] Ошибка сохранения (debounced):`, err.message);
        }
    });

    return true; // для совместимости с существующим кодом
}

function getLevelProgress(xp) {
    let level = 1;
    while (xp >= level * 100) {
        xp -= level * 100;
        level++;
    }
    return {
        level,
        currentXP: xp,
        neededXP: level * 100,
        progress: Math.floor((xp / (level * 100)) * 100)
    };
}

const RANKS = [
    { level: 1, name: "Новичок" },
{ level: 5, name: "Ученик" },
{ level: 10, name: "Боец" },
{ level: 15, name: "Ветеран" },
{ level: 20, name: "Элита" },
{ level: 30, name: "Мастер" }
];

function getRank(level) {
    return RANKS.filter(r => level >= r.level).pop() || RANKS[0];
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function getMessageXP() {
    return 1 + Math.floor(Math.random() * 3);
}

// Проверка спама команд
function checkSpam(state, sender, isAdmin) {
    if (isAdmin) return { allowed: true };

    const now = Date.now();
    const COOLDOWN_TIME = 3000;
    const SPAM_LIMIT = 5;
    const SPAM_WINDOW = 30000;

    if (!state.commandCooldowns) state.commandCooldowns = {};
    if (!state.commandHistory) state.commandHistory = {};

    const lastCommandTime = state.commandCooldowns[sender] || 0;
    let playerHistory = state.commandHistory[sender] || [];

    // Базовый кулдаун
    if (now - lastCommandTime < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastCommandTime)) / 1000);
        return { allowed: false, message: `подождите ${remaining} сек.` };
    }

    // Анти-спам
    playerHistory = playerHistory.filter(time => now - time < SPAM_WINDOW);
    if (playerHistory.length >= SPAM_LIMIT) {
        return { allowed: false, message: 'слишком много команд!' };
    }

    playerHistory.push(now);
    state.commandHistory[sender] = playerHistory;
    state.commandCooldowns[sender] = now;

    return { allowed: true };
}

function getTimeUntilNextRefill(state) {
    const now = Date.now();
    const lastRefill = state.lastRefillTime || 0;
    const nextRefill = lastRefill + (20 * 60 * 1000);
    const remaining = nextRefill - now;

    if (remaining <= 0) return "сейчас";

    const minutes = Math.ceil(remaining / (60 * 1000));
    return `${minutes} минут`;
}

// Отправка собранной информации о сервере
function sendServerInfo(bot, state) {
    if (!state.pendingServerInfo) return;
    const info = state.pendingServerInfo;
    clearTimeout(info.timer);

    let message = '/cc &fИнформация о сервере:';
    if (info.tps) {
        const tpsNum = parseFloat(info.tps);
        let color = '&a';
        if (tpsNum < 15) color = '&c';
        else if (tpsNum < 19) color = '&e';
        message += ` ${color}TPS: ${info.tps}&f`;
    } else {
        message += ' TPS: N/A';
    }

    if (info.online) {
        message += ` | Онлайн: ${info.online}`;
        if (info.maxOnline) message += `/${info.maxOnline}`;
    } else {
        message += ' | Онлайн: N/A';
    }

    bot.chat(message);
    delete state.pendingServerInfo;
}

async function processExpiredPunishments(bot, state) {
    const now = Date.now();
    let changed = false;

    // Муты
    if (state.clanData.mutes) {
        for (const [player, mute] of Object.entries(state.clanData.mutes)) {
            if (mute.until && mute.until < now) {
                bot.chat(`/c unmute ${player}`); // команда снятия мута
                await sleep(200);
                delete state.clanData.mutes[player];
                changed = true;
            }
        }
    }

    // Баны
    if (state.clanData.bans) {
        for (const [player, ban] of Object.entries(state.clanData.bans)) {
            if (ban.until && ban.until < now) {
                // Если есть команда разбана, раскомментируйте:
                // bot.chat(`/c unban ${player}`);
                // await sleep(200);
                delete state.clanData.bans[player];
                const index = state.clanData.blacklist ? state.clanData.blacklist.indexOf(player) : -1;
                if (index > -1) state.clanData.blacklist.splice(index, 1);
                changed = true;
            }
        }
    }

    if (changed) {
        saveData(state.clanData, state.config.dataFile);
    }
}

// Расстояние Левенштейна для автокоррекции команд
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

module.exports = {
    sleep,
    levenshtein,
    formatPlaytime,
        loadData,
        saveData,
        canUseFly,
        getLevelProgress,
        getRank,
        getMessageXP,
        getTimeUntilNextRefill,
        sendServerInfo,
        processExpiredPunishments,
        formatNumber,
            checkSpam,
            RANKS,
};
