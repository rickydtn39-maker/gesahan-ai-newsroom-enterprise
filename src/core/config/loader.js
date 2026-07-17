export function loadConfiguration(environment) {
  // Mengambil daftar User ID dari environment, mengubahnya menjadi array angka
  const allowedUsersRaw = environment.get('ALLOWED_USERS') ?? '';
  const allowedUsers = allowedUsersRaw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id));

  return Object.freeze({
    application: {
      environment: environment.get('APP_ENV') ?? 'development',
    },

    telegram: {
      botToken: environment.get('TELEGRAM_BOT_TOKEN') ?? null,
      allowedUsers: allowedUsers,
    },

    gemini: {
      apiKey: environment.get('GEMINI_API_KEY') ?? null,
      model: environment.get('GEMINI_MODEL') ?? 'gemini-2.5-flash',
    },

    wordpress: {
      endpoint: environment.get('WORDPRESS_ENDPOINT') ?? null,
      username: environment.get('WORDPRESS_USERNAME') ?? null,
      applicationPassword: environment.get('WORDPRESS_APPLICATION_PASSWORD') ?? null,
    },
  });
}
