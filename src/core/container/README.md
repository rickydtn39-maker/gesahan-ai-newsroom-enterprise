# Dependency Injection Container

Container mendukung dua jenis registrasi.

1. registerInstance()

Digunakan untuk objek yang sudah tersedia.

Contoh:

- configuration

2. registerFactory()

Digunakan untuk service yang dibuat saat pertama kali dipakai.

Contoh:

- logger
- metrics
- repository
- provider

Factory hanya dipanggil satu kali.

Hasilnya disimpan sebagai singleton selama request berlangsung.
