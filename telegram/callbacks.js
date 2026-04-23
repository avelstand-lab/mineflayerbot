// telegram/callbacks.js
module.exports = function setupCallbacks() {
    const self = this;

    self.bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id;
        const data = query.data;

        // Подтверждение вступления
        if (data === 'confirm_join') {
            const isMember = await self.isUserInClanChat(userId);
            if (!isMember) {
                await self.bot.answerCallbackQuery(query.id, { text: '❌ Вы ещё не вступили в чат! Сначала нажмите кнопку "Вступить".', show_alert: true });
                return;
            }
            self.userStates[userId] = { verified: true };
            await self.bot.editMessageText(
                '🏠 <b>Главное меню</b>\n\nВыберите действие:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: self.keyboards.getMainMenuKeyboard()
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Если пользователь не верифицирован
        if (!self.userStates[userId]?.verified) {
            await self.bot.answerCallbackQuery(query.id, { text: '❌ Сначала выполните /start и подтвердите вступление в чат.', show_alert: true });
            return;
        }

        // Главное меню
        if (data === 'menu_main') {
            await self.bot.editMessageText(
                '🏠 <b>Главное меню</b>\n\nВыберите действие:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: self.keyboards.getMainMenuKeyboard()
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Меню порталов
        if (data === 'menu_portals') {
            await self.bot.editMessageText(
                '📊 <b>Информация клана на порталах</b>\n\nВыберите сервер:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: self.keyboards.getPortalsMenuKeyboard()
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Обработка выбора портала
        const portalMatch = data.match(/^portal_(.+)$/);
        if (portalMatch) {
            const server = portalMatch[1];
            let response = '';

            if (server === 'all') {
                const servers = ['s1', 's2'];
                response = '📊 <b>Вся информация по серверам:</b>\n\n';
                servers.forEach(s => {
                    const data = self.clanData[s];
                    if (data) {
                        response += `<b>${s.toUpperCase()}:</b> #${data.place} | Убийств: ${data.kills} | КДР: ${data.kdr} | Участников: ${data.members}\n`;
                    } else {
                        response += `<b>${s.toUpperCase()}:</b> Нет данных\n`;
                    }
                });
            } else {
                const data = self.clanData[server];
                if (data) {
                    response = `📊 <b>Сервер ${server.toUpperCase()}</b>\n\n` +
                    `🏆 Место: #${data.place}\n` +
                    `👑 Глава: ${data.leader}\n` +
                    `⚔ Убийств: ${data.kills}\n` +
                    `📊 КДР: ${data.kdr}\n` +
                    `👥 Участников: ${data.members}`;
                } else {
                    response = `❌ Данные по серверу ${server.toUpperCase()} отсутствуют. Используйте /update для запроса.`;
                }
            }

            await self.bot.editMessageText(
                response,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 Назад к порталам', callback_data: 'menu_portals' }],
                            [{ text: '🏠 Главное меню', callback_data: 'menu_main' }]
                        ]
                    }
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Черный список пагинация
        const blacklistMatch = data.match(/^blacklist_page_(\d+)$/);
        if (blacklistMatch) {
            const page = parseInt(blacklistMatch[1], 10);
            const { text, keyboard } = self.dataManager.formatBlacklistPage(page);
            await self.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        if (data === 'blacklist_current') {
            await self.bot.answerCallbackQuery(query.id, { text: 'Текущая страница' });
            return;
        }

        // Черный список (главное меню)
        if (data === 'menu_blacklist') {
            const { text, keyboard } = self.dataManager.formatBlacklistPage(1);
            await self.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // --- ТИКЕТЫ (поддержка, идеи, жалобы, апелляции) ---

        // Обращение в поддержку
        if (data === 'menu_support') {
            self.userStates[userId] = {
                ...self.userStates[userId],
                ticketMode: true,
                ticketType: 'support'
            };
            await self.bot.editMessageText(
                '🆘 <b>Обращение в поддержку</b>\n\nОпишите вашу проблему или вопрос одним сообщением.\n\n<i>Нажмите "Отмена", чтобы выйти.</i>',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отмена', callback_data: 'ticket_cancel' }]
                        ]
                    }
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Идеи для клана
        if (data === 'menu_ideas') {
            self.userStates[userId] = {
                ...self.userStates[userId],
                ticketMode: true,
                ticketType: 'idea'
            };
            await self.bot.editMessageText(
                '💡 <b>Идеи для клана</b>\n\nНапишите вашу идею одним сообщением.\n\n<i>Нажмите "Отмена", чтобы выйти.</i>',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отмена', callback_data: 'ticket_cancel' }]
                        ]
                    }
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Подать жалобу на участника
        if (data === 'menu_complaint') {
            self.userStates[userId] = {
                ...self.userStates[userId],
                ticketMode: true,
                ticketType: 'complaint'
            };
            await self.bot.editMessageText(
                '⚠ <b>Подать жалобу на участника</b>\n\nОпишите ситуацию, укажите никнейм нарушителя и прикрепите скриншот (одним сообщением с фото и описанием).\n\n<i>Нажмите "Отмена", чтобы выйти.</i>',
                                           {
                                               chat_id: chatId,
                                               message_id: query.message.message_id,
                                               parse_mode: 'HTML',
                                               reply_markup: {
                                                   inline_keyboard: [
                                                       [{ text: '❌ Отмена', callback_data: 'ticket_cancel' }]
                                                   ]
                                               }
                                           }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Апелляция на выход из ЧС
        if (data === 'menu_appeal') {
            self.userStates[userId] = {
                ...self.userStates[userId],
                ticketMode: true,
                ticketType: 'appeal'
            };
            await self.bot.editMessageText(
                '⚖ <b>Апелляция на выход из ЧС</b>\n\nОпишите подробно, почему вас следует убрать из чёрного списка.\n\n<i>Нажмите "Отмена", чтобы выйти.</i>',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отмена', callback_data: 'ticket_cancel' }]
                        ]
                    }
                }
            );
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Отмена создания тикета
        if (data === 'ticket_cancel') {
            delete self.userStates[userId]?.ticketMode;
            delete self.userStates[userId]?.ticketType;
            await self.bot.editMessageText(
                '❌ Действие отменено.',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id
                }
            );
            // Через 2 секунды вернём главное меню
            setTimeout(async () => {
                try {
                    await self.bot.deleteMessage(chatId, query.message.message_id);
                    await self.bot.sendMessage(
                        chatId,
                        '🏠 <b>Главное меню</b>\n\nВыберите действие:',
                        { parse_mode: 'HTML', reply_markup: self.keyboards.getMainMenuKeyboard() }
                    );
                } catch (e) {}
            }, 2000);
            await self.bot.answerCallbackQuery(query.id);
            return;
        }

        // Неизвестная команда
        await self.bot.answerCallbackQuery(query.id, { text: 'Неизвестная команда' });
    });
};
