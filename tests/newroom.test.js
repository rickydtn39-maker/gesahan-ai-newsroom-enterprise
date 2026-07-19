import { describe, test, expect, vi } from 'vitest';
import { Draft } from '../src/domain/draft/draft.js';
import { Router } from '../src/app/router/router.js';
import { encryptText, decryptText } from '../src/core/security/crypto.js';
import { validateConfiguration } from '../src/core/config/validator.js';
import { WORKFLOW_STATE } from '../src/core/constants/workflow.js';
import { TOKENS } from '../src/core/container/tokens.js';

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

    // Dynamic salt menghasilkan cipher text acak yang berbeda meskipun input sama
    expect(encryptedBase64_1).not.toBe(encryptedBase64_2);
    expect(encryptedBase64_1).not.toBe(plainCredential);
    expect(decryptedText).toBe(plainCredential);
  });

  // 3. CONFIG_SCHEMA VALIDATOR TEST
  test('Configuration Schema Validation throws when required parameter is missing', () => {
    const incompleteConfig = {
      application: {
        environment: 'production',
        encryptionSecret: null, // Required but set to null
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
    };

    const validated = validateConfiguration(incompleteConfig);
    // Verifikasi suntikan nilai default pada validation schema
    expect(validated.application.environment).toBe('development');
  });

  // 4. GLOBAL ROUTER ERROR MIDDLEWARE EXCEPTION MAPPING TEST
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

    // Memverifikasi asinkron assertions pada Vitest mock Logger & Metrics
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockMetrics.increment).toHaveBeenCalled();
  });
});
