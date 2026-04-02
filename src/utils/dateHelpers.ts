/**
 * Parse date strings that may contain non-standard formats.
 * Handles formats like "July 28, 2025 at 9:00 AM" by stripping the word "at"
 * which is not recognized by the Date constructor.
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr.replace(/\bat\b/g, ''))
}
