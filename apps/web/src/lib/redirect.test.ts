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
  ])("falls back to /projets for a %s value", (_case, value) => {
    expect(safeNext(value, ORIGIN)).toBe("/projets");
  });

  it("uses the window origin by default", () => {
    expect(safeNext("/projets?x=1")).toBe("/projets?x=1");
    expect(safeNext("//site.example")).toBe("/projets");
  });
});
