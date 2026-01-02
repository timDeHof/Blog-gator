import { readConfig } from "../config";

type SanitizerConfig = {
  maskPII: boolean;
  maxLength: number;
};

export class InputSanitizer {
  private config: SanitizerConfig;

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = {
      maskPII: config.maskPII ?? true, // Default to masking PII for privacy
      maxLength: config.maxLength ?? 1000, // Default max length to prevent oversized logs
    };
  }

  /**
   * Sanitize and validate a string input
   * @param input The string to sanitize
   * @param fieldName Name of the field for error messages
   * @param options Additional sanitization options
   * @returns Sanitized string
   * @throws Error if input is invalid
   */
  public sanitizeString(
    input: unknown,
    fieldName: string,
    options: { isPII?: boolean; allowEmpty?: boolean } = {}
  ): string {
    // Type validation
    if (typeof input !== "string") {
      throw new Error(
        `Invalid ${fieldName}: must be a string, got ${typeof input}`
      );
    }

    // Empty validation
    if (!options.allowEmpty && input.trim() === "") {
      throw new Error(`Invalid ${fieldName}: cannot be empty`);
    }

    // Length validation
    if (input.length > this.config.maxLength) {
      throw new Error(
        `Invalid ${fieldName}: exceeds maximum length of ${this.config.maxLength} characters`
      );
    }

    let sanitized = this.removeControlCharacters(input);
    sanitized = this.normalizeWhitespace(sanitized);

    // PII handling for user-related fields
    if (options.isPII && this.config.maskPII) {
      sanitized = this.maskPII(sanitized);
    }

    return sanitized;
  }

  /**
   * Remove control characters that could be used for log injection
   */
  private removeControlCharacters(input: string): string {
    // Remove newline, carriage return, tab, and other control characters
    // Keep only printable ASCII characters and common whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }

  /**
   * Normalize whitespace to prevent log formatting issues
   */
  private normalizeWhitespace(input: string): string {
    // Replace multiple spaces with single space, trim edges
    return input.replace(/\s+/g, " ").trim();
  }

  /**
   * Mask PII by showing only first character and last character with asterisks
   * Example: "john.doe@example.com" -> "j***e@example.com"
   */
  private maskPII(input: string): string {
    if (input.length <= 2) {
      return input; // Too short to mask meaningfully
    }

    const firstChar = input[0];
    const lastChar = input[input.length - 1];
    const middle = input.slice(1, -1).replace(/[^@.]/g, "*");

    return firstChar + middle + lastChar;
  }

  /**
   * Create a sanitizer with default configuration from app config
   */
  public static createDefault(): InputSanitizer {
    try {
      const config = readConfig();
      return new InputSanitizer({
        maskPII: config.maskPII ?? true, // Use config setting or default to true
      });
    } catch (error) {
      // If config can't be read, use default secure settings
      return new InputSanitizer({
        maskPII: true,
      });
    }
  }
}
