export class GeminiOcrProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-1.5-pro';
  }

  async extractText(buffer, mimeType) {
    // REST API Endpoint resmi Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Konversi ArrayBuffer ke Base64
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    const prompt =
      'Ekstrak dan salin seluruh teks dari gambar atau dokumen ini secara lengkap, akurat, dan presisi. Jangan tambahkan komentar, penjelasan, atau kalimat pembuka/penutup.';

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini OCR (Google AI Studio) Error (${response.status}): ${msg}`);
    }

    const extractedText = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!extractedText.trim()) {
      throw new Error(
        'Gagal mengekstrak teks dari media. Gambar/dokumen mungkin buram atau tidak berisi teks.'
      );
    }

    return extractedText.trim();
  }
}export class GeminiOcrProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-1.5-pro';
  }

  async extractText(buffer, mimeType) {
    // Memastikan nama model selalu lowercase untuk Google API resmi
    const modelName = this.model.toLowerCase();

    // REST API Endpoint STABIL resmi Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.apiKey}`;

    // Konversi ArrayBuffer ke Base64
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    const prompt =
      'Ekstrak dan salin seluruh teks dari gambar atau dokumen ini secara lengkap, akurat, dan presisi. Jangan tambahkan komentar, penjelasan, atau kalimat pembuka/penutup.';

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini OCR (Google AI Studio) Error (${response.status}): ${msg}`);
    }

    const extractedText = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!extractedText.trim()) {
      throw new Error(
        'Gagal mengekstrak teks dari media. Gambar/dokumen mungkin buram atau tidak berisi teks.'
      );
    }

    return extractedText.trim();
  }
}