// bot/commands/seaBattle.js

const { sleep } = require('../../utils');

const SIZE = 4;
const SHIPS = [3, 2]; // трёхпалубный и двухпалубный

function cellToIndex(cell) {
    const col = cell.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(cell[1]) - 1;
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return null;
    return { row, col };
}

function indexToCell(row, col) {
    return String.fromCharCode('A'.charCodeAt(0) + col) + (row + 1);
}

function createEmptyField() {
    return Array(SIZE).fill().map(() => Array(SIZE).fill(null));
}

// Проверка, что клетки образуют прямую линию без пропусков
function isValidShipPlacement(cells) {
    if (cells.length === 0) return false;
    const sameRow = cells.every(c => c.row === cells[0].row);
    const sameCol = cells.every(c => c.col === cells[0].col);
    if (!sameRow && !sameCol) return false;

    if (sameRow) {
        const cols = cells.map(c => c.col).sort((a, b) => a - b);
        for (let i = 0; i < cols.length - 1; i++) {
            if (cols[i + 1] - cols[i] !== 1) return false;
        }
    } else {
        const rows = cells.map(c => c.row).sort((a, b) => a - b);
        for (let i = 0; i < rows.length - 1; i++) {
            if (rows[i + 1] - rows[i] !== 1) return false;
        }
    }
    return true;
}

// Проверка, что корабли не касаются (даже углами)
function cellsTouch(cells1, cells2) {
    for (const c1 of cells1) {
        for (const c2 of cells2) {
            if (Math.abs(c1.row - c2.row) <= 1 && Math.abs(c1.col - c2.col) <= 1) return true;
        }
    }
    return false;
}

function canPlaceShip(existingShips, newCells) {
    // Проверка границ
    for (const { row, col } of newCells) {
        if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return false;
    }
    // Проверка пересечения и касания с существующими кораблями
    for (const ship of existingShips) {
        if (cellsTouch(ship.cells, newCells)) return false;
    }
    return true;
}

// Генерация случайного поля для бота
function generateRandomShips() {
    const ships = [];
    const field = createEmptyField();

    for (const length of SHIPS) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            const horizontal = Math.random() > 0.5;
            const row = Math.floor(Math.random() * SIZE);
            const col = Math.floor(Math.random() * SIZE);
            const cells = [];

            if (horizontal) {
                if (col + length > SIZE) continue;
                for (let i = 0; i < length; i++) cells.push({ row, col: col + i });
            } else {
                if (row + length > SIZE) continue;
                for (let i = 0; i < length; i++) cells.push({ row: row + i, col });
            }

            if (canPlaceShip(ships, cells)) {
                ships.push({ cells, hits: [] });
                placed = true;
            }
            attempts++;
        }
    }
    return ships;
}

// Проверка, все ли корабли потоплены
function allShipsSunk(ships) {
    return ships.every(ship => ship.cells.length === ship.hits.length);
}

// Формирование текстового описания своих кораблей
function formatMyFleet(ships, hits) {
    let result = '&fᴛʙои ᴋорᴀбли: ';
    ships.forEach((ship, idx) => {
        const cellsStr = ship.cells.map(c => indexToCell(c.row, c.col)).join(',');
        result += `ᴋорᴀбль ${idx+1} (${ship.cells.length}): ${cellsStr}; `;
    });
    if (hits.length > 0) {
        const hitsStr = hits.map(c => indexToCell(c.row, c.col)).join(',');
        result += `попᴀдᴀния по ᴛᴇбᴇ: ${hitsStr}`;
    } else {
        result += 'попᴀдᴀний по ᴛᴇбᴇ нᴇᴛ.';
    }
    return result;
}

