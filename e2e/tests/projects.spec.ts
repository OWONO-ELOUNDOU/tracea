import { expect, test, type Page } from "@playwright/test";
import { accounts } from "../fixtures/accounts.js";
import { expectNoA11yViolations } from "../support/axe.js";
import { API_URL, signIn, uniqueProjectName, withApiSession } from "../support/session.js";

const NBSP = " ";

function projectList(page: Page) {
  return page.getByRole("list", { name: "Mes projets" });
}

function projectCard(page: Page, name: string) {
  return projectList(page).getByRole("article", { name, exact: true });
}

// The header button and the tile share the name « Nouveau projet » (spec § 9.1).
function headerNewProjectButton(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: "Nouveau projet" });
}

test.describe("Mes projets", () => {
  test.beforeEach(async () => {
    // Projects outlive a test in the e2e database: start every test from empty lists.
    for (const account of Object.values(accounts)) {
      await withApiSession(account, (session) => session.deleteAllProjects());
    }
  });

  test("sign in, create a project, find it again after reload", async ({ page }) => {
    const name = uniqueProjectName("Maison R+1");

    await page.goto("/connexion");
    await expectNoA11yViolations(page);
    await signIn(page, accounts.primary);
    await expect(page).toHaveTitle("Mes projets — Tracea");

    // Empty state.
    await expect(page.getByRole("heading", { name: "Aucun projet pour le moment" })).toBeVisible();
    await expect(projectList(page).getByRole("article")).toHaveCount(0);
    await expectNoA11yViolations(page);

    // Creation dialog.
    const trigger = headerNewProjectButton(page);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Nouveau projet" });
    await expect(dialog).toBeVisible();
    const nameField = dialog.getByRole("textbox", { name: "Nom du projet" });
    await expect(nameField).toBeFocused();
    await expectNoA11yViolations(page);

    await nameField.fill(name);
    await dialog.getByRole("button", { name: "Créer le projet" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("status")).toContainText(`Projet «${NBSP}${name}${NBSP}» créé.`);
    await expect(projectCard(page, name)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aucun projet pour le moment" })).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectNoA11yViolations(page);

    await page.reload();
    await expect(projectCard(page, name)).toBeVisible();
    await expect(projectList(page).getByRole("article")).toHaveCount(1);
  });

  test("the tile opens the same creation dialog", async ({ page }) => {
    const name = uniqueProjectName("Atelier");

    await signIn(page, accounts.primary);
    await projectList(page).getByRole("button", { name: "Nouveau projet" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouveau projet" });
    await dialog.getByRole("textbox", { name: "Nom du projet" }).fill(name);
    await dialog.getByRole("textbox", { name: "Nom du projet" }).press("Enter");

    await expect(dialog).toBeHidden();
    await expect(projectCard(page, name)).toBeVisible();
  });

  test("another account neither lists nor reaches the project", async ({ page }) => {
    const ownerProject = await withApiSession(accounts.primary, (session) =>
      session.createProject(uniqueProjectName("Villa du propriétaire")),
    );
    const otherName = uniqueProjectName("Duplex de l'autre compte");
    await withApiSession(accounts.secondary, (session) => session.createProject(otherName));

    await signIn(page, accounts.secondary);
    await expect(projectCard(page, otherName)).toBeVisible();
    await expect(projectList(page).getByRole("article")).toHaveCount(1);
    await expect(projectCard(page, ownerProject.name)).toHaveCount(0);

    // Same browser session (cookies of the second account), direct API call.
    const foreign = await page.request.get(`${API_URL}/projects/${ownerProject.id}`);
    expect(foreign.status()).toBe(404);
    const foreignBody: unknown = await foreign.json();
    expect(foreignBody).toMatchObject({ status: 404, code: "PROJECT_NOT_FOUND" });

    // Indistinguishable from a project that does not exist at all.
    const missing = await page.request.get(
      `${API_URL}/projects/00000000-0000-4000-8000-000000000000`,
    );
    expect(missing.status()).toBe(404);
    expect(foreignBody).toEqual(await missing.json());

    // The 404 comes from ownership, not from a missing project.
    const ownerStatus = await withApiSession(accounts.primary, (session) =>
      session.getProject(ownerProject.id),
    );
    expect(ownerStatus).toBe(200);
  });
});
