"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  errorCode,
  errorMessage,
  isUnauthenticated,
  type ProjectDetail,
  type ProjectPatch,
  type VersionedProject,
} from "@/lib/api";
import {
  GROUPS,
  fieldKeyForPath,
  groupOfKey,
  patchOf,
  type Group,
  type GroupStates,
} from "./form-model";

/** Timings of the plan § 3.4 and the spec § 8. */
export const AUTOSAVE = {
  /** Quiet time after the last modification before a save. */
  debounceMs: 1_000,
  /** Minimum time between the start of two saves: at most 20 `PATCH` per minute (D29). */
  spacingMs: 3_000,
  /** Automatic retries after a network error, a 429 or a 5xx; the last delay repeats. */
  retryDelaysMs: [5_000, 15_000, 30_000],
  /** Longest wait for pending saves when leaving the page (§ 8.7). */
  leaveBudgetMs: 10_000,
} as const;

export type WaitingCause = "network" | "rate" | "unavailable";

/** One state shown at a time, by priority (spec § 8.3). */
export type SaveStatus =
  | { kind: "conflict"; detail: string }
  | { kind: "failed"; message: string }
  | { kind: "offline" }
  | { kind: "waiting"; cause: WaitingCause }
  | { kind: "toFix" }
  | { kind: "saving" }
  | { kind: "modified" }
  | { kind: "saved" };

