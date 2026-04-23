// commands/loader.js
const fs = require('fs');
const path = require('path');

class CommandLoader {
    constructor() {
        this.cache = new Map(); // кэш загруженных модулей
        this.loadedModules = new Set(); // имена загруженных модулей
    }

    /**
     * Загружает модуль команд по имени (без расширения)
     * @param {string} moduleName - имя файла (например, 'admin', 'games')
     * @returns {Promise<Object>} - объект с командами из модуля
     */
    async load(moduleName) {
        if (this.cache.has(moduleName)) {
            return this.cache.get(moduleName);
        }

        try {
            const modulePath = path.join(__dirname, `${moduleName}.js`);
            if (!fs.existsSync(modulePath)) {
                console.error(`[LOADER] Модуль ${moduleName} не найден`);
                return null;
            }

            const commandsModule = require(modulePath);
            this.cache.set(moduleName, commandsModule);
            this.loadedModules.add(moduleName);
            console.log(`[LOADER] Загружен модуль: ${moduleName}`);
            return commandsModule;
        } catch (error) {
            console.error(`[LOADER] Ошибка загрузки модуля ${moduleName}:`, error.message);
            return null;
        }
    }

    /**
     * Предзагружает критически важные модули (например, админские)
     * @param {string[]} moduleNames - список имён модулей
     */
    preload(moduleNames) {
        moduleNames.forEach(name => this.load(name));
    }

    /**
     * Возвращает статистику загрузки
     */
    getStats() {
        return {
            loaded: Array.from(this.loadedModules),
            cached: this.cache.size,
            memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
        };
    }
     }

     module.exports = new CommandLoader();