const seaBattleCommands = {
    '#мб начать': {
        execute: async (bot, state, sender) => {
            state.mb = state.mb || {};
            const game = {
                status: 'placing',           // placing, battle, ended
                playerShips: [],             // [{ cells: [], hits: [] }]
                botShips: null,              // будет заполнено после готовности
                playerHits: [],              // попадания по игроку (клетки)
                turn: 'player',
                gameOver: false
            };
            state.mb[sender] = game;
            bot.chat(`/cc &b${sender}&f, нᴀчᴀᴛ ʍорᴄᴋой бой! поᴄᴛᴀʙь ᴛрёхпᴀлубный ᴋорᴀбль (3 ᴋлᴇᴛᴋи) ᴋоʍᴀндой: #ʍб поᴄᴛᴀʙиᴛь ᴀ1 ᴀ2 ᴀ3`);
        }
    },

    '#мб поставить (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.mb?.[sender];
            if (!game || game.status !== 'placing') {
                bot.chat(`/cc &b${sender}&f, ᴄнᴀчᴀлᴀ нᴀчни игру: #ʍб нᴀчᴀᴛь`);
                return;
            }

            const cellsStr = match[1].split(' ');
            if (cellsStr.length !== 3 && cellsStr.length !== 2) {
                bot.chat('/cc &fнужно уᴋᴀзᴀᴛь 2 или 3 ᴋлᴇᴛᴋи (ᴨᴩиʍᴇᴩ: ᴀ1 ᴀ2 ᴀ3)');
                return;
            }

            const cells = [];
            for (const str of cellsStr) {
                const idx = cellToIndex(str.toUpperCase());
                if (!idx) {
                    bot.chat(`/cc &fнᴇʙᴇᴩнᴀя ᴋлᴇᴛᴋᴀ: &c${str}&f. иᴄпользуй ᴀ1..ᴅ4`);
                    return;
                }
                cells.push(idx);
            }

            if (!isValidShipPlacement(cells)) {
                bot.chat('/cc &fᴋорᴀбль должᴇн быᴛь пряʍой линиᴇй бᴇз пропуᴄᴋоʙ');
                return;
            }

            if (!canPlaceShip(game.playerShips, cells)) {
                bot.chat('/cc &fнᴇльзя поᴄᴛᴀʙиᴛь ᴋорᴀбль здᴇᴄь (ʍᴇɯᴀюᴛ дᴩуᴦиᴇ или ᴋᴀᴄᴀниᴇ углоʍ)');
                return;
            }

            game.playerShips.push({ cells, hits: [] });

            const remaining = SHIPS.length - game.playerShips.length;
            if (remaining > 0) {
                bot.chat(`/cc &fᴋорᴀбль уᴄᴛᴀноʙлᴇн. оᴄᴛᴀлоᴄь поᴄᴛᴀʙиᴛь ᴇщё &a${remaining} ᴋорᴀбль(я).`);
            } else {
                bot.chat('/cc &fʙᴄᴇ ᴋорᴀбли уᴄᴛᴀноʙлᴇны! ʙʙᴇди #ʍб ᴦоᴛоʙ, чᴛобы нᴀчᴀᴛь бой.');
            }
        }
    },

    '#мб готов': {
        execute: async (bot, state, sender) => {
            const game = state.mb?.[sender];
            if (!game || game.status !== 'placing') {
                bot.chat(`/cc &b${sender}&f, нᴇᴛ игры или онᴀ ужᴇ нᴀчᴀлᴀᴄь.`);
                return;
            }
            if (game.playerShips.length !== SHIPS.length) {
                bot.chat(`/cc &fпоᴄᴛᴀʙь ʙᴄᴇ ᴋоᴩᴀбли (${SHIPS.length}) ᴄнᴀчᴀлᴀ.`);
                return;
            }

            // Генерируем корабли бота
            game.botShips = generateRandomShips();
            game.status = 'battle';

            bot.chat(`/cc &fигрᴀ нᴀчᴀлᴀᴄь! ᴛʙой ɸлоᴛ: ${formatMyFleet(game.playerShips, game.playerHits)}`);
            await sleep(1500);
            bot.chat(`/cc &fᴛʙой ход! ᴄᴛрᴇляй: #ʍб ᴄᴛᴩᴇляᴛь ᴀ1`);
        }
    },

    '#мб стрелять (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.mb?.[sender];
            if (!game || game.status !== 'battle' || game.gameOver) {
                bot.chat(`/cc &b${sender}&f, игры нᴇᴛ или онᴀ оᴋончᴇнᴀ.`);
                return;
            }
            if (game.turn !== 'player') {
                bot.chat(`/cc &fᴄᴇйчᴀᴄ ход боᴛᴀ, подожди.`);
                return;
            }

            const cellStr = match[1].toUpperCase();
            const idx = cellToIndex(cellStr);
            if (!idx) {
                bot.chat('/cc &fнᴇʙᴇрнᴀя ᴋлᴇᴛᴋᴀ. приʍᴇр: ᴀ1, ʙ3');
                return;
            }
            const { row, col } = idx;

            // Проверяем, стреляли ли уже в эту клетку
            for (const ship of game.botShips) {
                if (ship.hits.some(c => c.row === row && c.col === col)) {
                    bot.chat('/cc &fᴄюдᴀ ужᴇ ᴄᴛᴩᴇляли!');
                    return;
                }
            }

            // Ищем корабль бота в этой клетке
            let hitShip = null;
            for (const ship of game.botShips) {
                if (ship.cells.some(c => c.row === row && c.col === col)) {
                    hitShip = ship;
                    break;
                }
            }

            let result = '';
            if (hitShip) {
                hitShip.hits.push({ row, col });
                result = `ᴨоᴨᴀдᴀниᴇ ʙ ${cellStr}!`;
                if (hitShip.hits.length === hitShip.cells.length) {
                    result += ' ᴋорᴀбль поᴛоплᴇн!';
                }
            } else {
                result = `ʍиʍо.`;
            }

            bot.chat(`/cc ${result}`);
            await sleep(1500);
            // Проверка победы игрока
            if (allShipsSunk(game.botShips)) {
                bot.chat(`/cc &b${sender}&f, ᴛы поᴛопил ʙᴄᴇ ʙрᴀжᴇᴄᴋиᴇ ᴋорᴀбли! ᴨобᴇдᴀ!`);
                game.gameOver = true;
                delete state.mb[sender];
                return;
            }

            // Ход бота
            game.turn = 'bot';
            bot.chat('/cc &fход боᴛᴀ...');
            setTimeout(() => botTurn(bot, state, sender), 1500);
        }
    },

    '#мб поле': {
        execute: async (bot, state, sender) => {
            const game = state.mb?.[sender];
            if (!game) {
                bot.chat(`/cc &b${sender}&f, у ᴛᴇбя нᴇᴛ ᴀᴋᴛиʙной игры.`);
                return;
            }
            if (game.status === 'placing') {
                bot.chat(`/cc &fᴛы ᴇщё рᴀᴄᴄᴛᴀʙляᴇɯь ᴋорᴀбли. поᴄᴛᴀʙлᴇно ${game.playerShips.length}/${SHIPS.length}.`);
                return;
            }
            bot.chat(formatMyFleet(game.playerShips, game.playerHits));
        }
    },

    '#мб сдаться': {
        execute: async (bot, state, sender) => {
            if (state.mb?.[sender]) {
                bot.chat(`/cc &b${sender}&f ᴄдᴀёᴛᴄя. побᴇдᴀ зᴀ боᴛоʍ!`);
                delete state.mb[sender];
            } else {
                bot.chat(`/cc &b${sender}&f, у ᴛᴇбя нᴇᴛ ᴀᴋᴛиʙной игры.`);
            }
        }
    }
};

