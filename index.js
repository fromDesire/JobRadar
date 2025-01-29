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
    },
    continue: {
        reply_markup: {
            keyboard: [
                ['Продолжаем'],
                ['Вернуться в начало ↩️']
            ],
            resize_keyboard: true
        }
    },
    remove: {
        reply_markup: {
            remove_keyboard: true
        }
    }
};

// Константы сообщений
const messages = {
    start: 'Перед тем, как продолжить, заполни небольшую анкету. 📄\n\n' +
           'Это займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴\n\n' +
           'Хочешь стать курьером или узнать подробнее?',
    details: 'Студенты, специалисты, пенсионеры, гости из-за рубежа - курьером-партнёром Самоката может стать каждый, вне зависимости от того, каких целей он хочет достичь! 📈\n\n' +
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
    ageRestriction: 'К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺\n' +
                    'Буду рад видеть тебя снова, когда станешь старше!',
    walkCourier: 'Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим. ✅',
    weightWarning: 'Такие тяжёлые заказы - редкое явление. В основном, не более 10% от общего числа. ' +
                   'Однако все курьеры-партнёры периодически их доставляют. Если будешь готов, мы можем всегда начать сначала.',
    final: 'Спасибо! HR-менеджер свяжется с тобой в ближайшее время. ✅\n' +
           'Заявки обрабатываются менеджером с 12:00 до 19:00 ежедневно. 🕐\n' +
           'Буду рад видеть тебя в команде курьеров-партнёров Самоката! До новых встреч! 👋'
};

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    cleanupUserData(chatId);
    userStates[chatId] = 'START';
    userData[chatId] = {};
    setInactivityTimer(chatId);

    await bot.sendMessage(chatId, messages.start, keyboards.start);
});

// Обработчик сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    setInactivityTimer(chatId);

    if (text === 'Вернуться в начало ↩️') {
        cleanupUserData(chatId);
        userStates[chatId] = 'START';
        userData[chatId] = {};
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

// Обработчик начала анкеты
async function handleStartState(chatId, text) {
    switch (text) {
        case 'Продолжим':
            userStates[chatId] = 'WAITING_NAME';
            await bot.sendMessage(chatId, 'Как я могу к тебе обращаться?', keyboards.remove);
            break;
        case 'Хочу узнать подробнее':
            await bot.sendMessage(chatId, messages.details, {
                reply_markup: {
                    keyboard: [
                        ['Продолжим (В1)'],
                        ['Вернуться в начало ↩️']
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 'Не хочу быть курьером':
            await bot.sendMessage(chatId, 'Спасибо за интерес! Если передумаешь, всегда можешь вернуться.', keyboards.back);
            cleanupUserData(chatId);
            break;
    }
}

// Обработчик имени
async function handleNameState(chatId, name) {
    userData[chatId].name = name;
    userStates[chatId] = 'WAITING_AGE';
    await bot.sendMessage(chatId, `Сколько тебе лет, ${name}?`, keyboards.remove);
}

// Обработчик возраста
async function handleAgeState(chatId, age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) {
        await bot.sendMessage(chatId, 'Пожалуйста, введите возраст цифрами.', keyboards.remove);
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

// Обработчик гражданства
async function handleCitizenshipState(chatId, citizenship) {
    userData[chatId].citizenship = citizenship;
    userStates[chatId] = 'WAITING_BIKE';
    await bot.sendMessage(chatId, 'Умеешь кататься на велосипеде? 🚴', keyboards.bike);
}

// Обработчик велосипеда
async function handleBikeState(chatId, canRideBike) {
    userData[chatId].canRideBike = canRideBike;

    if (canRideBike === 'Нет') {
        await bot.sendMessage(chatId, messages.walkCourier, keyboards.continue);
        return;
    }

    userStates[chatId] = 'WAITING_WEIGHT';
    await bot.sendMessage(chatId, 'Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️', keyboards.weight);
}

// Обработчик веса
async function handleWeightState(chatId, canCarryWeight) {
    userData[chatId].canCarryWeight = canCarryWeight;

    if (canCarryWeight === 'Не думаю') {
        await bot.sendMessage(chatId, messages.weightWarning, keyboards.back);
        cleanupUserData(chatId);
        return;
    }

    userStates[chatId] = 'WAITING_PHONE';
    await bot.sendMessage(
        chatId,
        'Отлично! Думаю, ты подходишь! 🔥\n' +
        'Теперь оставь свой номер телефона, чтобы HR-менеджер мог связаться с тобой. 📞\n' +
        'Он поможет подобрать для тебя удобный центр формирования заказов, расскажет, что делать дальше, и ответит на все вопросы.\n' +
        'Не волнуйся, я не храню введённые данные и не передаю их 3-м лицам.',
        keyboards.remove
    );
}

// Обработчик телефона
async function handlePhoneState(chatId, phone) {
    userData[chatId].phone = phone;

    // Получение username пользователя
    const user = await bot.getChat(chatId);
    const userId = user.username ? `@${user.username}` : `ID: ${chatId}`;

    // Отправка summary в группу
    const summary =
        'Новая заявка:\n' +
        `Имя: ${userData[chatId].name}\n` +
        `Возраст: ${userData[chatId].age}\n` +
        `Гражданство: ${userData[chatId].citizenship}\n` +
        `Велосипед: ${userData[chatId].canRideBike}\n` +
        `Вес заказов: ${userData[chatId].canCarryWeight}\n` +
        `Телефон: ${userData[chatId].phone}\n` +
        `Профиль: ${userId}`;

    await bot.sendMessage(GROUP_CHAT_ID, summary);
    await bot.sendMessage(chatId, messages.final, keyboards.back);
    cleanupUserData(chatId);
}
