export class TelegramApi {
  constructor(token) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async call(method, payload) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(
        `Telegram API error: ${result.description ?? response.status}`
      );
    }

    return result;
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      text
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    return this.call('sendMessage', payload);
  }

  async setWebhook(url) {
    return this.call('setWebhook', {
      url
    });
  }

  async deleteWebhook() {
    return this.call('deleteWebhook', {});
  }
}