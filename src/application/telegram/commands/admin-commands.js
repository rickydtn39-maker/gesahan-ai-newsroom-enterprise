export async function addUserCommand(update, telegramApi, whitelistRepository) {
  const text = update.text || '';
  const parts = text.split(/\s+/);
  
  if (parts.length < 3) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ *Format Salah!*\n\nGunakan perintah:\n`/adduser [USER_ID] [NAMA]`\n\nContoh:\n`/adduser 987654321 Budi Utomo`'
    );
  }

  const targetId = Number(parts[1]);
  const name = parts.slice(2).join(' ');

  if (isNaN(targetId)) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ *ID Tidak Valid!* ID Telegram harus berupa deretan angka.'
    );
  }

  try {
    const list = await whitelistRepository.getAll();
    
    // Periksa apakah ID sudah terdaftar
    const existing = list.find((u) => Number(u.userId) === targetId);
    if (existing) {
      return telegramApi.sendMessage(
        update.chatId,
        `ℹ️ Pengguna dengan ID *${targetId}* sudah terdaftar sebelumnya sebagai *${existing.name}*.`
      );
    }

    list.push({ userId: targetId, name, addedAt: new Date().toISOString() });
    await whitelistRepository.save(list);

    return telegramApi.sendMessage(
      update.chatId,
      `✅ *PENGGUNA BERHASIL DITAMBAHKAN!*\n\n• *Nama:* ${name}\n• *ID:* \`${targetId}\`\n\nKini Budi sudah bisa langsung menggunakan GESAHAN AI Newsroom.`
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal menambahkan pengguna: ${error.message}`
    );
  }
}

export async function delUserCommand(update, telegramApi, whitelistRepository) {
  const text = update.text || '';
  const parts = text.split(/\s+/);

  if (parts.length < 2) {
    return telegramApi.sendMessage(
      update.chatId,
      '⚠️ *Format Salah!*\n\nGunakan perintah:\n`/deluser [USER_ID]`\n\nContoh:\n`/deluser 987654321`'
    );
  }

  const targetId = Number(parts[1]);

  if (isNaN(targetId)) {
    return telegramApi.sendMessage(
      update.chatId,
      '❌ *ID Tidak Valid!* ID Telegram harus berupa deretan angka.'
    );
  }

  try {
    const list = await whitelistRepository.getAll();
    const filteredList = list.filter((u) => Number(u.userId) !== targetId);

    if (list.length === filteredList.length) {
      return telegramApi.sendMessage(
        update.chatId,
        `❌ ID *${targetId}* tidak ditemukan dalam daftar database dinamis.`
      );
    }

    await whitelistRepository.save(filteredList);

    return telegramApi.sendMessage(
      update.chatId,
      `🗑️ *AKSES DICABUT!*\n\nID pengguna *${targetId}* telah dihapus dari sistem database dinamis.`
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal menghapus pengguna: ${error.message}`
    );
  }
}

export async function listUsersCommand(update, telegramApi, whitelistRepository) {
  try {
    const list = await whitelistRepository.getAll();

    if (list.length === 0) {
      return telegramApi.sendMessage(
        update.chatId,
        'ℹ️ Belum ada pengguna tambahan yang terdaftar di database dinamis.'
      );
    }

    const report = list
      .map((u, idx) => {
        const authorIndicator = (u.wpUsername) ? '✍️' : '👤';
        return `${idx + 1}. *${u.name}* (\`${u.userId}\`) ${authorIndicator}`;
      })
      .join('\n');

    return telegramApi.sendMessage(
      update.chatId,
      `📋 *DAFTAR PENGGUNA BOT (DINAMIS):*\n\n${report}\n\n_Catatan:\n- ✍️ = Sudah mengatur akun WordPress penulis.\n- 👤 = Belum mengatur akun (Fallback ke Admin).\n- Pengguna super admin (environment) tidak masuk dalam daftar ini._`
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal memanggil daftar pengguna: ${error.message}`
    );
  }
}