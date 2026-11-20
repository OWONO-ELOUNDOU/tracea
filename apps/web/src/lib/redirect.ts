export const DEFAULT_AFTER_SIGN_IN = "/projets";

// Browsers read `\` as `/` (so `/\host` means `//host`) and strip tabs and newlines from URLs.
const UNSAFE_CHARACTERS = /[\\\p{Cc}]/u;

/**
 * Path to open after sign-in, taken from the already-decoded `suivant` parameter. Only a path on the
 * application's own origin is kept; anything else falls back to « Mes projets ».
 *
 * In `/connexion?suivant=/projets#plan`, the browser treats `#plan` as the fragment of the login
 * page, not as part of `suivant`: `fragment` (the login page's own `location.hash`) is carried over
 * to the kept path when `suivant` has none of its own. It never applies to the fallback.
 */
export function safeNext(
  value: string | null,
  origin: string = window.location.origin,
  fragment: string = window.location.hash,
): string {
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
  // The setter only ever changes the fragment, so the origin check above still holds.
  if (url.hash === "" && fragment !== "") url.hash = fragment;
  const path = `${url.pathname}${url.search}${url.hash}`;
  // The parser removes dot segments, so "/.//host" comes out as "//host", which the router reads
  // as a protocol-relative URL: the returned path is checked, not only the received value.
  if (path.startsWith("//") || new URL(path, origin).origin !== origin) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return path;
}
