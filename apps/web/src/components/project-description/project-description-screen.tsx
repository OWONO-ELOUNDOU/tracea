"use client";

import { buildableZone } from "@tracea/domain";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { DESCRIPTION_MAX_LENGTH, countCharacters } from "@tracea/domain";
import {
  ApiError,
  errorCode,
  errorMessage,
  isUnauthenticated,
  type ApiClient,
  type ProjectDetail,
  type PublicUser,
} from "@/lib/api";
import { AccountMenu } from "@/components/projects/account-menu";
import { AppHeader } from "@/components/projects/app-header";
import type { ActionOutcome } from "@/components/projects/outcome";
import { projectHref } from "@/components/projects/project-card";
import { ProjectNameDialog } from "@/components/projects/project-name-dialog";
import { focusRing } from "@/components/projects/styles";
import { useMounted } from "@/components/projects/use-mounted";
import type { FormBinding } from "./binding";
import { DescriptionCard } from "./description-card";
import { ConfirmDialog, ExamplesDialog } from "./dialogs";
import { DESCRIPTION_EXAMPLES } from "./examples";
import {
  FIELD_KEYS,
  GROUP_LEVEL_KEYS,
  buildGroups,
  groupOfKey,
  newRoomRow,
  placeErrors,
  roomKey,
  sitePreviewState,
  valuesFromProject,
  type FormValues,
  type Group,
  type RoomCell,
  type ScalarField,
  type SitePreviewState,
} from "./form-model";
import { ParametersCard } from "./parameters-card";
import {
  ConflictAlert,
  PageError,
  PageHeading,
  PageLoading,
  ProjectNotFound,
  SaveStatusBar,
} from "./page-parts";
import { formatSavedDate, savedDateRefreshMs } from "./saved-date";
import { SiteCard } from "./site-card";
import { texts } from "./texts";
import { systemClock, useAutosave, type Clock, type SaveStatus } from "./use-autosave";

export type DescriptionClient = Pick<
  ApiClient,
  "me" | "logout" | "getProject" | "updateProject" | "createProject"
>;

export interface Navigator {
  replace: (href: string) => void;
  push: (href: string) => void;
}

export function signInHref(projectId: string): string {
  return `/connexion?suivant=${encodeURIComponent(projectHref(projectId))}`;
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "notFound" }
  | { kind: "ready" };

type DialogState =
  | { kind: "create" }
  | { kind: "examples"; focusIndex: number }
  | { kind: "replaceExample"; index: number }
  | { kind: "reload" }
  | {
      kind: "leave";
      resolve: (leave: boolean) => void;
      trigger: HTMLElement | null;
      /** Name of the project just created, announced if the user stays. */
      created?: string;
    };

const BLANK_VALUES: FormValues = valuesFromProject({
  id: "",
  name: "",
  descriptionText: null,
  parameters: null,
  site: null,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
  thumbnailUrl: null,
  currentVersion: null,
  lastJob: null,
});

function statusText(status: SaveStatus, savedDate: string): string {
  switch (status.kind) {
    case "conflict":
      return texts.conflictBar;
    case "failed":
      return texts.failedBar(status.message);
    case "offline":
      return texts.offlineBar;
    case "waiting":
      return texts.waitingBar(texts.waitingCause[status.cause]);
    case "toFix":
      return texts.toFixBar;
    case "saving":
      return texts.savingBar;
    case "modified":
      return texts.modifiedBar;
    case "saved":
      return texts.savedBar(savedDate);
  }
}

const FAILED_STATES = new Set<SaveStatus["kind"]>([
  "conflict",
  "failed",
  "offline",
  "waiting",
  "toFix",
]);

/** Type cells already chosen, revealed with a type change so that a duplicate shows at once. */
function revealOnTypeChange(values: FormValues): string[] {
  return values.rooms.flatMap((row, index) => (row.type === "" ? [] : [roomKey(index, "type")]));
}

