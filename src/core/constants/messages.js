export const MESSAGES = Object.freeze({
  AUTH: {
    UNAUTHORIZED: '⛔ *AKSES DITOLAK*\n\nMaaf, ID Telegram Anda tidak terdaftar di sistem. Anda tidak memiliki izin untuk menggunakan GESAHAN AI Newsroom Enterprise.\n\nSilakan hubungi Administrator.'
  },
  DRAFT: {
    NOT_FOUND: '❌ Sesi draf tidak ditemukan atau telah kedaluwarsa. Silakan tekan 🏁 Mulai untuk membuat sesi baru.',
    NEW_CREATED: '✅ *DRAFT BARU BERHASIL DIBUAT*\n\nSilakan kirim:\n\n📰 Teks berita\n📷 Foto\n📄 Dokumen\n\nSaya akan mengolah berita menjadi artikel siap terbit.\n\nTekan ❌ Batal kapan saja jika ingin membatalkan proses.',
    SESSION_ACTIVE_ERROR: '⚠️ Anda masih memiliki proses yang belum selesai.\n\nTekan ❌ Batal jika ingin menghapus proses tersebut.'
  },
  IMAGE: {
    WAITING_MISMATCH: 'Saat ini sistem tidak sedang menunggu foto unggulan.',
    REQUIRED: 'Silakan kirim foto unggulan dengan resolusi terbaik.',
    PUBLISH_REQUIRED: '❌ Foto unggulan wajib dikirim terlebih dahulu sebelum dapat menerbitkan artikel.'
  },
  MANUAL_EDIT: {
    PROMPT: '✏️ *MODE EDIT MANUAL*\n\nSilakan kirim versi akhir artikel.\n\nArtikel yang Anda kirim akan menggantikan hasil AI.\n\nSetelah itu Anda dapat langsung melakukan Publish.',
    SAVED: '✅ *EDIT MANUAL DISIMPAN*\n\nArtikel siap ditinjau kembali.\n\nGunakan 📄 Lihat Artikel Lengkap untuk membaca hasil akhir.\n\nSilakan pilih tindakan berikutnya.'
  },
  OCR: {
    LOW_ACCURACY: '⚠️ *AKURASI OCR TERLALU RENDAH* ({accuracy}%)\n\nFoto/dokumen yang dikirim buram atau tidak terbaca jelas. Silakan kirim ulang foto yang lebih tajam.',
    INPUT_INVALID: 'File foto atau dokumen tidak valid.',
    DOWNLOAD_FAILED: '🔍 [STAGE 1] Gemini Reporter sedang mengunduh media dan mengekstrak teks (OCR)...',
    INGEST_FAILED: '❌ OCR Ingest gagal: '
  },
  WORKFLOW: {
    ACTIVE_PROCESS: 'Masih ada proses yang sedang berjalan.',
    STAGE1_LOADING: '⏳ [STAGE 1] Gemini Reporter sedang memindai, menganalisis SEO, dan mengklasifikasikan data...',
    STAGE1_FAILED: '❌ Ingest gagal: ',
    ANGLE_NOT_FOUND: 'Sesi angle tidak valid.',
    CANCELLED: '✅ *SESI BERHASIL DIBATALKAN*\n\nSeluruh draf sementara Anda telah dihapus secara bersih dari database.\n\nSilakan klik tombol *🏁 Mulai* di bawah ini untuk memulai kembali dari awal.'
  },
  INTERACTION: {
    START_WELCOME: '👋 Selamat datang di *GESAHAN AI NEWSROOM*\n\nSaya adalah AI Editorial Assistant.\n\nSaya akan membantu mengubah naskah menjadi artikel siap terbit dengan standar redaksi.\n\nSilakan pilih menu di bawah.',
    INPUT_TEXT_REQUIRED: 'Silakan kirim berita dalam bentuk teks.',
    HELP_TEXT: 'ℹ️ *PANDUAN OPERASIONAL GESAHAN AI NEWSROOM*\n\nPlatform ini dirancang khusus untuk mempermudah produksi berita berkualitas tinggi secara cepat dan terintegrasi.\n\n*Alur Kerja Utama:*\n1. Tekan *📰 Berita Baru* atau langsung kirim teks naskah/foto rilis pers.\n2. Sistem akan melakukan pemindaian (OCR) & analisis awal SEO.\n3. Tentukan sudut pandang (*Angle*) penulisan.\n4. Lakukan peninjauan hasil redaksi, edit manual jika diperlukan.\n5. Kirim foto unggulan dan publikasikan secara instan ke portal WordPress.\n\n*Daftar Perintah Penting:*\n• `/start` atau `🏁 Mulai` - Memulai ulang bot & membuka menu utama.\n• `/cancel` atau `❌ Batal` - Membatalkan proses draf aktif.\n• `/setauthor [Username] [AppPassword]` - Konfigurasi akun WP Penulis (Multi-Author).\n• `/listusers` - Menampilkan daftar whitelist (Admin Only).'
  }
});