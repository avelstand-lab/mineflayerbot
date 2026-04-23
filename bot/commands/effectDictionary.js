// effectDictionary.js
// Словарь соответствия русских и английских названий эффектов

const effectDictionary = {
    // Положительные эффекты
    "скорость": "minecraft:speed",
    "спешка": "minecraft:haste",
    "сила": "minecraft:strength",
    "исцеление": "minecraft:instant_health",
    "прыгучесть": "minecraft:jump_boost",
    "регенерация": "minecraft:regeneration",
    "сопротивление": "minecraft:resistance",
    "огнестойкость": "minecraft:fire_resistance",
    "водное дыхание": "minecraft:water_breathing",
    "невидимость": "minecraft:invisibility",
    "ночное зрение": "minecraft:night_vision",
    "прилив здоровья": "minecraft:health_boost",
    "поглощение": "minecraft:absorption",
    "насыщенность": "minecraft:saturation",
    "свечение": "minecraft:glowing",
    "везение": "minecraft:luck",
    "плавное падение": "minecraft:slow_falling",
    "сила источника": "minecraft:conduit_power",
    "грация дельфина": "minecraft:dolphins_grace",
    "герой деревни": "minecraft:hero_of_the_village",

    // Отрицательные эффекты
    "замедление": "minecraft:slowness",
    "утомление": "minecraft:mining_fatigue",
    "моментальный урон": "minecraft:instant_damage",
    "тошнота": "minecraft:nausea",
    "слепота": "minecraft:blindness",
    "голод": "minecraft:hunger",
    "слабость": "minecraft:weakness",
    "отравление": "minecraft:poison",
    "иссушение": "minecraft:wither",
    "левитация": "minecraft:levitation",
    "невезение": "minecraft:unluck",
    "дурное знамение": "minecraft:bad_omen",
    "тьма": "minecraft:darkness",

    // Английские названия тоже оставим для удобства
    "speed": "minecraft:speed",
    "haste": "minecraft:haste",
    "strength": "minecraft:strength",
    "instant_health": "minecraft:instant_health",
    "jump_boost": "minecraft:jump_boost",
    "regeneration": "minecraft:regeneration",
    "resistance": "minecraft:resistance",
    "fire_resistance": "minecraft:fire_resistance",
    "water_breathing": "minecraft:water_breathing",
    "invisibility": "minecraft:invisibility",
    "night_vision": "minecraft:night_vision",
    "health_boost": "minecraft:health_boost",
    "absorption": "minecraft:absorption",
    "saturation": "minecraft:saturation",
    "glowing": "minecraft:glowing",
    "luck": "minecraft:luck",
    "slow_falling": "minecraft:slow_falling",
    "conduit_power": "minecraft:conduit_power",
    "dolphins_grace": "minecraft:dolphins_grace",
    "hero_of_the_village": "minecraft:hero_of_the_village",
    "slowness": "minecraft:slowness",
    "mining_fatigue": "minecraft:mining_fatigue",
    "instant_damage": "minecraft:instant_damage",
    "nausea": "minecraft:nausea",
    "blindness": "minecraft:blindness",
    "hunger": "minecraft:hunger",
    "weakness": "minecraft:weakness",
    "poison": "minecraft:poison",
    "wither": "minecraft:wither",
    "levitation": "minecraft:levitation",
    "unluck": "minecraft:unluck",
    "bad_omen": "minecraft:bad_omen",
    "darkness": "minecraft:darkness"
};

// Функция для получения ID эффекта по названию (игнорирует регистр)
function getEffectId(effectName) {
    const key = effectName.toLowerCase().trim();
    return effectDictionary[key] || null;
}

module.exports = { effectDictionary, getEffectId };