export interface Clock {
  now: () => number;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

type Signatures = Record<Group, string>;

interface Options {
  update: (patch: ProjectPatch, ifMatch: string | null) => Promise<VersionedProject>;
  /** Current groups, rebuilt from the fields at every render. */
  groups: GroupStates;
  clock: Clock;
  onSaved: (project: ProjectDetail) => void;
  onUnauthenticated: () => void;
  onNotFound: () => void;
  /** Called when the fields have been quiet for `debounceMs`. */
  onQuiet: () => void;
}

function waitingCause(error: unknown): WaitingCause | null {
  if (!(error instanceof ApiError)) return "network";
  if (error.problem.status === 429) return "rate";
  if (error.problem.status >= 500) return "unavailable";
  return null;
}

/**
 * Automatic saving (plan § 3.4, spec § 8): modified and valid groups leave together in one `PATCH`
 * with `If-Match`, 1 000 ms after the last modification or when a field is left, one request at a
 * time and at least 3 000 ms apart. A response never rewrites a field: only the `ETag`, the saved
 * signatures and the status change.
 */
export function useAutosave(options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const clock = options.clock;

  const baseline = useRef<Signatures | null>(null);
  const etag = useRef<string | null>(null);
  const inFlight = useRef(false);
  const sendAgain = useRef(false);
  const spacingForce = useRef(false);
  const lastSendAt = useRef(Number.NEGATIVE_INFINITY);
  const retryIndex = useRef(0);
  const timers = useRef<{ debounce?: unknown; spacing?: unknown; retry?: unknown }>({});
  const settleWaiters = useRef<(() => void)[]>([]);
  const stopped = useRef(false);
  // Signature of each group refused by a 422: not sent again until one of its fields changes.
  const rejected = useRef<Partial<Signatures>>({});

  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<WaitingCause | null>(null);
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [, setRevision] = useState(0);

  // Mirrors of the blocking states, read synchronously by the scheduler.
  const blocked = useRef({ conflict: false, failure: false, offline, waiting: false });
  blocked.current = {
    conflict: conflict !== null,
    failure: failure !== null,
    offline,
    waiting: waiting !== null,
  };

  const clear = useCallback(
    (name: "debounce" | "spacing" | "retry") => {
      const handle = timers.current[name];
      if (handle !== undefined) clock.clearTimeout(handle);
      timers.current[name] = undefined;
    },
    [clock],
  );

  const modifiedGroups = useCallback((): Group[] => {
    const saved = baseline.current;
    if (saved === null) return [];
    const { groups } = optionsRef.current;
    return GROUPS.filter((group) => groups[group].signature !== saved[group]);
  }, []);

  const sendableGroups = useCallback(
    () =>
      modifiedGroups().filter((group) => {
        const state = optionsRef.current.groups[group];
        return state.valid && rejected.current[group] !== state.signature;
      }),
    [modifiedGroups],
  );

  const settle = useCallback(() => {
    const waiters = settleWaiters.current;
    settleWaiters.current = [];
    for (const resolve of waiters) resolve();
  }, []);

  const requestSaveRef = useRef<(force?: boolean) => void>(() => undefined);

  const send = useCallback(async () => {
    const groups = sendableGroups();
    if (groups.length === 0) return;
    const { update, groups: states } = optionsRef.current;
    const signatures = Object.fromEntries(
      groups.map((group) => [group, states[group].signature]),
    ) as Partial<Signatures>;
    inFlight.current = true;
    sendAgain.current = false;
    lastSendAt.current = clock.now();
    setSaving(true);
    try {
      const result = await update(patchOf(states, groups), etag.current);
      if (stopped.current) return;
      etag.current = result.etag;
      // The server now holds what was sent, whatever was typed since.
      baseline.current = { ...(baseline.current as Signatures), ...signatures };
      retryIndex.current = 0;
      setWaiting(null);
      setLastSavedAt(clock.now());
      setRevision((value) => value + 1);
      optionsRef.current.onSaved(result.project);
    } catch (error) {
      if (stopped.current) return;
      if (isUnauthenticated(error)) {
        stopped.current = true;
        optionsRef.current.onUnauthenticated();
        return;
      }
      if (errorCode(error) === "PROJECT_NOT_FOUND") {
        stopped.current = true;
        optionsRef.current.onNotFound();
        return;
      }
      if (error instanceof ApiError && error.problem.status === 412) {
        clear("debounce");
        clear("spacing");
        clear("retry");
        blocked.current = { ...blocked.current, conflict: true };
        setConflict(error.problem.detail ?? "");
        return;
      }
      if (error instanceof ApiError && error.problem.status === 422) {
        const fields = error.problem.fields ?? {};
        const next: Record<string, string> = {};
        for (const [path, message] of Object.entries(fields)) {
          const key = fieldKeyForPath(path);
          next[key] ??= message;
        }
        const refused = new Set(
          Object.keys(next)
            .map(groupOfKey)
            .filter((group) => group in signatures),
        );
        if (refused.size === 0) {
          // No usable path: the whole request is refused, its groups show the API message.
          for (const group of groups) {
            refused.add(group);
            next[group] = errorMessage(error);
          }
        }
        for (const group of refused) rejected.current[group] = signatures[group];
        setApiErrors((current) => ({ ...current, ...next }));
        // The other groups of the request leave again on their own.
        sendAgain.current = true;
        return;
      }
      const cause = waitingCause(error);
      clear("spacing");
      if (cause === null) {
        blocked.current = { ...blocked.current, failure: true };
        setFailure(errorMessage(error));
        return;
      }
      blocked.current = { ...blocked.current, waiting: true };
      setWaiting(cause);
      const delays = AUTOSAVE.retryDelaysMs;
      const delay = delays[Math.min(retryIndex.current, delays.length - 1)] as number;
      retryIndex.current += 1;
      clear("retry");
      timers.current.retry = clock.setTimeout(() => {
        timers.current.retry = undefined;
        requestSaveRef.current(true);
      }, delay);
    } finally {
      if (!stopped.current) {
        inFlight.current = false;
        setSaving(false);
        if (sendAgain.current) requestSaveRef.current();
      }
      settle();
    }
  }, [clock, clear, sendableGroups, settle]);

  /**
   * Sends as soon as the rules allow. `force` also applies while waiting for an automatic retry
   * (retry timer, « Réessayer », back online, leaving the page).
   */
  const requestSave = useCallback(
    (force = false) => {
      const state = blocked.current;
      if (stopped.current || state.conflict || state.offline) return;
      if (state.failure && !force) return;
      if (state.waiting && !force) return;
      if (inFlight.current) {
        sendAgain.current = true;
        return;
      }
      if (sendableGroups().length === 0) return;
      const wait = lastSendAt.current + AUTOSAVE.spacingMs - clock.now();
      if (wait > 0) {
        spacingForce.current ||= force;
        if (timers.current.spacing === undefined) {
          timers.current.spacing = clock.setTimeout(() => {
            timers.current.spacing = undefined;
            const forced = spacingForce.current;
            spacingForce.current = false;
            requestSaveRef.current(forced);
          }, wait);
        }
        return;
      }
      spacingForce.current = false;
      void send();
    },
    [clock, send, sendableGroups],
  );
  requestSaveRef.current = requestSave;

  /** A field changed: the save leaves after `debounceMs` of quiet. */
  const notifyChange = useCallback(() => {
    clear("debounce");
    timers.current.debounce = clock.setTimeout(() => {
      timers.current.debounce = undefined;
      optionsRef.current.onQuiet();
      requestSaveRef.current();
    }, AUTOSAVE.debounceMs);
  }, [clock, clear]);

  /** A field was left, or a list, chip or row changed: save now (within the spacing rule). */
  const notifyCommit = useCallback(() => {
    clear("debounce");
    requestSaveRef.current();
  }, [clear]);

  const retry = useCallback(() => {
    clear("retry");
    setFailure(null);
    setWaiting(null);
    blocked.current = { ...blocked.current, failure: false, waiting: false };
    requestSaveRef.current(true);
  }, [clear]);

  /** Starts over from a freshly loaded project (opening or reload after a conflict). */
  const reset = useCallback(
    (groups: GroupStates, nextEtag: string | null) => {
      clear("debounce");
      clear("spacing");
      clear("retry");
      baseline.current = Object.fromEntries(
        GROUPS.map((group) => [group, groups[group].signature]),
      ) as Signatures;
      etag.current = nextEtag;
      rejected.current = {};
      retryIndex.current = 0;
      sendAgain.current = false;
      setConflict(null);
      setFailure(null);
      setWaiting(null);
      setApiErrors({});
      setLastSavedAt(null);
      setRevision((value) => value + 1);
    },
    [clear],
  );

  const clearApiErrors = useCallback((matches: (key: string) => boolean) => {
    setApiErrors((current) => {
      const kept = Object.entries(current).filter(([key]) => !matches(key));
      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, []);

  const hasUnsaved = useCallback(
    () => inFlight.current || modifiedGroups().length > 0,
    [modifiedGroups],
  );

  const waitForSettle = useCallback(
    (timeout: number) =>
      new Promise<void>((resolve) => {
        const handle = clock.setTimeout(resolve, timeout);
        settleWaiters.current.push(() => {
          clock.clearTimeout(handle);
          resolve();
        });
      }),
    [clock],
  );

  /**
   * Internal navigation (§ 8.7): waits for the request in flight, then sends the modified and
   * valid groups at once. Resolves `true` when nothing is left unsaved, `false` when the user must
   * confirm (invalid groups, failure, conflict, offline, or more than 10 s of waiting).
   */
  const flushBeforeLeaving = useCallback(async (): Promise<boolean> => {
    const start = clock.now();
    setLeaving(true);
    try {
      for (;;) {
        if (!hasUnsaved()) return true;
        const state = blocked.current;
        if (state.conflict || state.failure || state.offline) return false;
        if (!inFlight.current && sendableGroups().length === 0) return false;
        const remaining = AUTOSAVE.leaveBudgetMs - (clock.now() - start);
        if (remaining <= 0) return false;
        if (!inFlight.current) {
          clear("debounce");
          clear("retry");
          requestSaveRef.current(true);
        }
        await waitForSettle(remaining);
        if (stopped.current) return false;
      }
    } finally {
      setLeaving(false);
    }
  }, [clock, clear, hasUnsaved, sendableGroups, waitForSettle]);

  useEffect(() => {
    function goOffline() {
      setOffline(true);
    }
    function goOnline() {
      setOffline(false);
      blocked.current = { ...blocked.current, offline: false, waiting: false };
      clear("retry");
      setWaiting(null);
      requestSaveRef.current(true);
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [clear]);

  useEffect(() => {
    const current = timers.current;
    stopped.current = false;
    return () => {
      stopped.current = true;
      for (const handle of Object.values(current)) {
        if (handle !== undefined) clock.clearTimeout(handle);
      }
      settle();
    };
  }, [clock, settle]);

  /** Stops every save, e.g. once the project is gone or the user leaves without saving. */
  const stop = useCallback(() => {
    stopped.current = true;
    clear("debounce");
    clear("spacing");
    clear("retry");
  }, [clear]);

  /** State of the status bar, `shownErrorGroups` being the groups whose fields show an error. */
  const statusFor = (shownErrorGroups: ReadonlySet<Group>): SaveStatus => {
    const modified = modifiedGroups();
    const { groups } = options;
    if (conflict !== null) return { kind: "conflict", detail: conflict };
    if (failure !== null) return { kind: "failed", message: failure };
    if (offline) return { kind: "offline" };
    if (waiting !== null) return { kind: "waiting", cause: waiting };
    if (
      Object.keys(apiErrors).length > 0 ||
      modified.some(
        (group) =>
          (!groups[group].valid && shownErrorGroups.has(group)) ||
          rejected.current[group] === groups[group].signature,
      )
    ) {
      return { kind: "toFix" };
    }
    if (saving || leaving) return { kind: "saving" };
    if (modified.length > 0) return { kind: "modified" };
    return { kind: "saved" };
  };

  return {
    statusFor,
    apiErrors,
    lastSavedAt,
    hasUnsaved,
    notifyChange,
    notifyCommit,
    retry,
    reset,
    stop,
    clearApiErrors,
    flushBeforeLeaving,
  };
}
