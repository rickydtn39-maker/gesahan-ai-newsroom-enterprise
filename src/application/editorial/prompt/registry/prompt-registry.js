// FILE: src/application/editorial/prompt/registry/prompt-registry.js

import { GesahanGeneralProfile } from '../profiles/gesahan/gesahan-general-profile.js';
import { PolresPagaralamProfile } from '../profiles/polres/polres-pagaralam-profile.js';
import { PolrestabesPalembangProfile } from '../profiles/polres/polrestabes-palembang-profile.js';

/**
 * 🚀 ENTERPRISE PROMPT REGISTRY
 *
 * Pusat kendali integrasi seluruh profile penulisan Gesahan AI Newsroom.
 * Daftarkan setiap profile baru di bawah ini agar terbaca secara otomatis oleh AI.
 */
export const PROMPT_REGISTRY = Object.freeze({
  GENERAL: GesahanGeneralProfile,
  POLRES_PAGARALAM: PolresPagaralamProfile,
  POLRESTABES_PALEMBANG: PolrestabesPalembangProfile,
});

export function resolveProfile(type) {
  return PROMPT_REGISTRY[type] || PROMPT_REGISTRY.GENERAL;
}
