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
            await bot.sendMessage(chatId, 'Продолжим заполнение анкеты?', keyboards.continue);
            cleanupUserData(chatId);
        }
    }, TIMEOUT_DURATION);
}

const keyboards = {
    start: {
        reply_markup: {
            keyboard: [['К заполнению анкеты'], ['Хочу узнать подробнее'], ['Не хочу быть курьером']],
            resize_keyboard: true
        }
    },
    details: {
        reply_markup: {
            keyboard: [['К заполнению анкеты'], ['Не хочу быть курьером']],
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
        reply_markup: { keyboard: [['Справлюсь'], ['Не думаю']], resize_keyboard: true }
    },
    walkCourier: {
        reply_markup: { keyboard: [['Продолжим'], ['Не думаю']], resize_keyboard: true }
    },
    phone: {
        reply_markup: { remove_keyboard: true }
    }
};

const messages = {
    start: 'Перед тем, как продолжить, заполни небольшую анкету. 📄\n\nЭто займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴\n\nХочешь стать курьером или узнать подробнее?',
    details: '**Студенты, специалисты, пенсионеры, гости из-за рубежа** \n
Курьером-партнёром Самоката может стать каждый, вне зависимости от того, каких целей он хочет достичь! 📈  \n
---
#### **Что мы предлагаем:**  \n \n
​
**💸 Гарантированный доход каждый час**, даже если нет заказов.   \n \n
**🏘️ Центр формирования заказов** в шаговой доступности от дома.   \n \n
**🧭 Радиус доставок** в пределах *1,5–3 км* от центра формирования заказов.   \n \n
**🚴 Бесплатную униформу, шлем и велосипед.**   \n \n
**📅 Абсолютную гибкость** в выборе периодов для сотрудничества (доставлять заказы можно от *2-х часов в день*). \n \n
**😌 Комфортные условия** для отдыха и ожидания в центре формирования заказов.   \n \n
**🧾 Отсутствие штрафов.**   \n \n
**✅ Оформление по самозанятости.** Оплату налога Самокат берёт на себя и показывает тебе реальную сумму твоего дохода.   \n \n
​
---
​
#### **Остались вопросы?**  \n\n
Ты сможешь задать их HR-менеджеру, который свяжется с тобой после того, как ты заполнишь анкету. 📄',
    ageRestriction: 'К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺\n\nБуду рад видеть тебя снова, когда станешь старше!',
    walkCourier: 'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅',
    weightWarning: 'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️',
    final: '**Отлично! Думаю, ты подходишь!** 🔥\n\n

Теперь оставь свой номер телефона, чтобы *HR-менеджер* мог связаться с тобой. 📞\n\n

Он поможет подобрать для тебя удобный центр формирования заказов, расскажет, что делать дальше, и ответит на все вопросы.\n\n

> Не волнуйся, я не храню введённые данные и не передаю их 3-м лицам. 🔐\n\nНе волнуйся, я не храню введённые данные и не передаю их 3-м лицам. 🔐'
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    cleanupUserData(chatId);
    userStates[chatId] = 'START';
    setInactivityTimer(chatId);
    await bot.sendMessage(chatId, messages.start, keyboards.start);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    setInactivityTimer(chatId);

    if (text === 'Вернуться в начало ↩️') {
        cleanupUserData(chatId);
        userStates[chatId] = 'ZERO'; // Новое состояние ZERO
        return;
    }

    const handlers = {
        'START': () => handleStartState(chatId, text),
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
    if (text === 'К заполнению анкеты') {
        userStates[chatId] = 'WAITING_NAME';
        await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?', keyboards.phone);
    } else if (text === 'Хочу узнать подробнее') {
        await bot.sendMessage(chatId, messages.details, keyboards.details);
    } else if (text === 'Не хочу быть курьером') {
        await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', keyboards.back);
        cleanupUserData(chatId);
    }
}

async function handleNameState(chatId, name) {
    userData[chatId] = { name };
    userStates[chatId] = 'WAITING_AGE';
    await bot.sendMessage(chatId, `Сколько тебе лет, ${name}?`, keyboards.phone);
}

async function handleAgeState(chatId, age) {
    if (isNaN(parseInt(age))) {
        await bot.sendMessage(chatId, 'Введите возраст цифрами.', keyboards.phone);
        return;
    }
    const parsedAge = parseInt(age);
    if (parsedAge < 18) {
        await bot.sendMessage(chatId, messages.ageRestriction, keyboards.back);
        cleanupUserData(chatId);
        return;
    }
    userData[chatId].age = parsedAge; // Сохраняем возраст в userData
    userStates[chatId] = 'WAITING_CITIZENSHIP';
    await bot.sendMessage(chatId, 'Какое у тебя гражданство?', keyboards.citizenship);
}

async function handleCitizenshipState(chatId, citizenship) {
    userData[chatId].citizenship = citizenship;
    userStates[chatId] = 'WAITING_BIKE';
    await bot.sendMessage(chatId, 'Умеешь кататься на велосипеде? 🚴', keyboards.bike);
}

async function handleBikeState(chatId, bike) {
    userData[chatId].canRideBike = bike;
    if (bike === 'Да') {
        userStates[chatId] = 'WAITING_WEIGHT';
        await bot.sendMessage(chatId, 'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️', keyboards.weight);
    } else {
        userStates[chatId] = 'WAITING_WALK_COURIER';
        await bot.sendMessage(chatId, 'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅', keyboards.walkCourier);
    }
}

async function handleWeightState(chatId, weightResponse) {
    if (weightResponse === 'Справлюсь') {
        userStates[chatId] = 'WAITING_PHONE';
        await bot.sendMessage(chatId, messages.final, keyboards.phone);
    } else if (weightResponse === 'Не думаю') {
        await bot.sendMessage(chatId, 'Такие тяжёлые заказы - редкое явление. В основном, не более 10% от общего числа. Однако все курьеры-партнёры периодически их доставляют.');
        userStates[chatId] = 'ZERO'; // Возврат к состоянию ZERO
    }
}

async function handleWalkCourierState(chatId, walkResponse) {
    if (walkResponse === 'Продолжим') {
        userStates[chatId] = 'WAITING_WEIGHT';
        await bot.sendMessage(chatId, 'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️', keyboards.weight);
    } else {
        await bot.sendMessage(chatId, 'Буду рад видеть тебя снова, если решишь стать курьером!', keyboards.back);
        cleanupUserData(chatId);
    }
}

async function handlePhoneState(chatId, phone) {
    const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/;
    if (!phoneRegex.test(phone)) {
        await bot.sendMessage(chatId, 'Пожалуйста, введите корректный номер телефона.', keyboards.phone);
        return;
    }

    userData[chatId].phone = phone;
    const summary =
        `Новая заявка:\n
        Имя: ${userData[chatId].name}\n
        Возраст: ${userData[chatId].age}\n
        Гражданство: ${userData[chatId].citizenship}\n
        Велосипед: ${userData[chatId].canRideBike}\n
        Телефон: ${userData[chatId].phone}\n
        Профиль: @${chatId}`; // Добавляем @ перед ID пользователя

    await bot.sendMessage(GROUP_CHAT_ID, summary);
    await bot.sendMessage(chatId, 'Спасибо! Мы свяжемся с тобой для дальнейших инструкций. 📞', keyboards.back);
    cleanupUserData(chatId);
}
