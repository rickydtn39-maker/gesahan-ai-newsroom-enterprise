// FILE: src/infrastructure/providers/youtube/scrapers.js

import { TranscriptParser } from './transcript-parser.js';

export class EmbedScraper {
  static async fetchEmbedCaptions(videoId, env, logger) {
    const customProxy = env.CUSTOM_PROXY_URL || null;
    let url = `https://www.youtube.com/embed/${videoId}`;

    if (customProxy) {
      url = `${customProxy.replace(/\/+$/, '')}/${encodeURIComponent(url)}`;
    }

    logger.info(`[Embed Scraper] Bootstrapping HTML embed fallback: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Embed page returned HTTP status ${response.status}`);
    }

    const html = await response.text();

    // 🚀 RESILIENT MULTI-MARKER PARSER (SAFE DIAGNOSTIC-DRIVEN DECOUPLING)
    const markers = [
      'ytInitialPlayerResponse = ',
      'window["ytInitialPlayerResponse"] = ',
      'ytplayer.config = ',
      'ytInitialData = ',
    ];

    let jsonStr = null;
    let matchedMarker = null;

    for (const marker of markers) {
      const startIndex = html.indexOf(marker);
      if (startIndex !== -1) {
        const candidate = html.substring(startIndex + marker.length);
        const endIndex = candidate.indexOf(';</script>');
        if (endIndex !== -1) {
          jsonStr = candidate.substring(0, endIndex).trim();
          matchedMarker = marker;
          break;
        }
      }
    }

    if (!jsonStr) {
      // Cetak metadata diagnostik jika scraper gagal total memilah data HTML
      logger.warn('[Embed Scraper] Failed to locate any player markers in embed HTML.', {
        htmlLength: html.length,
        pageTitle: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'N/A',
      });
      throw new Error('Embed HTML Scraper could not extract player configuration objects.');
    }

    logger.info(
      `[Embed Scraper] Target player object extracted successfully using marker: "${matchedMarker}"`
    );

    let playerResponse;
    try {
      playerResponse = JSON.parse(jsonStr);
    } catch (jsonErr) {
      logger.error('[Embed Scraper] Failed to parse extracted player configuration JSON string.', {
        marker: matchedMarker,
        error: jsonErr.message,
      });
      // 🚀 FIXED: Menyertakan cause untuk mematuhi aturan preserve-caught-error
      throw new Error(`JSON parsing failure on HTML scraper marker: ${matchedMarker}`, {
        cause: jsonErr,
      });
    }

    // Jika marker yang ditemukan adalah ytplayer.config, ambil data playerResponse di dalamnya
    if (playerResponse?.args?.player_response) {
      try {
        playerResponse = JSON.parse(playerResponse.args.player_response);
      } catch (nestedJsonErr) {
        logger.error(
          '[Embed Scraper] Failed to parse nested player_response inside ytplayer.config.',
          {
            error: nestedJsonErr.message,
          }
        );
        // 🚀 FIXED: Menyertakan cause untuk mematuhi aturan preserve-caught-error
        throw new Error('Nested JSON parsing failure inside ytplayer.config wrapper.', {
          cause: nestedJsonErr,
        });
      }
    }

    const captionTracks = TranscriptParser.extractCaptionTracks(playerResponse);
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('Video captions tracklist is missing from the extracted embed metadata.');
    }

    return captionTracks;
  }
}
