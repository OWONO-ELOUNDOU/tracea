import { useId } from "react";
import { focusRing } from "./styles";

/**
 * The hint sentence sits outside the button (WCAG 2.5.3: every visible text of a control must be in
 * its name) and is stacked over it in the same grid cell. Spacers of identical heights keep both
 * columns centred alike, so the tile looks like a single block.
 */
export function NewProjectTile({ onClick }: { onClick: (trigger: HTMLButtonElement) => void }) {
  const hintId = useId();
  return (
    <div className="grid h-full min-h-[316px]">
      <button
        type="button"
        aria-describedby={hintId}
        onClick={(event) => onClick(event.currentTarget)}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface p-4 [grid-area:1/1] hover:bg-paper ${focusRing}`}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center text-4xl leading-none text-primary"
        >
          +
        </span>
        <span className="mt-3 text-sm font-medium">Nouveau projet</span>
        <span aria-hidden="true" className="mt-3 h-4" />
      </button>
      <div className="pointer-events-none flex flex-col items-center justify-center p-4 text-center [grid-area:1/1]">
        <span aria-hidden="true" className="h-12" />
        <span aria-hidden="true" className="mt-3 h-5" />
        <p id={hintId} className="mt-3 text-xs leading-4 text-ink/70">
          Décrivez, générez, exportez
        </p>
      </div>
    </div>
  );
}
