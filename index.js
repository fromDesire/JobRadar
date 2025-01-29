require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Временное хранение состояния пользователей
const userStates = {};
const userData = {};
const userTimers = {};

const TIMEOUT_DURATION = 2 * 60 * 60 * 1000; // 2 часа

// Очистка данных пользователя
function cleanupUserData(chatId) {
    delete userStates[chatId];
    delete userData[chatId];
    if (userTimers[chatId]) {
        clearTimeout(userTimers[chatId]);
        delete userTimers[chatId];
    }
}

// Установка таймера бездействия
function setInactivityTimer(chatId) {
    if (userTimers[chatId]) {
        clearTimeout(userTimers[chatId]);
    }
    userTimers[chatId] = setTimeout(async () => {
        if (userStates[chatId]) {
            await bot.sendMessage(chatId, 'Продолжим заполнение анкеты?', keyboards.continue);
            cleanupUserData(chatId);
        }
    }, TIMEOUT_DURATION);
}

const keyboards = {
    start: {
        reply_markup: {
            keyboard: [['Продолжим'], ['Хочу узнать подробнее'], ['Не хочу быть курьером']],
            resize_keyboard: true
        }
    },
    details: {
        reply_markup: {
            keyboard: [['Продолжим'], ['Не хочу быть курьером']],
            resize_keyboard: true
        }
    },
    back: {
        reply_markup: { keyboard: [['Вернуться в начало ↩️']], resize_keyboard: true }
    },
    citizenship: {
        reply_markup: {
            keyboard: [['РФ 🇷🇺'], ['Другие страны 🇧🇾🇹🇯🇺🇿🇰🇬…']],
            resize_keyboard: true
        }
    },
    bike: {
        reply_markup: { keyboard: [['Да'], ['Нет']], resize_keyboard: true }
    },
    weight: {
        reply_markup: { keyboard: [['Конечно'], ['Не думаю']], resize_keyboard: true }
    },
    continue: {
        reply_markup: { keyboard: [['Продолжим'], ['Вернуться в начало ↩️']], resize_keyboard: true }
    },
    remove: {
        reply_markup: { remove_keyboard: true }
    }
};

const messages = {
    start: 'Перед тем, как продолжить, заполни небольшую анкету. 📄\n\nЭто займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴\n\nХочешь стать курьером или узнать подробнее?',
    details: 'Студенты, специалисты, пенсионеры, гости из-за рубежа - курьером-партнёром Самоката может стать каждый, вне зависимости от того, каких целей он хочет достичь! 📈\n\nЧто мы предлагаем:\n💸 Гарантированный доход каждый час, даже если нет заказов.\n\n🏘 Центр формирования заказов в шаговой доступности от дома.\n\n🧭 Радиус доставок в пределах 1,5-3 км от центра формирования заказов.\n\n🚴 Бесплатную униформу, шлем и велосипед.\n\n📅 Абсолютную гибкость в выборе периодов для сотрудничества (доставлять заказы можно от 2-х часов в день).\n\n😌 Комфортные условия для отдыха и ожидания в центре формирования заказов.\n\n🧾 Отсутствие штрафов.\n\n✅ Оформление по самозанятости. Оплату налога Самокат берёт на себя и показывает тебе реальную сумму твоего дохода.\n\nОстались вопросы? - Ты сможешь задать их HR-менеджеру, который свяжется с тобой после того, как ты заполнишь анкету. 📄',
    ageRestriction: 'К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺\n\nБуду рад видеть тебя снова, когда станешь старше!',
    walkCourier: 'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅',
    weightWarning: 'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️',
    final: 'Отлично! Думаю, ты подходишь! 🔥\n\nТеперь оставь свой номер телефона, чтобы HR-менеджер мог связаться с тобой. 📞\n\nОн поможет подобрать для тебя удобный центр формирования заказов, расскажет, что делать дальше, и ответит на все вопросы.\n\nНе волнуйся, я не храню введённые данные и не передаю их 3-м лицам. 🔐',
    thankYou: 'Спасибо! HR-менеджер свяжется с тобой в ближайшее время. ✅\nЗаявки обрабатываются менеджером с 12:00 до 19:00 ежедневно. 🕐\nБуду рад видеть тебя в команде курьеров-партнёров Самоката! До новых встреч! 👋'
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    console.log('Received /start command from chat:', chatId); // Логируем команду
    cleanupUserData(chatId);
    userStates[chatId] = 'START';
    setInactivityTimer(chatId);
    await bot.sendMessage(chatId, messages.start, keyboards.start);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    console.log('Received message:', text); // Логируем полученное сообщение

    setInactivityTimer(chatId);

    if (text === 'Вернуться в начало ↩️') {
        cleanupUserData(chatId);
        userStates[chatId] = 'START';
        await bot.sendMessage(chatId, messages.start, keyboards.start);
        return;
    }

    const handlers = {
        'START': () => handleStartState(chatId, text),
        'DETAILS': () => handleDetailsState(chatId, text),
        'WAITING_NAME': () => handleNameState(chatId, text),
        'WAITING_AGE': () => handleAgeState(chatId, text),
        'WAITING_CITIZENSHIP': () => handleCitizenshipState(chatId, text),
        'WAITING_BIKE': () => handleBikeState(chatId, text),
        'WAITING_WEIGHT': () => handleWeightState(chatId, text),
        'WAITING_WALK_COURIER': () => handleWalkCourierState(chatId, text),
        'WAITING_PHONE': () => handlePhoneState(chatId, text)
    };

    const handler = handlers[userStates[chatId]];
    if (handler) await handler();
});

async function handleStartState(chatId, text) {
    if (text === 'Продолжим') {
        userStates[chatId] = 'WAITING_NAME';
        await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?', keyboards.remove);
    } else if (text === 'Хочу узнать подробнее') {
        userStates[chatId] = 'DETAILS';  // Переводим пользователя в состояние подробностей
        await bot.sendMessage(chatId, messages.details, keyboards.details);
    } else if (text === 'Не хочу быть курьером') {
        await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', keyboards.back);
        cleanupUserData(chatId);
    }
}

async function handleDetailsState(chatId, text) {
    if (text === 'Продолжим') {
        userStates[chatId] = 'WAITING_NAME';
        await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?', keyboards.remove);
    } else if (text === 'Не хочу быть курьером') {
        await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', keyboards.back);
        cl
