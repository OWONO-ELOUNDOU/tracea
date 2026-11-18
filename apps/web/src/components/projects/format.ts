import type { PublicUser } from "@/lib/api";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Relative date of the screen specification (§ 3.3), e.g. « il y a 2 h », « hier ».
 * Calendar days are counted in the device's time zone; rounding absorbs daylight-saving shifts.
 */
export function formatRelativeDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return "à l'instant";
  if (elapsed < HOUR) return `il y a ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `il y a ${Math.floor(elapsed / HOUR)} h`;

  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / DAY);
  if (days <= 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "il y a 1 semaine" : `il y a ${weeks} semaines`;
  }
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `le ${longDate.format(date)}`;
}

const ALPHANUMERIC = /[\p{L}\p{N}]/u;

/** Two-letter avatar initials (§ 3.4): from the display name, else from the e-mail local part. */
export function userInitials(user: Pick<PublicUser, "displayName" | "email">): string {
  const words = (user.displayName ?? "")
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== "");
  let letters: string[];
  if (words.length >= 2) {
    letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? "");
  } else if (words.length === 1) {
    letters = Array.from(words[0] as string).slice(0, 2);
  } else {
    const local = user.email.split("@")[0] ?? "";
    letters = Array.from(local)
      .filter((character) => ALPHANUMERIC.test(character))
      .slice(0, 2);
  }
  return letters.join("").toLocaleUpperCase("fr-FR");
}
