// debounceMap.js
class DebounceMap {
    constructor(defaultDelay = 3000) {
        this.map = new Map();          // Здесь будем хранить таймеры для каждого ключа
        this.defaultDelay = defaultDelay;
    }

    /**
     * Запускает функцию fn с дебаунсом по ключу key
     * @param {string} key - уникальный идентификатор (например, ник игрока)
     * @param {Function} fn - функция, которую нужно выполнить после дебаунса
     * @param {number} delay - задержка в мс (если не указана, используется defaultDelay)
     */
    debounce(key, fn, delay = this.defaultDelay) {
        // Если для этого ключа уже есть таймер — убиваем его
        if (this.map.has(key)) {
            clearTimeout(this.map.get(key));
        }

        // Создаём новый таймер
        const timer = setTimeout(() => {
            // Выполняем функцию
            fn();
            // Удаляем ключ из мапы после выполнения
            this.map.delete(key);
        }, delay);

        // Сохраняем таймер в мапу
        this.map.set(key, timer);
    }

    /**
     * Очистить дебаунс для конкретного ключа (отменить запланированное выполнение)
     */
    cancel(key) {
        if (this.map.has(key)) {
            clearTimeout(this.map.get(key));
            this.map.delete(key);
        }
    }

    /**
     * Очистить всё (например, при перезагрузке)
     */
    clearAll() {
        this.map.forEach((timer) => clearTimeout(timer));
        this.map.clear();
    }
}

module.exports = DebounceMap;
