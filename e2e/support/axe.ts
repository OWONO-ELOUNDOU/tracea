import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Tags of the WCAG 2.0 and 2.1 level A and AA rules (plan de qualité, ENF accessibilité). */
export const WCAG_A_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Runs axe-core on the current page and fails with the list of A / AA violations, if any. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_A_AA).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(summary, "axe-core WCAG 2 A/AA violations").toEqual([]);
}
