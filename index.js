require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Временное хранение состояния пользователей в памяти
const userStates = {};
const userData = {};
const userTimers = {};

// Константа времени ожидания (2 часа в миллисекундах)
const TIMEOUT_DURATION = 2 * 60 * 60 * 1000;

// Функция для очистки данных пользователя
function cleanupUserData(chatId) {
    delete userStates[chatId];
    delete userData[chatId];
    if (userTimers[chatId]) {
        clearTimeout(userTimers[chatId]);
        delete userTimers[chatId];
    }
}

// Функция для установки таймера неактивности
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

// Константы сообщений
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

    const handler = handlers[userStates[chatId]];
    if (handler) {
        await handler();
    }
});

async function handleStartState(chatId, text) {
    switch (text) {
        case 'Продолжим':
            userStates[chatId] = 'WAITING_NAME';
            await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?', { reply_markup: { remove_keyboard: true } });
            break;
        case 'Хочу узнать подробнее':
            await bot.sendMessage(chatId, messages.details);
            break;
        case 'Не хочу быть курьером':
            await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', keyboards.back);
            cleanupUserData(chatId);
            break;
    }
}

async function handleNameState(chatId, name) {
    userData[chatId].name = name;
    userStates[chatId] = 'WAITING_AGE';
    await bot.sendMessage(chatId, `Сколько тебе лет, ${name}?`, { reply_markup: { remove_keyboard: true } });
}

async function handlePhoneState(chatId, phone) {
    userData[chatId].phone = phone;
    await bot.sendMessage(GROUP_CHAT_ID, `Новая заявка: Имя: ${userData[chatId].name}, Телефон: ${phone}`);
    await bot.sendMessage(chatId, messages.final, keyboards.back);
    cleanupUserData(chatId);
}
