// FILE: src/core/utils/markdown.js

/**
 * Mengamankan karakter khusus Markdown dari kegagalan parsing Telegram API.
 * @param {string} text - Teks mentah yang akan dibersihkan.
 * @returns {string} Teks yang sudah aman untuk parser Markdown Telegram.
 */
export function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[_*`[\]]/g, '\\$&');
}
