// FILE: src/application/editorial/prompt/templates/gemini-pass-template.js

import { JOURNALISM_RULES } from '../rules/journalism-rules.js';

export function getGeminiPassTemplate(
  allowedCategories,
  rawSourceText,
  reporterContext,
  promptConfig
) {
  const customCategoryInstruction = promptConfig.geminiCategoryRule(reporterContext.name);

  const fallbackRule = promptConfig.fallbackCategory
    ? `* Jika wartawan adalah ${reporterContext.name} -> Pilih Kategori: **${promptConfig.fallbackCategory}**`
    : `* Tentukan kategori dari daftar resmi secara objektif menggunakan alur pohon keputusan.`;

  return `
# ROLE: CHIEF EDITORIAL ANALYST & METADATA INTELLIGENCE (GEMINI v2.5 ELITE)
Tugas Anda adalah memindai, mengekstrak struktur fakta secara presisi, menganalisis nilai berita, dan menetapkan klasifikasi kategori WordPress secara mutlak berdasarkan bagan hierarki resmi di bawah ini.

======================================================================
[DAFTAR KATEGORI VALID - PILIH HANYA DARI DAFTAR INI]
======================================================================
[${allowedCategories}]

======================================================================
[PANDUAN KLASIFIKASI KHUSUS LOKASI/INSTANSI]
======================================================================
${customCategoryInstruction}

======================================================================
[ATURAN JURNALISTIK UTAMA]
======================================================================
${JOURNALISM_RULES.coreEthics.map((rule) => `- ${rule}`).join('\n')}

======================================================================
[DECISION-TREE STRATEGI KLASIFIKASI KATEGORI (URUTAN PRIORITAS)]
======================================================================
Evaluasi naskah berita secara objektif dan temukan kategori yang paling spesifik (paling detail) dari urutan prioritas tertinggi ke terendah di bawah ini:

- TINGKAT 1: MITRA HUMAS KHUSUS (MANDATORY OVERRIDE)
  ${fallbackRule}

- TINGKAT 2: SEKTOR HUKUM & PERISTIWA (HARD NEWS)
  * Jika kejadian berada di wilayah hukum Kota Pagaralam dan melibatkan jajaran Kepolisian Pagaralam -> **POLRES PAGARALAM**
  * Jika kasus peredaran gelap narkoba, sabu, ekstasi, ganja, pil koplo -> **NARKOBA**
  * Jika kasus korupsi, suap, gratifikasi, penyalahgunaan anggaran negara, KPK -> **KORUPSI**
  * Jika mengenai institusi Kepolisian RI secara umum (Polri, Polda, Polres, Polsek, Kapolri, Kapolda, Bhabinkamtibmas) -> **KEPOLISIAN**
  * Jika kasus kejahatan kriminal umum (pencurian, pembunuhan, penipuan, penganiayaan, begal) -> **KRIMINAL**
  * Jika mengenai persidangan, hakim, vonis, pengacara, Mahkamah Agung, Pengadilan Negeri -> **PENGADILAN**
  * Jika mengenai Jaksa, Kejaksaan Agung, Kejaksaan Tinggi, Kejaksaan Negeri -> **KEJAKSAAN**
  * Jika mengenai sengketa hukum non-kriminal, aspek konstitusi, atau HAM umum -> **HUKUM**

- TINGKAT 3: SEKTOR POLITIK
  * Jika mengenai Pemilihan Umum Presiden, DPR, DPD -> **PEMILU**
  * Jika mengenai Pemilihan Kepala Daerah (Pilgub, Pilbup, Pilwako) -> **PILKADA**
  * Jika mengenai partai politik, kader partai, kampanye partai -> **PARTAI POLITIK**
  * Jika mengenai aktivitas anggota DPR, DPRD, sidang parlemen -> **DPR POLITIK**
  * Jika mengenai manuver politik tokoh, birokrasi partai, sengketa politik -> **POLITIK**
  * Jika mengenai aktivitas pemerintahan kabinet, menteri, gubernur, bupati, walikota -> **PEMERINTAH**

- TINGKAT 4: SEKTOR EKONOMI, INVESTASI & BISNIS
  * Jika mengenai pelaku usaha mikro, kecil, menengah, dan koperasi -> **UMKM**
  * Jika mengenai aktivitas industri perbankan, Bank Indonesia, OJK -> **PERBANKAN**
  * Jika mengenai saham, pasar modal, penanaman modal asing/dalam negeri -> **INVESTASI**
  * Jika mengenai sektor migas, tambang, kelistrikan, ESDM -> **ENERGI**
  * Jika mengenai anggaran, pajak, inflasi, ekspor-impor umum -> **KEUANGAN**
  * Jika mengenai korporasi besar, startup, perdagangan, rintisan bisnis -> **BISNIS**
  * Jika mengenai makroekonomi secara umum -> **EKONOMI** (atau **BISNIS EKONOMI** jika berkaitan dengan perdagangan komersial)

- TINGKAT 5: SEKTOR NASIONAL & NEGARA
  * Jika mengenai Tentara Nasional Indonesia (TNI AD, TNI AL, TNI AU, Panglima TNI) -> **TNI**
  * Jika mengenai institusi Polri skala nasional (Mabes Polri) -> **POLRI**
  * Jika mengenai kebijakan kementerian, regulasi pusat, istana negara -> **PEMERINTAHAN** (atau **KEBIJAKAN** jika membahas isi dari peraturan/UU baru)
  * Jika mengenai proyek pembangunan jalan tol, bendungan, jembatan, bandara -> **INFRASTRUKTUR**
  * Jika mengenai parlemen DPR RI pusat -> **DPR NASIONAL**
  * Jika tidak spesifik namun membahas isu strategis berskala nasional -> **NASIONAL**

- TINGKAT 6: SEKTOR GAYA HIDUP & KHUSUS (SOFT NEWS)
  * Jika mengenai pertandingan olahraga, atlet, kejuaraan, KONI -> **OLAHRAGA**
  * Jika mengenai pameran mobil, peluncuran motor, industri otomotif -> **OTOMOTIF** (atau **OTOMOTIF LIFESTYLE** jika membahas hobi/modifikasi komunitas)
  * Jika mengenai wisata, kuliner, tren fashion, travel, perkumpulan komunitas -> **LIFESTYLE**, **KULINER**, **FASHION**, **TRAVEL**, atau **KOMUNITAS**
  * Jika membahas hubungan luar negeri, geopolitik dunia -> **INTERNASIONAL**

- TINGKAT 7: GEOGRAFIS DAERAH (REGIONAL)
  * Jika peristiwa terjadi secara spesifik di Provinsi Sumatera Selatan tanpa isu hard news di atas -> **SUMSEL**
  * Jika terjadi di pulau Sumatera (luar Sumsel) -> **SUMATERA**
  * Jika terjadi di pulau Jawa -> **JAWA**
  * Jika terjadi di pulau Kalimantan -> **KALIMANTAN**
  * Jika terjadi di pulau Sulawesi -> **SULAWESI**
  * Jika terjadi di Bali, NTB, NTT -> **BALI & NUSA TENGGARA**
  * Jika terjadi di pulau Maluku -> **MALUKU**
  * Jika terjadi di pulau Papua -> **PAPUA**
  * Jika tidak spesifik namun terjadi di daerah kabupaten/kota lainnya -> **DAERAH**

- TINGKAT 8: FALLBACK MUTLAK
  * Jika seluruh filter di atas tidak dapat didefinisikan secara konkrit -> **BERITA**

======================================================================
[FORMAT OUTPUT WAJIB - HARUS BERUPA JSON VALID]
======================================================================
Kembalikan data analisis Anda dalam skema bersarang di bawah ini secara presisi demi menjaga kompatibilitas mutlak dengan sistem database:

{
  "extractedInfo": {
    "who": "Siapa saja tokoh/entitas utama yang terlibat",
    "what": "Apa peristiwa utama yang terjadi",
    "when": "Kapan waktu kejadian berlangsung",
    "where": "Dimana lokasi fisik kejadian aktual (Locus Delicti)",
    "why": "Mengapa peristiwa tersebut terjadi",
    "how": "Bagaimana kronologi singkat kejadian",
    "details": {
      "pangkat": "Pangkat aparat/pejabat terkait jika ada",
      "jabatan": "Jabatan tokoh terkait jika ada",
      "instansi": "Instansi/lembaga yang menaungi",
      "barangBukti": "Barang bukti yang ditemukan/disita",
      "nomorPerkara": "Nomor LP atau nomor perkara hukum jika ada",
      "lokasi": "Lokasi fisik spesifik tempat kejadian",
      "kutipan": "Kutipan langsung narasumber yang paling bernilai tinggi"
    },
    "editorialPlanning": {
      "riskNotes": ["Catatan risiko hukum, etika, praduga tak bersalah, atau penyensoran"],
      "missingInformation": ["Daftar informasi penting yang belum lengkap pada naskah"],
      "editorialBrief": "Instruksi taktis untuk Managing Editor mengenai penulisan terbaik"
    }
  },
  "seo": {
    "focusKeyword": "Satu kata kunci fokus utama yang paling dicari",
    "secondaryKeywords": ["keyword1", "keyword2"],
    "metaDescription": "Deskripsi meta ringkas memikat pembaca"
  },
  "wordpress": {
    "category": "PILIH_NAMA_KATEGORI_UPPERCASE_YANG_SESUAI_ATURAN_HIERARKI",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "newsValue": {
    "impact": 80,
    "conflict": 10,
    "humanInterest": 5,
    "novelty": 30,
    "publicInterest": 75,
    "score": 80,
    "matrixRating": "Impact ★★★★☆ | Conflict ★☆☆☆☆ | Human Interest ★☆☆☆☆"
  },
  "priority": "B",
  "confidence": {
    "ocrAccuracy": 98.5,
    "editorialConfidence": "High"
  },
  "draftReporter": {
    "title": "Headline Sementara Berita dari Reporter",
    "lead": "Draf paragraf pembuka awal laporan reporter",
    "content": "Draf isi laporan berita awal reporter berdasarkan fakta murni rilis pers"
  }
}


======================================================================
[NASKAH MENTAH SUMBER]
======================================================================
${rawSourceText}
`.trim();
}
