"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputSanitizer = void 0;
var config_1 = require("../config");
/**
 * Get default preserve characters for each PII type
 */
function getPreserveCharsForType(piiType) {
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
var InputSanitizer = /** @class */ (function () {
    function InputSanitizer(config) {
        if (config === void 0) { config = {}; }
        var _a, _b;
        this.config = {
            maskPII: (_a = config.maskPII) !== null && _a !== void 0 ? _a : true, // Default to masking PII for privacy
            maxLength: (_b = config.maxLength) !== null && _b !== void 0 ? _b : 1000, // Default max length to prevent oversized logs
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
    InputSanitizer.prototype.sanitizeString = function (input, fieldName, options) {
        if (options === void 0) { options = {}; }
        // Type validation
        if (typeof input !== "string") {
            throw new Error("Invalid ".concat(fieldName, ": must be a string, got ").concat(typeof input));
        }
        // Length validation
        if (input.length > this.config.maxLength) {
            throw new Error("Invalid ".concat(fieldName, ": exceeds maximum length of ").concat(this.config.maxLength, " characters"));
        }
        var sanitized = this.removeControlCharacters(input);
        sanitized = this.normalizeWhitespace(sanitized);
        // PII handling for user-related fields
        if (options.isPII && this.config.maskPII) {
            // Determine preserveChars: explicit value takes precedence, then piiType, then default
            var preserveChars = options.preserveChars;
            if (!preserveChars && options.piiType) {
                preserveChars = getPreserveCharsForType(options.piiType);
            }
            sanitized = this.maskPII(sanitized, preserveChars);
        }
        // Empty validation after sanitization
        if (!options.allowEmpty && sanitized.trim() === "") {
            throw new Error("Invalid ".concat(fieldName, ": cannot be empty"));
        }
        return sanitized;
    };
    /**
     * Remove control characters that could be used for log injection
     */
    InputSanitizer.prototype.removeControlCharacters = function (input) {
        // Remove non-printable control characters while preserving tab (\x09), newline (\x0A), and carriage return (\x0D)
        // These preserved characters are later normalized to spaces by normalizeWhitespace()
        // Removes control characters in ranges: \x00-\x08, \x0B-\x0C, \x0E-\x1F, and \x7F
        return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    };
    /**
     * Normalize whitespace to prevent log formatting issues
     */
    InputSanitizer.prototype.normalizeWhitespace = function (input) {
        // Replace multiple spaces with single space, trim edges
        return input.replace(/\s+/g, " ").trim();
    };
    /**
     * Mask PII by showing only first character and last character with asterisks
     * For emails, masks only the local part (before @) preserving first and last char of local part
     * Example: "john.doe@example.com" -> "j***e@example.com"
     * @param input The string to mask
     * @param preserveChars Characters to preserve in the middle section (default: '@.')
     */
    InputSanitizer.prototype.maskPII = function (input, preserveChars) {
        if (preserveChars === void 0) { preserveChars = "@."; }
        if (input.length <= 2) {
            return input; // Too short to mask meaningfully
        }
        // Special handling for email addresses
        if (preserveChars === "@." && input.includes("@")) {
            var parts = input.split("@");
            var localPart = parts[0];
            var domainPart = "@" + parts.slice(1).join("@");
            if (localPart.length <= 2) {
                return input; // Too short to mask meaningfully
            }
            var firstChar_1 = localPart[0];
            var lastChar_1 = localPart[localPart.length - 1];
            // Always use exactly 3 asterisks for email masking (established behavior)
            var maskedLocalPart = firstChar_1 + "***" + lastChar_1;
            return maskedLocalPart + domainPart;
        }
        var firstChar = input[0];
        var lastChar = input[input.length - 1];
        // Escape special regex characters in preserveChars for dynamic pattern
        // Note: hyphen needs special handling - either escape it or place it at start/end
        var escapedPreserveChars = preserveChars.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
        // Build regex pattern to match characters NOT in preserveChars set
        var pattern = new RegExp("[^".concat(escapedPreserveChars, "]"), "g");
        var middle = input.slice(1, -1).replace(pattern, "*");
        return firstChar + middle + lastChar;
    };
    /**
     * Create a sanitizer with default configuration from app config
     */
    InputSanitizer.createDefault = function () {
        try {
            var config = (0, config_1.readConfig)();
            return new InputSanitizer({
                maskPII: config.maskPII,
                maxLength: config.maxLength,
            });
        }
        catch (error) {
            // If config can't be read, use default secure settings
            return new InputSanitizer();
        }
    };
    return InputSanitizer;
}());
exports.InputSanitizer = InputSanitizer;
