// FILE: src/infrastructure/providers/ocr/gemini-ocr-provider.js

export class GeminiOcrProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = (model || 'gemini-2.5-flash').toLowerCase();
  }

  async extractText(buffer, mimeType) {
    const modelName = this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

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

    // 🚀 FAIL-FAST SHIELD: Mengunci maksimal 3 kali percobaan untuk mencegah Worker timeout
    const maxRetries = 3;
    let delay = 1000;
    let response;
    let payload;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        payload = await response.json();

        if (response.ok) {
          break;
        }

        const status = response.status;

        if (status === 429 || status >= 500) {
          if (attempt === maxRetries) {
            throw new Error(
              `Gemini OCR (${status}): ${payload?.error?.message || 'Exceeded max retry limits during OCR'}`
            );
          }

          const jitter = Math.random() * 500;
          const sleepTime = delay + jitter;

          console.warn(
            `[Gemini OCR Shield] Received HTTP ${status}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(sleepTime)}ms...`
          );

          await new Promise((resolve) => setTimeout(resolve, sleepTime));
          delay *= 2;
          continue;
        }

        throw new Error(
          `Gemini OCR Client Error (${status}): ${payload?.error?.message || 'Bad Request'}`
        );
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const jitter = Math.random() * 500;
        const sleepTime = delay + jitter;
        console.warn(
          `[Gemini OCR Shield] Connection error: ${error.message}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(sleepTime)}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        delay *= 2;
      }
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = text.trim();

    if (!result) {
      throw new Error('Gemini OCR tidak menemukan teks pada gambar atau dokumen.');
    }

    return result;
  }
}