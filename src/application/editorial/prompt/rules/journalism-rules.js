// FILE: src/application/editorial/prompt/rules/journalism-rules.js

export const JOURNALISM_RULES = Object.freeze({
  coreEthics: [
    "Pegang teguh asas praduga tak bersalah (gunakan istilah 'diduga', 'terduga pelaku', 'disangka').",
    'Bedakan secara tegas antara fakta empiris di lapangan, opini narasumber, dan opini pribadi (opini pribadi dilarang keras).',
    'Jaga netralitas mutlak, dilarang keras memihak, menyudutkan, atau melebih-lebihkan fakta tanpa bukti konkrit.',
  ],
  invertedPyramid: [
    'Gunakan struktur piramida terbalik (Lead/Fakta Utama -> Kronologi -> Kutipan Utama -> Informasi Pendukung -> Penutup).',
    'Paragraf kedua wajib langsung menyambung alur lead tanpa mengulang judul atau ringkasan lead.',
  ],
  quoteHandling: [
    'Kutipan langsung wajib identik 100% dengan naskah sumber (dilarang mengubah substansi kata).',
    'Kutipan yang terlalu panjang atau bertele-tele wajib dikemas menjadi kutipan tidak langsung yang padat dan presisi.',
  ],
});
