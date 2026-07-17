export class GeminiResponse {
  constructor(response) {
    this.response = response;
  }

  getText() {
    return (
      this.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      ''
    );
  }
}