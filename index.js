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
    delete userTimers[chatId];
}

// Функция для установки таймера неактивности
function setInactivityTimer(chatId) {
    // Очищаем предыдущий таймер, если он существует
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
        }
    }, TIMEOUT_DURATION);
}

// Клавиатуры для различных этапов
const startKeyboard = {
    reply_markup: {
        keyboard: [
            ['Продолжим'],
            ['Хочу узнать подробнее'],
            ['Не хочу быть курьером']
        ],
        resize_keyboard: true
    }
};

const backButton = {
    reply_markup: {
        keyboard: [['Вернуться в начало ↩️']],
        resize_keyboard: true
    }
};

const citizenshipKeyboard = {
    reply_markup: {
        keyboard: [
            ['РФ 🇷🇺'],
            ['Другие страны 🇧🇾🇹🇯🇺🇿🇰🇬…']
        ],
        resize_keyboard: true
    }
};

const bikeKeyboard = {
    reply_markup: {
        keyboard: [
            ['Да'],
            ['Нет']
        ],
        resize_keyboard: true
    }
};

const weightKeyboard = {
    reply_markup: {
        keyboard: [
            ['Конечно'],
            ['Не думаю']
        ],
        resize_keyboard: true
    }
};

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    cleanupUserData(chatId);
    userStates[chatId] = 'START';
    userData[chatId] = {};
    setInactivityTimer(chatId);

    await bot.sendMessage(chatId,
        'Перед тем, как продолжить, заполни небольшую анкету. 📄\n' +
        'Это займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴\n' +
        'Хочешь стать курьером или узнать подробнее?',
        startKeyboard
    );
});

// Обработчик текстовых сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Обновляем таймер при каждом сообщении
    setInactivityTimer(chatId);

    if (text === 'Вернуться в начало ↩️') {
        cleanupUserData(chatId);
        userStates[chatId] = 'START';
        userData[chatId] = {};
        await bot.sendMessage(chatId, 'Начнем сначала!', startKeyboard);
        return;
    }

    switch (userStates[chatId]) {
        case 'START':
            handleStartState(chatId, text);
            break;
        case 'WAITING_NAME':
            handleNameState(chatId, text);
            break;
        case 'WAITING_AGE':
            handleAgeState(chatId, text);
            break;
        case 'WAITING_CITIZENSHIP':
            handleCitizenshipState(chatId, text);
            break;
        case 'WAITING_BIKE':
            handleBikeState(chatId, text);
            break;
        case 'WAITING_WEIGHT':
            handleWeightState(chatId, text);
            break;
        case 'WAITING_PHONE':
            handlePhoneState(chatId, text);
            break;
    }
});

async function handleStartState(chatId, text) {
    switch (text) {
        case 'Продолжим':
            userStates[chatId] = 'WAITING_NAME';
            await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?');
            break;
        case 'Хочу узнать подробнее':
            await bot.sendMessage(chatId,
                'Студенты, специалисты, пенсионеры, гости из-за рубежа - курьером-партнёром Самоката может стать каждый, вне зависимости от того, каких целей он хочет достичь! 📈\n\n' +
                'Что мы предлагаем:\n' +
                '💸 Гарантированный доход каждый час, даже если нет заказов.\n' +
                '🏘️ Центр формирования заказов в шаговой доступности от дома.\n' +
                '🧭 Радиус доставок в пределах 1,5-3 км от центра формирования заказов.\n' +
                '🚴 Бесплатную униформу, шлем и велосипед.\n' +
                '📅 Абсолютную гибкость в выборе периодов для сотрудничества (доставлять заказы можно от 2-х часов в день).\n' +
                '😌 Комфортные условия для отдыха и ожидания в центре формирования заказов.\n' +
                '🧾 Отсутствие штрафов.\n' +
                '✅ Оформление по самозанятости. Оплату налога Самокат берёт на себя и показывает тебе реальную сумму твоего дохода.\n\n' +
                'Остались вопросы? - Ты сможешь задать их HR-менеджеру, который свяжется с тобой после того, как ты заполнишь анкету. 📄',
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
            break;
        case 'Не хочу быть курьером':
            await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', backButton);
            cleanupUserData(chatId);
            break;
    }
}

async function handleNameState(chatId, name) {
    userData[chatId].name = name;
    userStates[chatId] = 'WAITING_AGE';
    await bot.sendMessage(chatId, `Сколько тебе лет, ${name}?`);
}

async function handleAgeState(chatId, age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
        await bot.sendMessage(chatId, 'Пожалуйста, введите возраст цифрами.');
        return;
    }

    if (ageNum < 18) {
        await bot.sendMessage(
            chatId,
            'К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺\n' +
            'Буду рад видеть тебя снова, когда станешь старше!',
            backButton
        );
        cleanupUserData(chatId);
        return;
    }

    userData[chatId].age = ageNum;
    userStates[chatId] = 'WAITING_CITIZENSHIP';
    await bot.sendMessage(chatId, 'Какое у тебя гражданство?', citizenshipKeyboard);
}

