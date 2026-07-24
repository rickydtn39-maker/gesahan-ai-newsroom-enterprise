// FILE: src/core/config/schema.js

export const CONFIG_SCHEMA = Object.freeze({
  application: {
    environment: {
      required: false,
      defaultValue: 'development',
      type: 'string',
    },
    encryptionSecret: {
      required: true,
      secret: true,
      type: 'string',
    },
  },

  telegram: {
    botToken: {
      required: false,
      secret: true,
      type: 'string',
    },
    webhookSecretToken: {
      required: false,
      secret: true,
      type: 'string',
    },
    allowedUsers: {
      required: false,
      type: 'array',
    },
    groupChatId: {
      // 🚀 Skema validasi pengaman untuk ID Grup Redaksi
      required: false,
      type: 'string',
    },
  },

  gemini: {
    apiKey: {
      required: false,
      secret: true,
      type: 'string',
    },
  },

  openai: {
    apiKey: {
      required: false,
      secret: true,
      type: 'string',
    },
  },

  wordpress: {
    endpoint: {
      required: false,
      type: 'string',
    },
    username: {
      required: false,
      type: 'string',
    },
    applicationPassword: {
      required: false,
      secret: true,
      type: 'string',
    },
  },

  seo: {
    sitemapUrl: {
      required: false,
      type: 'string',
    },
    rssUrl: {
      required: false,
      type: 'string',
    },
    indexNowKey: {
      required: false,
      secret: true,
      type: 'string',
    },
  },
});
