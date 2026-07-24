// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

// Helper Fetch dengan Timeout yang dioptimalkan dengan block finally
async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Batas waktu request (${timeoutMs} ms) terlampaui`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId); // Jaminan mutlak timer dibersihkan di semua kondisi
  }
}

export async function fetchYoutubeTranscript(videoUrl, env = {}, chatId = null, userId = null, origin = null) {
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (!videoIdMatch) {
    throw new Error('URL YouTube tidak valid.');
  }
  const videoId = videoIdMatch[1];

  const assemblyAiKey = env.ASSEMBLYAI_API_KEY || null;

  // =========================================================================
  // 🎙️ JALUR A: PREMIUM ASSEMBLYAI PIPELINE (ASINKRONUS WEBHOOK)
  // =========================================================================
  if (assemblyAiKey && chatId && userId && origin) {
    console.log('[YouTube Pipeline A] Attempting premium async AssemblyAI pipeline...');
    try {
      const cobaltUrl = env.CUSTOM_COBALT_URL || 'https://api.cobalt.tools/api/json';
      console.log(`[YouTube Pipeline A] Requesting audio stream from Cobalt: ${cobaltUrl}`);
      
      const cobaltResponse = await fetchWithTimeout(cobaltUrl, {
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
      }, 7000);

      if (cobaltResponse.ok) {
        const cobaltData = await cobaltResponse.json();
        const directAudioUrl = cobaltData.url;

        if (directAudioUrl) {
          const webhookUrl = `${origin}/webhooks/assemblyai?chatId=${chatId}&userId=${userId}`;
          console.log('[YouTube Pipeline A] Audio URL acquired. Initializing AssemblyAI transcript job...');

          const assemblyResponse = await fetchWithTimeout('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
              'authorization': assemblyAiKey,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              audio_url: directAudioUrl,
              language_code: 'id',
              speech_model: 'best',
              webhook_url: webhookUrl
            })
          }, 5000);

          if (assemblyResponse.ok) {
            const assemblyData = await assemblyResponse.json();
            return {
              async: true,
              transcriptId: assemblyData.id,
              message: '🎙️ *AUDIO PIPELINE BERHASIL DIINJEK!*\n\nServer AI sedang mentranskripsikan audio percakapan video secara asinkron. Proses ini membutuhkan waktu sekitar 1-2 menit.\n\nSistem akan mengirimkan notifikasi instan secara otomatis begitu transkrip selesai!'
            };
          }
        }
      }
    } catch (premiumError) {
      console.warn(`[YouTube Pipeline A] AssemblyAI pipeline threw exception: ${premiumError.message}`);
    }
    console.log('[YouTube Pipeline A] Falling back to Pipeline B (Official InnerTube API)...');
  }

  // =========================================================================
  // 🚀 JALUR B: OFFICIAL YOUTUBE INNERTUBE MULTI-CLIENT API (PRIMARY SYSTEM)
  // Menghubungi endpoint resmi Google client player dengan rotasi device app.
  // =========================================================================
  console.log('[YouTube Pipeline B] Running Multi-Client InnerTube Discovery Engine...');

  const customProxy = env.CUSTOM_PROXY_URL || null;
  const innertubeKey = 'AIzaSyAO_JV6GgA-Wb_h-Z64b0718503b44b';
  const innertubeUrl = `https://www.youtube.com/youtubei/v1/player?key=${innertubeKey}`;

  // Daftar klien resmi YouTube untuk mengelabuhi pembatasan GDPR
  const innertubeClients = [
    {
      name: 'ANDROID Mobile App Client (GDPR Bypass)',
      payload: {
        videoId: videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.05.36',
            androidSdkVersion: 31,
            hl: 'id',
            gl: 'ID'
          }
        }
      }
    },
    {
      name: 'IOS Mobile App Client (GDPR Bypass)',
      payload: {
        videoId: videoId,
        context: {
          client: {
            clientName: 'IOS',
            clientVersion: '19.02.2',
            deviceModel: 'iPhone16,2',
            hl: 'id',
            gl: 'ID'
          }
        }
      }
    },
    {
      name: 'WEB Desktop Player Client (Fallback)',
      payload: {
        videoId: videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240210.01.00',
            hl: 'id',
            gl: 'ID',
            utcOffsetMinutes: 420
          }
        }
      }
    }
  ];

  let lastError = null;

  for (const client of innertubeClients) {
    try {
      let requestUrl = innertubeUrl;
      if (customProxy) {
        requestUrl = `${customProxy}${encodeURIComponent(innertubeUrl)}`;
      }

      console.log(`[YouTube Pipeline B] Requesting player data via ${client.name}...`);
      
      const response = await fetchWithTimeout(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(client.payload)
      }, 6000);

      if (!response.ok) {
        throw new Error(`InnerTube returned status ${response.status}`);
      }

      const payload = await response.json();
      const jsonStr = JSON.stringify(payload);

      // TELEMETRY DIAGNOSTIC LOGGER: Memeriksa struktur respon secara empiris
      console.log({
        event: 'YOUTUBE_INNERTUBE_CLIENT_DIAGNOSTICS',
        client: client.name,
        status: response.status,
        hasPlayerResponse: jsonStr.includes('playabilityStatus'),
        hasCaptionTracks: jsonStr.includes('captionTracks'),
        playabilityStatus: payload?.playabilityStatus?.status || 'N/A'
      });

      // Deteksi kegagalan akses video (private, dsb)
      if (payload?.playabilityStatus?.status === 'UNPLAYABLE') {
        throw new Error(`Video tidak dapat diputar: ${payload?.playabilityStatus?.reason || 'Alasan tidak diketahui'}`);
      }

      // Gunakan parser regex mendalam langsung pada string JSON payload murni
      const captionTracks = extractCaptionTracksFromJsonString(jsonStr);

      if (captionTracks && captionTracks.length > 0) {
        const bestTrack = selectBestTrack(captionTracks);
        console.log(`[YouTube Pipeline B] Found best track: lang=${bestTrack.languageCode}, kind=${bestTrack.kind || 'manual'}`);

        let xmlUrl = bestTrack.baseUrl;
        if (!xmlUrl.includes('&fmt=xml')) {
          xmlUrl += '&fmt=xml'; // Paksa format XML murni
        }

        let xmlRequestUrl = xmlUrl;
        if (customProxy) {
          xmlRequestUrl = `${customProxy}${encodeURIComponent(xmlUrl)}`;
        }

        console.log('[YouTube Pipeline B] Downloading structured XML subtitles from Google CDN...');
        const xmlResponse = await fetchWithTimeout(xmlRequestUrl, {}, 5000);

        if (!xmlResponse.ok) {
          throw new Error(`Google CDN XML returned HTTP status ${xmlResponse.status}`);
        }

        const xmlText = await xmlResponse.text();
        const textMatches = xmlText.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);

        if (textMatches && textMatches.length > 0) {
          console.log('[YouTube Pipeline B] Transcript successfully downloaded and parsed!');
          return textMatches.map(m => {
            const content = m.replace(/<text[^>]*>([\s\S]*?)<\/text>/i, '$1');
            return decodeHtmlEntities(content);
          }).join(' ');
        } else {
          throw new Error('XML file was empty of transcript text nodes.');
        }
      } else {
        throw new Error('No captionTracks found in InnerTube JSON response for this client.');
      }

    } catch (err) {
      console.warn(`[YouTube Pipeline B] Client ${client.name} missed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`Seluruh rute transkripsi video gagal dieksekusi. Detail kegagalan: ${lastError?.message || 'Access Denied'}`);
}

// =========================================================================
// 🛠️ INTERNAL SERVICE FUNCTIONS
// =========================================================================

function selectBestTrack(tracks) {
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

// Parser tangguh yang mengekstrak captionTracks langsung dari representasi string JSON
function extractCaptionTracksFromJsonString(jsonStr) {
  const tracks = [];
  
  // Regex universal untuk memindai token baseUrl & languageCode di dalam string JSON
  const directTracksRegex = /\{"baseUrl"\s*:\s*"([^"]+)"[^}]+?"languageCode"\s*:\s*"([^"]+)"/g;
  let match;
  
  while ((match = directTracksRegex.exec(jsonStr)) !== null) {
    try {
      const baseUrlEscaped = match[1];
      const languageCode = match[2];
      
      // Mengubah unicode escaped backslashes ke string biasa secara aman
      const baseUrl = JSON.parse(`"${baseUrlEscaped}"`);
      
      // Deteksi opsional tipe/jenis subtitle (asr atau bukan)
      let kind = 'manual';
      const surroundingBlock = jsonStr.substring(match.index, match.index + 300);
      if (surroundingBlock.includes('"kind":"asr"') || surroundingBlock.includes('"kind" : "asr"')) {
        kind = 'asr';
      }

      tracks.push({ baseUrl, languageCode, kind });
    } catch (_e) {}
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