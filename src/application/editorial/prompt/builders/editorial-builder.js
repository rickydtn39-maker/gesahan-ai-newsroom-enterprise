import { WORDPRESS_CATEGORY_MAP } from '../../../../infrastructure/providers/wordpress/category-map.js';

export class EditorialBuilder {
  buildGeminiPass(job) {
    const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
    
    return `
# KANALISASI & ANALISIS SEO (GEMINI ENGINE)

Tugas Anda adalah menganalisis naskah mentah berikut, lalu mengekstrak Focus Keyword terbaik, deskripsi penelusuran (meta description), kanal kategori yang cocok, serta tanda pengenal tags yang relevan.

### DAFTAR KATEGORI SANGAT WAJIB PILIH SALAH SATU:
[${allowedCategories}]

================================================

FORMAT OUTPUT WAJIB:
- HANYA KEMBALIKAN JSON VALID. 
- JANGAN ADA TEKS APAPUN DI LUAR JSON.
- Jangan menghilangkan field di bawah ini.

SKEMA JSON OUTPUT:
{
  "seo": {
    "focusKeyword": "Satu kata kunci fokus utama yang paling dicari",
    "metaDescription": "Deskripsi ringkas memikat pembaca untuk hasil pencarian Google",
    "category": "Pilih satu kategori yang paling cocok dari daftar di atas",
    "tags": ["tag1", "tag2", "tag3", "tag4"]
  }
}

================================================

NASKAH MENTAH SUMBER:
${job.source.text}
`;
  }

