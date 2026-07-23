// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

export async function fetchYoutubeTranscript(videoUrl) {
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (!videoIdMatch) {
    throw new Error('URL YouTube tidak valid.');
  }
  const videoId = videoIdMatch[1];
  
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  
  if (!response.ok) {
    throw new Error('Gagal mengakses halaman video YouTube.');
  }
  
  const html = await response.text();
  
  // Mencari JSON player response yang berisi data trek subtitle
  const regex = /"captionTracks":\s*(\[[^\]]+\])/;
  const match = html.match(regex);
  if (!match) {
    throw new Error('Transkrip tidak ditemukan pada video ini. Pastikan video memiliki subtitle atau transkrip otomatis.');
  }
  
  const captionTracks = JSON.parse(match[1]);
  // Prioritaskan Bahasa Indonesia (id), jika tidak ada ambil trek pertama yang tersedia
  const track = captionTracks.find(t => t.languageCode === 'id') || captionTracks[0];
  if (!track || !track.baseUrl) {
    throw new Error('Trek bahasa transkrip tidak ditemukan.');
  }
  
  const xmlRes = await fetch(track.baseUrl);
  if (!xmlRes.ok) {
    throw new Error('Gagal mengunduh berkas transkrip XML dari server YouTube.');
  }
  
  const xmlText = await xmlRes.text();
  
  // Ekstrak baris-baris teks dari tag XML menggunakan regex berkinerja tinggi
  const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
  if (!textMatches) {
    throw new Error('Berkas transkrip kosong atau tidak dapat diurai.');
  }
  
  return textMatches.map(m => {
    const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
    // Dekode entitas HTML dasar agar teks terbaca rapi
    return content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#45;/g, "-");
  }).join(' ');
}