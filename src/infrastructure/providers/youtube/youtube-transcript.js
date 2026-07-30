// FILE: src/infrastructure/providers/youtube/youtube-transcript.js

import { InnerTubeClient } from './innertube-client.js';
import { TranscriptParser } from './transcript-parser.js';
import { AssemblyAiPipeline } from './assemblyai-pipeline.js';
import { EmbedScraper } from './scrapers.js';

export async function fetchYoutubeTranscript(
  videoUrl,
  env = {},
  chatId = null,
  userId = null,
  origin = null
) {
  // 1. Ekstrak Video ID dari URL YouTube (Tanpa escape slash tidak perlu pada character class)
  const videoIdMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (!videoIdMatch) {
    throw new Error('URL YouTube tidak valid.');
  }
  const videoId = videoIdMatch[1];

  // Gunakan logging terstruktur bawaan Cloudflare Workers console
  const logger = {
    info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
  };

  const customProxy = env.CUSTOM_PROXY_URL || null;

  // =========================================================================
  // 🎙️ JALUR A: PREMIUM ASSEMBLYAI PIPELINE (AUDIO TO TEXT - PREMIUM BYPASS)
  // =========================================================================
  if (env.ASSEMBLYAI_API_KEY && chatId && userId && origin) {
    logger.info('[YouTube orchestrator] Memulai premium AssemblyAI async pipeline...');
    const asyncResult = await AssemblyAiPipeline.run(videoUrl, env, chatId, userId, origin, logger);
    if (asyncResult) {
      return asyncResult;
    }
    logger.warn(
      '[YouTube orchestrator] Premium pipeline bermasalah. Mengalihkan ke scrapers native...'
    );
  }

  const errors = [];

  // =========================================================================
  // 🚀 JALUR B: OFFICIAL NATIVE INNERTUBE API (DIRECT OBJECT PARSING)
  // =========================================================================
  logger.info('[YouTube orchestrator] Menjalankan InnerTube Player Engine...');
  try {
    const playerResponse = await InnerTubeClient.fetchPlayerResponse(videoId, env, logger);
    const captionTracks = TranscriptParser.extractCaptionTracks(playerResponse);

    if (captionTracks && captionTracks.length > 0) {
      const bestTrack = TranscriptParser.selectBestTrack(captionTracks);
      logger.info(`[YouTube orchestrator] Trek terbaik ditemukan: ${bestTrack.languageCode}`);
      return await TranscriptParser.downloadXmlTranscript(bestTrack.baseUrl, customProxy, logger);
    } else {
      throw new Error('Struktur response Google InnerTube player tidak menyediakan trek caption.');
    }
  } catch (err) {
    logger.warn(`[YouTube orchestrator] Jalur B (InnerTube) terhambat: ${err.message}`);
    errors.push(`Jalur B (InnerTube): ${err.message}`);
  }

  // =========================================================================
  // 🌐 JALUR C: FALLBACK SCRAPER EMBED PLAYER (JSON PARSING AMAN)
  // =========================================================================
  logger.info('[YouTube orchestrator] Jalur B gagal. Menghubungi Fallback Embed HTML Scraper...');
  try {
    const captionTracks = await EmbedScraper.fetchEmbedCaptions(videoId, env, logger);
    if (captionTracks && captionTracks.length > 0) {
      const bestTrack = TranscriptParser.selectBestTrack(captionTracks);
      logger.info(
        `[YouTube orchestrator] Trek terbaik ditemukan di halaman embed: ${bestTrack.languageCode}`
      );
      return await TranscriptParser.downloadXmlTranscript(bestTrack.baseUrl, customProxy, logger);
    } else {
      throw new Error('Trek subtitle tidak tersemat pada metadata player embed.');
    }
  } catch (err) {
    logger.error(`[YouTube orchestrator] Jalur C (Embed Scraper) gagal: ${err.message}`);
    errors.push(`Jalur C (Embed): ${err.message}`);
  }

  // Jika seluruh rute pencarian gagal dieksekusi, lempar detail error yang informatif
  throw new Error(
    `Seluruh jalur transkripsi video gagal dieksekusi. Detail kegagalan: ${errors.join(' | ')}`
  );
}
