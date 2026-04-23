require('dotenv').config();
const OpenAI = require('openai');

class DeepSeekAI {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('>>> [AI] ОШИБКА: Не найден DEEPSEEK_API_KEY в .env файле!');
            this.client = null;
        } else {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.deepseek.com'
            });
            console.log('>>> [AI] Модуль DeepSeek инициализирован.');
        }
    }

    async ask(question, playerName = 'Игрок') {
        if (!this.client) return 'ИИ-модуль отключён.';
        try {
            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [{
                    role: 'user',
                    content: `Ты помощник в Minecraft. Игрок ${playerName} спрашивает: "${question}". Ответь кратко и по-русски.`
                }],
                max_tokens: 150,
            });
            return response.choices[0].message.content;
        } catch (error) {
            console.error('>>> [AI] Ошибка запроса:', error.message);
            return 'Ошибка ИИ. Попробуй позже.';
        }
    }
}
module.exports = new DeepSeekAI();
