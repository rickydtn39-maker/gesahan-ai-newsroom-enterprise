export const EDITORIAL_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',

  required: [
    'article',
    'seo'
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
        'focusKeyword',
        'metaDescription',
        'category',
        'tags'
      ],

      properties: {
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
    }
  }
});