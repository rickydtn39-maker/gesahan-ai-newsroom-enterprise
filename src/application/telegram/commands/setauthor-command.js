export async function setAuthorCommand(update, telegramApi, whitelistRepository) {
  const text = update.text || '';
  const parts = text.split(/\s+/);

  if (parts.length < 3) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠️ *Format Salah!*',
        '',
        'Gunakan perintah:',
        '`/setauthor [WP_USERNAME] [WP_APP_PASSWORD]`',
        '',
        'Contoh:',
        '`/setauthor ricky_reporter gHjK-1234-aBcd-9999`',
        '',
        '*PENTING:* Anda harus terdaftar di whitelist dinamis terlebih dahulu sebelum dapat menggunakan fitur Multi-Author ini.'
      ].join('\n')
    );
  }

  const wpUsername = parts[1];
  const wpAppPassword = parts.slice(2).join(' ');

  try {
    const list = await whitelistRepository.getAll();
    const userId = Number(update.userId);

    const userIndex = list.findIndex((u) => Number(u.userId) === userId);
    if (userIndex === -1) {
      return telegramApi.sendMessage(
        update.chatId,
        '❌ *AKSES DITOLAK*\n\nAnda belum terdaftar di whitelist bot ini. Silakan hubungi Super Admin untuk mendaftarkan ID Anda terlebih dahulu.'
      );
    }

    // Update profil whitelist user dengan kredensial WordPress
    list[userIndex] = {
      ...list[userIndex],
      wpUsername,
      wpAppPassword,
      wpConfiguredAt: new Date().toISOString()
    };

    await whitelistRepository.save(list);

    return telegramApi.sendMessage(
      update.chatId,
      [
        '✅ *KREDENSIAL PENULIS BERHASIL DISIMPAN!*',
        '',
        `• *Nama:* ${list[userIndex].name}`,
        `• *WP Username:* \`${wpUsername}\``,
        '• *WP App Password:* `••••-••••-••••-••••`',
        '',
        'Mulai sekarang, seluruh artikel yang Anda terbitkan akan ditulis langsung atas nama akun WordPress Anda sendiri!'
      ].join('\n')
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal memproses kredensial penulis: ${error.message}`
    );
  }
}