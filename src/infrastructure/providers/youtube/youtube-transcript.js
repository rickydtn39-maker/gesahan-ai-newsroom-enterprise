// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

export async function fetchYoutubeTranscript(videoUrl) {
  // 1. Ekstrak Video ID menggunakan Regular Expression yang presisi
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (!videoIdMatch) {
    throw new Error('URL YouTube tidak valid.');
  }
  const videoId = videoIdMatch[1];
  
  // =========================================================================
  // 🚀 BYPASS DETEKSI BOT DENGAN INNERTUBE ANDROID CLIENT SIGNATURE
  // Client ANDROID sangat tangguh, melewati proteksi signature pada video politik/berita,
  // dan menjamin captions selalu dikembalikan oleh server YouTube tanpa diblokir Cloudflare.
  // =========================================================================
  const playerApiUrl = 'https://www.youtube.com/youtubei/v1/player';
  const playerPayload = {
    videoId: videoId,
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '17.30.35',
        hl: 'id',
        gl: 'ID'
      }
    }
  };

  const response = await fetch(playerApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/17.30.35 (Linux; U; Android 12; GB)'
    },
    body: JSON.stringify(playerPayload)
  });

  if (!response.ok) {
    throw new Error(`Koneksi Innertube API gagal dengan status HTTP ${response.status}`);
  }

  const playerData = await response.json();
  
  // 2. Cari jalur trek caption/subtitles dari data player JSON
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error('Transkrip tidak ditemukan pada video ini. Pastikan video memiliki subtitle atau transkrip otomatis di YouTube.');
  }

  // 🚀 FIXED: Cari trek yang mengandung kode 'id' secara luas (misal: 'id', 'id-ID', atau automatic 'a.id')
  const selectedTrack = captionTracks.find(t => 
    t.languageCode && (t.languageCode === 'id' || t.languageCode.startsWith('id') || t.languageCode.includes('id'))
  ) || captionTracks[0];

  if (!selectedTrack || !selectedTrack.baseUrl) {
    throw new Error('Trek transkrip tidak mendukung bahasa yang kompatibel.');
  }

  // 3. Unduh berkas XML timed-text transkrip asli dari CDN Google Video
  const xmlResponse = await fetch(selectedTrack.baseUrl);
  if (!xmlResponse.ok) {
    throw new Error('Gagal mengunduh data teks subtitle dari CDN Google.');
  }

  const xmlText = await xmlResponse.text();

  // 4. Ekstrak baris dialog dari tag XML menggunakan regex berkinerja tinggi
  const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
  if (!textMatches) {
    throw new Error('Teks transkrip kosong atau tidak dapat diurai.');
  }

  return textMatches.map(m => {
    const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
    // Dekode entitas HTML dasar agar teks terbaca rapi dan bersih
    return content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#45;/g, "-");
  }).join(' ');
}