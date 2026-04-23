// Карточные игры с текстовыми названиями
const cardGames = {
    // ========== БЛЭКДЖЕК ==========
    '#блэкджек(?: (\\d+))?': {
        execute: async (bot, state, sender, match) => {
            if (state.activeGames && state.activeGames[sender]) {
                bot.chat(`/cc &b${sender}, у вас уже есть активная игра!`);
                return;
            }

            const bet = match[1] ? parseInt(match[1]) : 1000;
            const MAX_BET = 1000000;

            if (bet > MAX_BET) {
                bot.chat(`/cc &fМаксимальная ставка: 1,000,000`);
                return;
            }

            // Инициализация игры
            state.activeGames = state.activeGames || {};
            state.activeGames[sender] = {
                type: 'blackjack',
                bet: bet,
                deck: createDeck(),
                playerHand: [],
                dealerHand: [],
                playerScore: 0,
                dealerScore: 0,
                gameState: 'player-turn',
                playerStood: false
            };

            const game = state.activeGames[sender];

            // Перемешиваем колоду
            shuffleDeck(game.deck);

            // Раздача карт
            game.playerHand.push(drawCard(game.deck));
            game.dealerHand.push(drawCard(game.deck));
            game.playerHand.push(drawCard(game.deck));
            game.dealerHand.push(drawCard(game.deck));

            // Подсчет очков
            game.playerScore = calculateHand(game.playerHand);
            game.dealerScore = calculateHand([game.dealerHand[0]]);

            // Отображение
            const playerCards = formatCards(game.playerHand);
            const dealerCards = formatCards([game.dealerHand[0], { hidden: true }]);

            bot.chat(`/cc &b${sender}&f, бл϶ᴋджᴇᴋ! ᴄᴛᴀʙᴋᴀ: ${formatNumber(bet)}. ʙᴀɯи ᴋᴀрᴛы: ${playerCards} (${game.playerScore} очᴋоʙ). ᴋᴀрᴛы дилᴇᴩᴀ: ${dealerCards} (${game.dealerScore} очᴋоʙ)`);
            await sleep(1500);
            bot.chat(`/cc &fᴋоʍᴀнды: #ʙзяᴛьᴋᴀрᴛы - ʙзяᴛь ᴋᴀрᴛу, #оᴄᴛᴀᴛьᴄя - оᴄᴛᴀноʙиᴛьᴄя, #ᴄброᴄ - зᴀᴋончиᴛь игру`);
        }
    },

    // ========== ОБЩАЯ КОМАНДА ВЗЯТЬ КАРТЫ ==========
    '#взятькарты': {
        execute: async (bot, state, sender) => {
            const game = state.activeGames?.[sender];

            if (!game) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры!`);
                return;
            }

            if (game.type === 'blackjack') {
                // Блэкджек: взять карту
                if (game.gameState !== 'player-turn') {
                    bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙᴀɯ ход!`);
                    return;
                }

                // Игрок берет карту
                game.playerHand.push(drawCard(game.deck));
                game.playerScore = calculateHand(game.playerHand);

                const playerCards = formatCards(game.playerHand);

                bot.chat(`/cc &b${sender}&f, ʙы ʙзяли ᴋᴀрᴛу. ʙᴀɯи ᴋᴀрᴛы: ${playerCards} (${game.playerScore} очᴋоʙ)`);

                // Проверка перебора
                if (game.playerScore > 21) {
                    await sleep(100);
                    bot.chat(`/cc &b${sender}&f, пᴇрᴇбор! ʙы ᴨроиᴦрᴀли ${formatNumber(game.bet)}`);

                    // Сохраняем статистику
                    saveGameStats(state, sender, 'blackjack', false);

                    delete state.activeGames[sender];
                    return;
                }
            }
            else if (game.type === 'fool') {
                // Дурак: взять все карты со стола
                if (game.state !== 'defend') {
                    bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙрᴇʍя брᴀᴛь ᴋᴀрᴛы!`);
                    return;
                }

                // Игрок берет все карты со стола
                game.playerHand.push(...game.table.map(item => item.card));
                if (game.table.some(item => item.defendedBy)) {
                    game.playerHand.push(...game.table.map(item => item.defendedBy).filter(card => card));
                }
                game.table = [];
                game.state = 'attack';
                game.turn = 'bot';
                game.playerHand.sort(sortCards);

                const playerCards = formatRussianCards(game.playerHand);

                bot.chat(`/cc &b${sender}&f, ʙы ʙзяли ʙᴄᴇ ᴋᴀрᴛы ᴄо ᴄᴛоᴧᴀ! ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
                await sleep(1500);
                bot.chat(`/cc &fход боᴛᴀ...`);

                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            }
        }
    },

    '#остаться': {
        execute: async (bot, state, sender) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'blackjack') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ бл϶ᴋджᴇᴋ!`);
                return;
            }

            if (game.gameState !== 'player-turn') {
                bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙᴀɯ ход!`);
                return;
            }

            game.gameState = 'dealer-turn';
            game.playerStood = true;

            // Ход дилера
            bot.chat(`/cc &b${sender}&f, ʙы оᴄᴛᴀноʙилиᴄь. ход дилᴇᴩᴀ...`);

            // Дилер берет карты
            while (calculateHand(game.dealerHand) < 17) {
                game.dealerHand.push(drawCard(game.deck));
                await sleep(1000);
                const dealerScore = calculateHand(game.dealerHand);
                const dealerCards = formatCards(game.dealerHand);
                bot.chat(`/cc &fдилᴇᴩ ʙзял ᴋᴀрᴛу: ${dealerCards} (${dealerScore} очков)`);
            }

            game.dealerScore = calculateHand(game.dealerHand);
            game.playerScore = calculateHand(game.playerHand);

            // Определение результата
            const playerCards = formatCards(game.playerHand);
            const dealerCards = formatCards(game.dealerHand);

            bot.chat(`/cc &fɸинᴀл: ʙᴀɯи ᴋᴀрᴛы: ${playerCards} (${game.playerScore} очков). ᴋᴀрᴛы дилᴇᴩᴀ: ${dealerCards} (${game.dealerScore} очков)`);
            await sleep(1000);
            let result = '';
            let playerWon = false;

            if (game.dealerScore > 21) {
                result = `дилᴇᴩ пᴇрᴇбрᴀл! ʙы ʙыигрᴀли ${formatNumber(game.bet * 2)}`;
                playerWon = true;
            } else if (game.playerScore > game.dealerScore) {
                result = `ʙы ʙыигрᴀли ${formatNumber(game.bet * 2)}`;
                playerWon = true;
            } else if (game.playerScore < game.dealerScore) {
                result = `ʙы проигрᴀли ${formatNumber(game.bet)}`;
                playerWon = false;
            } else {
                result = `ничья! ʙозʙрᴀᴛ ᴄᴛᴀʙᴋи ${formatNumber(game.bet)}`;
            }
            await sleep(200);
            bot.chat(`/cc &f${result}`);

            // Сохраняем статистику
            if (result !== 'ничья! ʙозʙрᴀᴛ ᴄᴛᴀʙᴋи') {
                saveGameStats(state, sender, 'blackjack', playerWon);
            }

            delete state.activeGames[sender];
        }
    },

    // ========== ДУРАК ==========
    '#дурак': {
        execute: async (bot, state, sender) => {
            if (state.activeGames && state.activeGames[sender]) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ ужᴇ ᴇᴄᴛь ᴀᴋᴛиʙнᴀя игрᴀ!`);
                return;
            }

            // Инициализация игры в дурака
            state.activeGames = state.activeGames || {};
            state.activeGames[sender] = {
                type: 'fool',
                deck: createRussianDeck(),
                playerHand: [],
                botHand: [],
                table: [],
                trump: null,
                turn: Math.random() > 0.5 ? 'player' : 'bot',
                state: 'attack',
                attacker: null
            };

            const game = state.activeGames[sender];

            // Перемешиваем колоду
            shuffleDeck(game.deck);

            // Определяем козырь
            game.trump = game.deck[0].suit;

            // Раздача карт (по 6)
            for (let i = 0; i < 6; i++) {
                game.playerHand.push(drawCard(game.deck));
                game.botHand.push(drawCard(game.deck));
            }

            // Сортировка карт
            game.playerHand.sort(sortCards);
            game.botHand.sort(sortCards);

            const playerCards = formatRussianCards(game.playerHand);
            const trumpText = getTrumpSuitText(game.trump);

            bot.chat(`/cc &b${sender}, игрᴀ ʙ дурᴀᴋᴀ! ᴋозырь: ${trumpText}. ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
            await sleep(1500);
            if (game.turn === 'player') {
                bot.chat(`/cc &fʙᴀɯ ход! ᴀᴛᴀᴋуйᴛᴇ: #ᴀᴛᴀᴋᴀ [ᴋᴀрᴛᴀ]. приʍᴇр: #ᴀᴛᴀᴋᴀ 6 ᴨиᴋи иᴧи #ᴀᴛᴀᴋᴀ ᴋороль чᴇᴩʙи`);
            } else {
                bot.chat(`/cc &fход боᴛᴀ...`);
                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            }
            await sleep(1500);
            bot.chat(`/cc &fᴋоʍᴀнды: #ᴀᴛᴀᴋᴀ [ᴋᴀрᴛᴀ], #зᴀщиᴛᴀ [ᴋᴀрᴛᴀ], #подᴋинуᴛь [ᴋᴀрᴛᴀ], #биᴛо, #ʙзяᴛьᴋᴀрᴛы, #ᴄдᴀᴛьᴄя, #ᴋᴀрᴛы`);
        }
    },

    '#атака (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'fool') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ дурᴀᴋᴀ!`);
                return;
            }

            if (game.turn !== 'player') {
                bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙᴀɯ ход!`);
                return;
            }

            const cardInput = match[1].toLowerCase();
            const cardIndex = findCardInHand(game.playerHand, cardInput);

            if (cardIndex === -1) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴛᴀᴋой ᴋᴀрᴛы! иᴄпользуйᴛᴇ #ᴋᴀрᴛы чᴛобы уʙидᴇᴛь ᴄʙои ᴋᴀрᴛы`);
                return;
            }

            // Проверяем, можно ли атаковать (если уже есть карты на столе, то нужно подкидывать той же масти или достоинству?
            // В дураке: если стол не пуст, то можно подкидывать только карты того же достоинства, что уже есть на столе.
            // Но для первого хода в атаке - можно любую карту.
            if (game.table.length > 0 && !canAttackCard(game.table, game.playerHand[cardIndex])) {
                bot.chat(`/cc &b${sender}&f, ʍожно ᴀᴛᴀᴋоʙᴀᴛь ᴛольᴋо ᴋᴀрᴛᴀʍи ᴛоᴦо жᴇ доᴄᴛоинᴄᴛʙᴀ, чᴛо ужᴇ нᴀ ᴄᴛолᴇ!`);
                return;
            }

            // Перемещаем карту на стол
            const card = game.playerHand.splice(cardIndex, 1)[0];
            game.table.push({ card, owner: 'player', defendedBy: null });
            game.attacker = 'player';
            game.state = 'defend';
            game.turn = 'bot';

            const tableCards = formatRussianCards(game.table.map(item => item.card));
            const playerCards = formatRussianCards(game.playerHand);

            bot.chat(`/cc &b${sender}&f, ʙы ᴀᴛᴀкоʙᴀли ᴋᴀрᴛой: ${formatRussianCard(card)}. нᴀ ᴄᴛолᴇ: ${tableCards}`);

            // Добираем карты
            refillHand(game.playerHand, game.deck);
            // Показываем обновленные карты
            setTimeout(() => {
                bot.chat(`/cc &fʙᴀɯи ᴋᴀрᴛы: ${playerCards}. ход боᴛᴀ...`);
                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            }, 1000);
        }
    },

    '#защита (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'fool') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ дурᴀᴋᴀ!`);
                return;
            }

            if (game.state !== 'defend' || game.turn !== 'player') {
                bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙрᴇʍя для зᴀщиᴛы!`);
                return;
            }

            const cardInput = match[1].toLowerCase();
            const cardIndex = findCardInHand(game.playerHand, cardInput);
            // Находим первую неотбитую карту на столе
            const unattackedCard = game.table.find(item => !item.defendedBy);
            if (!unattackedCard) {
                bot.chat(`/cc &b${sender}&f, ʙᴄᴇ ᴋᴀрᴛы ужᴇ оᴛбиᴛы! иᴄпользуйᴛᴇ #биᴛо или #подᴋинуᴛь`);
                return;
            }
            const attackingCard = unattackedCard.card;

            if (cardIndex === -1) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴛᴀᴋой ᴋᴀрᴛы! иᴄпользуйᴛᴇ #ᴋᴀрᴛы чᴛобы уʙидᴇᴛь ᴄʙои ᴋᴀрᴛы`);
                return;
            }

            const defendingCard = game.playerHand[cardIndex];

            // Проверяем, можно ли отбиться
            if (!canDefendCard(attackingCard, defendingCard, game.trump)) {
                bot.chat(`/cc &b${sender}&f, ϶ᴛой ᴋᴀрᴛой нᴇльзя оᴛбиᴛьᴄя! ʍожно биᴛь ᴋᴀрᴛой ᴛой жᴇ ʍᴀᴄᴛи, но ᴄᴛᴀрɯᴇ, иᴧи ᴋозырᴇʍ!`);
                return;
            }

            // Отбиваемся
            const card = game.playerHand.splice(cardIndex, 1)[0];
            unattackedCard.defendedBy = card;
            // После защиты проверяем, все ли карты отбиты
            const allDefended = game.table.every(item => item.defendedBy !== null);
            if (allDefended) {
                game.state = 'attack'; // Теперь можно подкидывать
                game.turn = 'player'; // Подкидывает тот, кто атаковал (игрок)
            }

            const tableCards = formatRussianCards(game.table.map(item =>
            item.defendedBy ? [item.card, item.defendedBy] : [item.card]
            ).flat());

            bot.chat(`/cc &b${sender}&f, ʙы оᴛбилиᴄь ᴋᴀрᴛой: ${formatRussianCard(card)}. нᴀ ᴄᴛолᴇ: ${tableCards}`);

            // Добираем карты
            refillHand(game.playerHand, game.deck);

            // Если все отбиты, сообщаем, что можно подкидывать
            if (allDefended) {
                bot.chat(`/cc &fʙᴄᴇ ᴋᴀрᴛы оᴛбиᴛы! ʙы ʍожᴇᴛᴇ ᴨодᴋинуᴛь ᴋᴀрᴛы: #ᴨодᴋинуᴛь [ᴋᴀрᴛᴀ] иᴧи ᴄᴋᴀзᴀᴛь #биᴛо`);
            } else {
                bot.chat(`/cc &fзᴀщищᴀйᴛᴇᴄь оᴛ ᴄлᴇдующᴇй ᴋᴀрᴛы`);
            }
        }
    },

    // Подкинуть карту (когда все карты на столе отбиты)
    '#подкинуть (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'fool') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ дурᴀᴋᴀ!`);
                return;
            }

            // Проверяем, можно ли подкидывать
            if (game.state !== 'attack' || game.turn !== 'player') {
                bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙрᴇʍя подᴋидыʙᴀᴛь!`);
                return;
            }

            // Проверяем, что игрок - атакующий
            if (game.attacker !== 'player') {
                bot.chat(`/cc &b${sender}&f, ᴄᴇйчᴀᴄ нᴇ ʙᴀɯ ход подᴋидыʙᴀᴛь!`);
                return;
            }

            // Проверяем, что все карты на столе отбиты
            const allDefended = game.table.every(item => item.defendedBy !== null);
            if (!allDefended) {
                bot.chat(`/cc &b${sender}&f, нᴇ ʙᴄᴇ ᴋᴀрᴛы оᴛбиᴛы! ᴄнᴀчᴀлᴀ оᴛбᴇйᴛᴇᴄь.`);
                return;
            }

            const cardInput = match[1].toLowerCase();
            const cardIndex = findCardInHand(game.playerHand, cardInput);

            if (cardIndex === -1) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴛᴀᴋой ᴋᴀрᴛы! иᴄᴨользуйᴛᴇ #ᴋᴀрᴛы чᴛобы уʙидᴇᴛь ᴄʙои ᴋᴀрᴛы`);
                return;
            }

            const card = game.playerHand[cardIndex];

            // Проверяем, можно ли подкинуть эту карту (должно быть то же достоинство, что уже есть на столе)
            if (!canAttackCard(game.table, card)) {
                bot.chat(`/cc &b${sender}&f, ʍожно подᴋидыʙᴀᴛь ᴛольᴋо ᴋᴀрᴛы ᴛоᴦо жᴇ доᴄᴛоинᴄᴛʙᴀ, чᴛо ужᴇ нᴀ ᴄᴛолᴇ!`);
                return;
            }

            // Подкидываем карту
            game.playerHand.splice(cardIndex, 1);
            game.table.push({ card, owner: 'player', defendedBy: null });
            game.state = 'defend'; // После подкидывания нужно снова защищаться
            game.turn = 'bot';

            const tableCards = formatRussianCards(game.table.map(item =>
            item.defendedBy ? [item.card, item.defendedBy] : [item.card]
            ).flat());

            bot.chat(`/cc &b${sender}&f, подᴋинул ᴋᴀрᴛу: ${formatRussianCard(card)}. нᴀ ᴄᴛолᴇ: ${tableCards}`);

            // Проверяем, не превышен ли лимит карт (максимум 6 карт на столе)
            if (game.table.length >= 6) {
                bot.chat(`/cc &fʍᴀᴋᴄиʍуʍ ᴋᴀрᴛ нᴀ ᴄᴛолᴇ! ᴀʙᴛоʍᴀᴛичᴇᴄᴋи: биᴛо`);

                // Убираем карты в отбой
                const discardedCount = game.table.length;
                game.table = [];
                game.state = 'attack';
                game.turn = 'bot';
                game.attacker = 'bot';

                // Добираем карты
                refillHand(game.playerHand, game.deck);
                refillHand(game.botHand, game.deck);

                bot.chat(`/cc &f${discardedCount} ᴋᴀрᴛ уɯло ʙ оᴛбой. ход боᴛᴀ...`);
                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            } else {
                bot.chat(`/cc &fход боᴛᴀ...`);
                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            }
        }
    },

    '#бито': {
        execute: async (bot, state, sender) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'fool') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ дурᴀᴋᴀ!`);
                return;
            }

            // Проверяем, что все карты на столе отбиты
            const allDefended = game.table.every(item => item.defendedBy !== null);
            if (!allDefended) {
                bot.chat(`/cc &b${sender}&f, нᴇ ʙᴄᴇ ᴋᴀрᴛы оᴛбиᴛы! ᴄнᴀчᴀлᴀ оᴛбᴇйᴛᴇᴄь.`);
                return;
            }

            // Убираем карты в отбой
            const discardedCount = game.table.length;
            game.table = [];
            game.state = 'attack';
            // После "бито" ход переходит к другому игроку (тому, кто отбивался)
            game.turn = game.attacker === 'player' ? 'bot' : 'player';
            game.attacker = game.turn; // Теперь атакует тот, чей ход

            // Добираем карты
            refillHand(game.playerHand, game.deck);
            refillHand(game.botHand, game.deck);

            bot.chat(`/cc &fбиᴛо! ${discardedCount} ᴋᴀрᴛ уɯло ʙ оᴛбой.`);

            if (game.turn === 'player') {
                await sleep(1000);
                const playerCards = formatRussianCards(game.playerHand);
                bot.chat(`/cc &b${sender}&f, ʙᴀɯ ход! ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
            } else {
                await sleep(1000);
                bot.chat(`/cc ход боᴛᴀ...`);
                setTimeout(() => botTurnFool(bot, state, sender), 2000);
            }
        }
    },

    '#карты': {
        execute: async (bot, state, sender) => {
            const game = state.activeGames?.[sender];

            if (!game || game.type !== 'fool') {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры ʙ дурᴀᴋᴀ!`);
                return;
            }

            const playerCards = formatRussianCards(game.playerHand);
            const trumpText = getTrumpSuitText(game.trump);

            bot.chat(`/cc &b${sender}&f, ʙᴀɯи ᴋᴀрᴛы: ${playerCards}. ᴋозырь: ${trumpText}`);

            if (game.table.length > 0) {
                const tableCards = formatRussianCards(game.table.map(item =>
                item.defendedBy ? [item.card, item.defendedBy] : [item.card]
                ).flat());
                bot.chat(`/cc &fнᴀ ᴄᴛолᴇ: ${tableCards}`);
            }
        }
    },

    '#сдаться': {
        execute: async (bot, state, sender) => {
            const game = state.activeGames?.[sender];

            if (!game) {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙной игры!`);
                return;
            }

            if (game.type === 'blackjack') {
                bot.chat(`/cc &b${sender}&f, ʙы ᴄдᴀлиᴄь ʙ бл϶ᴋджᴇᴋᴇ! ᴄᴛᴀʙᴋᴀ поᴛᴇрянᴀ.`);
            } else if (game.type === 'fool') {
                bot.chat(`/cc &b${sender}&f, ʙы ᴄдᴀлиᴄь ʙ дурᴀᴋᴇ! боᴛ побᴇждᴀᴇᴛ!`);
                saveGameStats(state, sender, 'fool', false);
            }

            delete state.activeGames[sender];
        }
    },

    '#сброс': {
        execute: async (bot, state, sender) => {
            if (state.activeGames?.[sender]) {
                bot.chat(`/cc &b${sender}&f, ʙᴀɯᴀ игрᴀ ᴄброɯᴇнᴀ!`);
                delete state.activeGames[sender];
            } else if (state.guessGame?.[sender]) {
                delete state.guessGame[sender];
                bot.chat(`/cc &b${sender}&f, игрᴀ ʙ уᴦᴀдᴀйᴋу ᴄброɯᴇнᴀ!`);
            } else if (state.hangman?.[sender]) {
                delete state.hangman[sender];
                bot.chat(`/cc &b${sender}&f, игрᴀ ʙ ʙиᴄᴇлицу ᴄброɯᴇнᴀ!`);
            } else {
                bot.chat(`/cc &b${sender}&f, у ʙᴀᴄ нᴇᴛ ᴀᴋᴛиʙных игр!`);
            }
        }
    },

    // ========== КАЗИНО КОМАНДЫ ==========

    // ========== СТАТИСТИЧЕСКИЕ КОМАНДЫ ==========
    '#статистика': {
        execute: async (bot, state, sender) => {
            const stats = state.clanData.games || {};

            if (Object.keys(stats).length === 0) {
                bot.chat('/cc &fᴄᴛᴀᴛиᴄᴛиᴋᴀ игр ᴨуᴄᴛᴀ!');
                return;
            }

            let message = '/cc ʙᴀɯᴀ ᴄᴛᴀᴛиᴄᴛиᴋᴀ:';

            if (stats.blackjack) {
                const bj = stats.blackjack[sender] || { wins: 0, losses: 0 };
                const total = bj.wins + bj.losses;
                const winRate = total > 0 ? ((bj.wins / total) * 100).toFixed(1) : 0;
                message += ` бл϶ᴋджᴇᴋ: ${bj.wins}/${bj.losses} (${winRate}%)`;
            }

            if (stats.fool) {
                const fool = stats.fool[sender] || { wins: 0, losses: 0 };
                const total = fool.wins + fool.losses;
                const winRate = total > 0 ? ((fool.wins / total) * 100).toFixed(1) : 0;
                message += ` дурᴀᴋ: ${fool.wins}/${fool.losses} (${winRate}%)`;
            }

            bot.chat(message);
        }
    },

    // ========== МИНИ-ИГРЫ ==========
    '#угадайчисло (\\d+)-(\\d+)': {
        execute: async (bot, state, sender, match) => {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);

            if (min >= max) {
                bot.chat('/cc &fʍиниʍᴀльноᴇ чиᴄло доᴧжно быᴛь ʍᴇньɯᴇ ʍᴀᴋᴄиʍᴀльного!');
                return;
            }

            if (max - min > 1000) {
                bot.chat('/cc &fдиᴀпᴀзон ᴄᴧиɯᴋоʍ боᴧьɯой (ʍᴀᴋᴄиʍуʍ 1000 чиᴄᴇл)!');
                return;
            }

            const secret = Math.floor(Math.random() * (max - min + 1)) + min;
            state.guessGame = state.guessGame || {};
            state.guessGame[sender] = {
                secret: secret,
                min: min,
                max: max,
                attempts: 0,
                maxAttempts: Math.ceil(Math.log2(max - min + 1))
            };

            bot.chat(`/cc &b${sender}&f, угᴀдᴀй чиᴄло! диᴀпᴀзон: ${min}-${max}`);
            await sleep(2000);
            bot.chat(`/cc &fу ʙᴀᴄ ${state.guessGame[sender].maxAttempts} попыᴛоᴋ. пиɯиᴛᴇ: #чиᴄᴧо [ʙᴀɯᴇ_чиᴄᴧо]`);
        }
    },

    '#число (\\d+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.guessGame?.[sender];

            if (!game) {
                bot.chat('/cc &fᴄнᴀчᴀлᴀ нᴀчниᴛᴇ игру: #угᴀдᴀйчиᴄло ʍин-ʍᴀᴋᴄ');
                return;
            }

            const guess = parseInt(match[1]);
            game.attempts++;

            if (guess < game.min || guess > game.max) {
                bot.chat(`/cc &fчиᴄло должно быᴛь ʙ диᴀпᴀзонᴇ ${game.min}-${game.max}!`);
                return;
            }

            if (guess === game.secret) {
                bot.chat(`/cc &b${sender}&f, ʙᴇрно! ʙы угᴀдᴀли чиᴄло ${game.secret} зᴀ ${game.attempts} попыᴛоᴋ!`);
                delete state.guessGame[sender];
            } else {
                const hint = guess < game.secret ? 'больше' : 'меньше';
                const attemptsLeft = game.maxAttempts - game.attempts;

                if (attemptsLeft <= 0) {
                    bot.chat(`/cc &b${sender}&f, проиᴦᴩᴀли! чиᴄло быᴧо: ${game.secret}`);
                    delete state.guessGame[sender];
                } else {
                    bot.chat(`/cc &fнᴇʙᴇᴩно! зᴀгᴀдᴀнноᴇ чиᴄло ${hint}. оᴄᴛᴀлоᴄь попыᴛоᴋ: ${attemptsLeft}`);
                }
            }
        }
    },

    '#виселица': {
        execute: async (bot, state, sender) => {
            const words = [
                'МАЙНКРАФТ', 'КЛАН', 'ЭПШТЕЙН', 'БОТ', 'ИГРОК',
                'ИЗУМРУД', 'ЗОМБИ', 'КРИПЕР', 'АЛМАЗ', 'ПОСТРОЙКА',
                'РЕДСТОН', 'ВАРП', 'КВЕСТ', 'ЯБЛОКО', 'ДОНАТ'
            ];

            const word = words[Math.floor(Math.random() * words.length)];
            const hidden = word.split('').map(() => '_').join(' ');

            state.hangman = state.hangman || {};
            state.hangman[sender] = {
                word: word,
                hidden: hidden.split(' '),
                guessed: [],
                mistakes: 0,
                maxMistakes: 6
            };

            bot.chat(`/cc &b${sender}&f, игрᴀ ʙ ʙиᴄᴇлицу! ᴄлоʙо: ${hidden}. ᴨиɯиᴛᴇ: #буᴋʙᴀ [буᴋʙᴀ]`);
        }
    },

    '#буква (.+)': {
        execute: async (bot, state, sender, match) => {
            const game = state.hangman?.[sender];

            if (!game) {
                bot.chat('/cc &fᴄнᴀчᴀлᴀ нᴀчниᴛᴇ игру: #ʙиᴄᴇлицᴀ');
                return;
            }

            const letter = match[1].toUpperCase();

            if (letter.length !== 1 || !/[А-ЯA-Z]/.test(letter)) {
                bot.chat('/cc &fʙʙᴇдиᴛᴇ одну буᴋʙу!');
                return;
            }

            if (game.guessed.includes(letter)) {
                bot.chat('/cc &fʙы ужᴇ нᴀзыʙᴀли ϶ᴛу буᴋʙу!');
                return;
            }

            game.guessed.push(letter);

            if (game.word.includes(letter)) {
                // Открываем буквы
                for (let i = 0; i < game.word.length; i++) {
                    if (game.word[i] === letter) {
                        game.hidden[i] = letter;
                    }
                }

                bot.chat(`/cc &fᴇᴄᴛь буᴋʙᴀ "&a${letter}&f"! ᴄлоʙо: ${game.hidden.join(' ')}`);
                // Проверка победы
                if (!game.hidden.includes('_')) {
                    bot.chat(`/cc &b${sender}&f, побᴇдᴀ! ᴄлоʙо: ${game.word}`);
                    delete state.hangman[sender];
                    return;
                }
            } else {
                game.mistakes++;
                bot.chat(`/cc нᴇᴛ буᴋʙы "&c${letter}&f"! оɯибоᴋ: ${game.mistakes}/${game.maxMistakes}`);

                if (game.mistakes >= game.maxMistakes) {
                    bot.chat(`/cc &b${sender}&f, проиᴦᴩᴀли! ᴄлоʙо было: ${game.word}`);
                    delete state.hangman[sender];
                }
            }
        }
    },

    // ========== ФУН-КОМАНДЫ ==========
    '#шар8 (.+)': {
        execute: async (bot, state, sender, match) => {
            const answers = [
                'Бесспорно', 'Предрешено', 'Никаких сомнений', 'Определенно да',
                'Можешь быть уверен', 'Мне кажется - да', 'Вероятнее всего',
                'Хорошие перспективы', 'Знаки говорят - да', 'Да',
                'Пока не ясно', 'Спроси позже', 'Лучше не рассказывать',
                'Сейчас нельзя предсказать', 'Сконцентрируйся и спроси опять',
                'Даже не думай', 'Мой ответ - нет', 'По моим данным - нет',
                'Перспективы не очень хорошие', 'Весьма сомнительно'
            ];

            const answer = answers[Math.floor(Math.random() * answers.length)];
            bot.chat(`/cc &fʍᴀгичᴇᴄᴋий ɯᴀᴩ гоʙориᴛ: &f&n${answer}`);
        }
    },

    '#орёлрешка': {
        execute: async (bot, state, sender) => {
            const result = Math.random() > 0.5 ? 'ОРЁЛ' : 'РЕШКА';
            bot.chat(`/cc &fʍонᴇᴛᴋᴀ подброɯᴇнᴀ: &a${result}!`);
        }
    },

    '#судьба': {
        execute: async (bot, state, sender) => {
            const fates = [
                'Сегодня вас ждет удача!',
                'Будьте осторожны в ближайшее время',
                'Вас ждет неожиданная встреча',
                'Финансовое благополучие на подходе',
                'Остерегайтесь ложных друзей',
                'Время для новых начинаний',
                'Ваше терпение будет вознаграждено',
                'Сегодняшний день принесет сюрприз'
            ];

            const fate = fates[Math.floor(Math.random() * fates.length)];
            bot.chat(`/cc &b${sender}&f, ʙᴀɯᴀ ᴄудьбᴀ: ${fate}`);
        }
    },

    '#игровойтоп': {
        execute: async (bot, state) => {
            const stats = state.clanData.games || {};

            let message = '/cc ᴛоᴨ игроᴋоʙ:';

            // Блэкджек топ
            if (stats.blackjack) {
                const bjTop = Object.entries(stats.blackjack)
                .map(([player, data]) => ({
                    player,
                    wins: data.wins || 0,
                    total: (data.wins || 0) + (data.losses || 0)
                }))
                .filter(p => p.total >= 5)
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 3);

                if (bjTop.length > 0) {
                    message += ' бл϶ᴋджᴇᴋ:';
                    bjTop.forEach((p, i) => {
                        message += ` ${i+1}.${p.player}(${p.wins})`;
                    });
                }
            }

            // Дурак топ
            if (stats.fool) {
                const foolTop = Object.entries(stats.fool)
                .map(([player, data]) => ({
                    player,
                    wins: data.wins || 0,
                    total: (data.wins || 0) + (data.losses || 0)
                }))
                .filter(p => p.total >= 5)
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 3);

                if (foolTop.length > 0) {
                    message += ' дурᴀᴋ:';
                    foolTop.forEach((p, i) => {
                        message += ` ${i+1}.${p.player}(${p.wins})`;
                    });
                }
            }

            bot.chat(message.length > 240 ? message.substring(0, 240) + '...' : message);
        }
    }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Блэкджек функции
