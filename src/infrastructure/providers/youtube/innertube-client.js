// FILE: src/infrastructure/providers/youtube/innertube-client.js

export class InnerTubeClient {
  static async fetchPlayerResponse(videoId, env, logger) {
    const customProxy = env.CUSTOM_PROXY_URL || null;
    const innertubeKey = 'AIzaSyAO_JV6GgA-Wb_h-Z64b0718503b44b';
    const innertubeUrl = `https://www.youtube.com/youtubei/v1/player?key=${innertubeKey}`;

    // Daftar agen resmi YouTube dengan rotasi device app untuk bypass filter
    const clients = [
      {
        name: 'ANDROID Mobile App Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.05.36',
              androidSdkVersion: 31,
              hl: 'id',
              gl: 'ID',
            },
          },
        },
      },
      {
        name: 'IOS Mobile App Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'IOS',
              clientVersion: '19.02.2',
              deviceModel: 'iPhone16,2',
              hl: 'id',
              gl: 'ID',
            },
          },
        },
      },
      {
        name: 'WEB Desktop Player Client',
        payload: {
          videoId,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240210.01.00',
              hl: 'id',
              gl: 'ID',
            },
          },
        },
      },
    ];

    let lastError = null;

    for (const client of clients) {
      try {
        let requestUrl = innertubeUrl;
        if (customProxy) {
          // Jika proxy dipasang, rutekan request ke proxy server Anda untuk bypass IP datacenter Cloudflare
          requestUrl = `${customProxy.replace(/\/+$/, '')}/${encodeURIComponent(innertubeUrl)}`;
        }

        logger.info(
          `[InnerTube Client] Mengirim request ke YouTube Player API via ${client.name}...`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(client.payload),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          throw new Error(`Server Google merespon dengan status HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data?.playabilityStatus?.status === 'UNPLAYABLE') {
          throw new Error(
            `Video tidak dapat diputar: ${data?.playabilityStatus?.reason || 'Status Unplayable'}`
          );
        }

        return data;
      } catch (err) {
        logger.warn(`[InnerTube Client] Gagal menggunakan klien ${client.name}: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('Seluruh agen InnerTube API gagal melakukan koneksi.');
  }
}
