import { readConfig } from "../../config";

type SanitizerConfig = {
  maskPII: boolean;
  maxLength: number;
};

/**
 * PII types for common personally identifiable information
 */
export type PIIType = "email" | "phone" | "url" | "default";

/**
 * Get default preserve characters for each PII type
 */
function getPreserveCharsForType(piiType: PIIType): string {
  switch (piiType) {
    case "email":
      return "@.";
    case "phone":
      return "+-()";
    case "url":
      return ":/?&=#";
    case "default":
      return "@."; // Default for backward compatibility
    default:
      return "@.";
  }
}

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
    options: {
      isPII?: boolean;
      allowEmpty?: boolean;
      preserveChars?: string;
      piiType?: PIIType;
    } = {}
  ): string {
    // Type validation
    if (typeof input !== "string") {
      throw new Error(
        `Invalid ${fieldName}: must be a string, got ${typeof input}`
      );
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
      // Determine preserveChars: explicit value takes precedence, then piiType, then default
      let preserveChars = options.preserveChars;
      if (!preserveChars && options.piiType) {
        preserveChars = getPreserveCharsForType(options.piiType);
      }
      sanitized = this.maskPII(sanitized, preserveChars);
    }

    // Empty validation after sanitization
    if (!options.allowEmpty && sanitized.trim() === "") {
      throw new Error(`Invalid ${fieldName}: cannot be empty`);
    }

    return sanitized;
  }

  /**
   * Remove control characters that could be used for log injection
   */
  private removeControlCharacters(input: string): string {
    // Remove non-printable control characters while preserving tab (\x09), newline (\x0A), and carriage return (\x0D)
    // These preserved characters are later normalized to spaces by normalizeWhitespace()
    // Removes control characters in ranges: \x00-\x08, \x0B-\x0C, \x0E-\x1F, and \x7F
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
   * For emails, masks only the local part (before @) preserving first and last char of local part
   * Example: "john.doe@example.com" -> "j***e@example.com"
   * @param input The string to mask
   * @param preserveChars Characters to preserve in the middle section (default: '@.')
   */
  private maskPII(input: string, preserveChars: string = "@."): string {
    if (input.length <= 2) {
      return input; // Too short to mask meaningfully
    }

    // Special handling for email addresses
    if (preserveChars === "@." && input.includes("@")) {
      const parts = input.split("@");
      const localPart = parts[0];
      const domainPart = "@" + parts.slice(1).join("@");

      if (localPart.length <= 2) {
        return input; // Too short to mask meaningfully
      }

      const firstChar = localPart[0];
      const lastChar = localPart[localPart.length - 1];

      // Always use exactly 3 asterisks for email masking (established behavior)
      const maskedLocalPart = firstChar + "***" + lastChar;

      return maskedLocalPart + domainPart;
    }

    const firstChar = input[0];
    const lastChar = input[input.length - 1];

    // Escape special regex characters in preserveChars for dynamic pattern
    // Note: hyphen needs special handling - either escape it or place it at start/end
    const escapedPreserveChars = preserveChars.replace(
      /[.*+?^${}()|[\]\\-]/g,
      "\\$&"
    );

    // Build regex pattern to match characters NOT in preserveChars set
    const pattern = new RegExp(`[^${escapedPreserveChars}]`, "g");

    const middle = input.slice(1, -1).replace(pattern, "*");

    return firstChar + middle + lastChar;
  }

  /**
   * Create a sanitizer with default configuration from app config
   */
  public static createDefault(): InputSanitizer {
    try {
      const config = readConfig();
      return new InputSanitizer({
        maskPII: config.maskPII,
        maxLength: config.maxLength,
      });
    } catch (error) {
      // If config can't be read, use default secure settings
      return new InputSanitizer();
    }
  }
}
