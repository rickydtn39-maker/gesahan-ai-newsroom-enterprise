# Configuration Module

Tujuan modul ini:

- Menjadi satu-satunya tempat yang membaca environment.
- Menghasilkan konfigurasi immutable.
- Memvalidasi konfigurasi saat aplikasi mulai.
- Menyembunyikan detail runtime dari business logic.

Aturan:

- Jangan membaca env secara langsung di service.
- Jangan membaca env secara langsung di provider.
- Gunakan createConfiguration().
