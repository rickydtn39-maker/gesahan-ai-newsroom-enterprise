# GESAHAN AI Newsroom Enterprise

An Enterprise AI Newsroom Platform powered by **Cloudflare Workers**, **Telegram Bot API**, **Google Gemini v2.5**, **OpenAI GPT-4o**, and **WordPress REST API**.

## 🚀 Architectural Design

[ Telegram App ]
│ (HTTPS Webhook with Secret Token Verification)
▼
[ Cloudflare Workers ] ────► [ global router handler ] ────► [ Global Error Middleware ]
│
├─► [ Command Registry Delegator ]
│ ├─► Static / Admin / Author Handlers
│ └─► State-Based Handlers (OCR, Ingest, Angle, Edit, Publish)
│
├─► [ Domain Layer (immutability Draft Entity) ]
│
├─► [ Core Services / Decoupled PubSub Event Bus ]
│ │
│ ├─► [ Editorial Engine (Gemini PASS Native JSON Schema) ]
│ ├─► [ Editorial Engine (GPT-4o Pass) ]
│ └─► [ Publishing Service (WordPress API Parallel Tasks) ]
│ │
│ └─► Event: 'ARTICLE_PUBLISHED'
│ │
│ └─► [ SEO Event Subscriber ]
│ ├─► IndexNow Submission
│ ├─► Sitemap Pinger (Bing)
│ └─► RSS WebSub Pinger (Google Hub)
│
└─► [ Security Layer (AES-GCM Encryption for WP Application Passwords) ]

## ⚙️ Environment Configurations

Setup the following variables inside your Worker environment (`wrangler.jsonc` or Cloudflare dashboard):

| Variable Name                    | Description                                                | Required | Sensitive |
| -------------------------------- | ---------------------------------------------------------- | -------- | --------- |
| `TELEGRAM_BOT_TOKEN`             | Your Telegram Bot HTTP token.                              | Yes      | Yes       |
| `TELEGRAM_SECRET_TOKEN`          | X-Telegram-Bot-Api-Secret-Token webhook validation string. | Yes      | Yes       |
| `GEMINI_API_KEY`                 | Google AI Studio Api Key.                                  | Yes      | Yes       |
| `OPENAI_API_KEY`                 | OpenAI / GitHub Models Auth Bearer Key.                    | Yes      | Yes       |
| `WORDPRESS_ENDPOINT`             | WordPress Site Base URL (e.g., `https://domain.com`).      | Yes      | No        |
| `WORDPRESS_USERNAME`             | Global Admin Username for WordPress.                       | Yes      | No        |
| `WORDPRESS_APPLICATION_PASSWORD` | Global WordPress Application Password.                     | Yes      | Yes       |
| `SITEMAP_URL`                    | WordPress Site Sitemap URL.                                | Yes      | No        |
| `RSS_URL`                        | WordPress Feed URL.                                        | Yes      | No        |
| `INDEXNOW_KEY`                   | IndexNow verification API key.                             | Yes      | Yes       |

## 📦 Multi-Author Encryption Configuration

Dynamic credentials stored in KV namespaces are symmetrically encrypted using Web Crypto AES-GCM before database submission. This prevents administrative credential leaks in case of database leakage.

---

### 17. FILE: `src/application/publishing/publishing-service.js`

_Mengekstrak mutasi penyimpanan riwayat KV ke dalam repositori resmi (`archiveDraftMemory`)._

```javascript
export class PublishingService {
  constructor(
    telegramApi,
    wordpressProvider,
    whitelistRepository,
    eventBus,
    logger,
    metrics,
    draftRepository
  ) {
    this.telegramApi = telegramApi;
    this.wordpressProvider = wordpressProvider;
    this.whitelistRepository = whitelistRepository;
    this.eventBus = eventBus;
    this.logger = logger;
    this.metrics = metrics;
    this.draftRepository = draftRepository; // 🚀 MEMBAWAKAN ABSTRAKSI REPOSITORY SEPENUHNYA
  }

  async publish(draft) {
    const startTime = Date.now();
    this.logger.info('Starting publishing process', { draftId: draft.id });

    try {
      if (!draft.source || !draft.source.featuredImage) {
        throw new Error('Foto unggulan (Featured Image) belum tersedia.');
      }

      const featured = draft.source.featuredImage;

      // 1. Deteksi dinamis kredensial Multi-Author dari whitelist KV
      const whitelist = await this.whitelistRepository.getAll();
      const userCredentials = whitelist.find((u) => Number(u.userId) === Number(draft.userId));

      let customAuth = null;
      if (userCredentials && userCredentials.wpUsername && userCredentials.wpAppPassword) {
        customAuth = {
          username: userCredentials.wpUsername,
          applicationPassword: userCredentials.wpAppPassword,
        };
        this.logger.info('Using custom author credentials for WordPress publishing', {
          userId: draft.userId,
          wpUsername: userCredentials.wpUsername,
        });
      } else {
        this.logger.info('Falling back to global WordPress Admin credentials', {
          userId: draft.userId,
        });
      }

      // 2. Download Foto Telegram
      const file = await this.telegramApi.downloadFile(featured.fileId);

      // 3. Upload Media WordPress menggunakan dynamic auth
      const media = await this.wordpressProvider.uploadMedia(
        file.fileName,
        file.mimeType,
        file.buffer,
        customAuth
      );

      // 4. Create Post menggunakan dynamic auth
      const post = await this.wordpressProvider.createPost(draft.editorial, media.id, customAuth);

      // 5. EVENT BUS DECOUPLING: Kirim sinyal bahwa artikel sukses diterbitkan
      try {
        const articleUrl = post.link;
        await this.eventBus.publish('ARTICLE_PUBLISHED', {
          articleUrl,
          postId: post.id,
          draftId: draft.id,
          editorial: draft.editorial,
        });
      } catch (eventError) {
        this.logger.error('Error triggering ARTICLE_PUBLISHED event subscribers', {
          error: eventError.message,
        });
      }

      // 6. 🚀 ARCHIVE DRAFT DENGAN AKURASI ENKAPSULASI REPOSITORY (MENGGANTI STG PUT LANGSUNG)
      try {
        await this.draftRepository.archiveDraftMemory(post.id, {
          id: post.id,
          title: draft.editorial.article.title,
          category: draft.editorial.seo.category,
          keyword: draft.editorial.seo.focusKeyword,
          url: post.link,
        });
      } catch (archError) {
        this.logger.error('Failed to archive draft into repository memory', {
          error: archError.message,
        });
      }

      const duration = Date.now() - startTime;
      this.logger.info('Publishing completed successfully', {
        draftId: draft.id,
        wpPostId: post.id,
      });
      this.metrics.timing('publishing_duration', duration, { status: 'success' });
      this.metrics.increment('articles_published', 1, { category: draft.editorial.seo.category });

      return {
        id: post.id,
        url: post.link,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Publishing failed', { draftId: draft.id, error: error.message });
      this.metrics.timing('publishing_duration', duration, { status: 'error' });
      this.metrics.increment('publishing_errors', 1);
      throw error;
    }
  }
}
```