async function handleCitizenshipState(chatId, citizenship) {
    userData[chatId].citizenship = citizenship;
    userStates[chatId] = 'WAITING_BIKE';
    await bot.sendMessage(chatId, 'Умеешь кататься на велосипеде? 🚴', bikeKeyboard);
}

async function handleBikeState(chatId, canRideBike) {
    userData[chatId].canRideBike = canRideBike;

    if (canRideBike === 'Нет') {
        await bot.sendMessage(
            chatId,
            'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅',
            {
                reply_markup: {
                    keyboard: [
                        ['Продолжаем'],
                        ['Вернуться в начало ↩️']
                    ],
                    resize_keyboard: true
                }
            }
        );
        return;
    }

    userStates[chatId] = 'WAITING_WEIGHT';
    await bot.sendMessage(
        chatId,
        'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️',
        weightKeyboard
    );
}

async function handleWeightState(chatId, canCarryWeight) {
    userData[chatId].canCarryWeight = canCarryWeight;

    if (canCarryWeight === 'Не думаю') {
        await bot.sendMessage(
            chatId,
            'Такие тяжёлые заказы - редкое явление. В основном, не более 10% от общего числа. ' +
            'Однако все курьеры-партнёры периодически их доставляют. Если будешь готов, мы можем всегда начать сначала.',
            backButton
        );
        cleanupUserData(chatId);
        return;
    }

    userStates[chatId] = 'WAITING_PHONE';
    await bot.sendMessage(
        chatId,
        'Отлично! Думаю, ты подходишь! 🔥\n' +
        'Теперь оставь свой номер телефона, чтобы HR-менеджер мог связаться с тобой. 📞\n' +
        'Он поможет подобрать для тебя удобный центр формирования заказов, расскажет, что делать дальше, и ответит на все вопросы.\n' +
        'Не волнуйся, я не храню введённые данные и не передаю их 3-м лицам.'
    );
}

async function handlePhoneState(chatId, phone) {
    userData[chatId].phone = phone;

    // Отправка summary в группу
    const summary =
        'Новая заявка:\n' +
        `Имя: ${userData[chatId].name}\n` +
        `Возраст: ${userData[chatId].age}\n` +
        `Гражданство: ${userData[chatId].citizenship}\n` +
        `Велосипед: ${userData[chatId].canRideBike}\n` +
        `Вес заказов: ${userData[chatId].canCarryWeight}\n` +
        `Телефон: ${userData[chatId].phone}\n` +
        `ID пользователя: ${chatId}`;

    await bot.sendMessage(GROUP_CHAT_ID, summary);

    // Финальное сообщение пользователю
    await bot.sendMessage(
        chatId,
        'Спасибо! HR-менеджер свяжется с тобой в ближайшее время. ✅\n' +
        'Заявки обрабатываются менеджером с 12:00 до 19:00 ежедневно. 🕐\n' +
        'Буду рад видеть тебя в команде курьеров-партнёров Самоката! До новых встреч! 👋',
        backButton
    );

    // Очистка всех данных пользователя
    cleanupUserData(chatId);
}
