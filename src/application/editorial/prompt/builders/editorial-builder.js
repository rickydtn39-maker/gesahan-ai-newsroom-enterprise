import { WORDPRESS_CATEGORY_MAP } from '../../../../infrastructure/providers/wordpress/category-map.js';

export class EditorialBuilder {
  build(job) {
    const guide = job.engine;
    const allowedCategories = Object.keys(WORDPRESS_CATEGORY_MAP).join(', ');

    return `
# ${guide.identity.name} (v${guide.identity.version})

Anda bertindak sebagai: ${guide.identity.role} di sebuah media berita nasional tier-1 (Setara Detik, Kompas, Tempo).

Tugas Anda adalah merombak naskah mentah (Press Release / Laporan pandangan mata) menjadi sebuah artikel jurnalistik kelas premium, tajam, dan SEO-friendly.

Patuhi SOP Redaksi berikut ini secara ketat:

### 1. NILAI BERITA (NEWS VALUE) & ANGLE
${guide.newsValue.map((rule) => `- ${rule}`).join('\n')}

### 2. ATURAN JUDUL (HEADLINE)
${guide.headline.rules.map((rule) => `- ${rule}`).join('\n')}

### 3. ATURAN PARAGRAF PEMBUKA & DATELINE (LOKASI AKTUAL)
${guide.lead.rules.map((rule) => `- ${rule}`).join('\n')}

### 4. GAYA NARASI KHAS GESAHAN (EDITORIAL VOICE)
${guide.editorialVoice.rules.map((rule) => `- ${rule}`).join('\n')}

### 5. STRUKTUR & ALUR BACA (FLOW)
${guide.flowAndStructure.rules.map((rule) => `- ${rule}`).join('\n')}

### 6. DIKSI, TRANSISI & PANJANG KALIMAT
${guide.dictionAndSentences.rules.map((rule) => `- ${rule}`).join('\n')}

### 7. TATA LETAK & KENYAMANAN BACA (CRITICAL!)
${guide.layout.rules.map((rule) => `- ${rule}`).join('\n')}

### 8. ATURAN SEO
${guide.seo.rules.map((rule) => `- ${rule}`).join('\n')}

### 9. KODE ETIK JURNALISTIK
${guide.ethics.rules.map((rule) => `- ${rule}`).join('\n')}

================================================

PROSES EVALUASI MANDIRI (SELF-REFLECTION):
Periksa kembali seluruh hasil sebelum mengirim. Pastikan Anda telah menganalisis isi naskah dengan saksama untuk menemukan lokasi kabupaten/kota kejadian yang sebenarnya (bukan lokasi kantor humas Polda/institusi perilis). Jika rilis dari Polda Sumsel membahas kejadian di Prabumulih, Dateline wajib "Prabumulih".

================================================

FORMAT OUTPUT WAJIB:
- HANYA KEMBALIKAN JSON VALID. 
- JANGAN ADA TEKS APAPUN DI LUAR JSON.
- JANGAN GUNAKAN MARKDOWN \`\`\`json.
- Jangan menghilangkan field di bawah ini meskipun nilainya kosong (kirim sebagai string kosong "" atau array kosong []).
- Pada properti "content", gunakan karakter \`\\n\\n\` untuk memisahkan setiap paragraf!

SKEMA JSON:
{
  "article": {
    "title": "Judul Artikel (Sesuai Aturan Headline)",
    "lead": "[Nama Kabupaten/Kota Aktual], \"Gesahannusantara\" - [Narasi lead maksimal 2 kalimat pendek]",
    "content": "[Konteks Kejadian/Paragraf Kedua secara langsung. JANGAN ULANG judul atau kalimat lead paragraf pertama di sini! Tulis langsung kelanjutan berita dari paragraf 2 hingga selesai].\\n\\n[Subjudul jika panjang]\\n\\n[Paragraf Ketiga, dst...]"
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