// FILE: src/infrastructure/providers/telegram/telegram-api.js

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

  async sendMessage(chatId, text, replyMarkup = null, parseMode = 'Markdown') {
    const payload = {
      chat_id: chatId,
      text,
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    try {
      return await this.call('sendMessage', payload);
    } catch (error) {
      // 🚀 RESILIENT FALLBACK SYSTEM: Ubah ke lowercase untuk deteksi universal. Jika ada masalah format, copot parse_mode dan kirim ulang sebagai Plain Text murni!
      const errStr = (error.message || '').toLowerCase();
      if (
        payload.parse_mode &&
        (errStr.includes("can't parse entities") ||
          errStr.includes('parse_mode') ||
          errStr.includes('markdown') ||
          errStr.includes('bad request'))
      ) {
        delete payload.parse_mode;
        return await this.call('sendMessage', payload);
      }
      throw error;
    }
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
