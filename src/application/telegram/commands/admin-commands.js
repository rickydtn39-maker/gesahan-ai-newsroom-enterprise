// FILE: src/application/telegram/commands/admin-commands.js

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

    list.push({
      userId: targetId,
      name,
      type: 'GENERAL', // Set default profil umum saat pertama kali ditambahkan
      addedAt: new Date().toISOString(),
    });
    await whitelistRepository.save(list);

    return telegramApi.sendMessage(
      update.chatId,
      `✅ *PENGGUNA BERHASIL DITAMBAHKAN!*\n\n• *Nama:* ${name}\n• *ID:* \`${targetId}\`\n• *Profil:* GENERAL (Umum)\n\nKini ${name} sudah bisa langsung menggunakan GESAHAN AI Newsroom.`
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
    return telegramApi.sendMessage(update.chatId, `❌ Gagal menghapus pengguna: ${error.message}`);
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
        const authorIndicator = u.wpUsername ? '✍️' : '👤';
        const profileIndicator = u.type ? `[${u.type}]` : '[GENERAL]';
        return `${idx + 1}. *${u.name}* (\`${u.userId}\`) ${profileIndicator} ${authorIndicator}`;
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

export async function setuserprofileCommand(update, telegramApi, whitelistRepository) {
  const text = update.text || '';
  const parts = text.split(/\s+/);

  if (parts.length < 3) {
    return telegramApi.sendMessage(
      update.chatId,
      [
        '⚠️ *Format Salah!*',
        '',
        'Gunakan perintah:',
        '`/setuserprofile [USER_ID] [PROFILE_TYPE]`',
        '',
        'Pilihan PROFILE_TYPE:',
        '• `GENERAL` (Profil Standar)',
        '• `POLRES_PAGARALAM` (Humas Polres Pagaralam)',
        '• `POLRESTABES_PALEMBANG` (Humas Polrestabes Palembang)',
        '',
        'Contoh:',
        '`/setuserprofile 987654321 POLRES_PAGARALAM`',
      ].join('\n')
    );
  }

  const targetId = Number(parts[1]);
  const profileType = parts[2].toUpperCase();

  const validTypes = ['GENERAL', 'POLRES_PAGARALAM', 'POLRESTABES_PALEMBANG'];
  if (!validTypes.includes(profileType)) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ *Tipe Profil Tidak Valid!*\n\nPilih salah satu dari: ${validTypes.map((t) => `\`${t}\``).join(', ')}`
    );
  }

  if (isNaN(targetId)) {
    return telegramApi.sendMessage(update.chatId, '❌ *ID Telegram Tidak Valid!*');
  }

  try {
    const list = await whitelistRepository.getAll();
    const userIndex = list.findIndex((u) => Number(u.userId) === targetId);

    if (userIndex === -1) {
      return telegramApi.sendMessage(
        update.chatId,
        `❌ ID Pengguna *${targetId}* tidak ditemukan dalam database whitelist.`
      );
    }

    list[userIndex] = {
      ...list[userIndex],
      type: profileType,
      profileUpdatedAt: new Date().toISOString(),
    };

    await whitelistRepository.save(list);

    return telegramApi.sendMessage(
      update.chatId,
      `✅ *PROFIL AKTIF BERHASIL DIKUNCI!*\n\n• Pengguna: *${list[userIndex].name}*\n• ID: \`${targetId}\`\n• Profil Baru: *${profileType}*\n\nSistem AI sekarang akan menerapkan SOP penulisan, template pimpinan, dan dateline khusus sesuai profil ini.`
    );
  } catch (error) {
    return telegramApi.sendMessage(
      update.chatId,
      `❌ Gagal mengubah profil pengguna: ${error.message}`
    );
  }
}
