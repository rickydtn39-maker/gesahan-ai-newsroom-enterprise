// FILE: tests/newroom.test.js

import { describe, test, expect, vi } from 'vitest';
import { Draft } from '../src/domain/draft/draft.js';
import { Router } from '../src/app/router/router.js';
import { encryptText, decryptText } from '../src/core/security/crypto.js';
import { validateConfiguration } from '../src/core/config/validator.js';
import { WORKFLOW_STATE } from '../src/core/constants/workflow.js';
import { TOKENS } from '../src/core/container/tokens.js';
import { EditorialValidator } from '../src/application/editorial/validator/editorial-validator.js';

describe('GESAHAN AI Newsroom Platform - Enterprise Unit Tests (Fase Final)', () => {
  // 1. DRAFT STATE & TRANSITION TEST
  test('Draft copyWith State Transition Validation', () => {
    const originalDraft = new Draft({
      id: 'uuid-1',
      chatId: 10001,
      userId: 20002,
      state: WORKFLOW_STATE.IDLE,
    });

    const mutatedDraft = originalDraft.copyWith({
      state: WORKFLOW_STATE.PUBLISHING,
    });

    expect(originalDraft.state).toBe(WORKFLOW_STATE.IDLE);
    expect(mutatedDraft.state).toBe(WORKFLOW_STATE.PUBLISHING);
    expect(Object.isFrozen(originalDraft)).toBe(true);
    expect(Object.isFrozen(mutatedDraft)).toBe(true);
  });

  // 2. TRUE PBKDF2 RANDOM SALT ENCRYPTION ROUNDTRIP TEST
  test('PBKDF2 Web Crypto Standard Key Derivation and AES-GCM Symmetric Encryption', async () => {
    const encryptionKey = 'super-secret-key-material-for-gesahan';
    const plainCredential = 'reporter_pass_abcd_9999';

    const encryptedBase64_1 = await encryptText(plainCredential, encryptionKey);
    const encryptedBase64_2 = await encryptText(plainCredential, encryptionKey);
    const decryptedText = await decryptText(encryptedBase64_1, encryptionKey);

    expect(encryptedBase64_1).not.toBe(encryptedBase64_2);
    expect(encryptedBase64_1).not.toBe(plainCredential);
    expect(decryptedText).toBe(plainCredential);
  });

  // 3. CONFIG_SCHEMA VALIDATOR TEST
  test('Configuration Schema Validation throws when required parameter is missing', () => {
    const incompleteConfig = {
      application: {
        environment: 'production',
        encryptionSecret: null,
      },
    };

    expect(() => validateConfiguration(incompleteConfig)).toThrow(
      'Configuration parameter "application.encryptionSecret" is required but missing.'
    );
  });

  test('Configuration Schema Validation injects default value', () => {
    const incompleteConfig = {
      application: {
        encryptionSecret: 'some-secure-secret-32-chars-long',
      },
      gemini: {
        apiKey: 'dummy-api-key',
      },
    };

    const validated = validateConfiguration(incompleteConfig);
    expect(validated.application.environment).toBe('development');
    expect(validated.gemini.model).toBe('gemini-2.5-flash');
  });

  // 4. DUAL GEMINI PIPELINE NESTED SCHEMA VALIDATION TEST
  test('Editorial Validator correctly maps and verifies Dual Gemini Restored Nested Properties', () => {
    const validator = new EditorialValidator();

    const mockIngestOutput = {
      extractedInfo: {
        who: 'Kapolda Sumsel',
        what: 'Wisuda Santri',
        when: 'WIB',
        where: 'Palembang',
        why: 'Program pembinaan karakter',
        how: 'Upacara resmi berlangsung khidmat',
        details: {
          pangkat: 'Irjen Pol',
          jabatan: 'Kapolda Sumsel',
          instansi: 'Polda Sumatera Selatan',
          barangBukti: 'Buku',
          nomorPerkara: 'N/A',
          lokasi: 'Palembang',
          kutipan: 'Sinergi bersama wisuda santri',
        },
        editorialPlanning: {
          riskNotes: [],
          missingInformation: [],
          editorialBrief: 'Tulis secara humanis dan berwibawa.',
        },
      },
      seo: {
        focusKeyword: 'Kapolda Sumsel Wisuda Santri',
        secondaryKeywords: ['Polda Sumsel', 'Wisuda Santri'],
        metaDescription: 'Polda Sumsel berkomitmen penuh menjaga kamtibmas.',
      },
      wordpress: {
        category: 'KEPOLISIAN',
        tags: ['polda sumsel', 'wisuda santri'],
      },
      newsValue: {
        impact: 80,
        conflict: 10,
        humanInterest: 40,
        novelty: 20,
        publicInterest: 85,
        score: 90,
        matrixRating: 'Impact ★★★★☆ | Human Interest ★★★★☆',
      },
      priority: 'B',
      confidence: {
        ocrAccuracy: 100,
        editorialConfidence: 'High',
      },
      draftReporter: {
        title: 'Wisuda Akbar Santri Bersama Polda Sumsel',
        lead: 'Palembang, Gesahannusantara - Kapolda Sumsel menghadiri wisuda akbar...',
        content: 'Draf isi tulisan murni dari rilis pers...',
      },
    };

    const mockEditorialOutput = {
      title: 'Polda Sumsel Siap Siaga Jamin Kamtibmas Bumi Sriwijaya',
      subtitle: 'Komitmen Harkamtibmas Polda Sumsel',
      excerpt: 'Polda Sumsel memperketat pengamanan wilayah.',
      lead: 'Palembang, Gesahannusantara - Polda Sumsel berkomitmen penuh menjamin stabilitas.',
      body: 'Untuk mewujudkan hal tersebut, jajaran kepolisian intensif menggelar patroli berkala...',
    };

    expect(validator.validateIngest(mockIngestOutput)).toEqual(mockIngestOutput);
    expect(validator.validateEditorial(mockEditorialOutput)).toEqual(mockEditorialOutput);
  });

  // 5. GLOBAL ROUTER ERROR MIDDLEWARE EXCEPTION MAPPING TEST
  test('Global Router catch runtime handler exceptions mapping and output JSON', async () => {
    const router = new Router();
    const correlationId = 'test-correlation-uuid-99';

    const mockLogger = {
      error: vi.fn(),
    };
    const mockMetrics = {
      increment: vi.fn(),
    };
    const mockContainer = {
      resolve: (token) => {
        if (token === TOKENS.LOGGER) return mockLogger;
        if (token === TOKENS.METRICS) return mockMetrics;
        return null;
      },
    };

    router.register('GET', '/runtime-error-path', () => {
      throw new Error('Sistem WordPress Mati Terputus!');
    });

    const mockRequest = new Request('https://gesahannusantara.com/runtime-error-path', {
      method: 'GET',
    });

    const context = {
      container: mockContainer,
      correlationId: correlationId,
    };

    const response = await router.handle(mockRequest, context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Sistem WordPress Mati Terputus!');
    expect(body.correlationId).toBe(correlationId);

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockMetrics.increment).toHaveBeenCalled();
  });
});