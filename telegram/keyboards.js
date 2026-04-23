// telegram/keyboards.js
function getMainMenuKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '💡 Идеи для клана', callback_data: 'menu_ideas' }],
            [{ text: '🆘 Обращение в поддержку', callback_data: 'menu_support' }],
            [{ text: '⚠ Подать жалобу на участника', callback_data: 'menu_complaint' }],
            [{ text: '📊 Информация клана на порталах', callback_data: 'menu_portals' }],
            [{ text: '📋 Черный список клана', callback_data: 'menu_blacklist' }],
            [{ text: '⚖ Апелляция на выход из ЧС', callback_data: 'menu_appeal' }]
        ]
    };
}

function getPortalsMenuKeyboard() {
    return {
        inline_keyboard: [
            [{ text: 'Выживание 1 (s1)', callback_data: 'portal_s1' }],
            [{ text: 'Выживание 2 (s2)', callback_data: 'portal_s2' }],
            /*[{ text: 'Эмеральд-4 (s4)', callback_data: 'portal_s4' }],
            [{ text: 'Альфа-5 (s5)', callback_data: 'portal_s5' }],
            [{ text: 'Омега-6 (s6)', callback_data: 'portal_s6' }],
            [{ text: 'Сигма-7 (s7)', callback_data: 'portal_s7' }],
            [{ text: 'Зета-8 (s8)', callback_data: 'portal_s8' }],
            [{ text: '📊 Вся информация с порталов', callback_data: 'portal_all' }],
            [{ text: '🔙 Назад в главное меню', callback_data: 'menu_main' }]*/
        ]
    };
}

module.exports = {
    getMainMenuKeyboard,
    getPortalsMenuKeyboard
};