// Ход бота
async function botTurn(bot, state, player) {
    const game = state.mb?.[player];
    if (!game || game.turn !== 'bot' || game.gameOver) return;

    // Простой ИИ: стреляет случайно по непроверенным клеткам
    const allCells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            allCells.push({ row: r, col: c });
        }
    }
    const untried = allCells.filter(cell => {
        return !game.playerHits.some(h => h.row === cell.row && h.col === cell.col);
    });

    if (untried.length === 0) return; // не должно случиться

    const shot = untried[Math.floor(Math.random() * untried.length)];
    const { row, col } = shot;
    const cellStr = indexToCell(row, col);

    // Проверяем, попал ли бот в корабль игрока
    let hitShip = null;
    for (const ship of game.playerShips) {
        if (ship.cells.some(c => c.row === row && c.col === col)) {
            hitShip = ship;
            break;
        }
    }

    let result = '';
    if (hitShip) {
        hitShip.hits.push({ row, col });
        game.playerHits.push({ row, col });
        result = `боᴛ ᴨоᴨᴀᴧ ʙ ${cellStr}!`;
        if (hitShip.hits.length === hitShip.cells.length) {
            result += ' ᴛʙой ᴋорᴀбль поᴛоплᴇн!';
        }
    } else {
        result = `боᴛ ᴄᴛᴩᴇлял ʙ ${cellStr} - ʍиʍо.`;
    }

    bot.chat(`/cc &f${result}`);
    await sleep(1500);
    // Проверка победы бота
    if (allShipsSunk(game.playerShips)) {
        bot.chat(`/cc &fбоᴛ поᴛопил ʙᴄᴇ ᴛʙои ᴋорᴀбли! ᴛы проигрᴀᴧ.`);
        game.gameOver = true;
        delete state.mb[player];
        return;
    }
    await sleep(1500);
    game.turn = 'player';
    bot.chat('/cc &fᴛʙой ход!');
}

module.exports = seaBattleCommands;
