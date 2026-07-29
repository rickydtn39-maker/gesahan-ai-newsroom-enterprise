// FILE: src/application/editorial/prompt/rules/ai-bypass-rules.js

export const AI_BYPASS_RULES = Object.freeze({
  bannedCliches: [
    "DILARANG keras menggunakan frasa AI generik seperti: 'Dalam upaya tersebut', 'Sebagai bentuk komitmen', 'Hal ini menunjukkan', 'Langkah ini merupakan', 'Dalam rangka', 'Berdasarkan informasi yang dihimpun', 'Kembali menegaskan'.",
    "DILARANG keras membuat dramatisasi hiperbola atau menggunakan kata sifat subjektif yang tidak ada di naskah sumber."
  ],
  flowOptimizations: [
    "Gunakan kata transisi alami untuk menghubungkan antar-paragraf (Sementara itu, Di sisi lain, Namun, Tak lama kemudian, Menanggapi hal tersebut, Di tempat terpisah).",
    "Gunakan variasi kata ganti yang kaya sesuai konteks (ia, tersangka, pelaku, penyidik, kapolres, aparat, petugas) agar tidak terjadi pengulangan subjek."
  ]
});