export class GeminiRequest {
  constructor({ model, prompt, schema }) {
    this.model = model;
    this.prompt = prompt;
    this.schema = schema;
  }

  toRequestBody() {
    return {
      contents: [
        {
          parts: [
            {
              text: this.prompt,
            },
          ],
        },
      ],
    };
  }
}
