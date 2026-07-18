export class GeminiOcrProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'Gemini-2.5-Pro';
  }

  async extractText(buffer, mimeType) {
    // Reroute ke endpoint stabil GitHub Models
    const url = 'https://models.inference.ai.azure.com/chat/completions';

    // Konversi ArrayBuffer ke Base64
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    const prompt =
      'Ekstrak dan salin seluruh teks dari gambar atau dokumen ini secara lengkap, akurat, dan presisi. Jangan tambahkan komentar, penjelasan, atau kalimat pembuka/penutup.';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini OCR (GitHub Models) Error (${response.status}): ${msg}`);
    }

    const extractedText = payload?.choices?.[0]?.message?.content ?? '';

    if (!extractedText.trim()) {
      throw new Error(
        'Gagal mengekstrak teks dari media. Gambar/dokumen mungkin buram atau tidak berisi teks.'
      );
    }

    return extractedText.trim();
  }
}