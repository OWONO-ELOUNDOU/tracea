"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  errorCode,
  errorMessage,
  isUnauthenticated,
  type ApiClient,
  type ProjectDetail,
  type ProjectSummary,
  type PublicUser,
} from "@/lib/api";
import { AccountMenu } from "./account-menu";
import { AppHeader } from "./app-header";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { NewProjectTile } from "./new-project-tile";
import { Notice, type NoticeMessage } from "./notice";
import type { ActionOutcome } from "./outcome";
import { ProjectCard } from "./project-card";
import { ProjectNameDialog } from "./project-name-dialog";
import { EmptyState, ErrorState, LoadMoreButton, LoadingState, gridClass } from "./states";
import { focusRing } from "./styles";
import { texts } from "./texts";
import { useMounted } from "./use-mounted";

export type ProjectsClient = Pick<
  ApiClient,
  | "me"
  | "logout"
  | "listProjects"
  | "createProject"
  | "updateProject"
  | "duplicateProject"
  | "deleteProject"
>;

export interface Navigator {
  replace: (href: string) => void;
  push: (href: string) => void;
}

export const SIGN_IN_REDIRECT = "/connexion?suivant=/projets";

type Phase = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready" };

type DialogState =
  | { kind: "create"; trigger: HTMLElement | null }
  | { kind: "rename"; project: ProjectSummary }
  | { kind: "delete"; project: ProjectSummary };

type FocusTarget =
  | { kind: "actions"; id: string }
  | { kind: "newProject" }
  | { kind: "main" }
  | { kind: "retry" }
  | { kind: "loadMore" }
  | { kind: "element"; element: HTMLElement | null };

function toSummary(project: ProjectDetail): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    thumbnailUrl: project.thumbnailUrl,
    currentVersion:
      project.currentVersion === null ? null : { number: project.currentVersion.number },
  };
}

function withoutKnown(items: ProjectSummary[], known: ProjectSummary[]): ProjectSummary[] {
  const ids = new Set(known.map((project) => project.id));
  return items.filter((project) => !ids.has(project.id));
}

/**
 * « Mes projets » (docs/specs/screens/projects.md). Order, bounds and validation come from the API;
 * the screen only places returned projects (§ 5) and moves focus (§ 7, § 9).
 */
