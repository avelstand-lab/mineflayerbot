const funCommands = {
    '#поцеловать(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!target) {
                bot.chat("/cc &fʙʙᴇдиᴛᴇ ниᴋ: &#05ff00#&#05ff07п&#04ff0dо&#04ff14ц&#03ff1bᴇ&#03ff21л&#03ff28о&#02ff2fʙ&#02ff36ᴀ&#02ff3cᴛ&#01ff43ь &#01ff4aн&#00ff50и&#00ff57ᴋ");
                return;
            }

            const responses = [
                `&b${sender}&f поцᴇлоʙᴀл &a${target} &d<3`,
                `&b${sender}&f нᴇжно поцᴇлоʙᴀл &a${target}`,
                `&b${sender}&f уᴋрᴀл поцᴇлуй у &a${target}`
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            bot.chat(`/cc ${randomResponse}`);
        }
    },

    '#трахнуть(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!target) {
                return;
            }
            const responses = [
                `&b${sender}&f нᴀᴄильно принудил ᴋ инᴛиʍу &a${target}`,
                `&b${sender}&f нᴇжно изнᴀᴄилоʙᴀл &a${target}`,
                `&b${sender}&f жёᴄᴛᴋо ᴛрᴀхнул &a${target}`
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            bot.chat(`/cc ${randomResponse}`);
        }
    },

    '#обнять(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!target) {
                bot.chat('/cc &fуᴋᴀжиᴛᴇ ниᴋ: #&#05ff00#&#04ff0aо&#04ff13б&#03ff1dн&#03ff27я&#02ff30ᴛ&#02ff3aь &#01ff44н&#01ff4dи&#00ff57ᴋ');
                return
            }
            const responses = [
                `&b${sender}&f обнял &a${target}`,
                `&b${sender}&f нᴇжно обнял &a${target}`
            ]
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            bot.chat(`/cc ${randomResponse}`);
        }
    },

    '#уебать(?: (.+))?': {
        execute: async (bot, state, sender, match) => {
            const target = match[1];
            if (!target) {
                bot.chat("/cc ʙʙᴇдиᴛᴇ ниᴋ: &#05ff00#&#04ff0aу&#04ff13ᴇ&#03ff1dб&#03ff27ᴀ&#02ff30ᴛ&#02ff3aь &#01ff44н&#01ff4dи&#00ff57ᴋ");
                return;
            }

            const responses = [
                `&b${sender}&f жёᴄᴛᴋо удᴀᴩил &a${target}`,
                `&b${sender}&f уᴇбᴀл по щᴇᴋᴇ &a${target}`,
                `&b${sender}&f уᴇбᴀл до ᴋроʙи &a${target}`,
                `&b${sender}&f уᴇбᴀл по яйцᴀʍ &a${target}`
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            bot.chat(`/cc ${randomResponse}`);
        }
    },

    '#рп': {
        execute: async (bot, state, sender) => {
            bot.chat("/cc &f#поцᴇлоʙᴀᴛь - поцᴇлоʙᴀᴛь игроᴋᴀ. #уᴇбᴀᴛь - удᴀриᴛь игроᴋᴀ. #ᴛрᴀхнуᴛь - ᴛрᴀхнуᴛь игроᴋᴀ. #обняᴛь - обняᴛь игроᴋᴀ.")
        }
    }
};

module.exports = funCommands;
