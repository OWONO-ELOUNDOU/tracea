import { ProjectSiteSchema } from "@tracea/domain";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NORTH, SitePreview } from "./site-preview";

function renderAt(northAngle: number) {
  const site = ProjectSiteSchema.parse({
    boundary: { kind: "rectangle", width: 20_000, depth: 30_000 },
    northAngle,
  });
  const { container } = render(<SitePreview preview={{ kind: "ready", site }} />);
  const symbol = container.querySelector<SVGGElement>("[data-north-symbol]");
  if (symbol === null) throw new Error("north symbol missing");
  return { container, symbol };
}

function point(text: string): [number, number] {
  const [x = "", y = ""] = text.split(",");
  return [Number(x), Number(y)];
}

/** Applies `rotate(angle cx cy)` (SVG: clockwise on screen, y pointing down). */
function rotate([px, py]: [number, number], transform: string): [number, number] {
  const [angle = 0, cx = 0, cy = 0] = (/rotate\(([^)]+)\)/u.exec(transform)?.[1] ?? "")
    .split(/\s+/u)
    .map(Number);
  const radians = (angle * Math.PI) / 180;
  const [dx, dy] = [px - cx, py - cy];
  return [
    cx + dx * Math.cos(radians) - dy * Math.sin(radians),
    cy + dx * Math.sin(radians) + dy * Math.cos(radians),
  ];
}

const bearing = ([x, y]: [number, number]) =>
  ((Math.atan2(x - NORTH.x, -(y - NORTH.y)) * 180) / Math.PI + 360) % 360;

describe("north symbol (A18)", () => {
  it.each([0, 20, 90, 200, 315])(
    "at %i°, the filled tip and the « N » point the same way, the letter upright and inside",
    (angle) => {
      const { symbol } = renderAt(angle);
      expect(symbol.getAttribute("aria-hidden")).toBe("true");

      const needle = symbol.querySelector("[data-north-needle]");
      const filled = symbol.querySelector("[data-north-half]");
      const letter = symbol.querySelector("[data-north-letter]");
      if (needle === null || filled === null || letter === null) throw new Error("incomplete");

      // The filled half's apex is its first point, the tip of the needle.
      const apex = point(filled.getAttribute("points")?.split(" ")[0] ?? "");
      const tip = rotate(apex, needle.getAttribute("transform") ?? "");
      const letterAt: [number, number] = [
        Number(letter.getAttribute("x")),
        Number(letter.getAttribute("y")),
      ];
      expect(bearing(tip)).toBeCloseTo(angle, 6);
      expect(bearing(letterAt)).toBeCloseTo(angle, 6);
      // Beyond the tip.
      expect(Math.hypot(letterAt[0] - NORTH.x, letterAt[1] - NORTH.y)).toBeGreaterThan(
        Math.hypot(tip[0] - NORTH.x, tip[1] - NORTH.y),
      );

      // Upright: the letter itself is never rotated.
      expect(letter.getAttribute("transform")).toBeNull();
      expect(letter.closest("[transform]")).toBeNull();
      expect(letter.textContent).toBe("N");
      // An 11 px semibold « N » spans about 8 × 11 around its centre.
      expect(letterAt[0] - 4).toBeGreaterThanOrEqual(0);
      expect(letterAt[0] + 4).toBeLessThanOrEqual(370);
      expect(letterAt[1] - 5.5).toBeGreaterThanOrEqual(0);
      expect(letterAt[1] + 5.5).toBeLessThanOrEqual(200);
    },
  );

  it("gives the angle in the preview's description, not in the symbol", () => {
    const { container } = renderAt(20);
    expect(container.querySelector("desc")?.textContent).toContain(
      "Nord orienté à 20° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu.",
    );
  });
});
