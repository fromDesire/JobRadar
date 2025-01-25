// Импортируем модуль Telegram API
const TelegramBot = require("node-telegram-bot-api");

// Токен Telegram-бота
const BOT_TOKEN = "7226497176:AAEkJcI_B6m37AlexAMueq2-zyL9ygYGQLQ"; // Укажите ваш токен

// ID группы, куда будут пересылаться данные
const GROUP_CHAT_ID = "-4659948787"; // Укажите ID вашей группы

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище состояний пользователей
const userState = {};

// Получение имени пользователя в формате @username или ID
function getUserMention(msg) {
  return msg.from.username ? `@${msg.from.username}` : `@id${msg.from.id}`;
}

// Основное меню
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "Вернуться в начало ↩️" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// Обработчик команды "/start" или "Вернуться в начало ↩️"
bot.onText(/\/start|Вернуться в начало ↩️/, (msg) => {
  const chatId = msg.chat.id;

  // Сбрасываем состояние пользователя
  userState[chatId] = { step: "/start", data: {} };

  bot.sendMessage(
    chatId,
    "Перед тем, как продолжить, заполни небольшую анкету. 📄 Это займёт всего пару минут и поможет мне понять, подходит ли тебе позиция курьера-партнёра. 🚴 Продолжим?",
    {
      reply_markup: {
        keyboard: [
          [{ text: "Да" }, { text: "Не хочу быть курьером" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
});

// Логика ответов
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userMention = getUserMention(msg);

  // Инициализация состояния для нового пользователя
  if (!userState[chatId]) {
    userState[chatId] = { step: "/start", data: {} };
  }

  const state = userState[chatId];

  switch (state.step) {
    case "/start":
      if (text === "Не хочу быть курьером") {
        bot.sendMessage(
          chatId,
          "Буду рад, если ты передумаешь. Мы всегда можем продолжить. Я буду здесь! 👋",
          mainMenu
        );
        state.step = "/start";
      } else if (text === "Да") {
        bot.sendMessage(chatId, "Как я могу к тебе обращаться?");
        state.step = "askName";
      }
      break;

    case "askName":
      state.data.name = text;
      bot.sendMessage(chatId, `Сколько тебе лет, ${text}?`);
      state.step = "askAge";
      break;

    case "askAge":
      if (!/^\d+$/.test(text)) {
        bot.sendMessage(chatId, "Пожалуйста, введи корректный возраст (только цифры).");
        return;
      }
      const age = parseInt(text);
      state.data.age = age;

      if (age < 18) {
        bot.sendMessage(
          chatId,
          "К сожалению, курьером-партнёром Самоката можно стать только с 18 лет. 🥺\n\nВернуться в начало ↩️",
          mainMenu
        );
        state.step = "/start";
      } else {
        bot.sendMessage(chatId, "Какое у тебя гражданство?", {
          reply_markup: {
            keyboard: [
              [{ text: "РФ 🇷🇺" }, { text: "Другие страны 🇧🇾🇹🇯🇺🇿🇰🇬…" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        state.step = "askCitizenship";
      }
      break;

    case "askCitizenship":
      state.data.citizenship = text;
      bot.sendMessage(chatId, "Умеешь кататься на велосипеде? 🚴", {
        reply_markup: {
          keyboard: [
            [{ text: "Да" }, { text: "Нет" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      state.step = "askBike";
      break;

    case "askBike":
      state.data.bike = text;
      if (text === "Нет") {
        bot.sendMessage(
          chatId,
          "Иногда есть потребность в пеших курьерах. Если тебе это интересно, продолжим? ✅",
          {
            reply_markup: {
              keyboard: [
                [{ text: "Продолжаем" }, { text: "Вернуться в начало ↩️" }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
        state.step = "askContinue";
      } else {
        bot.sendMessage(
          chatId,
          "Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️",
          {
            reply_markup: {
              keyboard: [
                [{ text: "Конечно" }, { text: "Не думаю" }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
        state.step = "askWeight";
      }
      break;

    case "askContinue":
      if (text === "Продолжаем") {
        bot.sendMessage(chatId, "Иногда заказ, который везёт курьер, может весить 15-20 кг. Справишься? 🏋️", {
          reply_markup: {
            keyboard: [
              [{ text: "Конечно" }, { text: "Не думаю" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        state.step = "askWeight";
      } else {
        bot.sendMessage(chatId, "Возвращаемся в начало!", mainMenu);
        state.step = "/start";
      }
      break;

      case "askWeight":
    state.data.weight = text;
    if (text === "Не думаю") {
      bot.sendMessage(
        chatId,
        "Понял! Буду рад видеть тебя снова, если передумаешь. 👋",
        mainMenu
      );
      state.step = "/start";
    } else {
      bot.sendMessage(
        chatId,
        "Отлично! Думаю, ты подходишь! 🔥\n\nТеперь оставь свой номер телефона, чтобы HR-менеджер мог связаться с тобой. 📞\n\nОн поможет подобрать для тебя удобный центр формирования заказов, расскажет, что делать дальше, и ответит на все вопросы.\n\nНе волнуйся, я не храню введённые данные и не передаю их третьим лицам. 🔐",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      state.step = "askPhone";
    }
    break;


    case "askPhone":
      state.data.phone = text;
      const userInfo = `Новая заявка:\nИмя: ${state.data.name}\nВозраст: ${state.data.age}\nГражданство: ${state.data.citizenship}\nВелосипед: ${state.data.bike}\nВес заказов: ${state.data.weight || "Не указано"}\nТелефон: ${state.data.phone}\nID пользователя: ${userMention}`;
      bot.sendMessage(GROUP_CHAT_ID, userInfo);
      bot.sendMessage(
        chatId,
        "Спасибо! HR-менеджер свяжется с тобой в ближайшее время. ✅\n\nЗаявки обрабатываются ежедневно с 12:00 до 19:00. 🕐",
        mainMenu
      );
      state.step = "/start";
      break;

    default:
      bot.sendMessage(chatId, "Что-то пошло не так. Давайте начнем сначала.", mainMenu);
      state.step = "/start";
      break;
  }
});
