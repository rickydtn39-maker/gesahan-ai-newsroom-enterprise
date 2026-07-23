// FILE: src/application/telegram/keyboards/theme-selection-keyboard.js

export function createThemeSelectionKeyboard(themes) {
  const buttons = themes.map((theme) => [
    {
      text: `🎯 Tema ${theme.id}: ${theme.themeTitle.substring(0, 30)}...`
    }
  ]);
  
  // Menggunakan tombol penutup sesi yang lebih profesional dan terintegrasi
  buttons.push([{ text: '🏁 Selesai & Tutup' }]);

  return {
    keyboard: buttons,
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}