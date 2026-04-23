const axios = require('axios');
const cheerio = require('cheerio');

const weatherCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут

const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
};

function transliterate(city) {
    return city.toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function getWeather(city = 'moskva') {
    try {
        const cacheKey = city.toLowerCase();
        const now = Date.now();

        // Проверяем кэш
        if (weatherCache.has(cacheKey)) {
            const cached = weatherCache.get(cacheKey);
            if (now - cached.timestamp < CACHE_DURATION) {
                console.log(`[WEATHER] Использую кэш для ${city}`);
                return cached.data;
            }
        }

        console.log(`[WEATHER] Запрашиваю погоду для ${city}...`);

        const cityForUrl = /[а-яА-Я]/.test(city) ? transliterate(city) : city.toLowerCase();
        const url = `https://pogoda.mail.ru/prognoz/${cityForUrl}/`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const tempDiv = $('div[data-qa="Title"]').first();
        const tempHtml = tempDiv.html() || '';
        const tempMatch = tempHtml.match(/(-?\d+)/);
        const temp = tempMatch ? tempMatch[1] : '0';

        const feelsDiv = $('div[data-qa="Text"].e6255c6329').first();
        const feelsHtml = feelsDiv.html() || '';
        const feelsMatch = feelsHtml.match(/(-?\d+)/);
        const feels = feelsMatch ? feelsMatch[1] : temp;

        const descDiv = $('div[data-qa="Text"]').not('.e6255c6329').first();
        let description = descDiv.text().trim() || 'без осадков';

        if (description.length > 30) {
            description = description.substring(0, 30) + '...';
        }

        const tempNumber = parseInt(temp);
        let color = '&f';

        if (tempNumber < -10) color = '&b';
        else if (tempNumber < 0) color = '&3';
        else if (tempNumber <= 10) color = '&e';
        else if (tempNumber <= 20) color = '&6';
        else color = '&c';

        const result = {
            city: cityForUrl,
            temp: temp,
            feels: feels,
            desc: description,
            color: color,
            message: `${color}${temp}&f (Ощущается ${feels}) - ${description}`
        };

        // кэш
        weatherCache.set(cacheKey, {
            data: result,
            timestamp: now
        });

        cleanCache();

        return result;

    } catch (error) {
        console.error(`[WEATHER] Ошибка для города ${city}:`, error.message);

        if (city !== 'moskva' && city !== 'москва') {
            console.log('[WEATHER] Пробую Москву как запасной вариант...');
            return getWeather('москва');
        }

        return {
            city: city,
            temp: '0',
            feels: '0',
            desc: 'Город не найден',
            color: '&c',
            message: '&cГород не найден или ошибка получения данных'
        };
    }
}

// Очистка старого кэша
function cleanCache() {
    const now = Date.now();
    for (const [key, value] of weatherCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            weatherCache.delete(key);
        }
    }
}

// функция для тестирования
async function test() {
    const testCities = ['москва', 'санкт-петербург', 'novokuznetsk', 'казань'];

    for (const city of testCities) {
        console.log(`\n=== Тест для города: ${city} ===`);
        const weather = await getWeather(city);
        console.log('Результат:', weather);
        console.log('Для чата:', `/cc Погода в москве: ${weather.message}`);
    }
}

// запуск теста при прямом вызове
if (require.main === module) {
    test();
}

module.exports = { getWeather };
