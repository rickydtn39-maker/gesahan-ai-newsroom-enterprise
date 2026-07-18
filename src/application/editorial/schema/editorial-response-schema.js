export const GEMINI_INGEST_SCHEMA = Object.freeze({
  type: 'object',
  required: [
    'extractedInfo',
    'seo',
    'wordpress',
    'newsValue',
    'priority',
    'confidence',
    'draftReporter'
  ],
  properties: {
    extractedInfo: {
      type: 'object',
      required: ['who', 'what', 'when', 'where', 'why', 'how', 'details'],
      properties: {
        who: { type: 'string' },
        what: { type: 'string' },
        when: { type: 'string' },
        where: { type: 'string' },
        why: { type: 'string' },
        how: { type: 'string' },
        details: {
          type: 'object',
          required: ['pangkat', 'jabatan', 'instansi', 'barangBukti', 'nomorPerkara', 'lokasi', 'kutipan'],
          properties: {
            pangkat: { type: 'string' },
            jabatan: { type: 'string' },
            instansi: { type: 'string' },
            barangBukti: { type: 'string' },
            nomorPerkara: { type: 'string' },
            lokasi: { type: 'string' },
            kutipan: { type: 'string' }
          }
        }
      }
    },
    seo: {
      type: 'object',
      required: ['focusKeyword', 'secondaryKeywords', 'metaDescription'],
      properties: {
        focusKeyword: { type: 'string' },
        secondaryKeywords: { type: 'array', items: { type: 'string' } },
        metaDescription: { type: 'string' }
      }
    },
    wordpress: {
      type: 'object',
      required: ['category', 'tags'],
      properties: {
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      }
    },
    newsValue: {
      type: 'object',
      required: ['impact', 'conflict', 'humanInterest', 'novelty', 'publicInterest', 'score'],
      properties: {
        impact: { type: 'number' },
        conflict: { type: 'number' },
        humanInterest: { type: 'number' },
        novelty: { type: 'number' },
        publicInterest: { type: 'number' },
        score: { type: 'number' }
      }
    },
    priority: {
      type: 'string',
      enum: ['A', 'B', 'C']
    },
    confidence: {
      type: 'object',
      required: ['ocrAccuracy'],
      properties: {
        ocrAccuracy: { type: 'number' }
      }
    },
    draftReporter: {
      type: 'object',
      required: ['title', 'lead', 'content'],
      properties: {
        title: { type: 'string' },
        lead: { type: 'string' },
        content: { type: 'string' }
      }
    }
  }
});

export const GPT_EDITORIAL_SCHEMA = Object.freeze({
  type: 'object',
  required: ['title', 'lead', 'content', 'qcReport'],
  properties: {
    title: { type: 'string' },
    lead: { type: 'string' },
    content: { type: 'string' },
    qcReport: {
      type: 'object',
      required: ['factCheckPassed', 'noHallucinations', 'typosCorrected', 'notes'],
      properties: {
        factCheckPassed: { type: 'boolean' },
        noHallucinations: { type: 'boolean' },
        typosCorrected: { type: 'boolean' },
        notes: { type: 'array', items: { type: 'string' } }
      }
    }
  }
});