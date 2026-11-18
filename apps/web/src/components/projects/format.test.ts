import { describe, expect, it } from "vitest";
import { formatRelativeDate, userInitials } from "./format";

const now = new Date(2026, 10, 17, 15, 0, 0);
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month, day, hour).toISOString();

describe("formatRelativeDate", () => {
  it.each([
    [ago(30_000), "à l'instant"],
    [ago(-HOUR), "à l'instant"],
    [ago(MINUTE), "il y a 1 min"],
    [ago(59 * MINUTE), "il y a 59 min"],
    [ago(2 * HOUR), "il y a 2 h"],
    [ago(23 * HOUR), "il y a 23 h"],
    [at(2026, 10, 16, 9), "hier"],
    [at(2026, 10, 14), "il y a 3 jours"],
    [at(2026, 10, 11), "il y a 6 jours"],
    [at(2026, 10, 10), "il y a 1 semaine"],
    [at(2026, 9, 20), "il y a 4 semaines"],
    [at(2026, 9, 18), "il y a 1 mois"],
    [at(2025, 10, 18), "il y a 12 mois"],
    [at(2025, 10, 16), "le 16 novembre 2025"],
  ])("formats %s as « %s »", (iso, expected) => {
    expect(formatRelativeDate(iso, now)).toBe(expected);
  });
});

describe("userInitials", () => {
  it("takes the first letters of the first two words of the display name", () => {
    expect(userInitials({ displayName: "hermann owono essomba", email: "h@x.fr" })).toBe("HO");
  });

  it("takes the first two letters of a single-word display name", () => {
    expect(userInitials({ displayName: "Élodie", email: "h@x.fr" })).toBe("ÉL");
  });

  it("falls back to the alphanumeric characters of the e-mail local part", () => {
    expect(userInitials({ displayName: null, email: "_j.dupont@exemple.fr" })).toBe("JD");
  });
});