  buildChatGptPass(job, geminiResult) {
    const guide = job.engine;
    const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');
    
    return `
# ${guide.identity.name} (v${guide.identity.version}) - Premium Writing Pass

Anda bertindak sebagai: ${guide.identity.role} di sebuah media berita nasional tier-1 (Setara Detik, Kompas, Tempo).

Tugas Anda adalah menulis ulang naskah mentah menjadi sebuah artikel berita premium dengan gaya naratif khas GESAHAN yang tajam, berwibawa, sangat hidup, dan memiliki transisi mengalir yang alami.

Target Optimasi Kata Kunci SEO: "${geminiResult.seo.focusKeyword}"

================================================

PROSES BERPIKIR REDAKTUR (EDITORIAL THINKING - WAJIB LAKUKAN SEBELUM MENULIS):
Sebelum mulai menulis, lakukan langkah analisis internal berikut:
1. Analisis nilai berita (news value) dari naskah sumber.
2. Tentukan angle berita yang paling kuat, tajam, dan menarik bagi pembaca nasional.
3. Susun urutan informasi terbaik dari yang paling krusial hingga informasi pendukung (modified inverted pyramid).
4. Baru mulai menulis artikel secara utuh. Jangan langsung melakukan parafrase mekanis kalimat demi kalimat.

================================================

PANDUAN DAN SOP REDAKSI SANGAT KETAT:

### 1. NILAI BERITA (NEWS VALUE) & ANGLE
${guide.newsValue.map((rule) => `- ${rule}`).join('\n')}

### 2. ATURAN JUDUL (HEADLINE)
${guide.headline.rules.map((rule) => `- ${rule}`).join('\n')}

### 3. ATURAN PARAGRAF PEMBUKA & DATELINE (LOKASI AKTUAL)
${guide.lead.rules.map((rule) => `- ${rule}`).join('\n')}

### 4. GAYA NARASI KHAS GESAHAN (EDITORIAL VOICE & ANTI-AI PATTERNS)
${guide.editorialVoice.rules.map((rule) => `- ${rule}`).join('\n')}

### 5. STRUKTUR & ALUR BACA (FLOW)
${guide.flowAndStructure.rules.map((rule) => `- ${rule}`).join('\n')}

### 6. DIKSI, TRANSISI & KATA GANTI
${guide.dictionAndSentences.rules.map((rule) => `- ${rule}`).join('\n')}

### 7. TATA LETAK & KELONSETAN BACA (LAYOUT)
${guide.layout.rules.map((rule) => `- ${rule}`).join('\n')}

### 8. ATURAN PENGELOLAAN KUTIPAN (QUOTE HANDLING)
${guide.quotes.rules.map((rule) => `- ${rule}`).join('\n')}

### 9. VERIFIKASI DATA DAN AKURASI (FACT CHECKING)
${guide.factChecking.rules.map((rule) => `- ${rule}`).join('\n')}

### 10. ETIKA JURNALISTIK & NETRALITAS
${guide.ethics.rules.map((rule) => `- ${rule}`).join('\n')}

### 11. ATURAN SEO DETAIL
${guide.seo.rules.map((rule) => `- ${rule}`).join('\n')}

================================================

TINDAKAN YANG DILARANG KERAS (PROHIBITED):
- DILARANG menyalin struktur kalimat mentah dari naskah sumber.
- DILARANG menyalin urutan paragraf atau alur kalimat asli naskah sumber.
- DILARANG menulis ulang secara parafrase mekanis/kaku.
- DILARANG menambahkan opini pribadi penulis atau kesimpulan subjektif di luar fakta rilis.

TINDAKAN YANG WAJIB DILAKUKAN (MANDATORY):
- WAJIB membangun ulang artikel dengan alur naratif baru yang segar, dinamis, dan hidup tanpa mengubah fakta sedikit pun.
- WAJIB memulai bagian "content" langsung dari PARAGRAF KEDUA (body copy). Dilarang keras mengulang judul, lead, dateline, atau kalimat pembuka yang sudah ditulis di properti "lead" JSON.

================================================

TARGET KUALITAS REDAKSI (QUALITY TARGET):
Artikel yang Anda hasilkan harus memenuhi kualifikasi bintang lima berikut:
★★★★★ Layak dipublikasikan langsung di halaman depan media berita nasional besar.
★★★★★ Tidak boleh terdeteksi atau terasa sebagai tulisan buatan AI (Zero AI Footprint).
★★★★★ Mengalir sangat alami, renyah dibaca, memiliki variasi struktur kalimat yang kaya dan dinamis.
★★★★★ Mudah dan nyaman dibaca di layar ponsel (mobile-friendly layout).
★★★★★ Bebas dari gaya penulisan birokratis, kaku, monoton, atau sekadar hasil terjemahan kaku.

================================================

CHECKLIST EVALUASI MANDIRI (SELF-REVIEW) - LAKUKAN SEBELUM MENGIRIM HASIL AKHIR:
Sebelum mengirimkan output JSON, centang checklist internal Anda secara ketat:
[✓] Apakah lead sudah diawali dengan dateline lokasi kejadian aktual yang benar?
[✓] Apakah Focus Keyword sudah disisipkan secara alami di judul dan lead tanpa dipaksakan?
[✓] Apakah seluruh nama orang, ejaan gelar, angka, tanggal, dan lokasi identik 100% dengan sumber?
[✓] Apakah tidak ada fakta fiktif atau data tambahan yang dikarang?
[✓] Apakah tidak ada pengulangan kalimat atau pengulangan subjek yang monoton?
[✓] Apakah tidak ada paragraf yang berisi lebih dari 3 kalimat?
[✓] Apakah tidak ada dua subjudul (###) yang tertulis berturut-turut tanpa jeda paragraf?
[✓] Apakah tulisan benar-benar terasa ditulis oleh jurnalis manusia profesional dengan karakter khas GESAHAN?

================================================

FORMAT OUTPUT WAJIB:
- HANYA KEMBALIKAN JSON VALID. 
- JANGAN ADA TEKS APAPUN DI LUAR JSON (Dilarang menyertakan salam pembuka, penutup, atau catatan kaki).
- JANGAN GUNAKAN MARKDOWN FENCES \`\`\`json ATAU \`\`\`.
- Semua string JSON wajib menggunakan tanda kutip ganda yang valid.
- Tidak boleh ada trailing comma (koma menggantung di akhir properti JSON).
- Tidak boleh ada komentar kode di dalam JSON.
- Jangan menghilangkan field di bawah ini meskipun nilainya kosong (kirim sebagai string kosong "").
- Pada properti "content", gunakan karakter \`\\n\\n\` untuk memisahkan setiap paragraf!

SKEMA JSON OUTPUT:
{
  "article": {
    "title": "Judul Artikel (Sesuai Aturan Headline & mengandung kata kerja aktif)",
    "lead": "[Nama Kabupaten/Kota Aktual], 'Gesahannusantara' - [Narasi lead maksimal 2 kalimat pendek yang mengandung fact-based hook]",
    "content": "[Konteks Kejadian/Paragraf Kedua secara langsung. JANGAN ULANG judul, lead, dateline, atau kalimat pembuka! Tulis langsung kelanjutan berita dari paragraf kedua hingga selesai].\\n\\n[Subjudul jika panjang]\\n\\n[Paragraf Ketiga, dst...]"
  },
  "seo": {
    "focusKeyword": "Satu keyword utama",
    "metaDescription": "Deskripsi meta untuk SEO",
    "category": "Pilih satu: [${allowedCategories}]",
    "tags": ["tag1", "tag2", "tag3", "tag4"]
  }
}

================================================

NASKAH MENTAH SUMBER:
${job.source.text}
`;
  }
}