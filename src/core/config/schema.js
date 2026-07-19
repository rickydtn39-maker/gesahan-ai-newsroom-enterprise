export const CONFIG_SCHEMA = Object.freeze({
  application: {
    environment: {
      required: false,
      defaultValue: 'development',
    },
  },

  telegram: {
    botToken: {
      required: false,
      secret: true,
    },
    allowedUsers: {
      required: false,
    },
  },

  gemini: {
    apiKey: {
      required: false,
      secret: true,
    },
  },

  openai: {
    apiKey: {
      required: false,
      secret: true,
    },
  },

  wordpress: {
    endpoint: {
      required: false,
    },
    username: {
      required: false,
    },
    applicationPassword: {
      required: false,
      secret: true,
    },
  },

  seo: {
    sitemapUrl: {
      required: false,
    },
    rssUrl: {
      required: false,
    },
    indexNowKey: {
      required: false,
      secret: true,
    },
  },
});
