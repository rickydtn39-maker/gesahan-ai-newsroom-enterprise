// FILE: src/application/editorial/prompt/profiles/gesahan/gesahan-general-profile.js

export const GesahanGeneralProfile = Object.freeze({
  name: "Gesahan General Profile",
  type: "GENERAL",
  fallbackCategory: null, // Dinamis menggunakan klasifikasi Gemini

  geminiCategoryRule: (_reporterName) => `
* Tentukan kategori dari daftar valid secara objektif berdasarkan isi naskah berita secara murni.
`,

  gptAngleInstruction: (job) => job.angle
    ? `### ANGLE UTAMA YANG DIINSTRUKSIKAN WARTAWAN (WAJIB INJECT DAN JADIKAN SUDUT PANDANG UTAMA):\n- ${job.angle}`
    : `### ANGLE / SUDUT PANDANG PENULISAN:\n- Tentukan angle terbaik secara otomatis berdasarkan nilai berita tertinggi (default AI).`,

  datelineRule: `- Paragraf pertama (lead) WAJIB diawali dengan Dateline lokasi kejadian aktual dengan format: "[Nama Kabupaten/Kota], Gesahannusantara - [Narasi]". Jangan gunakan lokasi institusi perilis pers jika lokasi kejadian aslinya berbeda!`,
  
  writingTone: [
    "Tulis dengan gaya narasi khas jurnalis lapangan senior yang profesional, berwibawa, lincah, dinamis, dan objektif.",
    "Bangun ketegangan melalui penyajian fakta-fakta konkrit, bukan drama kata-kata."
  ]
});