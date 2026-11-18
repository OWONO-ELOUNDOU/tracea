import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "../support/axe.js";

test("login page renders and has no WCAG 2 A/AA violation", async ({ page }) => {
  await page.goto("/connexion");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mot de passe", { exact: true })).toBeVisible();

  await expectNoA11yViolations(page);
});

test("the e2e API is up on its embedded database", async ({ request }) => {
  const response = await request.get("http://localhost:3001/health");
  expect(response.ok()).toBe(true);
});
