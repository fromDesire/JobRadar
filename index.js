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
