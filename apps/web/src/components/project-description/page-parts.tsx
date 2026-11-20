"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import { primaryButton, secondaryButton } from "@/components/projects/styles";
import { texts } from "./texts";

const STEPS = [
  { label: "Description", available: true },
  { label: "Terrain", available: true },
  { label: "Génération", available: false },
] as const;

/** Static steps (spec § 4.3): nothing is marked done or current, nothing is interactive. */
function Steps() {
  return (
    <ol aria-label={texts.steps} className="flex flex-wrap items-center gap-y-2">
      {STEPS.map((step, index) => (
        <li key={step.label} className={`flex items-center gap-2 ${index === 0 ? "" : "ml-3"}`}>
          {index === 0 ? null : (
            <span aria-hidden="true" className="mr-1 h-px w-6 bg-line sm:w-12" />
          )}
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium leading-4 ${
              step.available
                ? "bg-primary text-white"
                : "border border-dashed border-line bg-surface text-ink/70"
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`text-sm font-medium leading-5 ${step.available ? "text-ink" : "text-ink/70"}`}
          >
            {step.label}
            {step.available ? null : <span className="sr-only">{texts.unavailableStep}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PageHeading({ withIntro }: { withIntro: boolean }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-9">{texts.pageTitle}</h1>
        {withIntro ? <p className="mt-1 text-sm leading-5 text-ink/70">{texts.intro}</p> : null}
      </div>
      {withIntro ? <Steps /> : null}
    </div>
  );
}

export function PageLoading() {
  const card = "rounded-xl border border-line bg-surface motion-safe:animate-pulse";
  return (
    <div aria-busy="true" className="mt-6">
      <p role="status" className="text-sm text-ink/70">
        {texts.loading}
      </p>
      <div aria-hidden="true" className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-5">
          <div className={`h-[312px] ${card}`} />
          <div className={`h-[592px] ${card}`} />
        </div>
        <div className={`h-[498px] ${card}`} />
      </div>
    </div>
  );
}

export function PageError({
  message,
  retryRef,
  onRetry,
}: {
  message: string;
  retryRef: RefObject<HTMLButtonElement | null>;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="mt-6 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold">{texts.loadError}</h2>
      <p className="mt-2 text-sm">{message}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button ref={retryRef} type="button" onClick={onRetry} className={primaryButton}>
          {texts.retry}
        </button>
        <Link href="/projets" className="text-sm text-primary underline">
          {texts.backToProjects}
        </Link>
      </div>
    </div>
  );
}

export function ProjectNotFound() {
  return (
    <>
      <h1 className="text-[28px] font-semibold leading-9">{texts.notFoundTitle}</h1>
      <p className="mt-2 text-sm">{texts.notFoundBody}</p>
      <Link href="/projets" className={`${primaryButton} mt-6`}>
        {texts.backToProjects}
      </Link>
    </>
  );
}

export function ConflictAlert({
  detail,
  reloadRef,
  onReload,
}: {
  detail: string;
  reloadRef: RefObject<HTMLButtonElement | null>;
  onReload: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-3 rounded-lg border border-danger/40 bg-surface px-4 py-3 text-sm"
    >
      <span aria-hidden="true" className="text-danger">
        ⚠
      </span>
      <div className="flex-1">
        <p className="font-semibold">{texts.conflictTitle}</p>
        <p className="mt-1">{detail === "" ? texts.conflictDetail : detail}</p>
        <button
          ref={reloadRef}
          type="button"
          onClick={onReload}
          className={`${primaryButton} mt-3`}
        >
          {texts.reload}
        </button>
      </div>
    </div>
  );
}

/**
 * Save status (spec § 8.2): sticky at the bottom of windows at least 600 px high. The visible text
 * is not a live region; announcements go through the screen's status region.
 */
export function SaveStatusBar({
  text,
  failed,
  action,
}: {
  text: string;
  failed: boolean;
  action?: { label: string; onClick: () => void };
}) {
  const footerRef = useRef<HTMLElement>(null);

  // Keeps a focused element from hiding behind the sticky bar (WCAG 2.4.11).
  useEffect(() => {
    const footer = footerRef.current;
    if (footer === null) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    const update = () => {
      // `matchMedia` is missing from some test environments.
      const sticky =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(min-height: 600px)").matches
          : true;
      root.style.scrollPaddingBottom = sticky ? `${footer.offsetHeight}px` : previous;
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(footer);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.scrollPaddingBottom = previous;
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className="bottom-0 z-10 border-t border-line bg-surface py-2 [@media(min-height:600px)]:sticky"
    >
      <div className="mx-auto flex min-h-10 max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-12">
        <p className={`text-xs leading-4 ${failed ? "text-danger" : "text-ink/70"}`}>
          {failed ? <span aria-hidden="true">⚠ </span> : null}
          {text}
        </p>
        {action === undefined ? null : (
          <button type="button" onClick={action.onClick} className={secondaryButton}>
            {action.label}
          </button>
        )}
      </div>
    </footer>
  );
}
