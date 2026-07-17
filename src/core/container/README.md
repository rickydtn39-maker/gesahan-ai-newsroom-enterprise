# Dependency Injection Container

Container bertanggung jawab menyimpan seluruh dependency aplikasi.

Aturan:

- Jangan menggunakan new di business logic.
- Semua dependency harus di-resolve melalui Container.
- Seluruh provider didaftarkan saat bootstrap.