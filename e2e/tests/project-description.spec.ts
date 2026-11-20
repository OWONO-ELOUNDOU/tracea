import { expect, test, type Page, type Response } from "@playwright/test";
import { accounts } from "../fixtures/accounts.js";
import { expectNoA11yViolations } from "../support/axe.js";
import { API_URL, signIn, uniqueProjectName, withApiSession } from "../support/session.js";

const NBSP = " ";
// Thousands separator of `Intl.NumberFormat("fr-FR")`.
const NNBSP = "\u202f";
const PROJECT_URL = /\/projets\/[0-9a-f-]{36}$/u;

function statusBar(page: Page) {
  return page.getByRole("contentinfo");
}

function isPatch(response: Response): boolean {
  return (
    response.request().method() === "PATCH" && response.url().startsWith(`${API_URL}/projects/`)
  );
}

/**
 * Runs `action`, then waits for a save it triggered and for the bar to come back to « Enregistré »,
 * which it only shows once nothing is modified nor in flight.
 */
async function expectSavedAfter(page: Page, action: () => Promise<void>): Promise<Response> {
  const response = page.waitForResponse((candidate) => isPatch(candidate) && candidate.ok());
  await action();
  const saved = await response;
  await expect(statusBar(page)).toHaveText(/^Enregistré automatiquement · /u);
  return saved;
}

