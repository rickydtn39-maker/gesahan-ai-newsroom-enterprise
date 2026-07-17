export const EDITORIAL_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',

  required: [
    'article',
    'seo',
    'statistics',
    'quality'
  ],

  properties: {
    article: {
      type: 'object',

      required: [
        'title',
        'lead',
        'content'
      ],

      properties: {
        title: {
          type: 'string'
        },

        lead: {
          type: 'string'
        },

        content: {
          type: 'string'
        }
      }
    },

    seo: {
      type: 'object',

      required: [
        'slug',
        'focusKeyword',
        'metaDescription',
        'category',
        'tags'
      ],

      properties: {
        slug: {
          type: 'string'
        },

        focusKeyword: {
          type: 'string'
        },

        metaDescription: {
          type: 'string'
        },

        category: {
          type: 'string'
        },

        tags: {
          type: 'array',

          items: {
            type: 'string'
          }
        }
      }
    },

    statistics: {
      type: 'object',

      required: [
        'wordCount',
        'readingTime'
      ],

      properties: {
        wordCount: {
          type: 'number'
        },

        readingTime: {
          type: 'number'
        }
      }
    },

    quality: {
      type: 'object',

      required: [
        'score',
        'notes'
      ],

      properties: {
        score: {
          type: 'number'
        },

        notes: {
          type: 'array',

          items: {
            type: 'string'
          }
        }
      }
    }
  }
});