function createDeck() {
    const suits = ['пики', 'черви', 'буби', 'крести'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'валет', 'дама', 'король', 'туз'];
    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }

    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard(deck) {
    return deck.length > 0 ? deck.pop() : null;
}

function calculateHand(hand) {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.hidden) continue;

        if (['валет', 'дама', 'король'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'туз') {
            aces++;
            score += 11;
        } else {
            score += parseInt(card.value);
        }
    }

    // Корректировка тузов
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function formatCards(cards) {
    return cards.map(card =>
    card.hidden ? '[?]' : `${card.value} ${card.suit}`
    ).join(', ');
}

// Дурак функции
function createRussianDeck() {
    const suits = ['пики', 'черви', 'буби', 'крести'];
    const values = ['6', '7', '8', '9', '10', 'валет', 'дама', 'король', 'туз'];
    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }

    return deck;
}

function formatRussianCards(cards) {
    if (!cards || cards.length === 0) return 'нет карт';
    return cards.map(card => formatRussianCard(card)).join(', ');
}

function formatRussianCard(card) {
    if (!card) return '';
    return `${card.value} ${card.suit}`;
}

function getTrumpSuitText(trump) {
    const suitNames = {
        'пики': 'пики',
        'черви': 'черви',
        'буби': 'буби',
        'крести': 'крести'
    };
    return suitNames[trump] || trump;
}

