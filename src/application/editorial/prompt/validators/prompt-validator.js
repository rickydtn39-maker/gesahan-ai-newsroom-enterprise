// FILE: src/application/editorial/prompt/validators/prompt-validator.js

export class PromptValidator {
  static validateProfile(profile) {
    if (!profile) {
      throw new Error("Target prompt profile is null or undefined.");
    }
    const requiredFields = ["name", "type", "geminiCategoryRule", "gptAngleInstruction", "datelineRule", "writingTone"];
    for (const field of requiredFields) {
      if (profile[field] === undefined || profile[field] === null) {
        throw new Error(`Invalid Prompt Profile: Missing required field "${field}" in profile "${profile.name || 'Unknown'}".`);
      }
    }
    return true;
  }
}