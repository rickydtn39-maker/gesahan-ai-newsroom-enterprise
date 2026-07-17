import { EDITORIAL_POLICY } from '../../policy/editorial-policy.js';

export class EditorialBuilder {
  build(job) {
    return `
# ${job.engine.identity.name}

VERSI

${job.engine.identity.version}

PERAN

${job.engine.identity.role}

GAYA REDAKSI

${job.engine.rules.map((rule) => `- ${rule}`).join('\n')}

KEBIJAKAN EDITORIAL

${EDITORIAL_POLICY.journalism.map((rule) => `- ${rule}`).join('\n')}

FORMAT OUTPUT

${EDITORIAL_POLICY.output.map((rule) => `- ${rule}`).join('\n')}

SKEMA OUTPUT

{
  "title": "",
  "lead": "",
  "content": "",
  "slug": "",
  "excerpt": "",
  "focusKeyword": "",
  "metaDescription": "",
  "category": "",
  "tags": [],
  "readingTime": 0,
  "wordCount": 0,
  "qualityScore": 0
}

NASKAH ASLI

${job.source.text}
`;
  }
}