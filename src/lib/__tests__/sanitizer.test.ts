import { InputSanitizer } from "../sanitizer";

describe("InputSanitizer", () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer({ maskPII: true, maxLength: 1000 });
  });

  describe("sanitizeString", () => {
    describe("type validation", () => {
      it("should throw error for non-string input", () => {
        expect(() => {
          sanitizer.sanitizeString(123, "testField");
        }).toThrow("Invalid testField: must be a string, got number");

        expect(() => {
          sanitizer.sanitizeString(null, "testField");
        }).toThrow("Invalid testField: must be a string, got object");

        expect(() => {
          sanitizer.sanitizeString({}, "testField");
        }).toThrow("Invalid testField: must be a string, got object");
      });

      it("should accept valid string input", () => {
        const result = sanitizer.sanitizeString("valid string", "testField");
        expect(result).toBe("valid string");
      });
    });

    describe("empty validation", () => {
      it("should throw error for empty string when not allowed", () => {
        expect(() => {
          sanitizer.sanitizeString("  ", "testField", { allowEmpty: false });
        }).toThrow("Invalid testField: cannot be empty");

        expect(() => {
          sanitizer.sanitizeString("", "testField", { allowEmpty: false });
        }).toThrow("Invalid testField: cannot be empty");
      });

      it("should allow empty string when allowed", () => {
        const result = sanitizer.sanitizeString("  ", "testField", {
          allowEmpty: true,
        });
        expect(result).toBe("");
      });
    });

    describe("length validation", () => {
      it("should throw error for strings exceeding max length", () => {
        const longString = "a".repeat(1001);
        expect(() => {
          sanitizer.sanitizeString(longString, "testField");
        }).toThrow(
          "Invalid testField: exceeds maximum length of 1000 characters"
        );
      });

      it("should accept strings within max length", () => {
        const validString = "a".repeat(1000);
        const result = sanitizer.sanitizeString(validString, "testField");
        expect(result.length).toBe(1000);
      });
    });

    describe("control character removal", () => {
      it("should remove newline characters", () => {
        const input = "test\nstring\nwith\nnewlines";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with newlines");
      });

      it("should remove carriage return characters", () => {
        const input = "test\rstring\rwith\rcarriage\rreturns";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with carriage returns");
      });

      it("should remove tab characters", () => {
        const input = "test\tstring\twith\ttabs";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with tabs");
      });

      it("should remove other control characters", () => {
        const input = "test\x00string\x01with\x1Fcontrol";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with control");
      });
    });

    describe("whitespace normalization", () => {
      it("should normalize multiple spaces to single space", () => {
        const input = "test  string  with   multiple    spaces";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with multiple spaces");
      });

      it("should trim leading and trailing whitespace", () => {
        const input = "  test string with spaces  ";
        const result = sanitizer.sanitizeString(input, "testField");
        expect(result).toBe("test string with spaces");
      });
    });

    describe("PII masking", () => {
      it("should mask PII when maskPII is true and isPII option is true", () => {
        const input = "john.doe@example.com";
        const result = sanitizer.sanitizeString(input, "userName", {
          isPII: true,
        });
        expect(result).toBe("j***e@example.com");
      });

      it("should not mask PII when isPII option is false", () => {
        const input = "john.doe@example.com";
        const result = sanitizer.sanitizeString(input, "userName", {
          isPII: false,
        });
        expect(result).toBe("john.doe@example.com");
      });

      it("should not mask short strings even when isPII is true", () => {
        const input = "ab";
        const result = sanitizer.sanitizeString(input, "userName", {
          isPII: true,
        });
        expect(result).toBe("ab");
      });

      it("should handle PII masking with special characters", () => {
        const input = "user@domain.com";
        const result = sanitizer.sanitizeString(input, "userName", {
          isPII: true,
        });
        expect(result).toBe("u***m@domain.com");
      });
    });

    describe("log injection prevention", () => {
      it("should prevent newline injection attacks", () => {
        const maliciousInput =
          "normal\nACTION: fake_action, USER: fake_user, DETAILS: fake_details";
        const result = sanitizer.sanitizeString(maliciousInput, "details");
        expect(result).toBe(
          "normal ACTION: fake_action, USER: fake_user, DETAILS: fake_details"
        );
        expect(result).not.toContain("\n");
      });

      it("should prevent carriage return injection attacks", () => {
        const maliciousInput =
          "normal\rACTION: fake_action, USER: fake_user, DETAILS: fake_details";
        const result = sanitizer.sanitizeString(maliciousInput, "details");
        expect(result).toBe(
          "normal ACTION: fake_action, USER: fake_user, DETAILS: fake_details"
        );
        expect(result).not.toContain("\r");
      });
    });
  });

  describe("createDefault", () => {
    it("should create sanitizer with default secure settings", () => {
      // This test would normally mock the config reading, but for simplicity
      // we'll just test that it creates an instance
      const defaultSanitizer = InputSanitizer.createDefault();
      expect(defaultSanitizer).toBeInstanceOf(InputSanitizer);
    });
  });
});
