"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode, RefObject } from "react";
import { focusRing, primaryButton } from "./styles";

export function AppHeader({
  newProjectRef,
  onNewProject,
  account,
  onProjectsLink,
  inProject = false,
}: {
  newProjectRef: RefObject<HTMLButtonElement | null>;
  /** Absent while the screen is loading or in error: the button is then not shown. */
  onNewProject?: () => void;
  account?: ReactNode;
  /** Click on a link to « Mes projets » (brand or navigation), e.g. to save before leaving. */
  onProjectsLink?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Inside a project (project-description.md § 4.1): « Mes projets » is not the current page and
   * the navigation stays visible at every width, being the way back to the list.
   */
  inProject?: boolean;
}) {
  return (
    <header
      className={`flex h-16 items-center border-b border-line bg-surface px-4 lg:px-8 ${
        inProject ? "gap-4 sm:gap-8" : "gap-8"
      }`}
    >
      <Link
        href="/projets"
        onClick={onProjectsLink}
        className={`rounded text-lg font-semibold text-primary ${focusRing}`}
      >
        Tracea
      </Link>
      <nav aria-label="Navigation principale" className={inProject ? undefined : "hidden sm:block"}>
        <Link
          href="/projets"
          onClick={onProjectsLink}
          aria-current={inProject ? undefined : "page"}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ${
            inProject ? "hover:bg-paper" : "bg-paper"
          } ${focusRing}`}
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
