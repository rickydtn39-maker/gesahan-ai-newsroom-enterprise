// FILE: src/core/config/loader.js

export function loadConfiguration(environment) {
  const allowedUsersRaw = environment.get('ALLOWED_USERS') ?? '';

  const allowedUsers = allowedUsersRaw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id));

  return Object.freeze({
    application: {
      environment: environment.get('APP_ENV') ?? 'development',
      encryptionSecret: environment.get('ENCRYPTION_SECRET') ?? null,
    },

    telegram: {
      botToken: environment.get('TELEGRAM_BOT_TOKEN') ?? null,
      webhookSecretToken: environment.get('TELEGRAM_SECRET_TOKEN') ?? null,
      allowedUsers,
      groupChatId: environment.get('TELEGRAM_GROUP_CHAT_ID') ?? null, // 🚀 Membaca ID Grup Redaksi
    },

    gemini: {
      apiKey: environment.get('GEMINI_API_KEY') ?? null,
      model: environment.get('GEMINI_MODEL') ?? 'gemini-2.5-flash',
    },

    openai: {
      apiKey: environment.get('OPENAI_API_KEY') ?? null,
      model: environment.get('OPENAI_MODEL') ?? 'gpt-4o',
    },

    wordpress: {
      endpoint: environment.get('WORDPRESS_ENDPOINT') ?? null,
      username: environment.get('WORDPRESS_USERNAME') ?? null,
      applicationPassword: environment.get('WORDPRESS_APPLICATION_PASSWORD') ?? null,
    },

    seo: {
      sitemapUrl: environment.get('SITEMAP_URL') ?? null,
      rssUrl: environment.get('RSS_URL') ?? null,
      indexNowKey: environment.get('INDEXNOW_KEY') ?? null,
    },
  });
}