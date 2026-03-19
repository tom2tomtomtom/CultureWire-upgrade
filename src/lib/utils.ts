import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip lone Unicode surrogates that break JSON serialization.
 * Common in scraped social media data (emoji fragments, etc).
 */
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeString(s: string): string {
  return s.replace(LONE_SURROGATE_RE, '\uFFFD');
}

/** Deep-sanitize all strings in an object/array for safe JSON serialization */
export function sanitizeData<T>(data: T): T {
  if (typeof data === 'string') return sanitizeString(data) as T;
  if (Array.isArray(data)) return data.map(sanitizeData) as T;
  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeData(value);
    }
    return result as T;
  }
  return data;
}
