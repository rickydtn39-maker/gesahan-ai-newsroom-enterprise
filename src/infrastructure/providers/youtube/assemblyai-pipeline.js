// FILE: src/infrastructure/providers/youtube/assemblyai-pipeline.js

export class AssemblyAiPipeline {
  static async run(videoUrl, env, chatId, userId, origin, logger) {
    const assemblyAiKey = env.ASSEMBLYAI_API_KEY || null;
    if (!assemblyAiKey || !chatId || !userId || !origin) {
      logger.warn('[AssemblyAI Pipeline] Kunci API atau parameter koordinasi tidak lengkap.');
      return null;
    }

    try {
      const cobaltUrl = env.CUSTOM_COBALT_URL || 'https://api.cobalt.tools/api/json';
      logger.info(`[AssemblyAI Pipeline] Melakukan konversi audio via Cobalt: ${cobaltUrl}`);

      const cobaltResponse = await fetch(cobaltUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          isAudioOnly: true,
          aFormat: 'mp3',
        }),
      });

      if (!cobaltResponse.ok) {
        throw new Error(`Layanan Cobalt Downloader down (HTTP ${cobaltResponse.status})`);
      }

      const cobaltData = await cobaltResponse.json();
      const directAudioUrl = cobaltData.url;

      if (!directAudioUrl) {
        throw new Error('Cobalt tidak mengembalikan direct stream URL audio.');
      }

      const webhookUrl = `${origin}/webhooks/assemblyai?chatId=${chatId}&userId=${userId}`;
      logger.info(
        '[AssemblyAI Pipeline] Audio siap. Mendaftarkan transkripsi audio ke server AssemblyAI...'
      );

      const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          authorization: assemblyAiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: directAudioUrl,
          language_code: 'id',
          speech_model: 'best',
          webhook_url: webhookUrl,
        }),
      });

      if (!assemblyResponse.ok) {
        throw new Error(`AssemblyAI menolak request (HTTP ${assemblyResponse.status})`);
      }

      const assemblyData = await assemblyResponse.json();
      return {
        async: true,
        transcriptId: assemblyData.id,
        message:
          '🎙️ *AUDIO PIPELINE BERHASIL DIINJEK!*\n\nServer AI sedang mentranskripsikan audio percakapan video secara asinkron. Proses ini membutuhkan waktu sekitar 1-2 menit.\n\nSistem akan mengirimkan notifikasi instan secara otomatis begitu transkrip selesai!',
      };
    } catch (error) {
      logger.error('[AssemblyAI Pipeline] Gagal memproses pipeline audio:', {
        error: error.message,
      });
      return null;
    }
  }
}
