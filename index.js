require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const userStates = {};
const userData = {};
const userTimers = {};

const TIMEOUT_DURATION = 2 * 60 * 60 * 1000;

function cleanupUserData(chatId) {
    delete userStates[chatId];
    delete userData[chatId];
    if (userTimers[chatId]) {
        clearTimeout(userTimers[chatId]);
        delete userTimers[chatId];
    }
}

function setInactivityTimer(chatId) {
    if (userTimers[chatId]) {
        clearTimeout(userTimers[chatId]);
    }

    userTimers[chatId] = setTimeout(async () => {
        if (userStates[chatId]) {
            await bot.sendMessage(chatId,
                'Продолжим заполнение анкеты?',
                {
                    reply_markup: {
                        keyboard: [
                            ['Продолжим'],
                            ['Вернуться в начало ↩️']
                        ],
                        resize_keyboard: true
                    }
                }
            );
            cleanupUserData(chatId);
        }
    }, TIMEOUT_DURATION);
}

const keyboards = {
    start: {
        reply_markup: {
            keyboard: [
                ['Продолжим'],
                ['Хочу узнать подробнее'],
                ['Не хочу быть курьером']
            ],
            resize_keyboard: true
        }
    },
    back: {
        reply_markup: {
            keyboard: [['Вернуться в начало ↩️']],
            resize_keyboard: true
        }
    },
    citizenship: {
        reply_markup: {
            keyboard: [
                ['РФ 🇷🇺'],
                ['Другие страны 🇧🇾🇹🇯🇺🇿🇰🇬…']
            ],
            resize_keyboard: true
        }
    },
    bike: {
        reply_markup: {
            keyboard: [
                ['Да'],
                ['Нет']
            ],
            resize_keyboard: true
        }
    },
    weight: {
        reply_markup: {
            keyboard: [
                ['Конечно'],
                ['Не думаю']
            ],
            resize_keyboard: true
        }
    }
};

const messages = {
    start: 'Перед тем, как продолжить, заполни небольшую анкету. 📄\n\n' +
           'Это займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴\n\n' +
           'Хочешь стать курьером или узнать подробнее?',
    details: 'Студенты, специалисты, пенсионеры, гости из-за рубежа - курьером-партнёром Самоката может стать каждый! 📈\n\n' +
             'Что мы предлагаем: ...',
    ageRestriction: 'К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺',
    walkCourier: 'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅',
    weightWarning: 'Такие тяжёлые заказы - редкое явление...',
    final: 'Спасибо! HR-менеджер свяжется с тобой в ближайшее время. ✅'
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    cleanupUserData(chatId);
    userStates[chatId] = 'START';
    userData[chatId] = {};
    setInactivityTimer(chatId);

    await bot.sendMessage(chatId, messages.start, keyboards.start);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    setInactivityTimer(chatId);

    if (text === 'Вернуться в начало ↩️') {
        cleanupUserData(chatId);
        userStates[chatId] = 'START';
        await bot.sendMessage(chatId, messages.start, keyboards.start);
        return;
    }

    const handlers = {
        'START': () => handleStartState(chatId, text),
        'WAITING_NAME': () => handleNameState(chatId, text),
        'WAITING_AGE': () => handleAgeState(chatId, text),
        'WAITING_CITIZENSHIP': () => handleCitizenshipState(chatId, text),
        'WAITING_BIKE': () => handleBikeState(chatId, text),
        'WAITING_WEIGHT': () => handleWeightState(chatId, text),
        'WAITING_PHONE': () => handlePhoneState(chatId, text)
    };

    if (userStates[chatId] && handlers[userStates[chatId]]) {
        await handlers[userStates[chatId]]();
    }
});

async function handleAgeState(chatId, age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
        await bot.sendMessage(chatId, 'Пожалуйста, введите возраст цифрами.', { reply_markup: { remove_keyboard: true } });
        return;
    }

    if (ageNum < 18) {
        await bot.sendMessage(chatId, messages.ageRestriction, keyboards.back);
        cleanupUserData(chatId);
        return;
    }

    userData[chatId].age = ageNum;
    userStates[chatId] = 'WAITING_CITIZENSHIP';
    await bot.sendMessage(chatId, 'Какое у тебя гражданство?', keyboards.citizenship);
}
