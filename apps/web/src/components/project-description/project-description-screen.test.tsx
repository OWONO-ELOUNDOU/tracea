import {
  DESCRIPTION_MAX_LENGTH,
  ProjectParametersSchema,
  ProjectSiteSchema,
  countCharacters,
  squareMetresToMm2,
  type ProjectParameters,
} from "@tracea/domain";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  ApiError,
  type ProblemDetails,
  type ProjectPatch,
  type ProjectDetail,
  type PublicUser,
  type VersionedProject,
} from "@/lib/api";
import { DESCRIPTION_EXAMPLES } from "./examples";
import { formatCount, INVALID_NUMBER_MESSAGE } from "./number-input";
import { ProjectDescriptionScreen, type DescriptionClient } from "./project-description-screen";
import { texts } from "./texts";

const NOW = Date.parse("2026-11-19T12:00:00.000Z");

const user: PublicUser = {
  id: "u1",
  email: "hermann@exemple.fr",
  displayName: "Hermann Essomba",
  plan: "free",
  emailVerified: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const parameters: ProjectParameters = {
  buildingType: "house",
  levelsCount: 1,
  targetHabitableArea: 120_000_000,
  rooms: [
    { type: "livingKitchen", count: 1, minArea: 40_000_000 },
    { type: "bedroom", count: 3 },
  ],
  garage: { kind: "attached", spaces: 2, minArea: 36_000_000 },
  roof: { type: "gable", covering: "tile" },
  livingOrientation: "S",
};

const site = ProjectSiteSchema.parse({
  boundary: { kind: "rectangle", width: 20_000, depth: 30_000 },
  setbacks: { front: 5_000, side: 3_000, rear: 4_000 },
});

function detail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "p1",
    name: "Maison Mbarga",
    descriptionText: "Maison familiale",
    parameters,
    site,
    createdAt: "2026-11-17T10:00:00.000Z",
    updatedAt: new Date(NOW - 2 * 3_600_000).toISOString(),
    thumbnailUrl: null,
    currentVersion: null,
    lastJob: null,
    ...overrides,
  };
}

