// telegram/commands.js
const escapeHtml = require('./utils');
module.exports = function setupCommands() {
    const self = this;
    const { escapeHtml } = require('./utils');
    // Функция разбивки длинных сообщений для Telegram
    function splitTelegramMessage(text, maxLength = 4000) {
        const parts = [];
        while (text.length > maxLength) {
            let splitIndex = text.lastIndexOf('\n', maxLength);
            if (splitIndex === -1) splitIndex = maxLength;
            parts.push(text.substring(0, splitIndex));
            text = text.substring(splitIndex);
        }
        if (text.length > 0) parts.push(text);
        return parts;
    }

    console.log('[TELEGRAM] Настройка команд...');

    // ---------- КОМАНДЫ ----------
    self.bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const isMember = await self.isUserInClanChat(userId);
        if (!isMember) {
            await self.bot.sendMessage(chatId,
                                       '👋 Привет! Чтобы пользоваться ботом, необходимо вступить в наш клановый чат.\n\n' +
                                       'Нажми кнопку ниже, чтобы присоединиться, затем вернись и нажми "Подтвердить".',
                                       {
                                           reply_markup: {
                                               inline_keyboard: [
                                                   [{ text: '📢 Вступить в чат клана', url: 'https://t.me/resmaynclan' }],
                                                   [{ text: '✅ Я вступил(а)', callback_data: 'confirm_join' }]
                                               ]
                                           }
                                       }
            );
            return;
        }

        self.userStates[userId] = { verified: true };
        await self.bot.sendMessage(chatId,
                                   '🏠 <b>Главное меню</b>\n\nВыберите действие:',
                                   { parse_mode: 'HTML', reply_markup: self.keyboards.getMainMenuKeyboard() }
        );
    });

    self.bot.onText(/\/bots/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        if (self.activeBots.length === 0) {
            await self.bot.sendMessage(chatId, 'Нет активных ботов.');
            return;
        }
        let response = '📋 <b>Список ботов:</b>\n';
        self.activeBots.forEach((bot, index) => {
            const status = bot.entity ? '✅ в игре' : '❌ оффлайн';
            response += `${index + 1}. <b>${bot.username}</b> — ${status}\n`;
        });
        await self.bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
    });

    // Админские команды /restart, /say, /cmd
    const adminCommands = ['restart', 'say', 'cmd'];
    adminCommands.forEach(cmd => {
        self.bot.onText(new RegExp(`\\/${cmd}(?: (.+))?`), async (msg, match) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            if (!self.userStates[userId]?.verified) {
                await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
                return;
            }
            if (cmd === 'restart' && match[1]) {
                const botName = match[1];
                const bot = self.activeBots.find(b => b.username === botName);
                if (!bot) {
                    await self.bot.sendMessage(chatId, `❌ Бот <b>${botName}</b> не найден.`, { parse_mode: 'HTML' });
                    return;
                }
                await self.bot.sendMessage(chatId, `🔄 Перезапускаю <b>${botName}</b>...`, { parse_mode: 'HTML' });
                bot.quit();
            } else if (cmd === 'say' && match[1]) {
                const parts = match[1].split(' ');
                const botName = parts[0];
                const message = parts.slice(1).join(' ');
                const bot = self.activeBots.find(b => b.username === botName);
                if (!bot) {
                    await self.bot.sendMessage(chatId, `❌ Бот <b>${botName}</b> не найден.`, { parse_mode: 'HTML' });
                    return;
                }
                bot.chat(message);
                await self.bot.sendMessage(chatId, `✅ Сообщение отправлено от <b>${botName}</b>.`, { parse_mode: 'HTML' });
            } else if (cmd === 'cmd' && match[1]) {
                const parts = match[1].split(' ');
                const botName = parts[0];
                let command = parts.slice(1).join(' ');
                if (!command.startsWith('/')) command = '/' + command;
                const bot = self.activeBots.find(b => b.username === botName);
                if (!bot) {
                    await self.bot.sendMessage(chatId, `❌ Бот <b>${botName}</b> не найден.`, { parse_mode: 'HTML' });
                    return;
                }
                bot.chat(command);
                await self.bot.sendMessage(chatId, `✅ Команда \`${command}\` выполнена от <b>${botName}</b>.`, { parse_mode: 'HTML' });
            }
        });
    });

    self.bot.onText(/\/blacklist/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        const { text, keyboard } = self.dataManager.formatBlacklistPage(1);
        await self.bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    });

    self.bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        await self.bot.sendChatAction(chatId, 'typing');

        const servers = ['s1', 's2'];
        const validData = servers.filter(server => self.clanData[server] && typeof self.clanData[server].place === 'number');

        if (validData.length === 0) {
            await self.bot.sendMessage(chatId,
                                       '📊 <b>Общая статистика</b>\n\n❌ Нет данных о клане!\nИспользуйте /update для запроса данных',
                                       { parse_mode: 'HTML' }
            );
            return;
        }

        let totalPlace = 0, totalKills = 0, totalKDR = 0, totalMembers = 0;
        let bestPlace = Infinity, bestPlaceServer = '', worstPlace = 0, worstPlaceServer = '';
        let maxKills = 0, maxKillsServer = '', maxMembers = 0, maxMembersServer = '';

        validData.forEach(server => {
            const data = self.clanData[server];
            totalPlace += data.place;
            totalKills += data.kills;
            totalKDR += data.kdr;
            totalMembers += data.members;

            if (data.place < bestPlace) {
                bestPlace = data.place;
                bestPlaceServer = server.toUpperCase();
            }
            if (data.place > worstPlace) {
                worstPlace = data.place;
                worstPlaceServer = server.toUpperCase();
            }
            if (data.kills > maxKills) {
                maxKills = data.kills;
                maxKillsServer = server.toUpperCase();
            }
            if (data.members > maxMembers) {
                maxMembers = data.members;
                maxMembersServer = server.toUpperCase();
            }
        });

        const avgPlace = (totalPlace / validData.length).toFixed(1);
        const avgKDR = (totalKDR / validData.length).toFixed(2);

        let message = '📊 <b>ОБЩАЯ СТАТИСТИКА КЛАНА</b>\n\n';
        message += `🔢 <b>Всего серверов:</b> ${validData.length}/4\n`;
        message += `⭐ <b>Среднее место:</b> #${avgPlace}\n`;
        message += `⚔ <b>Всего убийств:</b> ${totalKills.toLocaleString()}\n`;
        message += `👥 <b>Всего участников:</b> ${totalMembers}\n`;
        message += `📈 <b>Средний КДР:</b> ${avgKDR}\n\n`;
        message += '<b>🏆 ЛУЧШИЕ ПОКАЗАТЕЛИ:</b>\n';
        message += `🥇 <b>Лучшее место:</b> #${bestPlace} (${bestPlaceServer})\n`;
        message += `⚔ <b>Макс. убийств:</b> ${maxKills.toLocaleString()} (${maxKillsServer})\n`;
        message += `👥 <b>Макс. участников:</b> ${maxMembers} (${maxMembersServer})\n`;
        if (worstPlace > 0) {
            message += `📉 <b>Худшее место:</b> #${worstPlace} (${worstPlaceServer})\n`;
        }
        message += `\n<i>Данные обновлены: ${new Date(self.lastUpdate[validData[0]] || Date.now()).toLocaleTimeString('ru-RU')}</i>`;

        await self.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    self.bot.onText(/\/clan/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        await self.bot.sendChatAction(chatId, 'typing');

        let message = '🏆 <b>Статистика клана Resmayn</b>\n\n';
        const servers = ['s1', 's2'];
        let hasData = false;

        servers.forEach(server => {
            const data = self.clanData[server];
            message += `📍 <b>${server.toUpperCase()}:</b> `;
            if (data) {
                hasData = true;
                message += `#${data.place}\n`;
                message += `👑 Глава: ${data.leader}\n`;
                message += `⚔ Убийств: ${data.kills}\n`;
                message += `📊 КДР: ${data.kdr}\n`;
                message += `👥 Участников: ${data.members}\n`;
            } else {
                message += '❌ Нет данных\n';
            }
            message += '\n';
        });

        if (!hasData) {
            message += 'Используйте /update для запроса данных';
        }
        await self.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    self.bot.onText(/\/clans/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        await self.bot.sendChatAction(chatId, 'typing');

        let message = '📊 <b>Краткая статистика клана:</b>\n\n';
        const servers = ['s1', 's2'];
        let hasData = false;

        servers.forEach(server => {
            const data = self.clanData[server];
            message += `<b>${server.toUpperCase()}:</b> `;
            if (data) {
                hasData = true;
                message += `#${data.place} | K:${data.kills} | M:${data.members}\n`;
            } else {
                message += 'Нет данных\n';
            }
        });

        if (!hasData) {
            message += '\nИспользуйте /update для запроса данных';
        }
        await self.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    self.bot.onText(/\/update/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        await self.bot.sendMessage(chatId,
                                   '🔄 Запрашиваю данные...\n\nОтправляю команду /c top всем ботам...'
        );
        if (self.sendToBotsCallback) {
            self.sendToBotsCallback('/c top');
        } else {
            await self.bot.sendMessage(chatId, '❌ Ошибка: не могу отправить команду ботам');
        }
    });

    self.bot.onText(/\/servers/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }
        const message = '🌐 <b>Серверы с ботами:</b>\n\n' +
        'S2 - anna201312\n' +
        'S3 - Malgrim\n' +
        'S4 - DopkaBobka\n' +
        'S7 - Ezzka2134q111e\n\n' +
        'Все боты находятся на сервере ru.masedworld.net';
        await self.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    // Команда /top [ник_бота]
    self.bot.onText(/\/top(?: (.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        if (!self.userStates[userId]?.verified) {
            await self.bot.sendMessage(chatId, '❌ Сначала выполните /start и подтвердите вступление в чат.');
            return;
        }

        const botName = match[1];
        if (!botName) {
            if (self.activeBots.length === 0) {
                await self.bot.sendMessage(chatId, 'Нет активных ботов.');
                return;
            }
            const list = self.activeBots.map(b => b.username).join(', ');
            await self.bot.sendMessage(chatId, `📋 <b>Доступные боты:</b>\n${list}\n\nИспользуйте /top ник_бота`, { parse_mode: 'HTML' });
            return;
        }

        const bot = self.activeBots.find(b => b.username.toLowerCase() === botName.toLowerCase());
        if (!bot) {
            await self.bot.sendMessage(chatId, `❌ Бот с ником <b>${botName}</b> не найден.`, { parse_mode: 'HTML' });
            return;
        }

        if (!bot.state) {
            await self.bot.sendMessage(chatId, '❌ У бота нет состояния. Возможно, он ещё не инициализирован.');
            return;
        }

        // Отправляем команду боту
        bot.chat('/c top');

        if (bot.state) {
            bot.state.pendingTopRequest = { chatId, userId };
            bot.state.collectingTop = true;
            bot.state.topLines = [];

            // Таймер на случай, если ответ не придёт (завершаем сбор через 15 секунд)
            if (bot.state.topTimer) clearTimeout(bot.state.topTimer);
            bot.state.topTimer = setTimeout(() => {
                if (bot.state && bot.state.collectingTop) {
                    bot.state.collectingTop = false;
                    if (bot.state.topLines && bot.state.topLines.length > 0) {
                        const fullTop = bot.state.topLines.join('\n');
                        const messages = splitTelegramMessage(fullTop, 4000);
                        for (const part of messages) {
                            self.bot.sendMessage(chatId, part, { parse_mode: 'HTML' })
                            .catch(e => console.error('[TELEGRAM] Ошибка отправки топа:', e.message));
                        }
                    } else {
                        self.bot.sendMessage(chatId, '❌ Не удалось получить топ кланов.', { parse_mode: 'HTML' })
                        .catch(() => {});
                    }
                    delete bot.state.pendingTopRequest;
                    delete bot.state.topTimer;
                }
            }, 15000)
        };
        await self.bot.sendMessage(chatId, `🔄 Запрашиваю топ кланов для бота <b>${botName}</b>...`, { parse_mode: 'HTML' });
    });

    // ---------- ОБРАБОТЧИКИ СООБЩЕНИЙ ----------

    // 1. Обработка входящих сообщений от пользователей в режиме тикета
    self.bot.on('message', async (msg) => {
        // Игнорируем команды и сообщения без текста (кроме фото)
        if (msg.text?.startsWith('/')) return;
        if (!msg.text && !msg.photo) return;

        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const userState = self.userStates[userId];

        // Если пользователь не в режиме тикета – игнорируем
        if (!userState?.ticketMode) return;

        const ticketType = userState.ticketType; // support, idea, complaint, appeal
        if (!ticketType) return;

        // Убираем режим ожидания
        delete userState.ticketMode;
        delete userState.ticketType;

        // Формируем заголовок для администратора
        let title = '';
        switch (ticketType) {
            case 'support': title = '🆘 Обращение в поддержку'; break;
            case 'idea':    title = '💡 Идея для клана'; break;
            case 'complaint': title = '⚠ Жалоба на участника'; break;
            case 'appeal':  title = '⚖ Апелляция на выход из ЧС'; break;
            default: title = '📝 Сообщение';
        }

        const userName = msg.from.username ? `@${msg.from.username}` :
        `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || `ID ${userId}`;

        // Текст для админа (описание)
        let adminText = `${title}\n\n<b>От:</b> ${userName} (ID: ${userId})\n\n`;

        let sentMessage; // для сохранения message_id

        // Если это жалоба с фото
        if (ticketType === 'complaint' && msg.photo) {
            const photo = msg.photo[msg.photo.length - 1]; // самое большое фото
            const caption = msg.caption || 'Без описания';
            adminText += `<b>Описание:</b>\n${caption}\n\n<i>Ответьте на это сообщение, чтобы отправить ответ пользователю.</i>`;

            // Отправляем админу фото с подписью (всем админам из списка)
            for (const adminId of self.adminIds) {
                sentMessage = await self.bot.sendPhoto(adminId, photo.file_id, {
                    caption: adminText,
                    parse_mode: 'HTML'
                });
                // Сохраняем связь: id сообщения -> { userId, ticketType }
                self.ticketMap.set(sentMessage.message_id, { userId, type: ticketType });
            }
        } else {
            // Обычное текстовое сообщение
            adminText += `<b>Сообщение:</b>\n${msg.text}\n\n<i>Ответьте на это сообщение, чтобы отправить ответ пользователю.</i>`;

            for (const adminId of self.adminIds) {
                sentMessage = await self.bot.sendMessage(adminId, adminText, { parse_mode: 'HTML' });
                self.ticketMap.set(sentMessage.message_id, { userId, type: ticketType });
            }
        }

        // Подтверждение пользователю
        let confirmText = '✅ Ваше обращение отправлено администрации. Ожидайте ответа.';
        if (ticketType === 'complaint') confirmText = '✅ Ваша жалоба отправлена администрации. Ожидайте ответа.';
        else if (ticketType === 'idea') confirmText = '✅ Ваша идея отправлена администрации. Спасибо!';
        else if (ticketType === 'appeal') confirmText = '✅ Ваша апелляция отправлена администрации. Ожидайте решения.';

        await self.bot.sendMessage(chatId, confirmText);

        // Возвращаем главное меню
        await self.bot.sendMessage(
            chatId,
            '🏠 <b>Главное меню</b>\n\nВыберите действие:',
            { parse_mode: 'HTML', reply_markup: self.keyboards.getMainMenuKeyboard() }
        );
    });

    // 2. Обработка ответов администратора (reply на пересланные сообщения)
    self.bot.on('message', async (msg) => {
        // Проверяем, что это ответ на другое сообщение
        if (!msg.reply_to_message) return;

        const originalMessageId = msg.reply_to_message.message_id;
        const ticketInfo = self.ticketMap.get(originalMessageId);

        if (!ticketInfo) return;

        const { userId, type } = ticketInfo;

        // Проверяем, что ответил администратор
        if (!self.adminIds.includes(msg.from.id)) return;

        const adminName = msg.from.username ? `@${msg.from.username}` :
        `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || 'Администратор';
        const safeMessage = escapeHtml(msg.text);
        const safeAdminName = escapeHtml(adminName);

        // Формируем текст ответа в зависимости от типа
        let responseText = `📬 <b>Ответ от администрации (${safeAdminName}):</b>\n\n${safeMessage}`;
        if (type === 'appeal' || type === 'complaint') {
            responseText += `\n\nС уважением, администрация Resmayn`;
        }

        // Отправляем ответ пользователю
        await self.bot.sendMessage(userId, responseText, { parse_mode: 'HTML' });

        // Подтверждение админу
        await self.bot.sendMessage(msg.chat.id, '✅ Ответ отправлен пользователю.');

        // Удаляем связку (тикет закрыт)
        self.ticketMap.delete(originalMessageId);
    });

    // ---------- ОБРАБОТКА ОШИБОК ----------
    self.bot.on('polling_error', (error) => {
        console.error('[TELEGRAM] Polling error:', error.message);
    });
    self.bot.on('error', (error) => {
        console.error('[TELEGRAM] Bot error:', error.message);
    });

    console.log('[TELEGRAM] Команды настроены');
};
