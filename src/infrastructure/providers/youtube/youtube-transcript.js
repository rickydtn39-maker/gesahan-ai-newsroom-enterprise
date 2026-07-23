// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

export async function fetchYoutubeTranscript(videoUrl, env = {}) {
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (!videoIdMatch) {
    throw new Error('URL YouTube tidak valid.');
  }
  const videoId = videoIdMatch[1];

  const assemblyAiKey = env.ASSEMBLYAI_API_KEY || null;

  // =========================================================================
  // 🚀 ENGINE 1: PREMIUM ASSEMBLYAI WHISPER PIPELINE (JIKA API KEY TERSEDIA)
  // Ekstraksi audio via Cobalt API ➡️ Transkripsi via AssemblyAI Flagship Model.
  // =========================================================================
  if (assemblyAiKey) {
    try {
      console.log('[YouTube Pipeline] Initiating premium AssemblyAI transcription...');
      
      // 1. Ekstrak Direct Link Audio MP3 menggunakan Cobalt API
      const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: videoUrl,
          isAudioOnly: true,
          aFormat: 'mp3'
        })
      });

      if (!cobaltResponse.ok) {
        throw new Error('Cobalt audio extraction service returned non-200 status');
      }

      const cobaltData = await cobaltResponse.json();
      const directAudioUrl = cobaltData.url;

      if (!directAudioUrl) {
        throw new Error('Failed to retrieve direct audio stream link from Cobalt');
      }

      // 2. Kirim URL Audio ke AssemblyAI untuk ditranskripsikan ke Bahasa Indonesia
      const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': assemblyAiKey, // Tanpa awalan "Bearer" sesuai Operating Rule 6
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: directAudioUrl,
          language_code: 'id', // Mengarahkan transkripsi ke Bahasa Indonesia
          // 🚀 SEUSAI ATURAN OPERASIONAL NO.7: Aktifkan model Flagship Universal 3.5 Pro secara eksplisit
          speech_models: ["universal-3-5-pro", "universal-2"]
        })
      });

      if (!assemblyResponse.ok) {
        const errorDetail = await assemblyResponse.text();
        throw new Error(`AssemblyAI initialization failed: ${errorDetail}`);
      }

      const assemblyData = await assemblyResponse.json();
      const transcriptId = assemblyData.id;

      // 3. Polling status transkripsi secara aman (Maksimal 24 detik untuk mematuhi limit Workers)
      let completed = false;
      let transcriptText = '';
      const startTime = Date.now();

      while (!completed && (Date.now() - startTime < 24000)) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik per siklus

        const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'authorization': assemblyAiKey
          }
        });

        if (pollResponse.ok) {
          const pollData = await pollResponse.json();
          if (pollData.status === 'completed') {
            completed = true;
            transcriptText = pollData.text;
          } else if (pollData.status === 'failed') {
            throw new Error(`AssemblyAI transcription job failed: ${pollData.error}`);
          }
        }
      }

      if (transcriptText) {
        console.log('[YouTube Pipeline] AssemblyAI Premium U3.5 Pro transcription completed successfully!');
        return transcriptText;
      } else {
        throw new Error('AssemblyAI transcription timeout.');
      }

    } catch (premiumError) {
      console.log('[YouTube Pipeline] Premium Engine failed, falling back to Proxy Scraper...', premiumError.message);
    }
  }

  // =========================================================================
  // 🚀 ENGINE 2: ZERO-COST PROXY-BYPASSED SCRAPER (DEFAULT / FALLBACK)
  // Menembus blokir IP Cloudflare Workers dengan melewatkan request youtube-nocookie
  // ke Rotating CORS Proxy Server eksternal gratis yang terpercaya.
  // =========================================================================
  console.log('[YouTube Pipeline] Running Proxy-Bypassed Scraper...');
  const targetUrl = `https://www.youtube-nocookie.com/embed/${videoId}?hl=id`;
  
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube-nocookie.com/'
    }
  });

  if (!response.ok) {
    throw new Error(`Proxy gateway returned HTTP status ${response.status}`);
  }

  const html = await response.text();
  
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]*?});\s*(?:var|yt)/) ||
                              html.match(/ytInitialPlayerResponse\s*=\s*([\s\S]*?);\s*(?:var\s+meta|<\/script)/i) ||
                              html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/);
                              
  if (!playerResponseMatch) {
    throw new Error('Transkrip gagal diekstrak karena proteksi halaman berubah. Silakan daftarkan ASSEMBLYAI_API_KEY untuk keamanan 100%.');
  }

  const playerResponse = JSON.parse(playerResponseMatch[1]);
  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error('Transkrip tidak ditemukan pada video ini. Pastikan video memiliki subtitle atau transkrip otomatis di YouTube.');
  }

  const selectedTrack = captionTracks.find(t => 
    t.languageCode && (t.languageCode === 'id' || t.languageCode.startsWith('id') || t.languageCode.includes('id'))
  ) || captionTracks[0];

  if (!selectedTrack || !selectedTrack.baseUrl) {
    throw new Error('Trek transkrip tidak mendukung bahasa yang kompatibel.');
  }

  const xmlResponse = await fetch(selectedTrack.baseUrl);
  if (!xmlResponse.ok) {
    throw new Error('Gagal mengunduh berkas XML transkrip dari CDN Google.');
  }

  const xmlText = await xmlResponse.text();

  const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
  if (!textMatches) {
    throw new Error('Teks transkrip kosong atau tidak dapat diurai.');
  }

  return textMatches.map(m => {
    const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
    return decodeHtmlEntities(content);
  }).join(' ');
}

function decodeHtmlEntities(str) {
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
    .replace(/<[^>]*>/g, '');
}