function problem(status: number, code: string, extra: Partial<ProblemDetails> = {}) {
  return new ApiError({ type: "about:blank", title: "Erreur", status, code, ...extra });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

type MockClient = { [K in keyof DescriptionClient]: Mock<DescriptionClient[K]> };

let etagCount = 1;

/** Answers like the API: the patch applied to the project, a new ETag. */
function saved(patch: ProjectPatch): VersionedProject {
  etagCount += 1;
  return { project: detail(patch as Partial<ProjectDetail>), etag: `"e${etagCount}"` };
}

async function flush() {
  await act(() => vi.advanceTimersByTimeAsync(0));
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

async function setup(
  configure: (client: MockClient) => void = () => undefined,
  project: ProjectDetail = detail(),
) {
  const client: MockClient = {
    me: vi.fn<DescriptionClient["me"]>().mockResolvedValue({ user }),
    logout: vi.fn<DescriptionClient["logout"]>().mockResolvedValue(undefined),
    getProject: vi
      .fn<DescriptionClient["getProject"]>()
      .mockResolvedValue({ project, etag: '"e1"' }),
    updateProject: vi
      .fn<DescriptionClient["updateProject"]>()
      .mockImplementation((_id, patch) => Promise.resolve(saved(patch))),
    createProject: vi.fn<DescriptionClient["createProject"]>(),
  };
  configure(client);
  const navigate = { replace: vi.fn(), push: vi.fn() };
  render(<ProjectDescriptionScreen projectId="p1" client={client} navigate={navigate} />);
  await flush();
  return {
    client,
    navigate,
    event: userEvent.setup({ delay: null }),
  };
}

const field = (name: string) => screen.getByLabelText<HTMLInputElement>(name);
const select = (name: string) => screen.getByLabelText<HTMLSelectElement>(name);

const description = () => screen.getByLabelText<HTMLTextAreaElement>("Description libre");
const statusBar = () => screen.getByRole("contentinfo").textContent;
const announcer = () => screen.getAllByRole("status").at(-1)?.textContent ?? "";
const patches = (client: MockClient) => client.updateProject.mock.calls.map((call) => call[1]);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  // Testing Library drains its async wrapper with `setTimeout(0)` and only advances fake timers
  // it recognises as Jest's: this shim lets it advance Vitest's.
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  etagCount = 1;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ProjectDescriptionScreen", () => {
  it("shows the loading state, then the stored values", async () => {
    const client = {
      me: vi.fn<DescriptionClient["me"]>().mockResolvedValue({ user }),
      logout: vi.fn<DescriptionClient["logout"]>(),
      getProject: vi.fn<DescriptionClient["getProject"]>(),
      updateProject: vi.fn<DescriptionClient["updateProject"]>(),
      createProject: vi.fn<DescriptionClient["createProject"]>(),
    };
    const pending = deferred<VersionedProject>();
    client.getProject.mockReturnValue(pending.promise);
    render(
      <ProjectDescriptionScreen
        projectId="p1"
        client={client}
        navigate={{ replace: vi.fn(), push: vi.fn() }}
      />,
    );
    expect(screen.getByText(texts.loading)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: texts.pageTitle })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nouveau projet" })).toBeNull();
    expect(document.title).toBe("Décrire le bâtiment — Tracea");

    pending.resolve({ project: detail(), etag: '"e1"' });
    await flush();

    expect(client.getProject).toHaveBeenCalledWith("p1");
    expect(document.title).toBe("Maison Mbarga — Décrire le bâtiment — Tracea");
    expect(field("Nom du projet").value).toBe("Maison Mbarga");
    expect(description().value).toBe("Maison familiale");
    expect(select("Type de bâtiment").value).toBe("house");
    expect(screen.getByRole("button", { name: "Plain-pied" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(field("Surface habitable cible (m²)").value).toBe("120");
    expect(select("Toiture").value).toBe("gable");
    expect(select("Couverture").value).toBe("tile");
    expect(select("Garage").value).toBe("attached:2");
    expect(field("Surface mini du garage (m²)").value).toBe("36");
    expect(select("Orientation du séjour").value).toBe("S");
    expect(select("Type, ligne 1").value).toBe("livingKitchen");
    expect(field("Surface mini (m²), ligne 1").value).toBe("40");
    expect(field("Nombre, ligne 2").value).toBe("3");
    expect(field("Surface mini (m²), ligne 2").value).toBe("");
    expect(field("Largeur (m)").value).toBe("20");
    expect(field("Profondeur (m)").value).toBe("30");
    expect(field("Recul avant (m)").value).toBe("5");
    expect(screen.getByRole("img", { name: /Aperçu du terrain/u })).toBeTruthy();
    expect(statusBar()).toBe("Enregistré automatiquement · il y a 2 h");
    // Elements of the mock-up that depend on the interpretation are hidden (D24).
    expect(screen.queryByText(/Ce que le moteur a compris/u)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Mes projets" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("sends one PATCH with If-Match 1 000 ms after the last modification", async () => {
    const { client, event } = await setup();
    await event.type(description(), " avec terrasse");
    await advance(999);
    expect(client.updateProject).not.toHaveBeenCalled();
    expect(statusBar()).toBe(texts.modifiedBar);

    await advance(1);
    expect(client.updateProject).toHaveBeenCalledTimes(1);
    expect(client.updateProject).toHaveBeenCalledWith(
      "p1",
      { descriptionText: "Maison familiale avec terrasse" },
      { ifMatch: '"e1"' },
    );
    await flush();
    expect(statusBar()).toBe("Enregistré automatiquement · à l'instant");
    expect(announcer()).toBe(texts.savedAnnouncement);
    // The text is refreshed every 5 s, never every second.
    await advance(5_000);
    expect(statusBar()).toBe("Enregistré automatiquement · il y a 5 s");
    await advance(5_000);
    await advance(2_000);
    expect(statusBar()).toBe("Enregistré automatiquement · il y a 10 s");
  });

  it("saves at once when a field is left, and when a list or a chip changes", async () => {
    const { client, event } = await setup();
    await event.type(field("Nom du projet"), " II");
    await event.tab();
    expect(patches(client)).toEqual([{ name: "Maison Mbarga II" }]);

    await advance(3_000);
    await event.click(screen.getByRole("button", { name: "R+1" }));
    await flush();
    expect(patches(client)[1]).toEqual({ parameters: { ...parameters, levelsCount: 2 } });
    expect(client.updateProject.mock.calls[1]?.[2]).toEqual({ ifMatch: '"e2"' });

    await advance(3_000);
    await event.click(screen.getByRole("button", { name: "R+1" }));
    await flush();
    const { levelsCount: _removed, ...withoutLevels } = parameters;
    expect(patches(client)[2]).toEqual({ parameters: withoutLevels });
  });

  it("never starts two saves less than 3 000 ms apart during continuous typing", async () => {
    const starts: number[] = [];
    const { client, event } = await setup((mock) => {
      mock.updateProject.mockImplementation((_id, patch) => {
        starts.push(Date.now());
        return Promise.resolve(saved(patch));
      });
    });
    for (let index = 0; index < 12; index += 1) {
      await event.type(description(), "x");
      await advance(1_100);
    }
    await advance(5_000);
    expect(client.updateProject.mock.calls.length).toBeGreaterThan(1);
    starts.slice(1).forEach((start, index) => {
      expect(start - (starts[index] as number)).toBeGreaterThanOrEqual(3_000);
    });
    expect(patches(client).at(-1)).toEqual({
      descriptionText: `Maison familiale${"x".repeat(12)}`,
    });
  });

  it("keeps a single request in flight and does not overwrite newer typing", async () => {
    const first = deferred<VersionedProject>();
    const { client, event } = await setup((mock) => {
      mock.updateProject.mockReturnValueOnce(first.promise);
    });
    await event.type(description(), " A");
    await advance(1_000);
    expect(client.updateProject).toHaveBeenCalledTimes(1);
    expect(statusBar()).toBe(texts.savingBar);

    await event.type(description(), "B");
    await advance(10_000);
    expect(client.updateProject).toHaveBeenCalledTimes(1);

    // Late answer for the first text: the field keeps what was typed since.
    first.resolve({ project: detail({ descriptionText: "Maison familiale A" }), etag: '"e2"' });
    await flush();
    expect(description().value).toBe("Maison familiale AB");
    expect(client.updateProject).toHaveBeenCalledTimes(2);
    expect(client.updateProject).toHaveBeenLastCalledWith(
      "p1",
      { descriptionText: "Maison familiale AB" },
      { ifMatch: '"e2"' },
    );
  });

  it("does not send an invalid group and shows its message once the field is left", async () => {
    const { client, event } = await setup();
    const area = field("Surface habitable cible (m²)");
    await event.clear(area);
    await event.type(area, "12,5x");
    await advance(1_000);
    expect(client.updateProject).not.toHaveBeenCalled();
    // Not shown while typing.
    expect(area.getAttribute("aria-invalid")).toBeNull();
    expect(statusBar()).toBe(texts.modifiedBar);

    await event.tab();
    expect(area.getAttribute("aria-invalid")).toBe("true");
    const describedBy = area.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(INVALID_NUMBER_MESSAGE);
    expect(statusBar()).toContain(texts.toFixBar);
    expect(announcer()).toBe(texts.toFixBar);

    await event.clear(area);
    await event.type(area, "600");
    await event.tab();
    const message = ProjectParametersSchema.safeParse({
      targetHabitableArea: squareMetresToMm2(600),
    }).error?.issues[0]?.message;
    expect(screen.getByText(message ?? "?")).toBeTruthy();
    expect(client.updateProject).not.toHaveBeenCalled();

    await event.click(screen.getByRole("button", { name: texts.goToField }));
    expect(document.activeElement).toBe(area);

    await event.clear(area);
    await event.type(area, "135");
    await event.tab();
    expect(area.getAttribute("aria-invalid")).toBeNull();
    expect(patches(client)).toEqual([
      { parameters: { ...parameters, targetHabitableArea: 135_000_000 } },
    ]);
  });

  it("stops saving and offers to reload after a 412", async () => {
    const detailText =
      "Ce projet a été modifié depuis une autre fenêtre. Rechargez-le pour retrouver la dernière version.";
    const { client, event } = await setup((mock) => {
      mock.updateProject.mockRejectedValue(
        problem(412, "PROJECT_MODIFIED", { title: "Projet modifié ailleurs", detail: detailText }),
      );
    });
    await event.type(description(), " A");
    await advance(1_000);
    await flush();

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Projet modifié ailleurs")).toBeTruthy();
    expect(within(alert).getByText(detailText)).toBeTruthy();
    expect(statusBar()).toContain(texts.conflictBar);

    await event.type(description(), "B");
    await event.tab();
    await advance(60_000);
    expect(client.updateProject).toHaveBeenCalledTimes(1);

    client.getProject.mockResolvedValue({
      project: detail({ descriptionText: "Version de l'autre onglet" }),
      etag: '"e9"',
    });
    await event.click(within(alert).getByRole("button", { name: texts.reload }));
    const confirm = screen.getByRole("alertdialog", { name: texts.reloadTitle });
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Annuler" }));
    await event.click(within(confirm).getByRole("button", { name: texts.reload }));
    await flush();

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(description().value).toBe("Version de l'autre onglet");
    expect(announcer()).toBe(texts.reloaded);
    expect(document.activeElement).toBe(screen.getByRole("main"));
    expect(statusBar()).toBe("Enregistré automatiquement · il y a 2 h");

    client.updateProject.mockImplementation((_id, patch) => Promise.resolve(saved(patch)));
    await event.type(description(), "!");
    await advance(1_000);
    expect(client.updateProject).toHaveBeenLastCalledWith(
      "p1",
      { descriptionText: "Version de l'autre onglet!" },
      { ifMatch: '"e9"' },
    );
  });

  it("shows a 422 under its field and sends the other groups alone", async () => {
    const { client, event } = await setup((mock) => {
      mock.updateProject.mockRejectedValueOnce(
        problem(422, "VALIDATION_ERROR", {
          fields: { "parameters.rooms.1.minArea": "Refus du service pour cette surface." },
        }),
      );
    });
    fireEvent.change(field("Surface mini (m²), ligne 2"), { target: { value: "12" } });
    fireEvent.change(description(), { target: { value: "Maison familiale A" } });
    await advance(1_000);
    expect(patches(client)[0]).toEqual({
      descriptionText: "Maison familiale A",
      parameters: {
        ...parameters,
        rooms: [parameters.rooms?.[0], { type: "bedroom", count: 3, minArea: 12_000_000 }],
      },
    });

    const cell = field("Surface mini (m²), ligne 2");
    expect(cell.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Refus du service pour cette surface.")).toBeTruthy();
    expect(statusBar()).toContain(texts.toFixBar);

    await advance(3_000);
    expect(patches(client)[1]).toEqual({ descriptionText: "Maison familiale A" });

    await event.type(cell, "5");
    expect(cell.getAttribute("aria-invalid")).toBeNull();
    await event.tab();
    await advance(3_000);
    expect(patches(client).at(-1)).toEqual({
      parameters: {
        ...parameters,
        rooms: [parameters.rooms?.[0], { type: "bedroom", count: 3, minArea: 125_000_000 }],
      },
    });
  });

  it("retries after a network error at 5 s, then 15 s, and offers « Réessayer »", async () => {
    const { client, event } = await setup((mock) => {
      mock.updateProject
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockRejectedValueOnce(problem(503, "UNKNOWN"))
        .mockRejectedValueOnce(problem(429, "RATE_LIMITED"));
    });
    await event.type(description(), " A");
    await advance(1_000);
    await flush();
    expect(statusBar()).toContain(texts.waitingBar(texts.waitingCause.network));
    expect(announcer()).toBe(texts.waitingBar(texts.waitingCause.network));

    // Typing while waiting does not bypass the delay.
    await event.type(description(), "B");
    await advance(4_000);
    expect(client.updateProject).toHaveBeenCalledTimes(1);
    await advance(1_000);
    expect(client.updateProject).toHaveBeenCalledTimes(2);
    await flush();
    expect(statusBar()).toContain(texts.waitingCause.unavailable);

    await advance(14_999);
    expect(client.updateProject).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(client.updateProject).toHaveBeenCalledTimes(3);
    await flush();
    expect(statusBar()).toContain(texts.waitingCause.rate);

    // « Réessayer » sends at once, within the 3 000 ms between two sends.
    await event.click(screen.getByRole("button", { name: texts.retry }));
    await advance(2_999);
    expect(client.updateProject).toHaveBeenCalledTimes(3);
    await advance(1);
    expect(client.updateProject).toHaveBeenCalledTimes(4);
    expect(patches(client).at(-1)).toEqual({ descriptionText: "Maison familiale AB" });
    expect(statusBar()).toBe("Enregistré automatiquement · à l'instant");
  });

  it("holds saves while offline and sends them when the connection comes back", async () => {
    const { client, event } = await setup();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await event.type(description(), " A");
    await event.tab();
    await advance(10_000);
    expect(client.updateProject).not.toHaveBeenCalled();
    expect(statusBar()).toContain(texts.offlineBar);
    expect(announcer()).toBe(texts.offlineBar);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await flush();
    expect(patches(client)).toEqual([{ descriptionText: "Maison familiale A" }]);
    expect(statusBar()).toBe("Enregistré automatiquement · à l'instant");
  });

  it("shows « Projet introuvable » on a 404, at opening as during a save", async () => {
    await setup((mock) => {
      mock.getProject.mockRejectedValue(problem(404, "PROJECT_NOT_FOUND"));
    });
    expect(screen.getByRole("heading", { level: 1, name: texts.notFoundTitle })).toBeTruthy();
    expect(screen.getByText(texts.notFoundBody)).toBeTruthy();
    expect(screen.getByRole("link", { name: texts.backToProjects }).getAttribute("href")).toBe(
      "/projets",
    );
    expect(document.title).toBe("Projet introuvable — Tracea");
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("shows « Projet introuvable » when the project disappears during a save", async () => {
    const { event } = await setup((mock) => {
      mock.updateProject.mockRejectedValue(problem(404, "PROJECT_NOT_FOUND"));
    });
    await event.type(description(), " A");
    await advance(1_000);
    await flush();
    expect(screen.getByRole("heading", { level: 1, name: texts.notFoundTitle })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("goes back to sign-in on a 401, keeping the project as the next page", async () => {
    const { navigate, event } = await setup((mock) => {
      mock.updateProject.mockRejectedValue(problem(401, "UNAUTHENTICATED"));
    });
    await event.type(description(), " A");
    await advance(1_000);
    await flush();
    expect(navigate.replace).toHaveBeenCalledWith("/connexion?suivant=%2Fprojets%2Fp1");
  });

  it("offers « Réessayer » after a load failure", async () => {
    const { client, event } = await setup((mock) => {
      mock.getProject
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({ project: detail(), etag: '"e1"' });
    });
    expect(screen.getByRole("heading", { name: texts.loadError })).toBeTruthy();
    await event.click(screen.getByRole("button", { name: texts.retry }));
    await flush();
    expect(client.getProject).toHaveBeenCalledTimes(2);
    expect(field("Nom du projet").value).toBe("Maison Mbarga");
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("counts characters as code points and signals the limit", async () => {
    await setup();
    const family = "👨‍👩‍👧";
    fireEvent.change(description(), { target: { value: family } });
    // Testing Library collapses the narrow no-break space of « 2 000 » in the text it searches.
    const counter = (count: number) =>
      texts.counter(formatCount(count), formatCount(DESCRIPTION_MAX_LENGTH)).replace(/\s+/gu, " ");
    expect(screen.getByText(counter(countCharacters(family)))).toBeTruthy();
    expect(countCharacters(family)).toBe(5);

    fireEvent.change(description(), { target: { value: "a".repeat(DESCRIPTION_MAX_LENGTH + 1) } });
    const over = screen.getByText(counter(DESCRIPTION_MAX_LENGTH + 1), { exact: false });
    expect(over.className).toContain("text-danger");
    expect(over.textContent.startsWith("⚠")).toBe(true);
    expect(announcer()).toBe(texts.limitExceeded);
    expect(description().getAttribute("aria-describedby")).toContain(over.id);
  });

  it("adds and deletes room rows, moving the focus as specified", async () => {
    const { client, event } = await setup();
    await event.click(screen.getByRole("button", { name: texts.addRoom }));
    const type3 = select("Type, ligne 3");
    expect(document.activeElement).toBe(type3);
    expect(field("Nombre, ligne 3").value).toBe("1");
    // A row without type is not sent.
    await advance(5_000);
    expect(client.updateProject).not.toHaveBeenCalled();

    await event.selectOptions(type3, "wc");
    await flush();
    expect(patches(client)[0]).toEqual({
      parameters: { ...parameters, rooms: [...(parameters.rooms ?? []), { type: "wc", count: 1 }] },
    });

    await event.click(screen.getByRole("button", { name: texts.deleteRow(1, "Séjour-cuisine") }));
    expect(announcer()).toBe("Ligne 1 supprimée.");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: texts.deleteRow(1, "Chambre") }),
    );
    await event.click(screen.getByRole("button", { name: texts.deleteRow(2, "WC") }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: texts.deleteRow(1, "Chambre") }),
    );
    await event.click(screen.getByRole("button", { name: texts.deleteRow(1, "Chambre") }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: texts.addRoom }));
    expect(screen.getByText(texts.noRooms)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();

    await advance(3_000);
    const { rooms: _rooms, ...withoutRooms } = parameters;
    expect(patches(client).at(-1)).toEqual({ parameters: withoutRooms });
  });

  it("inserts an example after confirming the replacement of the description", async () => {
    const { event } = await setup();
    const link = screen.getByRole("button", { name: texts.examplesLink });
    await event.click(link);
    const dialog = screen.getByRole("dialog", { name: texts.examplesTitle });
    const [first, second] = DESCRIPTION_EXAMPLES;
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: texts.useExampleLabel(first.title) }),
    );

    await event.click(
      within(dialog).getByRole("button", { name: texts.useExampleLabel(second.title) }),
    );
    const confirm = screen.getByRole("alertdialog", { name: texts.replaceTitle });
    expect(within(confirm).getByText(texts.replaceBody(second.title))).toBeTruthy();
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Annuler" }));
    await event.keyboard("{Escape}");
    const back = screen.getByRole("dialog", { name: texts.examplesTitle });
    expect(document.activeElement).toBe(
      within(back).getByRole("button", { name: texts.useExampleLabel(second.title) }),
    );
    expect(description().value).toBe("Maison familiale");

    await event.click(
      within(back).getByRole("button", { name: texts.useExampleLabel(second.title) }),
    );
    await event.click(screen.getByRole("button", { name: texts.replaceAction }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(description().value).toBe(second.text);
    expect(document.activeElement).toBe(description());
    expect(description().selectionStart).toBe(second.text.length);
    expect(announcer()).toBe(texts.exampleInserted);
  });

  it("signals an empty buildable zone once the site is validated", async () => {
    const { client, event } = await setup();
    const front = field("Recul avant (m)");
    await event.clear(front);
    await event.type(front, "28");
    expect(screen.queryAllByText(texts.emptyZone)).toEqual([]);
    await event.tab();
    const site = screen.getByRole("region", { name: texts.siteHeading });
    expect(within(site).getByText(texts.emptyZone)).toBeTruthy();
    expect(announcer()).toBe(texts.emptyZone);
    const preview = screen.getByRole("img", { name: /^Aperçu du terrain Terrain rectangulaire/u });
    expect(preview.textContent).toContain("Aucune zone constructible avec ces reculs.");
    expect(preview.textContent.replace(/\s+/gu, "")).toContain(
      texts.previewNoZone.replace(/\s+/gu, ""),
    );
    // Still saved (D28).
    await flush();
    expect(patches(client)[0]).toMatchObject({
      site: { setbacks: { front: 28_000, side: 3_000, rear: 4_000 } },
    });
  });

  it("waits for the save in flight before leaving for « Mes projets »", async () => {
    const pending = deferred<VersionedProject>();
    const { navigate, event } = await setup((mock) => {
      mock.updateProject.mockReturnValueOnce(pending.promise);
    });
    await event.type(description(), " A");
    await advance(1_000);
    await event.click(screen.getByRole("link", { name: "Mes projets" }));
    expect(navigate.push).not.toHaveBeenCalled();
    expect(statusBar()).toBe(texts.savingBar);
    pending.resolve(saved({ descriptionText: "Maison familiale A" }));
    await flush();
    expect(navigate.push).toHaveBeenCalledWith("/projets");
  });

  it("asks before leaving with modifications that cannot be saved", async () => {
    const { navigate, event } = await setup();
    const area = field("Surface habitable cible (m²)");
    await event.clear(area);
    await event.type(area, "abc");
    const link = screen.getByRole("link", { name: "Mes projets" });
    await event.click(link);
    await flush();
    const confirm = screen.getByRole("alertdialog", { name: texts.leaveTitle });
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: texts.stay }));
    await event.click(within(confirm).getByRole("button", { name: texts.stay }));
    expect(navigate.push).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(link);

    await event.click(link);
    await flush();
    await event.click(screen.getByRole("button", { name: texts.leave }));
    await flush();
    expect(navigate.push).toHaveBeenCalledWith("/projets");
  });

  it("opens the project created from the header", async () => {
    const { client, navigate, event } = await setup((mock) => {
      mock.createProject.mockResolvedValue(detail({ id: "p2", name: "Duplex Odza" }));
    });
    await event.click(screen.getByRole("button", { name: "Nouveau projet" }));
    const dialog = screen.getByRole("dialog", { name: "Nouveau projet" });
    await event.type(within(dialog).getByLabelText("Nom du projet"), "Duplex Odza{Enter}");
    await flush();
    expect(client.createProject).toHaveBeenCalledWith("Duplex Odza");
    expect(navigate.push).toHaveBeenCalledWith("/projets/p2");
  });
});
