// FILE: src/infrastructure/providers/youtube/innertube-client.js

export class InnerTubeClient {
  static async fetchPlayerResponse(videoId, env, logger) {
    const customProxy = env.CUSTOM_PROXY_URL || null;
    
    // 🚀 STRICT CONFIGURATION: Mengambil API Key dari environment tanpa hardcoding di dalam kode logis
    const innertubeKey = env.YOUTUBE_INNERTUBE_API_KEY;
    if (!innertubeKey) {
      logger.warn('[InnerTube Client] YOUTUBE_INNERTUBE_API_KEY is not configured in environment. Skipping direct route.');
      throw new Error('YOUTUBE_INNERTUBE_API_KEY is missing in wrangler configuration.');
    }

    const innertubeUrl = `https://www.youtube.com/youtubei/v1/player?key=${innertubeKey}`;

    // Payload resmi dengan konfigurasi client real-world untuk merotasi request
    const clients = [
      {
        name: 'ANDROID Mobile App Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: env.YOUTUBE_CLIENT_VERSION_ANDROID || '19.05.36',
              androidSdkVersion: 31,
              hl: 'id',
              gl: 'ID'
            }
          }
        }
      },
      {
        name: 'IOS Mobile App Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'IOS',
              clientVersion: env.YOUTUBE_CLIENT_VERSION_IOS || '19.02.2',
              deviceModel: 'iPhone16,2',
              hl: 'id',
              gl: 'ID'
            }
          }
        }
      },
      {
        name: 'WEB Desktop Player Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: env.YOUTUBE_CLIENT_VERSION_WEB || '2.20240210.01.00',
              hl: 'id',
              gl: 'ID'
            }
          }
        }
      }
    ];

    let lastError = null;

    for (const client of clients) {
      try {
        let requestUrl = innertubeUrl;
        if (customProxy) {
          requestUrl = `${customProxy.replace(/\/+$/, '')}/${encodeURIComponent(innertubeUrl)}`;
        }

        logger.info(`[InnerTube Client] Menghubungi InnerTube API via ${client.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          body: JSON.stringify(client.payload),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          throw new Error(`Google CDN merespon dengan status HTTP ${response.status}`);
        }

        const data = await response.json();

        // 🚀 ENRICHED DIAGNOSTIC TELEMETRY: Membuka 'black box' kegagalan YouTube API secara detail
        logger.info('[InnerTube Client] Player Response Diagnostics Evaluated:', {
          client: client.name,
          playabilityStatus: data?.playabilityStatus || null,
          hasCaptions: Boolean(data?.captions),
          hasVideoDetails: Boolean(data?.videoDetails),
          hasStreamingData: Boolean(data?.streamingData),
          hasMicroformat: Boolean(data?.microformat)
        });

        // Jika captions kosong, cetak potongan data mentah untuk investigasi forensik
        if (!data?.captions) {
          const rawString = JSON.stringify(data);
          logger.warn(`[InnerTube Client] Captions is missing. Raw payload preview: ${rawString.substring(0, 1500)}...`);
        }

        if (data?.playabilityStatus?.status === 'UNPLAYABLE') {
          throw new Error(`Video is unplayable: ${data?.playabilityStatus?.reason || 'No reason provided'}`);
        }

        return data;
      } catch (err) {
        logger.warn(`[InnerTube Client] Client ${client.name} execution missed: ${err.message}`);
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('All InnerTube API execution chains failed.');
  }
}