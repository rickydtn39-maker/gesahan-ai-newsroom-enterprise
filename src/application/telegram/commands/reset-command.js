// FILE: src/application/telegram/commands/reset-command.js

import { QueueManager } from '../../../infrastructure/queue/queue-manager.js';
import { createMainKeyboard } from '../keyboards/index.js';

export async function resetCommand(update, telegramApi, sessionManager, container) {
  const chatId = update.chatId;

  try {
    // 1. Hapus draf sesi lokal yang aktif
    if (chatId) {
      await sessionManager.cancel(chatId);
    }

    // 2. Sapu bersih antrean global KV secara total
    await QueueManager.clearGlobalQueue(container);

    return await telegramApi.sendMessage(
      chatId,
      [
        '🔄 *SISTEM BERHASIL DI-RESET DARURAT!*',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '• Sesi draf aktif Anda telah dihapus.',
        '• Seluruh antrean global KV telah disapu bersih.',
        '• Kunci pemrosesan AI telah dilepaskan.',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Sistem kini telah kembali normal dan siap menerima naskah baru. Silakan klik tombol di bawah untuk memulai.',
      ].join('\n'),
      createMainKeyboard()
    );
  } catch (error) {
    return await telegramApi.sendMessage(
      chatId,
      `❌ Gagal melakukan reset sistem: ${error.message}`
    );
  }
}
