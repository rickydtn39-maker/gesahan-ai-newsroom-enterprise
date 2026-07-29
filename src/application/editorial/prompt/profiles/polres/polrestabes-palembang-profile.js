// FILE: src/application/editorial/prompt/profiles/polres/polrestabes-palembang-profile.js

export const PolrestabesPalembangProfile = Object.freeze({
  name: "Polrestabes Palembang Humas Profile",
  type: "POLRESTABES_PALEMBANG",
  fallbackCategory: "KEPOLISIAN",

  geminiCategoryRule: (reporterName) => `
⚠️ MANDATORY POLRESTABES PALEMBANG HUMAS SHIELD ACTIVE:
- Wartawan pengirim berita adalah: "${reporterName}" (Mitra Humas Polrestabes Palembang).
- Anda WAJIB mengarahkan kategori utama ke "KEPOLISIAN" pada objek "wordpress"."category" (Jangan arahkan ke KRIMINAL atau SUMSEL).
- Fokus Keyword wajib berkaitan erat dengan Polrestabes Palembang, Kamtibmas Palembang, atau Kota Palembang.
`,

  gptAngleInstruction: (_job) => `### PROMPT KHUSUS - MITRA HUMAS POLRESTABES PALEMBANG:
- Sunting naskah ini dengan gaya rilis pers resmi metropolitan yang responsif, dinamis, tegas, dan taktis khas Polrestabes Palembang.
- Tonjolkan tindakan respons cepat jajaran Polrestabes Palembang (Satreskrim, Satnarkoba, Satlantas, atau Polsek jajaran) dalam menindak kejahatan jalanan, 3C (Curas, Curat, Curanmor), narkotika, serta menjaga ketertiban Kota Palembang.
- WAJIB menyisipkan atau mengemas kutipan pernyataan Kapolrestabes Palembang dengan bahasa yang tegas, solutif, serta mencantumkan nama lengkap beserta gelar beliau secara akurat: "Kapolrestabes Palembang, Kombes Pol Harryo Sugihhartono, S.I.K., M.H." jika terdapat pernyataan atau imbauan kepolisian di dalam naskah.
- Fokuskan narasi pada respons cepat kepolisian dalam memberikan rasa aman yang konkrit kepada seluruh warga Kota Palembang.`,

  datelineRule: `- Paragraf pertama (lead) WAJIB diawali dengan Dateline Palembang secara eksklusif dengan format: "Palembang, Gesahannusantara - [Narasi]". Jangan gunakan lokasi lain!`,

  writingTone: [
    "Gaya penulisan metropolitan humas: Tegas, dinamis, solutif, respons cepat, menyoroti tindakan pencegahan kejahatan secara konkrit di perkotaan."
  ]
});