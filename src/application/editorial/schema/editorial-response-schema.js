export const EDITORIAL_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',

  properties: {
    title: {
      type: 'string'
    },

    lead: {
      type: 'string'
    },

    content: {
      type: 'string'
    },

    slug: {
      type: 'string'
    },

    excerpt: {
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
    },

    readingTime: {
      type: 'number'
    },

    wordCount: {
      type: 'number'
    },

    qualityScore: {
      type: 'number'
    }
  },

  required: [
    'title',
    'lead',
    'content',
    'slug',
    'excerpt',
    'focusKeyword',
    'metaDescription',
    'category',
    'tags',
    'readingTime',
    'wordCount',
    'qualityScore'
  ]
});