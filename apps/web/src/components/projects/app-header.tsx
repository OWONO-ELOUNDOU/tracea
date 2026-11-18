"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { focusRing, primaryButton } from "./styles";

export function AppHeader({
  newProjectRef,
  onNewProject,
  account,
}: {
  newProjectRef: RefObject<HTMLButtonElement | null>;
  /** Absent while the screen is loading or in error: the button is then not shown. */
  onNewProject?: () => void;
  account?: ReactNode;
}) {
  return (
    <header className="flex h-16 items-center gap-8 border-b border-line bg-surface px-4 lg:px-8">
      <Link href="/projets" className={`rounded text-lg font-semibold text-primary ${focusRing}`}>
        Tracea
      </Link>
      <nav aria-label="Navigation principale" className="hidden sm:block">
        <Link
          href="/projets"
          aria-current="page"
          className={`inline-flex h-9 items-center rounded-lg bg-paper px-3 text-sm font-medium ${focusRing}`}
        >
          Mes projets
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {onNewProject === undefined ? null : (
          <button
            ref={newProjectRef}
            type="button"
            aria-label="Nouveau projet"
            onClick={onNewProject}
            className={`${primaryButton} w-10 px-0 sm:w-auto sm:px-4`}
          >
            <span aria-hidden="true" className="text-xl leading-none sm:hidden">
              +
            </span>
            <span className="hidden sm:inline">Nouveau projet</span>
          </button>
        )}
        {account}
      </div>
    </header>
  );
}
