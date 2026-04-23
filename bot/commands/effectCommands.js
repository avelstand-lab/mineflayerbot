// effectCommands.js
const { getEffectId } = require('./effectDictionary');
const { ADMINS } = require('../../config');
const { sleep } = require('../../utils')

const effectCommands = {
    // ========== ВЫДАЧА ЭФФЕКТА ==========
    '^#эффект (.+)$': {
        execute: async (bot, state, sender, match) => {
	
            const fullArgs = match[1].trim().split(/\s+/);
            if (fullArgs.length === 0) return;

            const effectName = fullArgs[0];
            let target = sender;      // по умолчанию себе
            let duration = 30;         // по умолчанию 30 сек
            let level = 1;             // по умолчанию 1 уровень

            // Определяем, есть ли ник (второй аргумент, если есть и не число)
            let index = 1;
            if (fullArgs.length > index) {
                // Проверяем, является ли второй аргумент числом (временем)
                if (/^\d+$/.test(fullArgs[index])) {
                    // Это время
                    duration = parseInt(fullArgs[index]);
                    index++;
                    if (fullArgs.length > index && /^\d+$/.test(fullArgs[index])) {
                        level = parseInt(fullArgs[index]);
                        index++;
                    }
                } else {
                    // Это ник
                    target = fullArgs[index];
                    index++;
                    if (fullArgs.length > index && /^\d+$/.test(fullArgs[index])) {
                        duration = parseInt(fullArgs[index]);
                        index++;
                        if (fullArgs.length > index && /^\d+$/.test(fullArgs[index])) {
                            level = parseInt(fullArgs[index]);
                            index++;
                        }
                    }
                }
            }

            // Проверка уровня
            if (level < 1 || level > 5) {
                bot.chat('/cc &cУровень эффекта должен быть от 1 до 5.');
                return;
            }

            // Проверка прав: если цель не sender, то нужны права админа
            const isAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase()) ||
            (state.tempAdmins && state.tempAdmins.includes(sender));
            if (target !== sender && !isAdmin) {
                bot.chat(`/cc &c${sender}&f, вы можете выдавать эффекты только себе.`);
                return;
            }

            const effectId = getEffectId(effectName);
            if (!effectId) {
                bot.chat(`/cc &cЭффект "${effectName}" не найден.`);
                return;
            }

            // Корректировка уровня из-за бага сервера: отправляем level-1
            const commandLevel = level - 1;
            bot.chat(`/effect give ${target} ${effectId} ${duration} ${commandLevel}`);
            await sleep(1500);
            if (target === sender) {
                bot.chat(`/cc &a${sender}&f, вы получили эффект &a${effectName}&f на &a${duration}&f сек ${level} уровня.`);
            } else {
                bot.chat(`/cc &a${sender}&f выдал эффект &a${effectName}&f игроку &a${target}&f на &a${duration}&f сек ${level} уровня.`);
            }
            console.log(`>>> [${state.config.username}] EFFECT: ${sender} -> ${target}: ${effectName} lv${level} ${duration}s`);
        }
    },

    // ========== СНЯТИЕ ЭФФЕКТА ==========
    '^#эффект убрать (.+)$': {
        execute: async (bot, state, sender, match) => {
            const args = match[1].trim().split(/\s+/);
            if (args.length === 0) return;

            const target = args[0];
            const effectName = args.length > 1 ? args[1] : null;

            // Проверка прав: снимать эффекты с других могут только админы
            const isAdmin = ADMINS.some(a => a.toLowerCase() === sender.toLowerCase()) ||
            (state.tempAdmins && state.tempAdmins.includes(sender));
            if (target !== sender && !isAdmin) {
                bot.chat(`/cc &c${sender}&f, вы можете снимать эффекты только с себя.`);
                return;
            }

            if (effectName) {
                const effectId = getEffectId(effectName);
                if (!effectId) {
                    bot.chat(`/cc &cЭффект "${effectName}" не найден.`);
                    return;
                }
                bot.chat(`/effect clear ${target} ${effectId}`);
                bot.chat(`/cc &a${sender}&f снял эффект &a${effectName}&f с игрока &a${target}&f.`);
            } else {
                bot.chat(`/effect clear ${target}`);
                bot.chat(`/cc &a${sender}&f снял &aвсе&f эффекты с игрока &a${target}&f.`);
            }
        }
    },
    '^#эффект$': {
        execute: async (bot, state, sender) => {
            bot.chat('/cc &fСправка по эффектам: Выдать себе эффект - #эффект (название эффекта) (время) (уровень, макс 5); Убрать эффект - #эффект (название эффекта)');
        }
    }
};

module.exports = effectCommands;
