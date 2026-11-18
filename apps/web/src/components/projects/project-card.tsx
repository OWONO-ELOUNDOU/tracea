import { useId } from "react";
import type { ProjectSummary } from "@/lib/api";
import { ProjectActionsMenu } from "./project-actions-menu";
import { RelativeDate } from "./relative-date";

export function ProjectCard({
  project,
  now,
  busy,
  actionsButtonRef,
  onRename,
  onDuplicate,
  onDelete,
}: {
  project: ProjectSummary;
  now: Date;
  busy: boolean;
  actionsButtonRef: (element: HTMLButtonElement | null) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const titleId = useId();
  const version = project.currentVersion;
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full min-h-[316px] flex-col rounded-xl border border-line bg-surface"
    >
      {/* Thumbnail slot: `thumbnailUrl` is always null in this release. */}
      <div aria-hidden="true" className="h-[180px] rounded-t-xl border-b border-line bg-paper" />
      <div className="flex flex-1 flex-col p-4">
        <h2 id={titleId} className="text-base font-semibold leading-6 [overflow-wrap:anywhere]">
          {project.name}
        </h2>
        {version === null ? (
          <p className="mt-2 text-xs leading-4 text-ink/70">Aucun plan généré</p>
        ) : null}
        <div className="mt-auto flex min-h-[46px] items-end justify-between gap-2 pt-2">
          <RelativeDate
            iso={project.updatedAt}
            now={now}
            prefix={version === null ? "Modifié" : `Version ${version.number} · modifié`}
          />
          <ProjectActionsMenu
            projectName={project.name}
            busy={busy}
            buttonRef={actionsButtonRef}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </article>
  );
}
