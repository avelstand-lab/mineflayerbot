// bot/commands/aiCommands.js
const aiModule = require('./ai');

const aiCommands = {
    '^#ии (.+)': {
        execute: async (bot, state, sender, match) => {
            const question = match[1]; // Берём текст после #ии

            // Сообщение о том, что запрос обрабатывается
            bot.chat(`/cc ${sender}, ИИ думает...`);

            // Отправляем вопрос в модуль ai.js
            const answer = await aiModule.ask(question, sender);

            // ОБЯЗАТЕЛЬНО обрезаем ответ для чата Minecraft (макс. ~256 символов)
            const MAX_LENGTH = 220; // Оставляем место для префикса
            let finalAnswer = answer.trim();
            if (finalAnswer.length > MAX_LENGTH) {
                finalAnswer = finalAnswer.substring(0, MAX_LENGTH - 3) + '...';
            }

            // Отправляем ответ в клан-чат
            bot.chat(`/cc ${sender}, ${finalAnswer}`);
        }
    }
};

module.exports = aiCommands;
