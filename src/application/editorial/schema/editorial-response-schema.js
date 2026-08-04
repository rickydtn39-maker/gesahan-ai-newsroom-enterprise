// FILE: src/application/editorial/schema/editorial-response-schema.js

export const GEMINI_INGEST_SCHEMA = Object.freeze({
  type: 'object',
  required: [
    'extractedInfo',
    'seo',
    'wordpress',
    'newsValue',
    'priority',
    'confidence',
    'draftReporter',
  ],
  properties: {
    extractedInfo: {
      type: 'object',
      required: ['who', 'what', 'when', 'where', 'why', 'how', 'details', 'editorialPlanning'],
      properties: {
        who: { type: 'string' },
        what: { type: 'string' },
        when: { type: 'string' },
        where: { type: 'string' },
        why: { type: 'string' },
        how: { type: 'string' },
        details: {
          type: 'object',
          required: [
            'pangkat',
            'jabatan',
            'instansi',
            'barangBukti',
            'nomorPerkara',
            'lokasi',
            'kutipan',
          ],
          properties: {
            pangkat: { type: 'string' },
            jabatan: { type: 'string' },
            instansi: { type: 'string' },
            barangBukti: { type: 'string' },
            nomorPerkara: { type: 'string' },
            lokasi: { type: 'string' },
            kutipan: { type: 'string' },
          },
        },
        editorialPlanning: {
          type: 'object',
          required: ['riskNotes', 'missingInformation', 'editorialBrief'],
          properties: {
            riskNotes: { type: 'array', items: { type: 'string' } },
            missingInformation: { type: 'array', items: { type: 'string' } },
            editorialBrief: { type: 'string' },
          },
        },
      },
    },
    seo: {
      type: 'object',
      required: ['focusKeyword', 'secondaryKeywords', 'metaDescription'],
      properties: {
        focusKeyword: { type: 'string' },
        secondaryKeywords: { type: 'array', items: { type: 'string' } },
        metaDescription: { type: 'string' },
      },
    },
    wordpress: {
      type: 'object',
      required: ['category', 'tags'],
      properties: {
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    newsValue: {
      type: 'object',
      required: [
        'impact',
        'conflict',
        'humanInterest',
        'novelty',
        'publicInterest',
        'score',
        'matrixRating',
      ],
      properties: {
        impact: { type: 'number' },
        conflict: { type: 'number' },
        humanInterest: { type: 'number' },
        novelty: { type: 'number' },
        publicInterest: { type: 'number' },
        score: { type: 'number' },
        matrixRating: { type: 'string' },
      },
    },
    priority: {
      type: 'string',
      enum: ['A', 'B', 'C'],
    },
    confidence: {
      type: 'object',
      required: ['ocrAccuracy', 'editorialConfidence'],
      properties: {
        ocrAccuracy: { type: 'number' },
        editorialConfidence: { type: 'string' },
      },
    },
    draftReporter: {
      type: 'object',
      required: ['title', 'lead', 'content'],
      properties: {
        title: { type: 'string' },
        lead: { type: 'string' },
        content: { type: 'string' },
      },
    },
  },
});

export const GEMINI_EDITORIAL_SCHEMA = Object.freeze({
  type: 'object',
  required: ['title', 'subtitle', 'excerpt', 'lead', 'body'], // 🚀 Parameter administratif dihapus secara mutlak
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    excerpt: { type: 'string' },
    lead: { type: 'string' },
    body: { type: 'string' },
  },
});

export const GPT_EDITORIAL_SCHEMA = GEMINI_EDITORIAL_SCHEMA;