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
  // 🚀 BYPASS DETEKSI BOT DENGAN INNERTUBE API (INTERNAL YOUTUBE JSON CLIENT)
  // Cara ini meniru protokol resmi aplikasi YouTube Web Client sehingga aman dari blokir IP Cloudflare.
  // =========================================================================
  const playerApiUrl = 'https://www.youtube.com/youtubei/v1/player';
  const playerPayload = {
    videoId: videoId,
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20210621.02.00',
        hl: 'id', // Paksa hasil parameter ke Bahasa Indonesia
        gl: 'ID'
      }
    }
  };

  const response = await fetch(playerApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

  // Prioritaskan Bahasa Indonesia (id), jika tidak ada ambil opsi pertama yang tersedia (otomatis/terjemahan)
  const selectedTrack = captionTracks.find(t => t.languageCode === 'id') || captionTracks[0];
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