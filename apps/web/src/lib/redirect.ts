export const DEFAULT_AFTER_SIGN_IN = "/projets";

// Browsers read `\` as `/` (so `/\host` means `//host`) and strip tabs and newlines from URLs.
const UNSAFE_CHARACTERS = /[\\\p{Cc}]/u;

/**
 * Path to open after sign-in, taken from the already-decoded `suivant` parameter. Only a path on the
 * application's own origin is kept; anything else falls back to « Mes projets ».
 */
export function safeNext(value: string | null, origin: string = window.location.origin): string {
  if (value === null || !value.startsWith("/") || UNSAFE_CHARACTERS.test(value)) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (url.origin !== origin) return DEFAULT_AFTER_SIGN_IN;
  return `${url.pathname}${url.search}${url.hash}`;
}
