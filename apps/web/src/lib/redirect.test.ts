import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

const ORIGIN = "https://app.tracea.example";

describe("safeNext", () => {
  it.each([
    ["/projets", "/projets"],
    ["/projets?x=1", "/projets?x=1"],
    ["/projets?x=1#carte", "/projets?x=1#carte"],
  ])("keeps the same-origin path %s", (value, expected) => {
    expect(safeNext(value, ORIGIN)).toBe(expected);
  });

  it.each([
    ["absent", null],
    ["empty", ""],
    ["protocol-relative", "//site.example"],
    ["backslash", "/\\site.example"],
    ["backslash then slash", "/\\/site.example"],
    ["decoded %5C", decodeURIComponent("/%5Csite.example")],
    ["absolute URL", "https://site.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["tab between slashes", "/\t/site.example"],
    ["newline between slashes", "/\n/site.example"],
    ["relative path", "projets"],
    // S3-SEC-01: dot segments removed by the URL parser leave a protocol-relative path.
    ["dot segment", "/.//site-externe.example"],
    ["decoded %2e segment", decodeURIComponent("/%2e//site-externe.example")],
    ["dot-dot segment", "/projets/..//site-externe.example/connexion"],
  ])("falls back to /projets for a %s value", (_case, value) => {
    expect(safeNext(value, ORIGIN)).toBe("/projets");
  });

  describe("fragment of the login page (A11)", () => {
    it.each([
      ["/projets", "#x", "/projets#x"],
      ["/projets?x=1", "#carte", "/projets?x=1#carte"],
      ["/projets#plan", "#x", "/projets#plan"],
      ["/projets", "", "/projets"],
      ["/projets", "#a b", "/projets#a%20b"],
    ])("%s with fragment %j gives %s", (value, fragment, expected) => {
      expect(safeNext(value, ORIGIN, fragment)).toBe(expected);
    });

    it.each([
      ["absent", null],
      ["protocol-relative", "//site.example"],
      ["backslash", "/\\site.example"],
      ["absolute URL", "https://site.example"],
      ["relative path", "projets"],
    ])("is not added to the fallback for a %s value", (_case, value) => {
      expect(safeNext(value, ORIGIN, "#x")).toBe("/projets");
    });

    it("cannot move the path to another origin", () => {
      expect(safeNext("/projets", ORIGIN, "#//site.example")).toBe("/projets#//site.example");
      expect(safeNext("/projets", ORIGIN, "#@site.example")).toBe("/projets#@site.example");
    });
  });

  it("never returns a path that leaves the origin once dot segments are removed (S3-SEC-01)", () => {
    for (const value of [
      "/.//site-externe.example",
      "/./%2F%2Fsite-externe.example",
      "/projets/..//site-externe.example/connexion",
      "/././/site-externe.example",
    ]) {
      for (const fragment of ["", "#x"]) {
        const result = safeNext(value, ORIGIN, fragment);
        expect(result.startsWith("//"), `${value} gives ${result}`).toBe(false);
        expect(new URL(result, ORIGIN).origin, `${value} gives ${result}`).toBe(ORIGIN);
      }
    }
    // An encoded slash stays inside the path segment: still an internal path.
    expect(safeNext("/./%2F%2Fsite-externe.example", ORIGIN)).toBe("/%2F%2Fsite-externe.example");
  });

  it("keeps a safe path normalised, with the fragment of A11", () => {
    expect(safeNext("/projets/./plan", ORIGIN, "#x")).toBe("/projets/plan#x");
    expect(safeNext("/projets/./plan#x", ORIGIN)).toBe("/projets/plan#x");
  });

  it("uses the window origin by default", () => {
    expect(safeNext("/projets?x=1")).toBe("/projets?x=1");
    expect(safeNext("//site.example")).toBe("/projets");
  });

  it("uses the window fragment by default", () => {
    window.location.hash = "#x";
    try {
      expect(safeNext("/projets")).toBe("/projets#x");
    } finally {
      window.location.hash = "";
    }
  });
});
