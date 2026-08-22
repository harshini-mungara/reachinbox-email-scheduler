/**
 * Email Parser Utility
 * Parses CSV/TXT data containing email lists.
 * Supports comma, semicolon, whitespace, or newline delimiters.
 */

export interface ParseResult {
  validEmails: string[];
  invalidEmails: string[];
  totalDetected: number;
}

export function parseEmails(content: string): ParseResult {
  if (!content || typeof content !== 'string') {
    return { validEmails: [], invalidEmails: [], totalDetected: 0 };
  }

  // Regex to match a standard email address
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Split by common delimiters (newline, comma, semicolon, tab)
  const rawTokens = content.split(/[\n\r,;\t]+/);

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  let totalDetected = 0;

  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    totalDetected++;
    if (emailRegex.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        validEmails.push(trimmed);
      }
    } else {
      invalidEmails.push(trimmed);
    }
  }

  return {
    validEmails,
    invalidEmails,
    totalDetected
  };
}
