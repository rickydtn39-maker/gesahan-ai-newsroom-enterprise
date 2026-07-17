# Logger

Seluruh aplikasi menggunakan logger melalui Dependency Injection.

Jangan menggunakan console.log() secara langsung di business logic.

Gunakan:

logger.debug()
logger.info()
logger.warn()
logger.error()

Logger menghasilkan structured log dalam format JSON.