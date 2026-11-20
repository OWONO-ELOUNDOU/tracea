import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, type Mock } from "vitest";
import {
  ApiError,
  type ProblemDetails,
  type ProjectDetail,
  type ProjectPage,
  type ProjectSummary,
  type PublicUser,
} from "@/lib/api";
import { ProjectsScreen, SIGN_IN_REDIRECT, type ProjectsClient } from "./projects-screen";

const NBSP = " ";
const NOW = new Date("2026-11-17T12:00:00.000Z");

const user: PublicUser = {
  id: "u1",
  email: "hermann@exemple.fr",
  displayName: "Hermann Essomba",
  plan: "free",
  emailVerified: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

function summary(id: string, name: string, hoursAgo = 2): ProjectSummary {
  const at = new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();
  return { id, name, createdAt: at, updatedAt: at, thumbnailUrl: null, currentVersion: null };
}

function detail(id: string, name: string): ProjectDetail {
  return {
    ...summary(id, name, 0),
    descriptionText: null,
    parameters: null,
    site: null,
    currentVersion: null,
    lastJob: null,
  };
}

function problem(status: number, code: string, extra: Partial<ProblemDetails> = {}) {
  return new ApiError({ type: "about:blank", title: "Erreur", status, code, ...extra });
}

const three = [
  summary("p1", "Maison Mbarga", 2),
  summary("p2", "Immeuble R+3 Bastos", 30),
  summary("p3", "Villa Kribi", 24 * 10),
];

function setup(
  pages: ProjectPage[] = [{ items: three, nextCursor: null }],
  configure: (client: MockClient) => void = () => undefined,
) {
  const listProjects = vi.fn<ProjectsClient["listProjects"]>();
  for (const page of pages) listProjects.mockResolvedValueOnce(page);
  const client = {
    me: vi.fn<ProjectsClient["me"]>().mockResolvedValue({ user }),
    logout: vi.fn<ProjectsClient["logout"]>().mockResolvedValue(undefined),
    listProjects,
    createProject: vi.fn<ProjectsClient["createProject"]>(),
    updateProject: vi.fn<ProjectsClient["updateProject"]>(),
    duplicateProject: vi.fn<ProjectsClient["duplicateProject"]>(),
    deleteProject: vi.fn<ProjectsClient["deleteProject"]>(),
  } satisfies ProjectsClient;
  configure(client);
  const navigate = { replace: vi.fn(), push: vi.fn() };
  render(<ProjectsScreen client={client} navigate={navigate} now={() => NOW} />);
  return { client, navigate, user: userEvent.setup() };
}

type MockClient = { [K in keyof ProjectsClient]: Mock<ProjectsClient[K]> };

const cardNames = () =>
  within(screen.getByRole("list", { name: "Mes projets" }))
    .queryAllByRole("article")
    .map((card) => within(card).getByRole("heading", { level: 2 }).textContent);

async function openMenuItem(
  event: ReturnType<typeof userEvent.setup>,
  project: string,
  item: string,
) {
  await event.click(screen.getByRole("button", { name: `Actions pour le projet ${project}` }));
  await event.click(screen.getByRole("menuitem", { name: item }));
}

const statusText = () =>
  screen
    .getAllByRole("status")
    .map((node) => node.textContent)
    .join("");

describe("ProjectsScreen", () => {
  it("shows the loading state, then the empty state with the new project tile", async () => {
    setup([{ items: [], nextCursor: null }]);
    expect(screen.getByText("Chargement de vos projets…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nouveau projet" })).toBeNull();

    expect(
      await screen.findByRole("heading", { name: "Aucun projet pour le moment" }),
    ).toBeTruthy();
    const list = screen.getByRole("list", { name: "Mes projets" });
    expect(within(list).queryAllByRole("article")).toHaveLength(0);
    expect(within(list).getByRole("button", { name: "Nouveau projet" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Afficher plus de projets" })).toBeNull();
    expect(screen.queryByText(/prochaine version/)).toBeNull();
  });

  it("lists three projects with their plan state and modification date", async () => {
    const { client } = setup();
    await screen.findByText("Maison Mbarga");
    expect(client.listProjects).toHaveBeenCalledWith();
    expect(cardNames()).toEqual(["Maison Mbarga", "Immeuble R+3 Bastos", "Villa Kribi"]);
    expect(screen.getAllByText("Aucun plan généré")).toHaveLength(3);
    const time = screen.getByText("Modifié il y a 2 h");
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe(three[0]?.updatedAt);
    expect(screen.getByText("Modifié hier")).toBeTruthy();
    expect(screen.getByText("Modifié il y a 1 semaine")).toBeTruthy();
    expect(screen.getByRole("button", { name: "HE, menu du compte" }).textContent).toBe("HE");
    const tile = within(screen.getByRole("list", { name: "Mes projets" })).getByRole("button", {
      name: "Nouveau projet",
    });
    expect(tile.getAttribute("aria-describedby")).toBe(
      screen.getByText("Décrivez, générez, exportez").id,
    );
    expect(tile.textContent).toBe("+Nouveau projet");
  });

  it("creates a project and opens it, keeping the dialog pending until the page changes", async () => {
    const { client, navigate, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.createProject.mockResolvedValue(detail("p9", "Duplex Odza"));

    const trigger = screen.getAllByRole("button", { name: "Nouveau projet" })[0] as HTMLElement;
    await event.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Nouveau projet" });
    const field = within(dialog).getByLabelText("Nom du projet");
    expect(document.activeElement).toBe(field);
    await event.type(field, "  Duplex Odza ");
    await event.click(within(dialog).getByRole("button", { name: "Créer le projet" }));

    expect(client.createProject).toHaveBeenCalledWith("  Duplex Odza ");
    await waitFor(() => expect(navigate.push).toHaveBeenCalledWith("/projets/p9"));
    // D15: no insertion, no status message; the dialog waits for the navigation.
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Création…" })).toBeTruthy();
    expect(cardNames()).toEqual(["Maison Mbarga", "Immeuble R+3 Bastos", "Villa Kribi"]);
    expect(statusText()).toBe("");
  });

  it("opens a project from the link of its name, the actions staying outside the link", async () => {
    setup();
    await screen.findByText("Maison Mbarga");
    const card = screen.getByRole("article", { name: "Maison Mbarga" });
    const link = within(card).getByRole("link", { name: "Maison Mbarga" });
    expect(link.getAttribute("href")).toBe("/projets/p1");
    expect(link.closest("h2")).toBeTruthy();
    const actions = within(card).getByRole("button", {
      name: "Actions pour le projet Maison Mbarga",
    });
    expect(link.contains(actions)).toBe(false);
    // The plan state and the date are not part of the link's name (WCAG 2.5.3).
    expect(link.textContent).toBe("Maison Mbarga");
    // Tab order inside a card: the name link, then « Actions ».
    const focusable = Array.from(card.querySelectorAll('a[href], button:not([tabindex="-1"])'));
    expect(focusable).toEqual([link, actions]);
  });

  it("opens the actions menu without following the card link", async () => {
    const { navigate, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    await event.click(screen.getByRole("button", { name: "Actions pour le projet Maison Mbarga" }));
    expect(screen.getByRole("menuitem", { name: "Renommer" })).toBeTruthy();
    expect(navigate.push).not.toHaveBeenCalled();
    expect(window.location.pathname).not.toBe("/projets/p1");
  });

  it("shows a 422 name refusal under the field and keeps the dialog open", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.createProject.mockRejectedValue(
      problem(422, "VALIDATION_ERROR", { fields: { name: "Le nom est requis." } }),
    );

    await event.click(screen.getAllByRole("button", { name: "Nouveau projet" })[0] as HTMLElement);
    const dialog = screen.getByRole("dialog");
    await event.click(within(dialog).getByRole("button", { name: "Créer le projet" }));

    const field = within(dialog).getByLabelText("Nom du projet");
    await within(dialog).findByText("Le nom est requis.");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const describedBy = field.getAttribute("aria-describedby") ?? "";
    const error = within(dialog).getByText("Le nom est requis.");
    expect(describedBy.split(" ")).toContain(error.id);
    expect(document.activeElement).toBe(field);
    expect(cardNames()).toHaveLength(3);

    await event.type(field, "A");
    expect(field.getAttribute("aria-invalid")).toBeNull();
  });

  it("shows other creation failures at the top of the dialog", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.createProject.mockRejectedValue(new TypeError("Failed to fetch"));

    await event.click(screen.getAllByRole("button", { name: "Nouveau projet" })[0] as HTMLElement);
    const dialog = screen.getByRole("dialog");
    await event.type(within(dialog).getByLabelText("Nom du projet"), "Villa{Enter}");

    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain("Impossible de joindre le service.");
    expect(document.activeElement).toBe(alert);
  });

  it("cancels creation with Escape without calling the API", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    const tile = within(screen.getByRole("list", { name: "Mes projets" })).getByRole("button", {
      name: "Nouveau projet",
    });
    await event.click(tile);
    await event.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(client.createProject).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(tile);
  });

  it("renames a project, moves it first and focuses its actions button", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.updateProject.mockResolvedValue({
      project: detail("p3", "Villa Kribi plage"),
      etag: '"e"',
    });

    await openMenuItem(event, "Villa Kribi", "Renommer");
    const dialog = screen.getByRole("dialog", { name: "Renommer le projet" });
    const field = within(dialog).getByLabelText<HTMLInputElement>("Nom du projet");
    expect(field.value).toBe("Villa Kribi");
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, "Villa Kribi".length]);
    await event.type(field, " plage", { initialSelectionStart: 11, initialSelectionEnd: 11 });
    await event.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    expect(client.updateProject).toHaveBeenCalledWith("p3", { name: "Villa Kribi plage" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(cardNames()).toEqual(["Villa Kribi plage", "Maison Mbarga", "Immeuble R+3 Bastos"]);
    expect(statusText()).toBe(`Projet renommé en «${NBSP}Villa Kribi plage${NBSP}».`);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Actions pour le projet Villa Kribi plage" }),
    );
  });

  it("closes the rename dialog without a call when the name is unchanged", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    await openMenuItem(event, "Maison Mbarga", "Renommer");
    await event.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(client.updateProject).not.toHaveBeenCalled();
  });

  it("duplicates a project and puts the copy first", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    let resolve: (project: ProjectDetail) => void = () => undefined;
    client.duplicateProject.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );

    await openMenuItem(event, "Immeuble R+3 Bastos", "Dupliquer");
    const button = screen.getByRole("button", {
      name: "Actions pour le projet Immeuble R+3 Bastos",
    });
    expect(client.duplicateProject).toHaveBeenCalledWith("p2");
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(statusText()).toBe(`Duplication de «${NBSP}Immeuble R+3 Bastos${NBSP}» en cours…`);

    resolve(detail("p8", "Immeuble R+3 Bastos (copie)"));
    await screen.findByText("Immeuble R+3 Bastos (copie)");
    expect(cardNames()[0]).toBe("Immeuble R+3 Bastos (copie)");
    expect(statusText()).toBe(
      `Projet dupliqué sous le nom «${NBSP}Immeuble R+3 Bastos (copie)${NBSP}».`,
    );
    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("deletes a project after confirmation and focuses the next card", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.deleteProject.mockResolvedValue(undefined);

    await openMenuItem(event, "Maison Mbarga", "Supprimer");
    const dialog = screen.getByRole("alertdialog", { name: `Supprimer ce projet${NBSP}?` });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(
      within(dialog).getByText(/sera retiré de votre liste et placé dans la corbeille/),
    ).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Annuler" }));
    await event.click(within(dialog).getByRole("button", { name: "Supprimer le projet" }));

    expect(client.deleteProject).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(cardNames()).toEqual(["Immeuble R+3 Bastos", "Villa Kribi"]);
    expect(statusText()).toBe(`Projet «${NBSP}Maison Mbarga${NBSP}» supprimé.`);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Actions pour le projet Immeuble R+3 Bastos" }),
    );
  });

  it("keeps the project when the deletion is cancelled", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    await openMenuItem(event, "Villa Kribi", "Supprimer");
    await event.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(client.deleteProject).not.toHaveBeenCalled();
    expect(cardNames()).toHaveLength(3);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Actions pour le projet Villa Kribi" }),
    );
  });

  it("removes a project the API no longer finds", async () => {
    const { client, user: event } = setup();
    await screen.findByText("Maison Mbarga");
    client.deleteProject.mockRejectedValue(problem(404, "PROJECT_NOT_FOUND"));
    await openMenuItem(event, "Villa Kribi", "Supprimer");
    await event.click(screen.getByRole("button", { name: "Supprimer le projet" }));

    await waitFor(() => expect(cardNames()).toHaveLength(2));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText(/Ce projet est introuvable/)).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Actions pour le projet Immeuble R+3 Bastos" }),
    );
  });

  it("offers « Réessayer » after a network error at load", async () => {
    const { client, user: event } = setup([], (mock) => {
      mock.listProjects
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({ items: three, nextCursor: null });
    });

    expect(
      await screen.findByRole("heading", { name: "Impossible d'afficher vos projets" }),
    ).toBeTruthy();
    expect(screen.getByText(/Impossible de joindre le service/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nouveau projet" })).toBeNull();

    await event.click(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByText("Maison Mbarga");
    expect(client.me).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("loads the next page with the cursor it received", async () => {
    const { client, user: event } = setup([
      { items: three, nextCursor: "curseur-opaque" },
      { items: [summary("p4", "Bureaux Akwa", 24 * 40)], nextCursor: null },
    ]);
    await screen.findByText("Maison Mbarga");

    await event.click(screen.getByRole("button", { name: "Afficher plus de projets" }));
    expect(client.listProjects).toHaveBeenLastCalledWith({ cursor: "curseur-opaque" });
    await screen.findByText("Bureaux Akwa");
    expect(cardNames()).toEqual([
      "Maison Mbarga",
      "Immeuble R+3 Bastos",
      "Villa Kribi",
      "Bureaux Akwa",
    ]);
    expect(statusText()).toBe("1 projet supplémentaire affiché.");
    expect(screen.queryByRole("button", { name: "Afficher plus de projets" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Bureaux Akwa" }));
  });

  it("redirects to sign-in when the session is missing", async () => {
    const { navigate } = setup(undefined, (mock) => {
      mock.me.mockReset().mockRejectedValue(problem(401, "UNAUTHENTICATED"));
    });
    await waitFor(() => expect(navigate.replace).toHaveBeenCalledWith(SIGN_IN_REDIRECT));
  });

  it("gives menu entries the 2 px focus outline of the specification", async () => {
    const { user: event } = setup();
    await screen.findByText("Maison Mbarga");
    await event.click(screen.getByRole("button", { name: "Actions pour le projet Maison Mbarga" }));
    await event.click(screen.getByRole("button", { name: "HE, menu du compte" }));
    const entries = [
      ...screen.getAllByRole("menuitem", { hidden: true }),
      screen.getByRole("button", { name: "Se déconnecter" }),
    ];
    for (const entry of entries) {
      expect(entry.className).toContain("focus-visible:outline-2");
      expect(entry.className).toContain("focus-visible:outline-primary");
      expect(entry.className).not.toContain("outline-none");
    }
  });

  it("drives the actions menu with the keyboard", async () => {
    const { user: event } = setup();
    await screen.findByText("Maison Mbarga");
    const button = screen.getByRole("button", { name: "Actions pour le projet Maison Mbarga" });
    button.focus();
    await event.keyboard("{ArrowDown}");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Renommer" }));
    await event.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Supprimer" }));
    await event.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Renommer" }));
    await event.keyboard("{Escape}");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });
});
