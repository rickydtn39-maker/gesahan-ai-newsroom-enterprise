export const MESSAGES = Object.freeze({
  AUTH: {
    UNAUTHORIZED:
      '⛔ *AKSES DITOLAK*\n\nMaaf, ID Telegram Anda tidak terdaftar di sistem. Anda tidak memiliki izin untuk menggunakan GESAHAN AI Newsroom Enterprise.\n\nSilakan hubungi Administrator.',
  },
  DRAFT: {
    NOT_FOUND: '❌ Sesi draf tidak ditemukan atau telah kedaluwarsa. Silakan tekan 🆕 Berita Baru.',
    NEW_CREATED:
      '✅ *DRAFT BARU BERHASIL DIBUAT*\n\nSilakan kirim:\n\n📰 Teks berita\n📷 Foto\n📄 Dokumen\n\nSaya akan mengolah berita menjadi artikel siap terbit.\n\nTekan ❌ Batal kapan saja jika ingin membatalkan proses.',
    SESSION_ACTIVE_ERROR:
      '⚠️ Anda masih memiliki proses yang belum selesai.\n\nTekan ❌ Batal jika ingin menghapus proses tersebut.',
  },
  IMAGE: {
    WAITING_MISMATCH: 'Saat ini sistem tidak sedang menunggu foto unggulan.',
    REQUIRED: 'Silakan kirim foto unggulan dengan resolusi terbaik.',
    PUBLISH_REQUIRED:
      '❌ Foto unggulan wajib dikirim terlebih dahulu sebelum dapat menerbitkan artikel.',
  },
  MANUAL_EDIT: {
    PROMPT:
      '✏️ *MODE EDIT MANUAL*\n\nSilakan kirim versi akhir artikel.\n\nArtikel yang Anda kirim akan menggantikan hasil AI.\n\nSetelah itu Anda dapat langsung melakukan Publish.',
    SAVED:
      '✅ *EDIT MANUAL DISIMPAN*\n\nArtikel siap ditinjau kembali.\n\nGunakan 📄 Lihat Artikel Lengkap untuk membaca hasil akhir.\n\nSilakan pilih tindakan berikutnya.',
  },
  OCR: {
    LOW_ACCURACY:
      '⚠️ *AKURASI OCR TERLALU RENDAH* ({accuracy}%)\n\nFoto/dokumen yang dikirim buram atau tidak terbaca jelas. Silakan kirim ulang foto yang lebih tajam.',
    INPUT_INVALID: 'File foto atau dokumen tidak valid.',
    DOWNLOAD_FAILED:
      '🔍 [STAGE 1] Gemini Reporter sedang mengunduh media dan mengekstrak teks (OCR)...',
    INGEST_FAILED: '❌ OCR Ingest gagal: ',
  },
  WORKFLOW: {
    ACTIVE_PROCESS: 'Masih ada proses yang sedang berjalan.',
    STAGE1_LOADING:
      '⏳ [STAGE 1] Gemini Reporter sedang memindai, menganalisis SEO, dan mengklasifikasikan data...',
    STAGE1_FAILED: '❌ Ingest gagal: ',
    ANGLE_NOT_FOUND: 'Sesi angle tidak valid.',
    CANCELLED:
      '✅ Sesi berhasil dibatalkan.\n\nSemua draft sementara telah dihapus.\n\nTekan 🆕 Berita Baru untuk memulai kembali.',
  },
  INTERACTION: {
    START_WELCOME:
      '👋 Selamat datang di *GESAHAN AI NEWSROOM*\n\nSaya adalah AI Editorial Assistant.\n\nSaya akan membantu mengubah naskah menjadi artikel siap terbit dengan standar redaksi.\n\nSilakan pilih menu di bawah.',
    INPUT_TEXT_REQUIRED: 'Silakan kirim berita dalam bentuk teks.',
  },
});
