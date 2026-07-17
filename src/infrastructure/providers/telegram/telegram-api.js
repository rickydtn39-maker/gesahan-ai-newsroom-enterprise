export class TelegramApi {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.fileBaseUrl = `https://api.telegram.org/file/bot${token}`;
  }

  async call(method, payload) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.description ?? `Telegram API ${response.status}`);
    }

    return result.result;
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      text,
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    return this.call('sendMessage', payload);
  }

  async getFile(fileId) {
    return this.call('getFile', {
      file_id: fileId,
    });
  }

  async downloadFile(fileId) {
    const file = await this.getFile(fileId);

    const response = await fetch(`${this.fileBaseUrl}/${file.file_path}`);

    if (!response.ok) {
      throw new Error('Failed to download Telegram file.');
    }

    return {
      fileName: file.file_path.split('/').pop(),

      mimeType: response.headers.get('content-type') ?? 'application/octet-stream',

      buffer: await response.arrayBuffer(),
    };
  }
}
