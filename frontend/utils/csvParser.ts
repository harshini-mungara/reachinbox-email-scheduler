/**
 * Simple client-side Email Parser matching backend logic.
 */
export interface ParseResult {
  validEmails: string[];
  invalidEmails: string[];
  totalDetected: number;
}

export function parseEmailsClient(content: string): ParseResult {
  if (!content || typeof content !== 'string') {
    return { validEmails: [], invalidEmails: [], totalDetected: 0 };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
    totalDetected,
  };
}
