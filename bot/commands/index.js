// commands/index.js
const { checkSpam } = require('../../utils');
const { ADMINS } = require('../../config'); // путь исправлен, т.к. index.js внутри папки commands
const loader = require('./loader');
const { levenshtein } = require('../../utils');

class CommandHandler {
    constructor() {
        this.commands = new Map(); // key: regex, value: { moduleName, commandKey }
        this.commandNames = [];
        this.registerAllCommands();
        // Предзагружаем админские команды, так как они нужны сразу
        loader.preload(['admin']);
    }

    registerAllCommands() {
        // Описываем все команды без загрузки модулей
        // Формат: [regexString] = { moduleName, commandKey }
        const commandRegistry = {
            // Админские команды (модуль admin)
            '^#админ$': { moduleName: 'admin', commandKey: '^#админ$' },
            '^#админ2$': { moduleName: 'admin', commandKey: '^#админ2$' },
            '^#админ3$': { moduleName: 'admin', commandKey: '^#админ3$' },
            '#мут (.+?) (\\d+[smhd]) (.+)': { moduleName: 'admin', commandKey: '#мут (.+?) (\\d+[smhd]) (.+)' },
            '#размут (.+)': { moduleName: 'admin', commandKey: '#размут (.+)' },
            '#муты': { moduleName: 'admin', commandKey: '#муты' },
            '#муты(\\d+)': { moduleName: 'admin', commandKey: '#муты(\\d+)' },
            '#бан (.+?) (\\d+[smhd]) (.+)': { moduleName: 'admin', commandKey: '#бан (.+?) (\\d+[smhd]) (.+)' },
            '#разбан (.+)': { moduleName: 'admin', commandKey: '#разбан (.+)' },
            '#чс лист(?: (\\d+))?': { moduleName: 'admin', commandKey: '#чс лист(?: (\\d+))?' },
            '#чс (.+?) (.+)': { moduleName: 'admin', commandKey: '#чс (.+?) (.+)' },
            '#анчс (.+)': { moduleName: 'admin', commandKey: '#анчс (.+)' },
            '#кик (.+?) (.+)': { moduleName: 'admin', commandKey: '#кик (.+?) (.+)' },
            '#наказания (.+)': { moduleName: 'admin', commandKey: '#наказания (.+)' },
            '#наказания(\\d+)(.+)': { moduleName: 'admin', commandKey: '#наказания(\\d+)(.+)' },
            '#очистка': { moduleName: 'admin', commandKey: '#очистка' },
            '#invite (.+)': { moduleName: 'admin', commandKey: '#invite (.+)' },
            '#реконнект': { moduleName: 'admin', commandKey: '#реконнект' },
            '#автоинвайт (вкл|выкл)': { moduleName: 'admin', commandKey: '#автоинвайт (вкл|выкл)' },
            '#чат (.+)': { moduleName: 'admin', commandKey: '#чат (.+)' },
            '^#админстат$': { moduleName: 'admin', commandKey: '^#админстат$' },
            '#вечныйадмин (.+)': { moduleName: 'admin', commandKey: '#вечныйадмин (.+)'},
            '#вечныйадмин убрать (.+)': { moduleName: 'admin', commandKey: '#вечныйадмин убрать (.+)'},
            '^#вечныйадмин список$': { moduleName: 'admin', commandKey: '^#вечныйадмин список$'},
            '#датьадмина (.+)': { moduleName: 'admin', commandKey: '#датьадмина (.+)' },
            '#убратьадмина (.+)': { moduleName: 'admin', commandKey: '#убратьадмина (.+)' },
            '#дк (#[^ ]+) все': { moduleName: 'admin', commandKey: '#дк (#[^ ]+) все' },
            '#дк (#[^ ]+) убрать все': { moduleName: 'admin', commandKey: '#дк (#[^ ]+) убрать все' },
            '#дк (#[^ ]+) ([^ ]+)': { moduleName: 'admin', commandKey: '#дк (#[^ ]+) ([^ ]+)' },
            '#дк (#[^ ]+) убрать ([^ ]+)': { moduleName: 'admin', commandKey: '#дк (#[^ ]+) убрать ([^ ]+)' },

            // Игровые команды (модуль games)
            '#кнб (камень|ножницы|бумага)': { moduleName: 'games', commandKey: '#кнб (камень|ножницы|бумага)' },
            '^#города$': { moduleName: 'games', commandKey: '^#города$' },
            '^#города создать$': { moduleName: 'games', commandKey: '^#города создать$' },
            '^#города присоединиться (.+)$': { moduleName: 'games', commandKey: '^#города присоединиться (.+)$' },
            '^#города (.+)$': { moduleName: 'games', commandKey: '^#города (.+)$' },
            '^#города стоп$': { moduleName: 'games', commandKey: '^#города стоп$' },
            '#stop': { moduleName: 'games', commandKey: '#stop' },
            '^#статгорода$': { moduleName: 'games', commandKey: '^#статгорода$' },
            '#инфа(?: (.+))?': { moduleName: 'games', commandKey: '#инфа(?: (.+))?' },
            '^#игры$': { moduleName: 'games', commandKey: '^#игры$' },
            '^#игры2$': { moduleName: 'games', commandKey: '^#игры2$' },
            '^#игры3$': { moduleName: 'games', commandKey: '^#игры3$' },
            '#слоты': { moduleName: 'games', commandKey: '#слоты' },
            '#кости(?: (\\d+))?(?:\\s*-\\s*(\\d+))?': { moduleName: 'games', commandKey: '#кости(?: (\\d+))?(?:\\s*-\\s*(\\d+))?' },

            // Fun команды (модуль fun)
            '#поцеловать(?: (.+))?': { moduleName: 'fun', commandKey: '#поцеловать(?: (.+))?' },
            '#трахнуть(?: (.+))?': { moduleName: 'fun', commandKey: '#трахнуть(?: (.+))?' },
            '#обнять(?: (.+))?': { moduleName: 'fun', commandKey: '#обнять(?: (.+))?' },
            '#уебать(?: (.+))?': { moduleName: 'fun', commandKey: '#уебать(?: (.+))?' },
            '#рп': { moduleName: 'fun', commandKey: '#рп' },

            // Clan команды (модуль clan)
            '#статус(?: (.+))?': { moduleName: 'clan', commandKey: '#статус(?: (.+))?' },
            '#погода(?: (.+))?': { moduleName: 'clan', commandKey: '#погода(?: (.+))?' },
            '#активность(?: (.+))?': { moduleName: 'clan', commandKey: '#активность(?: (.+))?' },
            '#флай': { moduleName: 'clan', commandKey: '#флай' },
            '#gm0': { moduleName: 'clan', commandKey: '#gm0' },
            '#pvp': { moduleName: 'clan', commandKey: '#pvp'},
            '#клан': { moduleName: 'clan', commandKey: '#клан' },
            '#деньги ([\\d.]+)': { moduleName: 'clan', commandKey: '#деньги ([\\d.]+)' },
            '#help2': { moduleName: 'clan', commandKey: '#help2' },
            '#help(?: (.*))?': { moduleName: 'clan', commandKey: '#help(?: (.*))?' }, // <- универсальная

            // Cards команды (модуль cards)
            '#блэкджек(?: (\\d+))?': { moduleName: 'cards', commandKey: '#блэкджек(?: (\\d+))?' },
            '#взятькарты': { moduleName: 'cards', commandKey: '#взятькарты' },
            '#остаться': { moduleName: 'cards', commandKey: '#остаться' },
            '#дурак': { moduleName: 'cards', commandKey: '#дурак' },
            '#атака (.+)': { moduleName: 'cards', commandKey: '#атака (.+)' },
            '#защита (.+)': { moduleName: 'cards', commandKey: '#защита (.+)' },
            '#подкинуть (.+)': { moduleName: 'cards', commandKey: '#подкинуть (.+)' },
            '#бито': { moduleName: 'cards', commandKey: '#бито' },
            '#карты': { moduleName: 'cards', commandKey: '#карты' },
            '#сдаться': { moduleName: 'cards', commandKey: '#сдаться' },
            '#сброс': { moduleName: 'cards', commandKey: '#сброс' },
            '#рулетка (красное|черное|зеленое)(?: (\\d+))?': { moduleName: 'cards', commandKey: '#рулетка (красное|черное|зеленое)(?: (\\d+))?' },
            '#монетка (орел|решка)(?: (\\d+))?': { moduleName: 'cards', commandKey: '#монетка (орел|решка)(?: (\\d+))?' },
            '#лотерея(?: (\\d+))?': { moduleName: 'cards', commandKey: '#лотерея(?: (\\d+))?' },
            '#статистика': { moduleName: 'cards', commandKey: '#статистика' },
            '#угадайчисло (\\d+)-(\\d+)': { moduleName: 'cards', commandKey: '#угадайчисло (\\d+)-(\\d+)' },
            '#число (\\d+)': { moduleName: 'cards', commandKey: '#число (\\d+)' },
            '#виселица': { moduleName: 'cards', commandKey: '#виселица' },
            '#буква (.+)': { moduleName: 'cards', commandKey: '#буква (.+)' },
            '#шар8 (.+)': { moduleName: 'cards', commandKey: '#шар8 (.+)' },
            '#орёлрешка': { moduleName: 'cards', commandKey: '#орёлрешка' },
            '#судьба': { moduleName: 'cards', commandKey: '#судьба' },
            '#игровойтоп': { moduleName: 'cards', commandKey: '#игровойтоп' },

            // Levels команды (модуль levels)
            '#лвл(?: (.+))?': { moduleName: 'levels', commandKey: '#лвл(?: (.+))?' },
            '#топ': { moduleName: 'levels', commandKey: '#топ' },
            '#xp (\\d+) (.+)': { moduleName: 'levels', commandKey: '#xp (\\d+) (.+)' },

            // AI команды (модуль aiCommands)
            '^#ии (.+)': { moduleName: 'aiCommands', commandKey: '^#ии (.+)' },

            // AntiKDR команды (модуль antiKDRCommands)
            '^#антикдр все$': { moduleName: 'antiKDRCommands', commandKey: '^#антикдр все$' },
            '^#антикдр ([a-zA-Z0-9_.-]+)$': { moduleName: 'antiKDRCommands', commandKey: '^#антикдр ([a-zA-Z0-9_.-]+)$' },
            '^#антикдр кик(?: (\\d+))?$': { moduleName: 'antiKDRCommands', commandKey: '^#антикдр кик(?: (\\d+))?$' },
            '^#антикдр стоп$': { moduleName: 'antiKDRCommands', commandKey: '^#антикдр стоп$' },

            // SeaBattle команды (модуль seaBattle)
            '#мб начать': { moduleName: 'seaBattle', commandKey: '#мб начать' },
            '#мб поставить (.+)': { moduleName: 'seaBattle', commandKey: '#мб поставить (.+)' },
            '#мб готов': { moduleName: 'seaBattle', commandKey: '#мб готов' },
            '#мб стрелять (.+)': { moduleName: 'seaBattle', commandKey: '#мб стрелять (.+)' },
            '#мб поле': { moduleName: 'seaBattle', commandKey: '#мб поле' },
            '#мб сдаться': { moduleName: 'seaBattle', commandKey: '#мб сдаться' },

            // Effect команды (модуль effectCommands)
            '^#эффект (.+)$': { moduleName: 'effectCommands', commandKey: '^#эффект (.+)$' },
            '^#эффект убрать (.+)$': { moduleName: 'effectCommands', commandKey: '^#эффект убрать (.+)$' },
            '^#эффект$': { moduleName: 'effectCommands', commandKey: '^#эффект$' }
        };

        for (const [patternString, meta] of Object.entries(commandRegistry)) {
            // Сохраняем команду в Map
            this.commands.set(new RegExp(patternString, 'i'), meta);

            // Извлекаем имя команды (первое слово с решёткой)
            const cmdName = patternString.match(/^[#@]?\w+/)?.[0];
            if (cmdName && !this.commandNames.includes(cmdName)) {
                this.commandNames.push(cmdName);
                console.log(`[DEBUG] Добавлена команда для автокоррекции: ${cmdName}`);
            }
        }
        console.log(`[DEBUG] Всего команд в автокоррекции: ${this.commandNames.length}`);
    }

    async handleCommand(bot, state, sender, message) {
        console.log(`>>> [${state.config.username} COMMAND] ${sender}: ${message}`);

        message = message.replace(/\s+/g, ' ').trim();

        const senderLower = sender.toLowerCase();
        if (senderLower === state.config.username.toLowerCase()) {
            return;
        }

        const isAdmin =
        ADMINS.some(admin => admin.toLowerCase() === senderLower) || // глобальные из конфига
        (state.clanData?.permanentAdmins && state.clanData.permanentAdmins.some(admin => admin.toLowerCase() === senderLower)) || // вечные из JSON
        (state.tempAdmins && state.tempAdmins.some(admin => admin.toLowerCase() === senderLower)); // временные

        let commandAllowed = false;
        if (!isAdmin) {
            const commandText = message.split(' ')[0];
            // Публичные команды
            if (state.publicCommands && state.publicCommands.has(commandText)) {
                commandAllowed = true;
            }
            // Персональные разрешения
            if (!commandAllowed && state.playerPermissions && state.playerPermissions.has(senderLower)) {
                const perms = state.playerPermissions.get(senderLower);
                if (perms.has(commandText)) {
                    commandAllowed = true;
                }
            }
        }

        // Спам-контроль
        if (!isAdmin && !commandAllowed) {
            const spamCheck = checkSpam(state, sender, isAdmin);
            if (!spamCheck.allowed) {
                bot.chat(`/cc ${sender}, ${spamCheck.message}`);
                return;
            }
        }

        // Блокировка команд во время сбора статистики
        if (state.statsGather && state.statsGather.active) {
            // Разрешаем только команду #антикдр стоп (чтобы можно было прервать сбор)
            if (message.startsWith('#антикдр стоп')) {
                // разрешаем, продолжим обработку
            } else {
                bot.chat(`/cc &b${sender}&f, сейчас идёт сбор статистики. Подождите или используйте #антикдр стоп.`);
                return;
            }
        }

        // Поиск команды по регулярке
        for (const [regex, meta] of this.commands) {
            const match = message.match(regex);
            if (match) {
                // Загружаем модуль, если ещё не загружен
                const moduleObj = await loader.load(meta.moduleName);
                if (!moduleObj) {
                    bot.chat(`/cc Ошибка загрузки модуля команды.`);
                    return;
                }

                // Извлекаем нужную команду из модуля
                const command = moduleObj[meta.commandKey];
                if (!command) {
                    console.error(`[ERROR] Команда ${meta.commandKey} не найдена в модуле ${meta.moduleName}`);
                    bot.chat(`/cc Ошибка выполнения команды.`);
                    return;
                }

                // Проверка админских прав
                if (command.admin && !isAdmin && !commandAllowed) {
                    bot.chat(`/cc &b${sender}&f, у вас нет прав для использования этой команды.`);
                    return;
                }

                try {
                    await command.execute(bot, state, sender, match, isAdmin);
                } catch (error) {
                    console.error(`>>> [${state.config.username} COMMAND ERROR] ${error.message}`);
                    bot.chat(`/cc Ошибка выполнения команды.`);
                }
                return;
            }
        }

        // ========== АВТОКОРРЕКЦИЯ ОПЕЧАТОК ==========
        if (message.startsWith('#')) {
            const inputCmd = message.split(' ')[0];
            if (inputCmd.length >= 3) {
                let bestMatch = null;
                let bestDist = Infinity;
                for (const cmd of this.commandNames) {
                    if (cmd === inputCmd) continue;
                    const dist = levenshtein(inputCmd, cmd);
                    if (dist <= 2 && Math.abs(cmd.length - inputCmd.length) <= 2 && dist < bestDist) {
                        bestDist = dist;
                        bestMatch = cmd;
                    }
                }
                if (bestMatch) {
                    bot.chat(`/cc Команда &c${inputCmd}&f не найдена. Может быть, вы имели в виду &a${bestMatch}&f?`);
                    return;
                }
            }
        }

        // Если команда не найдена, но начинается с # и пользователь не админ
        if (message.startsWith('#') && !isAdmin && !commandAllowed) {
            const adminPatterns = ['#чс', '#анчс', '#реконнект', '#invite', '#кик', '#мут', '#анмут', '#автоинвайт', '#админ', '#чат'];
            for (const pattern of adminPatterns) {
                if (message.startsWith(pattern)) {
                    bot.chat(`/cc &b${sender}&f, у вас нет прав для использования этой команды.`);
                    return;
                }
            }
        }
    }
}

module.exports = CommandHandler;