async function openNewProject(page: Page, name: string): Promise<string> {
  await page.getByRole("banner").getByRole("button", { name: "Nouveau projet" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouveau projet" });
  await dialog.getByRole("textbox", { name: "Nom du projet" }).fill(name);
  await dialog.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page).toHaveURL(PROJECT_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Décrire le bâtiment" })).toBeVisible();
  return page.url();
}

const DESCRIPTION =
  "Maison de plain-pied d'environ 120 m² pour une famille de cinq personnes. Séjour-cuisine ouvert orienté sud, trois chambres, une salle de bain, un WC séparé et un cellier. Garage double accolé. Toiture à deux pans en tuiles.";

const ROOMS = [
  { type: "livingKitchen", label: "Séjour-cuisine", count: "1", minArea: "40" },
  { type: "bedroom", label: "Chambre", count: "3", minArea: "12" },
  { type: "bathroom", label: "Salle de bain ou salle d'eau", count: "1", minArea: "6" },
  { type: "wc", label: "WC", count: "1", minArea: "" },
  { type: "storage", label: "Cellier ou rangement", count: "1", minArea: "4,5" },
] as const;

const SITE = {
  "Largeur (m)": "20",
  "Profondeur (m)": "30",
  "Orientation du nord (°)": "15",
  "Recul avant (m)": "5",
  "Recul latéral (m)": "3",
  "Recul arrière (m)": "4",
  "Pente (%)": "2,5",
  "Direction de la pente (°)": "180",
} as const;

test.describe("Décrire le bâtiment", () => {
  test.beforeEach(async () => {
    for (const account of Object.values(accounts)) {
      await withApiSession(account, (session) => session.deleteAllProjects());
    }
  });

  test("describe the building and its site, find everything again after reload", async ({
    page,
  }) => {
    const name = uniqueProjectName("Maison plain-pied");
    await signIn(page, accounts.primary);
    const projectUrl = await openNewProject(page, name);

    // Empty screen.
    await expect(page).toHaveTitle(`${name} — Décrire le bâtiment — Tracea`);
    await expect(page.getByRole("textbox", { name: "Nom du projet" })).toHaveValue(name);
    await expect(page.getByText("Aucune pièce indiquée", { exact: false })).toBeVisible();
    await expect(
      page.getByText("Indiquez la largeur et la profondeur du terrain pour afficher l'aperçu."),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    // Description: saved with the ETag of the loaded version.
    const descriptionSave = await expectSavedAfter(page, async () => {
      await page.getByRole("textbox", { name: "Description libre" }).fill(DESCRIPTION);
      await page.getByRole("textbox", { name: "Description libre" }).blur();
    });
    expect(descriptionSave.request().headers()["if-match"]).toMatch(/^".+"$/u);
    await expect(page.getByText(`${DESCRIPTION.length} / 2${NNBSP}000 caractères`)).toBeVisible();

    // Parameters.
    await page.getByLabel("Type de bâtiment", { exact: true }).selectOption("house");
    await page.getByRole("button", { name: "Plain-pied" }).click();
    await expect(page.getByRole("button", { name: "Plain-pied" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByLabel("Surface habitable cible (m²)", { exact: true }).fill("120");
    await page.getByLabel("Toiture", { exact: true }).selectOption({ label: "2 pans" });
    await page.getByLabel("Couverture", { exact: true }).selectOption({ label: "Tuiles" });
    await page.getByLabel("Garage", { exact: true }).selectOption({ label: "Accolé, 2 places" });
    await page.getByLabel("Surface mini du garage (m²)", { exact: true }).fill("36");
    await page.getByLabel("Orientation du séjour", { exact: true }).selectOption({ label: "Sud" });

    // Rooms, added with the keyboard flow of the table (focus on the new row's type).
    for (const [index, room] of ROOMS.entries()) {
      const row = index + 1;
      await page.getByRole("button", { name: "Ajouter une pièce" }).click();
      const type = page.getByRole("combobox", { name: `Type, ligne ${row}` });
      await expect(type).toBeFocused();
      await type.selectOption({ label: room.label });
      await page.getByRole("textbox", { name: `Nombre, ligne ${row}` }).fill(room.count);
      if (room.minArea !== "") {
        await page
          .getByRole("textbox", { name: `Surface mini (m²), ligne ${row}` })
          .fill(room.minArea);
      }
    }

    // Site.
    for (const [label, value] of Object.entries(SITE)) {
      await page.getByRole("textbox", { name: label }).fill(value);
    }
    await expectSavedAfter(page, async () => {
      await page
        .getByLabel("Voie d'accès", { exact: true })
        .selectOption({ label: "En haut de l'aperçu" });
    });
    const preview = page.getByRole("img", { name: /^Aperçu du terrain Terrain rectangulaire/u });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAccessibleName(/20 m de largeur sur 30 m de profondeur/u);
    await expect(preview).toHaveAccessibleName(/Voie d'accès en haut de l'aperçu/u);
    await expect(preview).toHaveAccessibleName(/Zone constructible représentée en tireté/u);
    await expectNoA11yViolations(page);

    // Reload: every value comes back from the API.
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Description libre" })).toHaveValue(DESCRIPTION);
    await expect(page.getByLabel("Type de bâtiment", { exact: true })).toHaveValue("house");
    await expect(page.getByRole("button", { name: "Plain-pied" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("Surface habitable cible (m²)", { exact: true })).toHaveValue(
      "120",
    );
    await expect(page.getByLabel("Toiture", { exact: true })).toHaveValue("gable");
    await expect(page.getByLabel("Couverture", { exact: true })).toHaveValue("tile");
    await expect(page.getByLabel("Garage", { exact: true })).toHaveValue("attached:2");
    await expect(page.getByLabel("Surface mini du garage (m²)", { exact: true })).toHaveValue("36");
    await expect(page.getByLabel("Orientation du séjour", { exact: true })).toHaveValue("S");
    for (const [index, room] of ROOMS.entries()) {
      const row = index + 1;
      await expect(page.getByRole("combobox", { name: `Type, ligne ${row}` })).toHaveValue(
        room.type,
      );
      await expect(page.getByRole("textbox", { name: `Nombre, ligne ${row}` })).toHaveValue(
        room.count,
      );
      await expect(
        page.getByRole("textbox", { name: `Surface mini (m²), ligne ${row}` }),
      ).toHaveValue(room.minArea);
    }
    for (const [label, value] of Object.entries(SITE)) {
      await expect(page.getByRole("textbox", { name: label })).toHaveValue(value);
    }
    await expect(page.getByLabel("Voie d'accès", { exact: true })).toHaveValue("2");

    // Field error: shown once the field is left, nothing sent, status « à corriger ».
    const area = page.getByRole("textbox", { name: "Surface habitable cible (m²)" });
    await area.fill("12,5x");
    await area.blur();
    await expect(area).toHaveAttribute("aria-invalid", "true");
    await expect(area).toHaveAccessibleDescription("Saisissez un nombre, par exemple 12,5.");
    await expect(statusBar(page)).toContainText(
      `Certaines modifications ne sont pas enregistrées${NBSP}: corrigez les champs signalés.`,
    );
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Aller au champ à corriger" }).click();
    await expect(area).toBeFocused();
    // Back to the saved value: nothing left to send, the error and the warning go away.
    await area.fill("120");
    await area.blur();
    await expect(area).not.toHaveAttribute("aria-invalid", "true");
    await expect(statusBar(page)).toHaveText(/^Enregistré automatiquement · /u);

    // Examples dialog.
    await page.getByRole("button", { name: "Voir des exemples de descriptions" }).click();
    const examples = page.getByRole("dialog", { name: "Exemples de descriptions" });
    await expect(examples).toBeVisible();
    await expect(
      examples.getByRole("button", {
        name: /^Utiliser cet exemple : Maison de plain-pied familiale$/u,
      }),
    ).toBeFocused();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(examples).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Voir des exemples de descriptions" }),
    ).toBeFocused();

    // Back to « Mes projets »: the card opens the project again.
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Mes projets" })
      .click();
    await expect(page).toHaveURL(/\/projets$/u);
    await page
      .getByRole("list", { name: "Mes projets" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(projectUrl);
    await expect(page.getByRole("textbox", { name: "Description libre" })).toHaveValue(DESCRIPTION);
  });

  test("another account gets « Projet introuvable » and a 404", async ({ page }) => {
    const project = await withApiSession(accounts.primary, (session) =>
      session.createProject(uniqueProjectName("Villa privée")),
    );

    await signIn(page, accounts.secondary);
    await page.goto(`/projets/${project.id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Projet introuvable" })).toBeVisible();
    await expect(page).toHaveTitle("Projet introuvable — Tracea");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle("Projet introuvable — Tracea");
    await expect(page.getByRole("textbox", { name: "Nom du projet" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Retour à Mes projets" })).toHaveAttribute(
      "href",
      "/projets",
    );

    // Same session, direct API call: indistinguishable from a project that does not exist.
    const foreign = await page.request.get(`${API_URL}/projects/${project.id}`);
    expect(foreign.status()).toBe(404);
    const missing = await page.request.get(
      `${API_URL}/projects/00000000-0000-4000-8000-000000000000`,
    );
    expect(missing.status()).toBe(404);
    expect(await foreign.json()).toEqual(await missing.json());
  });

  test("the project title stays in place once the page has settled", async ({ page }) => {
    const name = uniqueProjectName("Titre stable");
    const project = await withApiSession(accounts.primary, (session) =>
      session.createProject(name),
    );
    await signIn(page, accounts.primary);
    await page.goto(`/projets/${project.id}`);
    await expect(page).toHaveTitle(`${name} — Décrire le bâtiment — Tracea`);
    // Nothing written later (streamed metadata, hydration) may replace it.
    await expect(statusBar(page)).toHaveText(/^Enregistré automatiquement · /u);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(`${name} — Décrire le bâtiment — Tracea`);
  });

  // A21: the title of « Mes projets » comes back after leaving a project from inside the app.
  for (const way of ["Mes projets", "Tracea", "Retour à Mes projets"] as const) {
    test(`« Mes projets » gets its title back after leaving by « ${way} »`, async ({ page }) => {
      const name = uniqueProjectName("Retour");
      const project = await withApiSession(accounts.primary, (session) =>
        session.createProject(name),
      );
      await signIn(page, accounts.primary);
      if (way === "Retour à Mes projets") {
        await page.goto("/projets/00000000-0000-4000-8000-000000000000");
        await expect(page).toHaveTitle("Projet introuvable — Tracea");
        await page.getByRole("main").getByRole("link", { name: way }).click();
      } else {
        await page.goto(`/projets/${project.id}`);
        await expect(page).toHaveTitle(`${name} — Décrire le bâtiment — Tracea`);
        await page.getByRole("banner").getByRole("link", { name: way, exact: true }).click();
      }
      await expect(page).toHaveURL(/\/projets$/u);
      await expect(page.getByRole("heading", { level: 1, name: "Mes projets" })).toBeVisible();
      await expect(page).toHaveTitle("Mes projets — Tracea");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveTitle("Mes projets — Tracea");
    });
  }

  test("two tabs on the same project: the stale one gets a 412 and reloads", async ({ page }) => {
    const project = await withApiSession(accounts.primary, (session) =>
      session.createProject(uniqueProjectName("Deux onglets")),
    );
    await signIn(page, accounts.primary);
    await page.goto(`/projets/${project.id}`);
    const stale = page.getByRole("textbox", { name: "Description libre" });
    await expect(stale).toHaveValue("");

    // A second tab saves first.
    const other = await page.context().newPage();
    await other.goto(`/projets/${project.id}`);
    await expectSavedAfter(other, async () => {
      await other
        .getByRole("textbox", { name: "Description libre" })
        .fill("Version de l'autre onglet");
      await other.getByRole("textbox", { name: "Description libre" }).blur();
    });

    // The first tab still holds the previous ETag.
    const refused = page.waitForResponse(isPatch);
    await stale.fill("Ma version");
    await stale.blur();
    expect((await refused).status()).toBe(412);
    const alert = page.getByRole("alert").filter({ hasText: "Projet modifié ailleurs" });
    await expect(alert).toBeVisible();
    await expect(statusBar(page)).toContainText(
      `Enregistrement suspendu${NBSP}: ce projet a été modifié ailleurs.`,
    );
    await expectNoA11yViolations(page);

    await alert.getByRole("button", { name: "Recharger le projet" }).click();
    const confirm = page.getByRole("alertdialog", { name: `Recharger le projet${NBSP}?` });
    await expect(confirm.getByRole("button", { name: "Annuler" })).toBeFocused();
    await confirm.getByRole("button", { name: "Recharger le projet" }).click();
    await expect(confirm).toBeHidden();
    await expect(alert).toBeHidden();
    await expect(stale).toHaveValue("Version de l'autre onglet");

    // Saving works again with the new ETag.
    await expectSavedAfter(page, async () => {
      await stale.fill("Version réconciliée");
      await stale.blur();
    });
    await other.reload();
    await expect(other.getByRole("textbox", { name: "Description libre" })).toHaveValue(
      "Version réconciliée",
    );
    await other.close();
  });
});
