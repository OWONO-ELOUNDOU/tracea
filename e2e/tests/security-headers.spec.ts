import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { accounts } from "../fixtures/accounts.js";
import { API_URL, signIn, uniqueProjectName, withApiSession } from "../support/session.js";

const EXPECTED_CSP =
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; " +
  `connect-src 'self' ${API_URL}`;

const EXPECTED_HEADERS = {
  "content-security-policy": EXPECTED_CSP,
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  // The e2e stack runs the production build (browsers ignore HSTS over plain HTTP).
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

/** Collects the console messages Chromium logs when a CSP directive blocks something. */
function watchCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test.describe("Security headers of the web application", () => {
  test("pages carry the five headers", async ({ page }) => {
    const project = await withApiSession(accounts.primary, (session) =>
      session.createProject(uniqueProjectName("En-têtes")),
    );

    for (const path of ["/connexion", "/projets", `/projets/${project.id}`]) {
      const response = await page.goto(path);
      expect(response, path).not.toBeNull();
      const headers = response?.headers() ?? {};
      for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
        expect(headers[name], `${name} on ${path}`).toBe(value);
      }
    }

    await withApiSession(accounts.primary, (session) => session.deleteAllProjects());
  });

  test("sign-in and projects journey logs no CSP violation", async ({ page }) => {
    const violations = watchCspViolations(page);
    const name = uniqueProjectName("Sans violation");

    await page.goto("/connexion");
    await signIn(page, accounts.primary);

    // Exercises `connect-src` against the API: list, create (which opens the project, D15),
    // autosave of the project (cross-origin PATCH with If-Match, preflighted), reload, list again.
    await page.getByRole("banner").getByRole("button", { name: "Nouveau projet" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouveau projet" });
    await dialog.getByRole("textbox", { name: "Nom du projet" }).fill(name);
    await dialog.getByRole("button", { name: "Créer le projet" }).click();
    await expect(page).toHaveURL(/\/projets\/[0-9a-f-]{36}$/u);
    await expect(page.getByRole("textbox", { name: "Nom du projet" })).toHaveValue(name);
    const description = page.getByRole("textbox", { name: "Description libre" });
    const saved = page.waitForResponse(
      (response) => response.request().method() === "PATCH" && response.ok(),
    );
    await description.fill("Maison de plain-pied orientée sud.");
    await description.blur();
    expect((await saved).request().headers()["if-match"]).toBeTruthy();
    await expect(page.getByRole("contentinfo")).toHaveText(/^Enregistré automatiquement · /u);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Nom du projet" })).toHaveValue(name);
    await expect(description).toHaveValue("Maison de plain-pied orientée sud.");
    await page.goto("/projets");
    await expect(page.getByRole("list", { name: "Mes projets" })).toContainText(name);

    for (const [path, heading] of [
      ["/inscription", "Créer un compte"],
      ["/mot-de-passe-oublie", "Mot de passe oublié"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }

    expect(violations).toEqual([]);
    await withApiSession(accounts.primary, (session) => session.deleteAllProjects());
  });

  test("connect-src blocks other origins, and the violation is reported", async ({ page }) => {
    // Also proves that the console watch used above does see violations.
    const violations = watchCspViolations(page);
    await page.goto("/connexion");

    const outcome = await page.evaluate(() =>
      fetch("http://127.0.0.1:9/").then(
        () => "loaded",
        () => "blocked",
      ),
    );

    expect(outcome).toBe("blocked");
    await expect.poll(() => violations.join("\n")).toContain("connect-src");
  });

  test("a third-party page cannot frame /projets", async ({ page, baseURL }) => {
    const target = new URL("/projets", baseURL).href;
    // A real server on `127.0.0.1`: another origin and site than `localhost`. A page fulfilled by
    // `page.route` would count as public and Chromium's local network access checks would block
    // the frame request before any response, leaving the headers untested.
    const thirdParty = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><title>Tiers</title><iframe src="${target}"></iframe>`);
    });
    await new Promise<void>((resolve) => thirdParty.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = thirdParty.address() as AddressInfo;
      const framed = page.waitForResponse(target);

      await page.goto(`http://127.0.0.1:${port}/`);

      // The response arrives; Chromium then refuses to render it and shows its error page.
      expect((await framed).headers()["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
      await expect.poll(() => frame?.url()).toMatch(/^chrome-error:/);
      await expect(page.frameLocator("iframe").getByRole("heading")).toHaveCount(0);
    } finally {
      await new Promise((resolve) => thirdParty.close(resolve));
    }
  });
});

test.describe("Return after sign-in (A11)", () => {
  test("keeps the fragment of an internal suivant", async ({ page }) => {
    await page.goto("/connexion?suivant=/projets#x");
    await page.getByLabel("Adresse e-mail", { exact: true }).fill(accounts.primary.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(accounts.primary.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/projets#x$/);
    await expect(page.getByRole("heading", { level: 1, name: "Mes projets" })).toBeVisible();
  });

  test("still refuses an external suivant, fragment included", async ({ page }) => {
    await page.goto("/connexion?suivant=//site.example#x");
    await page.getByLabel("Adresse e-mail", { exact: true }).fill(accounts.primary.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(accounts.primary.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/projets$/);
  });

  // S3-SEC-01: the URL parser turns "/.//host" into "//host", a protocol-relative URL.
  for (const suivant of [
    "/.//site-externe.example",
    "/%2e//site-externe.example",
    "/projets/..//site-externe.example/connexion",
  ]) {
    test(`refuses a suivant leaving the origin through dot segments: ${suivant}`, async ({
      page,
    }) => {
      // Any request to the third-party host would mean the redirect escaped.
      const escaped: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).hostname === "site-externe.example") escaped.push(request.url());
      });
      // Raw in the query, as in a crafted link: "%2e" reaches `safeNext` decoded as ".".
      await page.goto(`/connexion?suivant=${suivant}`);
      await page.getByLabel("Adresse e-mail", { exact: true }).fill(accounts.primary.email);
      await page.getByLabel("Mot de passe", { exact: true }).fill(accounts.primary.password);
      await page.getByRole("button", { name: "Se connecter" }).click();

      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/projets$/);
      await expect(page.getByRole("heading", { level: 1, name: "Mes projets" })).toBeVisible();
      expect(escaped).toEqual([]);
    });
  }
});