function sortCards(a, b) {
    const suitOrder = { 'пики': 0, 'черви': 1, 'буби': 2, 'крести': 3 };
    const valueOrder = {
        '6': 0, '7': 1, '8': 2, '9': 3, '10': 4,
        'валет': 5, 'дама': 6, 'король': 7, 'туз': 8
    };

    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return valueOrder[a.value] - valueOrder[b.value];
}

function findCardInHand(hand, cardInput) {
    // Разбиваем ввод на достоинство и масть
    const parts = cardInput.split(' ');
    if (parts.length < 2) return -1;

    // Достоинство - все кроме последнего слова
    const value = parts.slice(0, -1).join(' ').toLowerCase();
    // Масть - последнее слово
    const suit = parts[parts.length - 1].toLowerCase();

    // Нормализуем ввод
    const suitMap = {
        'пики': 'пики', 'пика': 'пики', 'пик': 'пики',
        'черви': 'черви', 'черва': 'черви', 'червей': 'черви',
        'буби': 'буби', 'бубны': 'буби', 'бубен': 'буби',
        'крести': 'крести', 'крестей': 'крести', 'креста': 'крести'
    };

    const valueMap = {
        'в': 'валет', 'валета': 'валет', 'валет': 'валет',
        'д': 'дама', 'дамы': 'дама', 'дама': 'дама',
        'к': 'король', 'короля': 'король', 'король': 'король',
        'т': 'туз', 'туза': 'туз', 'туз': 'туз'
    };

    const normalizedSuit = suitMap[suit] || suit;
    const normalizedValue = valueMap[value] || value;

    for (let i = 0; i < hand.length; i++) {
        const card = hand[i];
        if (card.suit === normalizedSuit && card.value === normalizedValue) {
            return i;
        }
    }

    return -1;
}

