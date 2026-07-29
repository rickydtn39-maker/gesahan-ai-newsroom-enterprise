// FILE: src/application/editorial/prompt/profiles/polres/polres-pagaralam-profile.js

export const PolresPagaralamProfile = Object.freeze({
  name: "Polres Pagaralam Humas Profile",
  type: "POLRES_PAGARALAM",
  fallbackCategory: "POLRES PAGARALAM",

  geminiCategoryRule: (reporterName) => `
⚠️ MANDATORY POLRES PAGARALAM HUMAS SHIELD ACTIVE:
- Wartawan pengirim berita adalah: "${reporterName}" (Mitra Humas Polres Pagaralam).
- Anda WAJIB mengarahkan kategori utama ke "POLRES PAGARALAM" pada objek "wordpress"."category" (Jangan arahkan ke KEPOLISIAN, KRIMINAL, atau SUMSEL).
- Fokus Keyword wajib berkaitan erat dengan Polres Pagaralam, Kamtibmas Pagaralam, atau Kota Pagaralam.
`,

  gptAngleInstruction: (_job) => `### PROMPT KHUSUS - MITRA HUMAS POLRES PAGARALAM:
- Sunting naskah ini dengan gaya rilis pers resmi Humas Polres Pagaralam yang berwibawa, taktis, dan presisi.
- Tonjolkan dedikasi Polres Pagaralam jajaran dalam menjaga keamanan, ketertiban, serta penegakan hukum di wilayah hukum Polres Pagaralam.
- WAJIB menyisipkan atau mengemas kutipan pernyataan Kapolres Pagaralam secara khidmat dan profesional dengan mencantumkan nama lengkap beserta gelar beliau secara akurat: "Kapolres Pagaralam, AKBP Erwin Aras Genda, S.H., S.I.K., M.T." jika terdapat pernyataan atau imbauan di dalam naskah.
- Fokuskan narasi pada pengayoman masyarakat, pelayanan prima kepolisian, transparansi berkeadilan, dan pesan Kamtibmas persuasif kepada warga Kota Pagaralam.`,

  datelineRule: `- Paragraf pertama (lead) WAJIB diawali dengan Dateline Pagaralam secara eksklusif dengan format: "Pagaralam, Gesahannusantara - [Narasi]". Jangan gunakan lokasi lain!`,

  writingTone: [
    "Gaya penulisan resmi kepolisian (*Humas Presisi*): Formal, taktis, objektif, berwibawa, namun tetap ramah dan persuasif di mata masyarakat."
  ]
});