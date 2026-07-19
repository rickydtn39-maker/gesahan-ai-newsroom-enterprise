async function deriveKey(secretKeyString, salt) {
  const encoder = new TextEncoder();
  const rawKeyMaterial = encoder.encode(secretKeyString);

  const baseKey = await crypto.subtle.importKey('raw', rawKeyMaterial, { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(text, secretKeyString) {
  if (!secretKeyString || !text) return text;
  const encoder = new TextEncoder();

  // Generasikan salt (16 bytes) & IV (12 bytes) acak baru per enkripsi
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await deriveKey(secretKeyString, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(text)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  let binary = '';
  const chunkLength = 8192;
  for (let i = 0; i < combined.byteLength; i += chunkLength) {
    binary += String.fromCharCode.apply(null, combined.subarray(i, i + chunkLength));
  }
  return btoa(binary);
}

export async function decryptText(base64Text, secretKeyString) {
  if (!secretKeyString || !base64Text) return base64Text;
  try {
    const binaryString = atob(base64Text);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // Ekstrak salt, IV, dan ciphertext dari payload Base64 tunggal
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const keyMaterial = await deriveKey(secretKeyString, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data);
    return new TextDecoder().decode(decrypted);
  } catch (_error) {
    return base64Text; // Fallback jika data adalah plain text lama
  }
}
