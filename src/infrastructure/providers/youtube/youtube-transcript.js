// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

// Helper Fetch dengan Timeout ketat untuk mencegah Cloudflare Workers menggantung
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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
  // =========================================================================
  if (assemblyAiKey) {
    try {
      console.log('[YouTube Pipeline] Initiating premium AssemblyAI transcription...');
      
      const cobaltResponse = await fetchWithTimeout('https://api.cobalt.tools/api/json', {
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
      }, 6000);

      if (!cobaltResponse.ok) {
        throw new Error('Cobalt audio extraction service returned non-200 status');
      }

      const cobaltData = await cobaltResponse.json();
      const directAudioUrl = cobaltData.url;

      if (!directAudioUrl) {
        throw new Error('Failed to retrieve direct audio stream link from Cobalt');
      }

      const assemblyResponse = await fetchWithTimeout('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': assemblyAiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: directAudioUrl,
          language_code: 'id',
          speech_models: ["universal-3-5-pro", "universal-2"]
        })
      }, 5000);

      if (!assemblyResponse.ok) {
        const errorDetail = await assemblyResponse.text();
        throw new Error(`AssemblyAI initialization failed: ${errorDetail}`);
      }

      const assemblyData = await assemblyResponse.json();
      const transcriptId = assemblyData.id;

      let completed = false;
      let transcriptText = '';
      const startTime = Date.now();

      while (!completed && (Date.now() - startTime < 20000)) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const pollResponse = await fetchWithTimeout(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { 'authorization': assemblyAiKey }
          }, 3000);

          if (pollResponse.ok) {
            const pollData = await pollResponse.json();
            if (pollData.status === 'completed') {
              completed = true;
              transcriptText = pollData.text;
            } else if (pollData.status === 'failed') {
              throw new Error(`AssemblyAI job failed: ${pollData.error}`);
            }
          }
        } catch (pollErr) {
          console.warn('[YouTube Pipeline] Polling cycle timed out, retrying...', pollErr.message);
        }
      }

      if (transcriptText) {
        console.log('[YouTube Pipeline] AssemblyAI transcription completed successfully!');
        return transcriptText;
      } else {
        throw new Error('AssemblyAI transcription timeout.');
      }

    } catch (premiumError) {
      console.log('[YouTube Pipeline] Premium Engine failed, falling back to Legacy TimedText Scraper...', premiumError.message);
    }
  }

  // =========================================================================
  // 🚀 ENGINE 2: GOOGLE LEGACY TIMEDTEXT API SCRAPER
  // Menggunakan rute legacy Google TimedText yang sangat ringan dan andal.
  // =========================================================================
  console.log('[YouTube Pipeline] Querying Legacy TimedText API...');
  
  try {
    return await getTranscriptFromLegacyAPI(videoId);
  } catch (legacyError) {
    console.warn('[YouTube Pipeline] Legacy API failed completely. Try fallback embed parser...', legacyError.message);
  }

  // =========================================================================
  // 🚀 ENGINE 3: FALLBACK EMBED HTML PARSER (PILIHAN TERAKHIR)
  // =========================================================================
  return await runFallbackEmbedScraper(videoId);
}

// =========================================================================
// 🛠️ INTERNAL SERVICE FUNCTIONS (LEGACY GOOGLE TIMEDTEXT)
// =========================================================================

const strategies = [
  { name: 'Direct Google API', useProxy: false },
  { name: 'Proxy Gateway CorsProxy.io', useProxy: true, proxy: 'corsproxy' },
  { name: 'Proxy Gateway AFELD', useProxy: true, proxy: 'afeld' },
  { name: 'Proxy Gateway AllOrigins', useProxy: true, proxy: 'allorigins' },
  { name: 'Proxy Gateway CodeTabs', useProxy: true, proxy: 'codetabs' }
];

