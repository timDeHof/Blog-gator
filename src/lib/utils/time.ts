/**
 * Parse a duration string into a number of milliseconds.
 *
 * Accepts a string consisting of an integer followed immediately by a unit: `ms`, `s`, `m`, or `h`.
 *
 * @param durationStr - The duration string in the format `<integer><unit>` (e.g., `150ms`, `2s`, `5m`, `1h`)
 * @returns The duration converted to milliseconds, or `undefined` if the input does not match the expected format or unit
 */
export function parseDuration(durationStr: string) {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) return;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return;
  }
}
