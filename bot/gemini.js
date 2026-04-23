// bot/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

class GeminiAI {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Быстрая модель
        this.chat = this.model.startChat(); // Для поддержания истории диалога (опционально)
    }

    async ask(question, playerContext = {}) {
        // Можно добавить контекст, например: "Игрок {playerName} на сервере S7 спрашивает: ..."
        const fullPrompt = `Ответь кратко и по-русски, как помощник в Minecraft: ${question}`;
        try {
            const result = await this.chat.sendMessage(fullPrompt);
            return result.response.text();
        } catch (error) {
            console.error(">>> [GEMINI ERROR]:", error);
            return "Ой, ИИ-мозг временно отключился...";
        }
    }
}
module.exports = GeminiAI;