/**
 * « Décrire le bâtiment » (docs/specs/screens/project-description.md). Validation, bounds,
 * counting, unit conversions and the buildable zone come from `@tracea/domain`; the API stays the
 * authority. Every change is saved automatically (§ 8, `useAutosave`).
 */
export function ProjectDescriptionScreen({
  projectId,
  client,
  navigate,
  clock = systemClock,
}: {
  projectId: string;
  client: DescriptionClient;
  navigate: Navigator;
  /** Time source and timers of the autosave and of the relative date; injected by tests. */
  clock?: Clock;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [user, setUser] = useState<PublicUser | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<SitePreviewState>({ kind: "blank" });
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string; key: number } | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [now, setNow] = useState(() => clock.now());

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const mainRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const newProjectRef = useRef<HTMLButtonElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const examplesButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<(() => HTMLElement | null | undefined) | null>(null);
  const commitRequested = useRef<{ site: boolean } | null>(null);
  const announcementKey = useRef(0);
  const loadId = useRef(0);
  const leftPage = useRef(false);
  const mounted = useMounted();

  const groups = useMemo(() => buildGroups(values ?? BLANK_VALUES), [values]);

  const announce = useCallback((text: string) => {
    announcementKey.current += 1;
    setAnnouncement({ text, key: announcementKey.current });
  }, []);

  const focusSoon = useCallback((target: () => HTMLElement | null | undefined) => {
    pendingFocus.current = target;
    setFocusTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    const element = target();
    // The focus is never lost: when the intended element is gone it goes to <main> (§ 11.1).
    (element?.isConnected === true ? element : mainRef.current)?.focus();
  }, [focusTick]);

  const refreshPreview = useCallback(() => {
    const current = valuesRef.current;
    if (current !== null) setPreview(sitePreviewState(current));
  }, []);

  const redirectToSignIn = useCallback(() => {
    leftPage.current = true;
    setDialog(null);
    navigate.replace(signInHref(projectId));
  }, [navigate, projectId]);

  const showNotFound = useCallback(() => {
    leftPage.current = true;
    setDialog(null);
    setPhase({ kind: "notFound" });
    focusSoon(() => mainRef.current);
  }, [focusSoon]);

  // Errors shown under the fields: API refusals first, then local errors once revealed (§ 9.1).
  const localErrors = useMemo(
    () =>
      Object.assign({}, ...Object.values(groups).map((group) => group.errors)) as Record<
        string,
        string
      >,
    [groups],
  );

  const autosave = useAutosave({
    update: (patch, ifMatch) => client.updateProject(projectId, patch, { ifMatch }),
    groups,
    clock,
    onSaved: (saved) => setProject(saved),
    onUnauthenticated: redirectToSignIn,
    onNotFound: showNotFound,
    onQuiet: refreshPreview,
  });

  const displayedErrors = useMemo(() => {
    if (values === null) return {};
    const visible: Record<string, string> = {};
    for (const key of revealed) {
      const message = localErrors[key];
      if (message !== undefined) visible[key] = message;
    }
    return placeErrors({ ...visible, ...autosave.apiErrors }, values);
  }, [values, revealed, localErrors, autosave.apiErrors]);

  const shownErrorGroups = useMemo(
    () => new Set<Group>(Object.keys(displayedErrors).map(groupOfKey)),
    [displayedErrors],
  );

  // A revealed error that has become valid is hidden until the field is left again (§ 9.1).
  useEffect(() => {
    const stale = [...revealed].filter((key) => localErrors[key] === undefined);
    if (stale.length === 0) return;
    setRevealed((current) => new Set([...current].filter((key) => !stale.includes(key))));
  }, [revealed, localErrors]);

  // Lists, chips and rows: validated and saved once the new values are rendered.
  useEffect(() => {
    const request = commitRequested.current;
    if (request === null) return;
    commitRequested.current = null;
    autosave.notifyCommit();
    if (request.site) refreshPreview();
  });

  const init = useCallback(
    (loaded: ProjectDetail, etag: string | null) => {
      const next = valuesFromProject(loaded);
      autosave.reset(buildGroups(next), etag);
      setValues(next);
      setProject(loaded);
      setRevealed(new Set());
      setPreview(sitePreviewState(next));
    },
    [autosave.reset],
  );

  const load = useCallback(
    async (isRetry: boolean) => {
      const id = ++loadId.current;
      setPhase({ kind: "loading" });
      const [meResult, projectResult] = await Promise.allSettled([
        client.me(),
        client.getProject(projectId),
      ]);
      if (!mounted.current || id !== loadId.current) return;
      const reasons = [meResult, projectResult].flatMap((result) =>
        result.status === "rejected" ? [result.reason as unknown] : [],
      );
      if (reasons.some(isUnauthenticated)) {
        navigate.replace(signInHref(projectId));
        return;
      }
      if (meResult.status === "fulfilled") setUser(meResult.value.user);
      if (
        projectResult.status === "rejected" &&
        errorCode(projectResult.reason) === "PROJECT_NOT_FOUND"
      ) {
        setPhase({ kind: "notFound" });
        if (isRetry) focusSoon(() => mainRef.current);
        return;
      }
      if (projectResult.status === "rejected" || meResult.status === "rejected") {
        setPhase({ kind: "error", message: errorMessage(reasons[0]) });
        if (isRetry) focusSoon(() => retryRef.current);
        return;
      }
      init(projectResult.value.project, projectResult.value.etag);
      setPhase({ kind: "ready" });
      if (isRetry) focusSoon(() => mainRef.current);
    },
    [client, projectId, mounted, navigate, focusSoon, init],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Document title (§ 3): the last name received from the API, not the one being typed. Rendered
  // as a React <title>, hoisted into <head> and removed with the screen; the route sets none.
  const documentTitle =
    phase.kind === "notFound"
      ? texts.notFoundDocumentTitle
      : phase.kind === "ready" && project !== null
        ? texts.projectDocumentTitle(project.name)
        : texts.documentTitle;

  // Native warning when the tab is closed or reloaded with unsaved changes (§ 8.7).
  const hasUnsaved = autosave.hasUnsaved;
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (leftPage.current || !hasUnsaved()) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  // ------------------------------------------------------------------------------------------
  // Status bar, announcements
  // ------------------------------------------------------------------------------------------

  const status = autosave.statusFor(shownErrorGroups);
  const savedAt =
    autosave.lastSavedAt ?? (project === null ? clock.now() : Date.parse(project.updatedAt));

  useEffect(() => {
    if (phase.kind !== "ready") return;
    const handle = clock.setTimeout(
      () => setNow(clock.now()),
      savedDateRefreshMs(savedAt, clock.now()),
    );
    return () => clock.clearTimeout(handle);
  }, [clock, phase.kind, savedAt, now]);

  const previousStatus = useRef<SaveStatus["kind"]>("saved");
  const lastSavedAnnouncement = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    if (phase.kind !== "ready" || status.kind === previousStatus.current) return;
    previousStatus.current = status.kind;
    if (status.kind === "saved") {
      // At most one « saved » announcement every 30 s during continuous typing (§ 11.4).
      if (autosave.lastSavedAt !== null && clock.now() - lastSavedAnnouncement.current >= 30_000) {
        lastSavedAnnouncement.current = clock.now();
        announce(texts.savedAnnouncement);
      }
    } else if (FAILED_STATES.has(status.kind) && status.kind !== "conflict") {
      announce(statusText(status, ""));
    }
  }, [phase.kind, status, autosave.lastSavedAt, clock, announce]);

  const over = values !== null && countCharacters(values.description) > DESCRIPTION_MAX_LENGTH;
  const wasOver = useRef(false);
  useEffect(() => {
    if (over && !wasOver.current) announce(texts.limitExceeded);
    wasOver.current = over;
  }, [over, announce]);

  const emptyZone =
    preview.kind === "ready" &&
    preview.site.boundary.kind === "rectangle" &&
    buildableZone(preview.site) === null;
  const wasEmptyZone = useRef(false);
  useEffect(() => {
    if (emptyZone && !wasEmptyZone.current) announce(texts.emptyZone);
    wasEmptyZone.current = emptyZone;
  }, [emptyZone, announce]);

  // ------------------------------------------------------------------------------------------
  // Field changes
  // ------------------------------------------------------------------------------------------

  const reveal = useCallback((keys: string[]) => {
    setRevealed((current) => {
      if (keys.every((key) => current.has(key))) return current;
      return new Set([...current, ...keys]);
    });
  }, []);

  function updateValues(update: (current: FormValues) => FormValues) {
    setValues((current) => (current === null ? current : update(current)));
  }

  function requestCommit(site: boolean) {
    commitRequested.current = { site: site || (commitRequested.current?.site ?? false) };
  }

  const binding: FormBinding | null =
    values === null
      ? null
      : {
          values,
          errors: displayedErrors,
          change(field: ScalarField, value: string, commit = false) {
            const key = FIELD_KEYS[field];
            updateValues((current) => {
              const next = { ...current, [field]: value };
              // A dependent field disappears with its value (§ 6.2).
              if (field === "roof" && value === "") next.covering = "";
              if (field === "garage" && (value === "" || value === "none")) next.garageArea = "";
              return next;
            });
            autosave.clearApiErrors((candidate) => candidate === key);
            if (commit) {
              reveal([key]);
              requestCommit(groupOfKey(key) === "site");
            } else {
              autosave.notifyChange();
            }
          },
          leave(key: string) {
            const group = groupOfKey(key);
            reveal([key, ...GROUP_LEVEL_KEYS[group]]);
            autosave.notifyCommit();
            if (group === "site") refreshPreview();
          },
          changeRoom(index: number, cell: RoomCell, value: string, commit = false) {
            const key = roomKey(index, cell);
            updateValues((current) => ({
              ...current,
              rooms: current.rooms.map((row, position) =>
                position === index ? { ...row, [cell]: value } : row,
              ),
            }));
            autosave.clearApiErrors((candidate) => candidate === key);
            if (commit) {
              // A duplicate type is reported on its second occurrence, possibly another row.
              reveal([key, ...revealOnTypeChange(values)]);
              requestCommit(false);
            } else {
              autosave.notifyChange();
            }
          },
          addRoom() {
            const index = values.rooms.length;
            updateValues((current) => ({
              ...current,
              rooms: [...current.rooms, newRoomRow({ count: "1" })],
            }));
            autosave.clearApiErrors((key) => key.startsWith("parameters.rooms"));
            reveal(["parameters.rooms"]);
            requestCommit(false);
            focusSoon(() =>
              formRef.current?.querySelector<HTMLElement>(
                `[data-field="${roomKey(index, "type")}"]`,
              ),
            );
          },
          deleteRoom(index: number) {
            const remaining = values.rooms.length - 1;
            updateValues((current) => ({
              ...current,
              rooms: current.rooms.filter((_, position) => position !== index),
            }));
            // Indices shift: errors attached to rows no longer designate the same row.
            autosave.clearApiErrors((key) => key.startsWith("parameters.rooms"));
            setRevealed(
              (current) =>
                new Set([...current].filter((key) => !key.startsWith("parameters.rooms."))),
            );
            reveal(["parameters.rooms"]);
            requestCommit(false);
            announce(texts.rowDeleted(index + 1));
            const target = index < remaining ? index : index - 1;
            focusSoon(() =>
              target < 0
                ? formRef.current?.querySelector<HTMLElement>("[data-add-room]")
                : formRef.current?.querySelector<HTMLElement>(`[data-delete-row="${target}"]`),
            );
          },
        };

  // ------------------------------------------------------------------------------------------
  // Leaving the page (§ 8.7)
  // ------------------------------------------------------------------------------------------

  const guardLeave = useCallback(
    async (trigger: HTMLElement | null, created?: string): Promise<boolean> => {
      if (!autosave.hasUnsaved()) return true;
      const clean = await autosave.flushBeforeLeaving();
      if (!mounted.current || leftPage.current) return false;
      if (clean) return true;
      return new Promise<boolean>((resolve) => {
        setDialog({ kind: "leave", resolve, trigger, created });
      });
    },
    [autosave.hasUnsaved, autosave.flushBeforeLeaving, mounted],
  );

  function onProjectsLink(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (phase.kind !== "ready" || !autosave.hasUnsaved()) return;
    event.preventDefault();
    const trigger = event.currentTarget;
    void guardLeave(trigger).then((leave) => {
      if (leave) {
        leftPage.current = true;
        navigate.push("/projets");
      }
    });
  }

  async function createProject(name: string): Promise<ActionOutcome> {
    try {
      const created = await client.createProject(name);
      if (!mounted.current) return { kind: "done" };
      setDialog(null);
      focusSoon(() => newProjectRef.current);
      if (await guardLeave(newProjectRef.current, created.name)) {
        leftPage.current = true;
        navigate.push(projectHref(created.id));
      }
      return { kind: "done" };
    } catch (error) {
      if (isUnauthenticated(error)) {
        redirectToSignIn();
        return { kind: "done" };
      }
      const fieldError =
        error instanceof ApiError && error.problem.status === 422
          ? error.problem.fields?.name
          : undefined;
      if (fieldError !== undefined) return { kind: "fieldError", message: fieldError };
      return { kind: "formError", message: errorMessage(error) };
    }
  }

  async function logout(): Promise<"done" | "failed"> {
    if (!(await guardLeave(avatarRef.current))) return "failed";
    try {
      await client.logout();
      leftPage.current = true;
      navigate.push("/connexion");
      return "done";
    } catch (error) {
      if (isUnauthenticated(error)) {
        redirectToSignIn();
        return "done";
      }
      announce(errorMessage(error));
      return "failed";
    }
  }

  // ------------------------------------------------------------------------------------------
  // Conflict and examples
  // ------------------------------------------------------------------------------------------

  async function reloadProject(): Promise<string | null> {
    try {
      const { project: loaded, etag } = await client.getProject(projectId);
      if (!mounted.current) return null;
      init(loaded, etag);
      setDialog(null);
      announce(texts.reloaded);
      focusSoon(() => mainRef.current);
      return null;
    } catch (error) {
      if (isUnauthenticated(error)) {
        redirectToSignIn();
        return null;
      }
      if (errorCode(error) === "PROJECT_NOT_FOUND") {
        autosave.stop();
        showNotFound();
        return null;
      }
      return errorMessage(error);
    }
  }

  function askReload() {
    if (autosave.hasUnsaved()) {
      setDialog({ kind: "reload" });
      return;
    }
    void reloadProject().then((message) => {
      if (message !== null) announce(message);
    });
  }

  function insertExample(index: number) {
    const example = DESCRIPTION_EXAMPLES[index];
    if (example === undefined || binding === null) return;
    binding.change("description", example.text);
    setDialog(null);
    announce(texts.exampleInserted);
    focusSoon(() => {
      const textarea = textareaRef.current;
      textarea?.setSelectionRange(example.text.length, example.text.length);
      return textarea;
    });
  }

  function goToFirstError() {
    focusSoon(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-group-error]'),
    );
  }

  // ------------------------------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------------------------------

  const ready = phase.kind === "ready" && binding !== null;
  const headerComplete = ready || (phase.kind === "notFound" && user !== null);
  const conflict = status.kind === "conflict" ? status : null;
  const barAction =
    status.kind === "failed" || status.kind === "waiting"
      ? { label: texts.retry, onClick: autosave.retry }
      : status.kind === "toFix"
        ? { label: texts.goToField, onClick: goToFirstError }
        : undefined;

  return (
    <>
      <title>{documentTitle}</title>
      <div inert={dialog !== null} className="flex min-h-screen flex-col">
        <a
          href="#contenu"
          className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm ${focusRing}`}
        >
          Aller au contenu
        </a>
        <AppHeader
          inProject
          newProjectRef={newProjectRef}
          onProjectsLink={onProjectsLink}
          onNewProject={headerComplete ? () => setDialog({ kind: "create" }) : undefined}
          account={
            headerComplete && user !== null ? (
              <AccountMenu user={user} avatarRef={avatarRef} onLogout={logout} />
            ) : undefined
          }
        />
        <main
          id="contenu"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-12 pt-8 outline-none sm:px-6 lg:px-12"
        >
          {phase.kind === "notFound" ? (
            <ProjectNotFound />
          ) : (
            <>
              <PageHeading withIntro={ready} />
              {phase.kind === "loading" ? <PageLoading /> : null}
              {phase.kind === "error" ? (
                <PageError
                  message={phase.message}
                  retryRef={retryRef}
                  onRetry={() => void load(true)}
                />
              ) : null}
              {ready ? (
                <>
                  {conflict === null ? null : (
                    <ConflictAlert
                      detail={conflict.detail}
                      reloadRef={reloadRef}
                      onReload={askReload}
                    />
                  )}
                  <form
                    ref={formRef}
                    noValidate
                    onSubmit={(event) => event.preventDefault()}
                    className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
                  >
                    <div className="flex min-w-0 flex-col gap-5">
                      <DescriptionCard
                        binding={binding}
                        textareaRef={textareaRef}
                        examplesButtonRef={examplesButtonRef}
                        onOpenExamples={() => setDialog({ kind: "examples", focusIndex: 0 })}
                      />
                      <ParametersCard binding={binding} />
                    </div>
                    <SiteCard binding={binding} preview={preview} emptyZone={emptyZone} />
                  </form>
                </>
              ) : null}
            </>
          )}
        </main>
        {ready ? (
          <SaveStatusBar
            text={statusText(status, formatSavedDate(savedAt, now))}
            failed={FAILED_STATES.has(status.kind)}
            action={barAction}
          />
        ) : null}
      </div>
      <div role="status" className="sr-only">
        {announcement === null ? null : <span key={announcement.key}>{announcement.text}</span>}
      </div>
      {dialog?.kind === "create" ? (
        <ProjectNameDialog
          mode="create"
          onSubmit={createProject}
          onCancel={() => {
            setDialog(null);
            focusSoon(() => newProjectRef.current);
          }}
        />
      ) : null}
      {dialog?.kind === "examples" ? (
        <ExamplesDialog
          focusIndex={dialog.focusIndex}
          onUse={(index) => {
            if ((values?.description ?? "").trim() === "") insertExample(index);
            else setDialog({ kind: "replaceExample", index });
          }}
          onClose={() => {
            setDialog(null);
            focusSoon(() => examplesButtonRef.current);
          }}
        />
      ) : null}
      {dialog?.kind === "replaceExample" ? (
        <ConfirmDialog
          title={texts.replaceTitle}
          body={texts.replaceBody(DESCRIPTION_EXAMPLES[dialog.index]?.title ?? "")}
          confirmLabel={texts.replaceAction}
          onConfirm={() => {
            insertExample(dialog.index);
            return null;
          }}
          onCancel={() => setDialog({ kind: "examples", focusIndex: dialog.index })}
        />
      ) : null}
      {dialog?.kind === "reload" ? (
        <ConfirmDialog
          title={texts.reloadTitle}
          body={texts.reloadBody}
          confirmLabel={texts.reload}
          pendingLabel={texts.reloadPending}
          onConfirm={reloadProject}
          onCancel={() => {
            setDialog(null);
            focusSoon(() => reloadRef.current);
          }}
        />
      ) : null}
      {dialog?.kind === "leave" ? (
        <ConfirmDialog
          title={texts.leaveTitle}
          body={texts.leaveBody}
          cancelLabel={texts.stay}
          confirmLabel={texts.leave}
          onConfirm={() => {
            leftPage.current = true;
            autosave.stop();
            setDialog(null);
            dialog.resolve(true);
            return null;
          }}
          onCancel={() => {
            setDialog(null);
            const { trigger, created } = dialog;
            focusSoon(() => trigger);
            if (created !== undefined) announce(texts.created(created));
            dialog.resolve(false);
          }}
        />
      ) : null}
    </>
  );
}
