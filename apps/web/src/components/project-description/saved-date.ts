import { formatRelativeDate } from "@/components/projects/format";

/**
 * Date of the « Enregistré automatiquement » state (spec § 8.3). Seconds are rounded down to the
 * ten so that the text does not change every second; beyond a minute, the rules of « Mes projets ».
 */
export function formatSavedDate(savedAt: number, now: number): string {
  const elapsed = now - savedAt;
  if (elapsed < 5_000) return "à l'instant";
  if (elapsed < 10_000) return "il y a 5 s";
  if (elapsed < 60_000) return `il y a ${Math.floor(elapsed / 10_000) * 10} s`;
  return formatRelativeDate(new Date(savedAt).toISOString(), new Date(now));
}

/** Refresh period of that text: every 5 s during the first minute, then every minute. */
export function savedDateRefreshMs(savedAt: number, now: number): number {
  return now - savedAt < 60_000 ? 5_000 : 60_000;
}