export function ProjectsScreen({
  client,
  navigate,
  now = () => new Date(),
}: {
  client: ProjectsClient;
  navigate: Navigator;
  /** Current time for relative dates; injected by tests. */
  now?: () => Date;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [user, setUser] = useState<PublicUser | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [duplicating, setDuplicating] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  // Mirrors read by async handlers, which must see the list as it is when their call settles.
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const cursorRef = useRef(nextCursor);
  cursorRef.current = nextCursor;

  const mainRef = useRef<HTMLElement>(null);
  const newProjectRef = useRef<HTMLButtonElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const actionButtons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<FocusTarget | null>(null);
  const noticeKey = useRef(0);
  const loadId = useRef(0);
  const mounted = useMounted();

  const requestFocus = useCallback((target: FocusTarget) => {
    pendingFocus.current = target;
    setFocusTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    let element: HTMLElement | null | undefined;
    switch (target.kind) {
      case "actions":
        element = actionButtons.current.get(target.id);
        break;
      case "newProject":
        element = newProjectRef.current;
        break;
      case "main":
        element = mainRef.current;
        break;
      case "retry":
        element = retryRef.current;
        break;
      case "loadMore":
        element = loadMoreRef.current;
        break;
      case "element":
        element = target.element;
        break;
    }
    // The focus is never lost: when the intended element is gone it goes to « Nouveau projet ».
    (element?.isConnected === true ? element : newProjectRef.current)?.focus();
  }, [focusTick]);

  const announce = useCallback((kind: NoticeMessage["kind"], text: string) => {
    noticeKey.current += 1;
    setNotice({ kind, text, key: noticeKey.current });
  }, []);

  const redirectToSignIn = useCallback(() => {
    setDialog(null);
    navigate.replace(SIGN_IN_REDIRECT);
  }, [navigate]);

  const loadPage = useCallback(
    async (cursor: string, mode: "more" | "refill") => {
      if (mode === "more") setLoadingMore(true);
      else setRefilling(true);
      try {
        const page = await client.listProjects({ cursor });
        if (!mounted.current) return;
        const fresh = withoutKnown(page.items, projectsRef.current);
        setProjects((current) => [...current, ...withoutKnown(fresh, current)]);
        setNextCursor(page.nextCursor);
        if (mode === "more") {
          announce("status", texts.moreLoaded(fresh.length));
          const first = fresh[0];
          requestFocus(
            first === undefined ? { kind: "newProject" } : { kind: "actions", id: first.id },
          );
        }
      } catch (error) {
        if (!mounted.current) return;
        if (isUnauthenticated(error)) {
          redirectToSignIn();
          return;
        }
        announce("alert", errorMessage(error));
        if (mode === "more") requestFocus({ kind: "loadMore" });
      } finally {
        if (mounted.current) {
          setLoadingMore(false);
          setRefilling(false);
        }
      }
    },
    [client, mounted, announce, requestFocus, redirectToSignIn],
  );

  const load = useCallback(
    async (isRetry: boolean) => {
      const id = ++loadId.current;
      setPhase({ kind: "loading" });
      const [meResult, pageResult] = await Promise.allSettled([client.me(), client.listProjects()]);
      if (!mounted.current || id !== loadId.current) return;
      if (meResult.status === "rejected" || pageResult.status === "rejected") {
        const reasons = [meResult, pageResult].flatMap((result) =>
          result.status === "rejected" ? [result.reason as unknown] : [],
        );
        if (reasons.some(isUnauthenticated)) {
          navigate.replace(SIGN_IN_REDIRECT);
          return;
        }
        setPhase({ kind: "error", message: errorMessage(reasons[0]) });
        if (isRetry) requestFocus({ kind: "retry" });
        return;
      }
      const page = pageResult.value;
      setUser(meResult.value.user);
      setProjects(withoutKnown(page.items, []));
      setNextCursor(page.nextCursor);
      setPhase({ kind: "ready" });
      if (isRetry) requestFocus({ kind: "main" });
      if (page.items.length === 0 && page.nextCursor !== null) {
        void loadPage(page.nextCursor, "refill");
      }
    },
    [client, mounted, navigate, requestFocus, loadPage],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  /** Takes a project off the list and moves focus to its neighbour (§ 7.4, § 7.5). */
  function removeProject(id: string) {
    const list = projectsRef.current;
    const index = list.findIndex((project) => project.id === id);
    const neighbour = list[index + 1] ?? list[index - 1];
    const remaining = list.filter((project) => project.id !== id);
    setProjects((current) => current.filter((project) => project.id !== id));
    requestFocus(
      neighbour === undefined || index === -1
        ? { kind: "newProject" }
        : { kind: "actions", id: neighbour.id },
    );
    // An emptied page must not show the empty state while more projects exist (§ 6.5).
    const cursor = cursorRef.current;
    if (remaining.length === 0 && cursor !== null) void loadPage(cursor, "refill");
  }

  /** Common failure handling of the dialog actions (§ 6.6, § 7.1, § 7.5). */
  function failure(error: unknown, project?: ProjectSummary): ActionOutcome {
    if (isUnauthenticated(error)) {
      redirectToSignIn();
      return { kind: "done" };
    }
    if (project !== undefined && errorCode(error) === "PROJECT_NOT_FOUND") {
      setDialog(null);
      announce("alert", texts.notFound);
      removeProject(project.id);
      return { kind: "done" };
    }
    const fieldError =
      error instanceof ApiError && error.problem.status === 422
        ? error.problem.fields?.name
        : undefined;
    if (fieldError !== undefined) return { kind: "fieldError", message: fieldError };
    return { kind: "formError", message: errorMessage(error) };
  }

  function openDialog(next: DialogState) {
    setNotice(null);
    setDialog(next);
  }

  async function createProject(trigger: HTMLElement | null, name: string): Promise<ActionOutcome> {
    try {
      const project = toSummary(await client.createProject(name));
      if (!mounted.current) return { kind: "done" };
      setProjects((current) =>
        current.some((item) => item.id === project.id) ? current : [project, ...current],
      );
      setDialog(null);
      announce("status", texts.created(project.name));
      requestFocus({ kind: "element", element: trigger });
      return { kind: "done" };
    } catch (error) {
      return failure(error);
    }
  }

  async function renameProject(project: ProjectSummary, name: string): Promise<ActionOutcome> {
    if (name === project.name) {
      setDialog(null);
      requestFocus({ kind: "actions", id: project.id });
      return { kind: "done" };
    }
    try {
      const renamed = toSummary(await client.updateProject(project.id, { name }));
      if (!mounted.current) return { kind: "done" };
      // The API now lists it first: its `updatedAt` is the most recent.
      setProjects((current) => [renamed, ...current.filter((item) => item.id !== renamed.id)]);
      setDialog(null);
      announce("status", texts.renamed(renamed.name));
      requestFocus({ kind: "actions", id: renamed.id });
      return { kind: "done" };
    } catch (error) {
      return failure(error, project);
    }
  }

  async function deleteProject(project: ProjectSummary): Promise<ActionOutcome> {
    try {
      await client.deleteProject(project.id);
      if (!mounted.current) return { kind: "done" };
      setDialog(null);
      announce("status", texts.deleted(project.name));
      removeProject(project.id);
      return { kind: "done" };
    } catch (error) {
      return failure(error, project);
    }
  }

  async function duplicateProject(project: ProjectSummary) {
    if (duplicating.has(project.id)) return;
    setDuplicating((current) => new Set(current).add(project.id));
    announce("status", texts.duplicating(project.name));
    try {
      const copy = toSummary(await client.duplicateProject(project.id));
      if (!mounted.current) return;
      setProjects((current) =>
        current.some((item) => item.id === copy.id) ? current : [copy, ...current],
      );
      announce("status", texts.duplicated(copy.name));
    } catch (error) {
      if (!mounted.current) return;
      if (isUnauthenticated(error)) {
        redirectToSignIn();
      } else if (errorCode(error) === "PROJECT_NOT_FOUND") {
        announce("alert", texts.notFound);
        removeProject(project.id);
      } else {
        announce("alert", errorMessage(error));
      }
    } finally {
      if (mounted.current) {
        setDuplicating((current) => {
          const next = new Set(current);
          next.delete(project.id);
          return next;
        });
      }
    }
  }

  async function logout(): Promise<"done" | "failed"> {
    try {
      await client.logout();
      navigate.push("/connexion");
      return "done";
    } catch (error) {
      if (isUnauthenticated(error)) {
        redirectToSignIn();
        return "done";
      }
      announce("alert", errorMessage(error));
      return "failed";
    }
  }

  function cancelDialog() {
    if (dialog === null) return;
    setDialog(null);
    requestFocus(
      dialog.kind === "create"
        ? { kind: "element", element: dialog.trigger }
        : { kind: "actions", id: dialog.project.id },
    );
  }

  const ready = phase.kind === "ready";
  const busy = phase.kind === "loading" || refilling;
  const currentTime = now();

  return (
    <>
      <div inert={dialog !== null} className="min-h-screen">
        <a
          href="#contenu"
          className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm ${focusRing}`}
        >
          Aller au contenu
        </a>
        <AppHeader
          newProjectRef={newProjectRef}
          onNewProject={
            ready ? () => openDialog({ kind: "create", trigger: newProjectRef.current }) : undefined
          }
          account={
            ready && user !== null ? (
              <AccountMenu user={user} avatarRef={avatarRef} onLogout={logout} />
            ) : undefined
          }
        />
        <main
          id="contenu"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto max-w-[1344px] px-4 pb-12 pt-8 outline-none sm:px-6 lg:px-12"
        >
          <h1 id="projets-titre" className="text-[28px] font-semibold leading-9">
            Mes projets
          </h1>
          <Notice
            message={notice}
            onClose={() => {
              setNotice(null);
              requestFocus({ kind: "newProject" });
            }}
          />
          <div aria-busy={busy}>
            {busy ? (
              <LoadingState />
            ) : phase.kind === "error" ? (
              <ErrorState
                message={phase.message}
                retryRef={retryRef}
                onRetry={() => void load(true)}
              />
            ) : (
              <>
                {projects.length === 0 && nextCursor === null ? <EmptyState /> : null}
                <ul role="list" aria-labelledby="projets-titre" className={`mt-6 ${gridClass}`}>
                  {projects.map((project) => (
                    <li key={project.id}>
                      <ProjectCard
                        project={project}
                        now={currentTime}
                        busy={duplicating.has(project.id)}
                        actionsButtonRef={(element) => {
                          if (element === null) actionButtons.current.delete(project.id);
                          else actionButtons.current.set(project.id, element);
                        }}
                        onRename={() => openDialog({ kind: "rename", project })}
                        onDuplicate={() => void duplicateProject(project)}
                        onDelete={() => openDialog({ kind: "delete", project })}
                      />
                    </li>
                  ))}
                  <li>
                    <NewProjectTile
                      onClick={(trigger) => openDialog({ kind: "create", trigger })}
                    />
                  </li>
                </ul>
                {nextCursor === null ? null : (
                  <LoadMoreButton
                    pending={loadingMore}
                    buttonRef={loadMoreRef}
                    onClick={() => void loadPage(nextCursor, "more")}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
      {dialog?.kind === "create" ? (
        <ProjectNameDialog
          mode="create"
          onSubmit={(name) => createProject(dialog.trigger, name)}
          onCancel={cancelDialog}
        />
      ) : null}
      {dialog?.kind === "rename" ? (
        <ProjectNameDialog
          key={dialog.project.id}
          mode="rename"
          initialName={dialog.project.name}
          onSubmit={(name) => renameProject(dialog.project, name)}
          onCancel={cancelDialog}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteProjectDialog
          projectName={dialog.project.name}
          onConfirm={() => deleteProject(dialog.project)}
          onCancel={cancelDialog}
        />
      ) : null}
    </>
  );
}
