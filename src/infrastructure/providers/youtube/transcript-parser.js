// FILE: src/infrastructure/providers/youtube/transcript-parser.js

export class TranscriptParser {
  // Ekstraksi path captions secara aman menggunakan navigasi properti objek native
  static extractCaptionTracks(playerResponse) {
    if (!playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      return null;
    }
    return playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
  }

  // Pilih subtitle terbaik secara hierarkis (Bahasa Indonesia Manual -> Auto ASR -> Bahasa Inggris)
  static selectBestTrack(tracks) {
    if (!tracks || tracks.length === 0) return null;

    return tracks.sort((a, b) => {
      const isAId = a.languageCode === 'id';
      const isBId = b.languageCode === 'id';
      if (isAId && !isBId) return -1;
      if (!isAId && isBId) return 1;
      if (isAId) {
        const isAAsr = a.kind === 'asr';
        const isBAsr = b.kind === 'asr';
        if (!isAAsr && isBAsr) return -1;
        if (isAAsr && !isBAsr) return 1;
      }
      const isAEn = a.languageCode === 'en';
      const isBEn = b.languageCode === 'en';
      if (isAEn && !isBEn) return -1;
      if (!isAEn && isBEn) return 1;
      return 0;
    })[0];
  }

  // Unduh transkrip terstruktur dari CDN resmi Google XML
  static async downloadXmlTranscript(xmlUrl, customProxy, logger) {
    let targetUrl = xmlUrl;
    if (!targetUrl.includes('&fmt=xml')) {
      targetUrl += '&fmt=xml'; // Paksa format XML murni untuk parser yang andal
    }

    if (customProxy) {
      targetUrl = `${customProxy.replace(/\/+$/, '')}/${encodeURIComponent(targetUrl)}`;
    }

    logger.info(`[Transcript Parser] Mengunduh transkrip terstruktur dari CDN Google...`);

    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Gagal mengunduh XML Subtitle dari CDN: HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);

    if (!textMatches || textMatches.length === 0) {
      throw new Error('File XML subtitle kosong dari node teks transkripsi.');
    }

    return textMatches
      .map((m) => {
        const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
        return this.decodeHtmlEntities(content);
      })
      .join(' ');
  }

  static decodeHtmlEntities(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#x27;/g, "'")
      .replace(/&#45;/g, '-')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
