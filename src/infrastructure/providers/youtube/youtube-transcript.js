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
  // 🚀 KEMBALI KE METODE HTML SCRAPER YANG TERBUKTI SUKSES DI SERVER ANDA
  // Kami mengoptimalkan header agar meniru browser desktop asli secara sempurna.
  // =========================================================================
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal mengakses halaman YouTube. Status HTTP: ${response.status}`);
  }

  const html = await response.text();
  let captionTracks = null;

  // 🚀 METODE CADANGAN GANDA UNTUK PARSING CAPTION TRACKS
  // Mencari data trek subtitle langsung menggunakan regex global
  const directRegex = /"captionTracks":\s*(\[[^\]]+\])/;
  const directMatch = html.match(directRegex);
  
  if (directMatch) {
    try {
      captionTracks = JSON.parse(directMatch[1]);
    } catch (_) {}
  }

  // Jika gagal, cari di dalam objek utama ytInitialPlayerResponse
  if (!captionTracks) {
    const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*({[\s\S]*?});\s*(?:var\s+meta|<\/script|\n)/;
    const playerResponseMatch = html.match(playerResponseRegex);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      } catch (_) {}
    }
  }
  
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error('Transkrip tidak ditemukan pada video ini. Pastikan video memiliki subtitle atau transkrip otomatis di YouTube.');
  }

  // Cari trek yang mendukung Bahasa Indonesia secara fleksibel (id, id-ID, atau otomatis a.id)
  const selectedTrack = captionTracks.find(t => 
    t.languageCode && (t.languageCode === 'id' || t.languageCode.startsWith('id') || t.languageCode.includes('id'))
  ) || captionTracks[0];

  if (!selectedTrack || !selectedTrack.baseUrl) {
    throw new Error('Trek transkrip tidak mendukung bahasa yang kompatibel.');
  }

  // 2. Unduh berkas XML timed-text transkrip asli dari CDN Google Video
  const xmlResponse = await fetch(selectedTrack.baseUrl);
  if (!xmlResponse.ok) {
    throw new Error('Gagal mengunduh berkas transkrip XML dari server YouTube.');
  }

  const xmlText = await xmlResponse.text();

  // 3. Ekstrak baris dialog dari tag XML menggunakan regex berkinerja tinggi
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