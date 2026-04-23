const readline = require('readline');

class ConsoleInput {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'BOT> '
        });

        this.bots = new Map(); // Храним ботов по имени
        this.currentBot = null;
        this.currentBotName = null;
    }

    addBot(bot, botName) {
        this.bots.set(botName, bot);
        console.log(`>>> [CONSOLE] Добавлен бот: ${botName}`);

        if (!this.currentBot) {
            this.currentBot = bot;
            this.currentBotName = botName;
            console.log(`>>> [CONSOLE] Текущий бот: ${botName}`);
        }
    }

    removeBot(botName) {
        this.bots.delete(botName);
        console.log(`>>> [CONSOLE] Удален бот: ${botName}`);

        if (this.currentBotName === botName) {
            const firstBot = this.bots.keys().next().value;
            if (firstBot) {
                this.currentBot = this.bots.get(firstBot);
                this.currentBotName = firstBot;
                console.log(`>>> [CONSOLE] Новый текущий бот: ${firstBot}`);
            } else {
                this.currentBot = null;
                this.currentBotName = null;
                console.log(`>>> [CONSOLE] Нет активных ботов`);
            }
        }
    }

    start() {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     КОНСОЛЬНОЕ УПРАВЛЕНИЕ БОТАМИ     ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('Доступные команды:');
        console.log('  .say [сообщение] - отправить сообщение');
        console.log('  .chat [команда] - отправить команду');
        console.log('  .cc [сообщение] - отправить в клан-чат');
        console.log('  .switch [имя_бота] - переключиться на бота');
        console.log('  .bots - список ботов');
        console.log('  .status - статус текущего бота');
        console.log('  .quit - отключить текущего бота');
        console.log('  .help - помощь');
        console.log('  .exit - выйти из консоли\n');

        // Проверяем, не закрыт ли уже readline
        if (this.rl.closed) {
            console.log('>>> [CONSOLE] Пересоздаю readline...');
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                prompt: 'BOT> '
            });
        }

        this.rl.prompt();

        this.rl.on('line', (line) => {
            const input = line.trim();

            if (input === '.exit') {
                console.log('>>> [CONSOLE] Выход из консоли...');
                this.rl.close();
                return;
            }

            if (input === '') {
                this.rl.prompt();
                return;
            }

            this.handleCommand(input);
            this.rl.prompt();
        }).on('close', () => {
            console.log('>>> [CONSOLE] Консоль закрыта');
            process.exit(0);
        });
    }

    handleCommand(input) {
        if (!this.currentBot) {
            console.log('>>> [CONSOLE] Нет активного бота!');
            return;
        }

        if (input.startsWith('.say ')) {
            const message = input.substring(5);
            this.currentBot.chat(message);
            console.log(`>>> [CONSOLE/${this.currentBotName}] Отправлено: ${message}`);
        }
        else if (input.startsWith('.chat ')) {
            const command = input.substring(6);
            this.currentBot.chat(command);
            console.log(`>>> [CONSOLE/${this.currentBotName}] Команда: ${command}`);
        }
        else if (input.startsWith('.cc ')) {
            const message = input.substring(4);
            this.currentBot.chat(`/cc ${message}`);
            console.log(`>>> [CONSOLE/${this.currentBotName}] Клан-чат: ${message}`);
        }
        else if (input.startsWith('.switch ')) {
            const botName = input.substring(8);
            this.switchBot(botName);
        }
        else if (input === '.bots') {
            this.listBots();
        }
        else if (input === '.status') {
            this.showStatus();
        }
        else if (input === '.quit') {
            this.quitCurrentBot();
        }
        else if (input === '.help') {
            this.showHelp();
        }
        else if (input.startsWith('.')) {
            console.log('>>> [CONSOLE] Неизвестная команда. Напишите .help для списка команд');
        }
        else {
            this.currentBot.chat(input);
            console.log(`>>> [CONSOLE/${this.currentBotName}] Отправлено: ${input}`);
        }
    }

    switchBot(botName) {
        const bot = this.bots.get(botName);
        if (bot) {
            this.currentBot = bot;
            this.currentBotName = botName;
            console.log(`>>> [CONSOLE] Переключился на бота: ${botName}`);
            this.showStatus();
        } else {
            console.log(`>>> [CONSOLE] Бот ${botName} не найден!`);
            console.log(`>>> [CONSOLE] Доступные боты: ${Array.from(this.bots.keys()).join(', ')}`);
        }
    }

    listBots() {
        if (this.bots.size === 0) {
            console.log('>>> [CONSOLE] Нет активных ботов');
            return;
        }

        console.log('>>> [CONSOLE] Список ботов:');
        for (const [name, bot] of this.bots) {
            const status = bot.entity ? 'В игре' : 'Отключен';
            console.log(`  ${name} - ${status} ${name === this.currentBotName ? '(ТЕКУЩИЙ)' : ''}`);
        }
        console.log(`>>> [CONSOLE] Всего ботов: ${this.bots.size}`);
    }

    showStatus() {
        if (!this.currentBot) {
            console.log('>>> [CONSOLE] Нет текущего бота');
            return;
        }

        console.log(`>>> [CONSOLE] Текущий бот: ${this.currentBotName}`);
        console.log(`>>> [CONSOLE] Статус: ${this.currentBot.entity ? 'В игре' : 'Отключен'}`);

        if (this.currentBot.entity) {
            const pos = this.currentBot.entity.position;
            console.log(`>>> [CONSOLE] Позиция: X: ${pos.x.toFixed(1)} Y: ${pos.y.toFixed(1)} Z: ${pos.z.toFixed(1)}`);
            console.log(`>>> [CONSOLE] Здоровье: ${this.currentBot.health || '?'} ❤`);
            console.log(`>>> [CONSOLE] Голод: ${this.currentBot.food || '?'} 🍖`);
        }
    }

    quitCurrentBot() {
        if (!this.currentBot) {
            console.log('>>> [CONSOLE] Нет текущего бота');
            return;
        }

        console.log(`>>> [CONSOLE] Отключаю бота ${this.currentBotName}...`);
        this.currentBot.quit();
        this.removeBot(this.currentBotName);
    }

    showHelp() {
        console.log('\n>>> [CONSOLE] Команды:');
        console.log('  .say [сообщение]        - отправить сообщение в чат');
        console.log('  .chat [команда]         - отправить команду (с /)');
        console.log('  .cc [сообщение]         - отправить в клан-чат');
        console.log('  .switch [имя]          - переключиться на другого бота');
        console.log('  .bots                   - список всех ботов');
        console.log('  .status                 - статус текущего бота');
        console.log('  .quit                   - отключить текущего бота');
        console.log('  .help                   - показать эту справку');
        console.log('  .exit                   - выйти из консоли');
        console.log('\n>>> [CONSOLE] Примеры:');
        console.log('  .say Привет всем!');
        console.log('  .chat /warp ch');
        console.log('  .cc Тестовое сообщение');
        console.log('  .switch bot2');
        console.log('  say Просто текст (без точки тоже работает)');
        console.log('');
    }
}

const consoleInput = new ConsoleInput();

module.exports = consoleInput;
