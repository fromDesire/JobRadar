const TelegramBot = require("node-telegram-bot-api");

// Замените на ваш токен Telegram-бота
const BOT_TOKEN = "7226497176:AAEkJcI_B6m37AlexAMueq2-zyL9ygYGQLQ";
// ID Telegram пользователя (HR), куда будут отправляться данные
const HR_TELEGRAM_ID = "1802499315"; // Замените на реальный ID

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Основное меню
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "Работа без опыта" }],
      [{ text: "Работа с опытом" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Меню для "Работа без опыта"
const noExperienceMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "Курьер/Доставщик" }],
      [{ text: "Сборщик заказов" }],
      [{ text: "Упаковщик" }],
      [{ text: "Разнорабочий/Грузчик" }],
      [{ text: "Промоутер" }],
      [{ text: "Назад" }],
    ],
    resize_keyboard: true,
  },
};

// Меню для "Работа с опытом"
const experienceMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "Программист" }],
      [{ text: "Менеджер проектов" }],
      [{ text: "Дизайнер" }],
      [{ text: "Маркетолог" }],
      [{ text: "Назад" }],
    ],
    resize_keyboard: true,
  },
};

// Временное хранилище для данных пользователей
const userData = {};

// Стартовое сообщение
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Добро пожаловать! Выберите, что вас интересует:", mainMenu);
});

// Обработка выбора в главном меню
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Главное меню
  if (text === "Работа без опыта") {
    bot.sendMessage(chatId, "Выберите вакансию:", noExperienceMenu);
  } else if (text === "Работа с опытом") {
    bot.sendMessage(chatId, "Выберите вакансию:", experienceMenu);
  }

  // Возврат в главное меню
  else if (text === "Назад") {
    bot.sendMessage(chatId, "Возвращаемся в главное меню:", mainMenu);
  }

  // Обработка вакансий (работа без опыта)
  else if (
    ["Курьер/Доставщик", "Сборщик заказов", "Упаковщик", "Разнорабочий/Грузчик", "Промоутер"].includes(
      text
    )
  ) {
    bot.sendMessage(
      chatId,
      `Вакансия: ${text}\n\nОписание: Мы ищем сотрудников на позицию "${text}". Заработная плата обсуждается на собеседовании.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Откликнуться", callback_data: `apply_${text}` }],
          ],
        },
      }
    );
  }

  // Обработка вакансий (работа с опытом)
  else if (
    ["Программист", "Менеджер проектов", "Дизайнер", "Маркетолог"].includes(text)
  ) {
    bot.sendMessage(
      chatId,
      `Вакансия: ${text}\n\nОписание: Мы ищем специалистов на позицию "${text}". Опыт работы обязателен. Условия обсуждаются на собеседовании.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Откликнуться", callback_data: `apply_${text}` }],
          ],
        },
      }
    );
  }

  // Любое другое сообщение
  else {
    bot.sendMessage(chatId, "Пожалуйста, выберите вариант из меню.");
  }
});

// Обработка кнопки "Откликнуться"
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("apply_")) {
    const vacancy = data.replace("apply_", "");
    userData[chatId] = { vacancy }; // Сохраняем выбранную вакансию

    bot.sendMessage(chatId, `Вы выбрали вакансию: ${vacancy}\n\nПожалуйста, введите свои данные (Имя, номер телефона, и другие детали):`);
  }
});

// Обработка отправки данных пользователем
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (userData[chatId] && !userData[chatId].details) {
    userData[chatId].details = msg.text; // Сохраняем данные пользователя

    const { vacancy, details } = userData[chatId];
    const hrMessage = `Новый отклик на вакансию "${vacancy}":\n\nДанные пользователя:\n${details}`;

    // Отправляем данные HR-у
    bot.sendMessage(HR_TELEGRAM_ID, hrMessage);

    // Подтверждаем отправку данных
    bot.sendMessage(chatId, "Ваши данные успешно отправлены! HR свяжется с вами в ближайшее время.");

    // Удаляем временные данные пользователя
    delete userData[chatId];
  }
});