function canAttackCard(table, card) {
    if (table.length === 0) return true; // Первый ход - можно любой картой

    // Собираем все достоинства карт на столе
    const tableValues = [];
    for (const item of table) {
        tableValues.push(item.card.value);
        if (item.defendedBy) {
            tableValues.push(item.defendedBy.value);
        }
    }

    // Карта может быть подкинута, если её достоинство уже есть на столе
    return tableValues.includes(card.value);
}

function canDefendCard(attackCard, defenseCard, trump) {
    // Если защищаемся той же мастью - должна быть старше
    if (attackCard.suit === defenseCard.suit) {
        const values = ['6', '7', '8', '9', '10', 'валет', 'дама', 'король', 'туз'];
        return values.indexOf(defenseCard.value) > values.indexOf(attackCard.value);
    }

    // Если защищаемся козырем, а атакующая карта не козырь
    if (defenseCard.suit === trump && attackCard.suit !== trump) {
        return true;
    }

    return false;
}

function refillHand(hand, deck) {
    while (hand.length < 6 && deck.length > 0) {
        hand.push(drawCard(deck));
    }
    hand.sort(sortCards);
}

async function botTurnFool(bot, state, playerName) {
    const game = state.activeGames?.[playerName];
    if (!game || game.type !== 'fool') return;

    await sleep(1500);

    if (game.state === 'attack') {
        // Проверяем, все ли карты на столе отбиты
        const allDefended = game.table.every(item => item.defendedBy !== null);

        if (allDefended && game.table.length > 0) {
            // Бот может подкинуть карты
            await botAddCards(bot, state, playerName);
            return;
        }

        // Бот атакует
        if (game.botHand.length === 0) {
            bot.chat(`/cc &b${playerName}&f, у боᴛᴀ зᴀᴋончилиᴄь ᴋᴀрᴛы! ʙы проигрᴀли!`);
            saveGameStats(state, playerName, 'fool', false);
            delete state.activeGames[playerName];
            return;
        }

        // Выбираем карту для атаки
        const attackCard = game.botHand.pop();
        game.table.push({ card: attackCard, owner: 'bot', defendedBy: null });
        game.state = 'defend';
        game.turn = 'player';
        game.attacker = 'bot';

        bot.chat(`/cc &fбоᴛ ᴀᴛᴀᴋуᴇᴛ ᴋᴀᴩᴛой: ${formatRussianCard(attackCard)}`);
        await sleep(1500);
        bot.chat(`/cc &b${playerName}&f, зᴀщищᴀйᴛᴇᴄь: #зᴀщиᴛᴀ [ʙᴀɯᴀ_ᴋᴀрᴛᴀ] иᴧи #ʙзяᴛьᴋᴀрᴛы`);
    } else if (game.state === 'defend') {
        // Бот защищается
        const unattackedCard = game.table.find(item => !item.defendedBy);
        if (!unattackedCard) {
            // Все карты отбиты, бот может подкинуть
            await botAddCards(bot, state, playerName);
            return;
        }

        const attackCard = unattackedCard.card;
        let defenseCard = null;
        let cardIndex = -1;

        // Ищем карту для защиты
        for (let i = 0; i < game.botHand.length; i++) {
            if (canDefendCard(attackCard, game.botHand[i], game.trump)) {
                defenseCard = game.botHand[i];
                cardIndex = i;
                break;
            }
        }

        if (defenseCard) {
            // Бот может отбиться
            game.botHand.splice(cardIndex, 1);
            unattackedCard.defendedBy = defenseCard;

            bot.chat(`/cc &fбоᴛ оᴛбилᴄя ᴋᴀрᴛой: ${formatRussianCard(defenseCard)}`);

            // Проверяем, все ли карты отбиты
            const allDefended = game.table.every(item => item.defendedBy !== null);
            if (allDefended) {
                await sleep(1000);
                bot.chat(`/cc &fʙᴄᴇ ᴋᴀрᴛы оᴛбиᴛы! боᴛ рᴇɯᴀᴇᴛ, ᴨодᴋинуᴛь ᴇщᴇ иᴧи ᴄᴋᴀзᴀᴛь "биᴛо"...`);
                await sleep(2000);

                // Бот решает подкинуть еще или сказать "бито"
                const shouldAddCards = Math.random() > 0.5 && game.botHand.length > 0;

                if (shouldAddCards) {
                    await botAddCards(bot, state, playerName);
                } else {
                    bot.chat(`/cc боᴛ гоʙориᴛ: биᴛо!`);
                    await sleep(1500);

                    // Убираем карты в отбой
                    const discardedCount = game.table.length;
                    game.table = [];
                    game.state = 'attack';
                    game.turn = 'player';
                    game.attacker = 'player';

                    // Добираем карты
                    refillHand(game.playerHand, game.deck);
                    refillHand(game.botHand, game.deck);

                    bot.chat(`/cc &f${discardedCount} ᴋᴀрᴛ уɯло ʙ оᴛбой.`);
                    await sleep(1000);
                    const playerCards = formatRussianCards(game.playerHand);
                    bot.chat(`/cc &b${playerName}&f, ʙᴀɯ ход! ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
                }
            } else {
                bot.chat(`/cc &b${playerName}&f, зᴀщищᴀйᴛᴇᴄь оᴛ ᴄлᴇдующᴇй ᴋᴀрᴛы!`);
            }
        } else {
            // Бот не может отбиться - берет карты
            game.botHand.push(...game.table.map(item => item.card));
            if (game.table.some(item => item.defendedBy)) {
                game.botHand.push(...game.table.map(item => item.defendedBy).filter(card => card));
            }
            game.table = [];
            game.state = 'attack';
            game.turn = 'player';
            game.attacker = 'player';
            game.botHand.sort(sortCards);

            bot.chat(`/cc &fбоᴛ нᴇ ʍожᴇᴛ оᴛбиᴛьᴄя и зᴀбирᴀᴇᴛ ʙᴄᴇ ᴋᴀрᴛы ᴄо ᴄᴛолᴀ!`);
            await sleep(1000);
            const playerCards = formatRussianCards(game.playerHand);
            bot.chat(`/cc &b${playerName}&f, ʙᴀɯ ход! ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
        }
    }
}

// Функция для подкидывания карт ботом
async function botAddCards(bot, state, playerName) {
    const game = state.activeGames?.[playerName];
    if (!game) return;

    // Бот может подкинуть карты того же достоинства, что уже на столе
    const tableValues = [...new Set(game.table.map(item =>
    item.defendedBy ? [item.card.value, item.defendedBy.value] : [item.card.value]
    ).flat())];

    let addedCards = false;

    for (const value of tableValues) {
        // Ищем карты такого же достоинства у бота
        for (let i = 0; i < game.botHand.length; i++) {
            if (game.botHand[i].value === value) {
                const card = game.botHand.splice(i, 1)[0];
                game.table.push({ card, owner: 'bot', defendedBy: null });
                bot.chat(`/cc боᴛ подᴋидыʙᴀᴇᴛ: ${formatRussianCard(card)}`);
                addedCards = true;
                await sleep(1500);
                break;
            }
        }

        // Максимум 6 карт на столе
        if (game.table.length >= 6) break;
    }

    if (addedCards) {
        bot.chat(`/cc &b${playerName}&f, зᴀщищᴀйᴛᴇᴄь оᴛ ноʙых кᴀрᴛ!`);
    } else {
        bot.chat(`/cc &fбоᴛ гоʙориᴛ: биᴛо! нᴇчᴇʍ подᴋидыʙᴀᴛь.`);

        // Убираем карты в отбой
        const discardedCount = game.table.length;
        game.table = [];
        game.state = 'attack';
        game.turn = 'player';
        game.attacker = 'player';

        // Добираем карты
        refillHand(game.playerHand, game.deck);
        refillHand(game.botHand, game.deck);

        bot.chat(`/cc &f${discardedCount} ᴋᴀрᴛ уɯло ʙ оᴛбой.`);
        await sleep(1000);
        const playerCards = formatRussianCards(game.playerHand);
        bot.chat(`/cc &b${playerName}&f, ʙᴀɯ ход! ʙᴀɯи ᴋᴀрᴛы: ${playerCards}`);
    }
}

function checkFoolGameEnd(bot, state, playerName) {
    const game = state.activeGames?.[playerName];
    if (!game || game.type !== 'fool') return;

    if (game.playerHand.length === 0 && game.deck.length === 0) {
        bot.chat(`/cc &b${playerName}&f, поздрᴀʙᴧяᴇʍ! ʙы ʙыигрᴀли ʙ дурᴀᴋᴀ!`);
        saveGameStats(state, playerName, 'fool', true);
        delete state.activeGames[playerName];
    } else if (game.botHand.length === 0 && game.deck.length === 0) {
        bot.chat(`/cc &b${playerName}&f, ʙы проигрᴀᴧи! боᴛ побᴇждᴀᴇᴛ!`);
        saveGameStats(state, playerName, 'fool', false);
        delete state.activeGames[playerName];
    }
}

function saveGameStats(state, playerName, gameType, playerWon) {
    if (!state.clanData.games) state.clanData.games = {};
    if (!state.clanData.games[gameType]) state.clanData.games[gameType] = {};
    if (!state.clanData.games[gameType][playerName]) {
        state.clanData.games[gameType][playerName] = { wins: 0, losses: 0 };
    }

    const playerStats = state.clanData.games[gameType][playerName];

    if (playerWon) {
        playerStats.wins = (playerStats.wins || 0) + 1;
    } else {
        playerStats.losses = (playerStats.losses || 0) + 1;
    }

    saveData(state.clanData, state.config.dataFile);
}

module.exports = cardGames;