async function getTranscriptFromLegacyAPI(videoId) {
  const listUrl = `https://video.google.com/timedtext?type=list&v=${videoId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  let xmlListText = '';
  let successfulStrategy = null;

  // 1. Dapatkan daftar trek bahasa yang tersedia
  for (const strategy of strategies) {
    try {
      console.log(`[YouTube Legacy] Fetching tracklist with strategy: ${strategy.name}`);
      xmlListText = await fetchLegacyTrack(listUrl, strategy, headers);
      if (xmlListText && xmlListText.includes('<transcript_list>')) {
        successfulStrategy = strategy;
        break;
      }
    } catch (err) {
      console.warn(`[YouTube Legacy] Strategy ${strategy.name} missed: ${err.message}`);
    }
  }

  if (!xmlListText || !xmlListText.includes('<transcript_list>')) {
    throw new Error('Gagal mendapatkan daftar trek bahasa dari TimedText API.');
  }

  const tracks = parseTracks(xmlListText);
  if (tracks.length === 0) {
    throw new Error('Tidak ada subtitle/transkrip yang tersedia pada video ini.');
  }

  // Prioritaskan: 1. ID Manual, 2. ID Auto-Generated (asr), 3. EN Manual, 4. Trek pertama apa saja
  const prioritizedTracks = tracks.sort((a, b) => {
    const isAId = a.langCode === 'id';
    const isBId = b.langCode === 'id';
    if (isAId && !isBId) return -1;
    if (!isAId && isBId) return 1;
    if (isAId) {
      const isAAsr = a.name === 'asr';
      const isBAsr = b.name === 'asr';
      if (!isAAsr && isBAsr) return -1;
      if (isAAsr && !isBAsr) return 1;
    }
    const isAEn = a.langCode === 'en';
    const isBEn = b.langCode === 'en';
    if (isAEn && !isBEn) return -1;
    if (!isAEn && isBEn) return 1;
    return 0;
  });

  const bestTrack = prioritizedTracks[0];
  console.log(`[YouTube Legacy] Selected best track: lang=${bestTrack.langCode}, name=${bestTrack.name}`);

  const trackUrl = `https://video.google.com/timedtext?type=track&v=${videoId}&lang=${bestTrack.langCode}${bestTrack.name ? `&name=${bestTrack.name}` : ''}`;
  
  // 2. Unduh konten transkrip menggunakan strategi/rute IP yang terbukti sukses sebelumnya
  let xmlTrackText = '';
  try {
    xmlTrackText = await fetchLegacyTrack(trackUrl, successfulStrategy, headers);
  } catch (_err) {
    // Jika rute sukses mengalami anomali, lakukan rotasi ke seluruh strategi
    for (const strategy of strategies) {
      try {
        xmlTrackText = await fetchLegacyTrack(trackUrl, strategy, headers);
        if (xmlTrackText && xmlTrackText.includes('<transcript>')) {
          break;
        }
      } catch (_inner) {
        // Lanjut mencoba
      }
    }
  }

  if (!xmlTrackText || !xmlTrackText.includes('<transcript>')) {
    throw new Error('Gagal mengunduh berkas XML subtitle target.');
  }

  const textMatches = xmlTrackText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
  if (!textMatches) {
    throw new Error('Berkas XML transkrip kosong atau tidak memiliki data teks.');
  }

  return textMatches.map(m => {
    const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
    return decodeHtmlEntities(content);
  }).join(' ');
}

async function fetchLegacyTrack(url, strategy, headers) {
  let requestUrl = url;
  if (strategy.useProxy) {
    if (strategy.proxy === 'corsproxy') {
      requestUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    } else if (strategy.proxy === 'afeld') {
      requestUrl = `https://jsonp.afeld.me/?url=${encodeURIComponent(url)}`;
    } else if (strategy.proxy === 'allorigins') {
      requestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    } else if (strategy.proxy === 'codetabs') {
      requestUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    }
  }
  
  const response = await fetchWithTimeout(requestUrl, { headers: strategy.useProxy ? {} : headers }, 3000);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.text();
}

function parseTracks(xmlText) {
  const tracks = [];
  const trackBlockRegex = /<track([\s\S]*?)\/>/gi;
  let blockMatch;
  while ((blockMatch = trackBlockRegex.exec(xmlText)) !== null) {
    const block = blockMatch[1];
    const langMatch = block.match(/lang_code="([^"]+)"/i);
    const nameMatch = block.match(/name="([^"]*)"/i);
    if (langMatch) {
      tracks.push({
        langCode: langMatch[1],
        name: nameMatch ? nameMatch[1] : ''
      });
    }
  }
  return tracks;
}

