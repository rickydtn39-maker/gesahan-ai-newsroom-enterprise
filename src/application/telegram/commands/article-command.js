import { WORKFLOW_STATE } from '../../../core/constants/index.js';
import { TOKENS } from '../../../core/container/tokens.js';
import { MESSAGES } from '../../../core/constants/messages.js';
import { createDraft } from '../../services/editorial-session.js';
import { attachSourceText } from '../../services/draft-service.js';
import { createAngleKeyboard } from '../keyboards/index.js';

export async function articleCommand(update, telegramApi, sessionManager, container) {
  let state = await sessionManager.getState(update.chatId);

  if (state === WORKFLOW_STATE.IDLE) {
    await sessionManager.create(update.chatId, update.userId, createDraft);
    state = WORKFLOW_STATE.WAITING_ARTICLE;
  }

  if (state !== WORKFLOW_STATE.WAITING_ARTICLE) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.ACTIVE_PROCESS);
  }

  if (!update.hasText) {
    return telegramApi.sendMessage(update.chatId, MESSAGES.INTERACTION.INPUT_TEXT_REQUIRED);
  }

  const draft = await sessionManager.get(update.chatId);
  const draftWithSource = attachSourceText(draft, update.text);
  await sessionManager.save(draftWithSource);

  await telegramApi.sendMessage(update.chatId, MESSAGES.WORKFLOW.STAGE1_LOADING);

  try {
    const editorialService = container.resolve(TOKENS.EDITORIAL_SERVICE);
    const stage1Result = await editorialService.ingestStage1(draftWithSource);

    const updatedDraft = draftWithSource.copyWith({
      state: WORKFLOW_STATE.WAITING_ANGLE,
      stage1: stage1Result,
    });

    await sessionManager.save(updatedDraft);

    const priorityIcons = {
      A: '🔴 [A - BREAKING NEWS]',
      B: '🟡 [B - PUBLISH TODAY]',
      C: '🟢 [C - EVERGREEN]',
    };

    return telegramApi.sendMessage(
      update.chatId,
      [
        '📊 *HASIL ANALISIS INGEST GEMINI (STAGE 1)*',
        '━━━━━━━━━━━━━━━━━━',
        `🏷️ *Kategori:* ${stage1Result.wordpress.category}`,
        `🔑 *Keyword:* ${stage1Result.seo.focusKeyword}`,
        `🚨 *Prioritas:* ${priorityIcons[stage1Result.priority] || stage1Result.priority}`,
        `📈 *News Score:* ${stage1Result.newsValue.score}/100`,
        `🎯 *Draf Sementara Reporter:* "${stage1Result.draftReporter.title}"`,
        '━━━━━━━━━━━━━━━━━━',
        '',
        '✍️ *STAGE 2: TENTUKAN SUDUT PANDANG (ANGLE)*',
        'Silakan ketik angle khusus Anda (Contoh: "fokus pada kesedihan keluarga korban" atau "tonjolkan kronologi penangkapan") atau klik tombol di bawah untuk default AI.',
      ].join('\n'),
      createAngleKeyboard()
    );
  } catch (error) {
    await sessionManager.cancel(update.chatId);
    return telegramApi.sendMessage(
      update.chatId,
      `${MESSAGES.WORKFLOW.STAGE1_FAILED}${error.message}\n\nSesi dibatalkan.`
    );
  }
}
