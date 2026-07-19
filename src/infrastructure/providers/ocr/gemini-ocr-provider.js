export class GeminiOcrProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = (model || 'gemini-2.5-flash').toLowerCase();
  }

  async extractText(buffer, mimeType) {
    const modelName = this.model;
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.apiKey}`;

    // 🚀 CHUNKED BUFFER TO BASE64 ENCODING FOR CPU OPTIMIZATION
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkLength = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkLength) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkLength));
    }
    const base64 = btoa(binary);

    const body = {
      contents: [
        {
          parts: [
            {
              text: 'Ekstrak seluruh teks dari gambar atau dokumen ini secara lengkap. Jangan melakukan ringkasan. Jangan menambahkan komentar. Jangan memperbaiki isi. Salin apa adanya.',
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        `Gemini OCR (${response.status}): ${payload?.error?.message || 'Unknown error'}`
      );
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = text.trim();

    if (!result) {
      throw new Error('Gemini OCR tidak menemukan teks pada gambar atau dokumen.');
    }

    return result;
  }
}
