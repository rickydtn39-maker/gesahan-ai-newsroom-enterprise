export async function encryptText(text, secretKeyString) {
  if (!secretKeyString || !text) return text;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKeyString.padEnd(32).slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(text)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptText(base64Text, secretKeyString) {
  if (!secretKeyString || !base64Text) return base64Text;
  try {
    const combined = new Uint8Array(
      atob(base64Text)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKeyString.padEnd(32).slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data);
    return new TextDecoder().decode(decrypted);
  } catch (_error) {
    return base64Text; // Fallback jika data adalah plain text lama
  }
}
