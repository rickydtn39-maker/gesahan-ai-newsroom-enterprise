export function loadConfiguration(environment) {
  return Object.freeze({
    application: {
      environment: environment.get('APP_ENV') ?? 'development'
    },

    telegram: {
      botToken: environment.get('TELEGRAM_BOT_TOKEN') ?? null
    },

    gemini: {
      apiKey: environment.get('GEMINI_API_KEY') ?? null,
      model: environment.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    },

    wordpress: {
      endpoint: environment.get('WORDPRESS_ENDPOINT') ?? null,
      username: environment.get('WORDPRESS_USERNAME') ?? null,
      applicationPassword:
        environment.get('WORDPRESS_APPLICATION_PASSWORD') ?? null
    }
  });
}