# Core Errors

Seluruh aplikasi menggunakan AppError sebagai error standar.

Jangan melempar Error bawaan secara langsung pada business logic.

Gunakan:

- AppError
- createError()

Seluruh error harus memiliki:

- code
- message
- status

Opsional:

- details
- cause