// =========================================================================
// 🛠️ REGULAR EMBED SCRAPER FALLBACK
// =========================================================================

async function runFallbackEmbedScraper(videoId) {
  const targetUrl = `https://www.youtube-nocookie.com/embed/${videoId}?hl=id&t=${Date.now()}`;
  let lastError = null;

  for (const strategy of strategies) {
    try {
      let requestUrl = targetUrl;
      let headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'id-ID,id;q=0.9'
      };

      if (strategy.useProxy) {
        if (strategy.proxy === 'corsproxy') {
          requestUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        } else if (strategy.proxy === 'afeld') {
          requestUrl = `https://jsonp.afeld.me/?url=${encodeURIComponent(targetUrl)}`;
        } else if (strategy.proxy === 'allorigins') {
          requestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        } else if (strategy.proxy === 'codetabs') {
          requestUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        }
        headers = {};
      }

      const response = await fetchWithTimeout(requestUrl, { headers }, 3000);
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const html = await response.text();
      const captionTracks = extractCaptionTracks(html);
      if (!captionTracks || captionTracks.length === 0) {
        throw new Error('Trek subtitle tidak ditemukan pada embed player.');
      }

      const selectedTrack = captionTracks.find(t => 
        t.languageCode && (t.languageCode === 'id' || t.languageCode.startsWith('id'))
      ) || captionTracks[0];

      let xmlRequestUrl = selectedTrack.baseUrl;
      if (strategy.useProxy) {
        if (strategy.proxy === 'corsproxy') {
          xmlRequestUrl = `https://corsproxy.io/?${encodeURIComponent(selectedTrack.baseUrl)}`;
        } else if (strategy.proxy === 'afeld') {
          xmlRequestUrl = `https://jsonp.afeld.me/?url=${encodeURIComponent(selectedTrack.baseUrl)}`;
        } else if (strategy.proxy === 'allorigins') {
          xmlRequestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(selectedTrack.baseUrl)}`;
        } else if (strategy.proxy === 'codetabs') {
          xmlRequestUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(selectedTrack.baseUrl)}`;
        }
      }

      const xmlResponse = await fetchWithTimeout(xmlRequestUrl, { headers }, 3000);
      if (!xmlResponse.ok) {
        throw new Error(`XML Status ${xmlResponse.status}`);
      }

      const xmlText = await xmlResponse.text();
      const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
      if (!textMatches) throw new Error('XML sisa teks kosong.');

      return textMatches.map(m => {
        const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
        return decodeHtmlEntities(content);
      }).join(' ');

    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Seluruh strategi gagal. Error akhir: ${lastError.message}`);
}

function extractCaptionTracks(html) {
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]*?});\s*(?:var|yt)/) ||
                              html.match(/ytInitialPlayerResponse\s*=\s*([\s\S]*?);\s*(?:var\s+meta|<\/script)/i) ||
                              html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/) ||
                              html.match(/"ytInitialPlayerResponse"\s*:\s*({[\s\S]*?})\s*,\s*"microformat"/);

  if (playerResponseMatch) {
    try {
      const parsed = JSON.parse(playerResponseMatch[1]);
      const tracks = parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && Array.isArray(tracks) && tracks.length > 0) {
        return tracks;
      }
    } catch (_e) {
      // Abaikan dan lanjut ke direct regex
    }
  }

  const tracks = [];
  const directTracksRegex = /\{"baseUrl"\s*:\s*"([^"]+)"[^}]+?"languageCode"\s*:\s*"([^"]+)"/g;
  let match;
  
  while ((match = directTracksRegex.exec(html)) !== null) {
    try {
      const baseUrlEscaped = match[1];
      const languageCode = match[2];
      const baseUrl = JSON.parse(`"${baseUrlEscaped}"`);
      tracks.push({ baseUrl, languageCode });
    } catch (_e) {
      // Lanjut
    }
  }

  return tracks;
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
    .replace(/<[^>]*>/g, '')
    .trim();
}