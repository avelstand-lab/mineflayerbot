class ClanParser {
    parseClanLine(line) {
        const cleanLine = line.replace(/§[0-9a-fklmnor]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

        console.log(`[CLAN PARSER] Парсим: "${cleanLine.substring(0, 80)}..."`);

        const placeMatch = cleanLine.match(/(\d+)\.\s*Клан:\s*Resmayn/i) ||
        cleanLine.match(/\[(\d+)\]\s*Клан:\s*Resmayn/i) ||
        cleanLine.match(/(\d+)\.\s*Resmayn/i) ||
        cleanLine.match(/Resmayn.*\[(\d+)\]/i);

        if (!placeMatch) {
            console.log('[CLAN PARSER] Не найден паттерн с местом, пробую альтернативный поиск...');

            const altMatch = cleanLine.match(/^(\d+)\./);
            if (altMatch && cleanLine.includes('Resmayn')) {
                console.log('[CLAN PARSER] Нашел место через альтернативный поиск:', altMatch[1]);
                return this.parseWithPlace(cleanLine, parseInt(altMatch[1]));
            }

            console.log('[CLAN PARSER] Не удалось найти место клана');
            return null;
        }

        const place = parseInt(placeMatch[1]);
        return this.parseWithPlace(cleanLine, place);
    }

    parseWithPlace(cleanLine, place) {
        console.log(`[CLAN PARSER] Место найдено: ${place}`);

        let kills = 0;
        const killsMatch = cleanLine.match(/Убийств[:\s]+(\d+)/i) ||
        cleanLine.match(/Kills[:\s]+(\d+)/i);
        if (killsMatch) {
            kills = parseInt(killsMatch[1]);
            console.log(`[CLAN PARSER] Убийства: ${kills}`);
        } else {
            const afterChert = cleanLine.split(/Resmayn/i)[1];
            if (afterChert) {
                const numbers = afterChert.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    kills = parseInt(numbers[0]);
                    console.log(`[CLAN PARSER] Убийства (альтернативный поиск): ${kills}`);
                }
            }
        }

        let kdr = 0;
        const kdrMatch = cleanLine.match(/КДР[:\s]+([\d.]+)/i) ||
        cleanLine.match(/KDR[:\s]+([\d.]+)/i);
        if (kdrMatch) {
            kdr = parseFloat(kdrMatch[1]);
            console.log(`[CLAN PARSER] КДР: ${kdr}`);
        }

        let members = 0;
        const membersMatch = cleanLine.match(/Участников[:\s]+(\d+)/i) ||
        cleanLine.match(/Members[:\s]+(\d+)/i);
        if (membersMatch) {
            members = parseInt(membersMatch[1]);
            console.log(`[CLAN PARSER] Участников: ${members}`);
        }

        let leader = 'fees';
        const leaderMatch = cleanLine.match(/Глава[:\s]+([^,]+)/i) ||
        cleanLine.match(/Leader[:\s]+([^,]+)/i);
        if (leaderMatch) {
            leader = leaderMatch[1].trim();
            console.log(`[CLAN PARSER] Лидер: ${leader}`);
        }

        const result = {
            place: place,
            leader: leader,
            kills: kills || 0,
            kdr: kdr || 0,
            members: members || 0,
            rawLine: cleanLine.substring(0, 100),
            timestamp: Date.now()
        };

        console.log('[CLAN PARSER] Финальный результат:', result);
        return result;
    }
}

module.exports = ClanParser;
