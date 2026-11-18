import type { RefObject } from "react";
import { primaryButton, secondaryButton } from "./styles";
import { texts } from "./texts";

export const gridClass = "grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3";

export function LoadingState() {
  return (
    <div className="mt-6">
      <p role="status" className="text-sm text-ink/70">
        Chargement de vos projets…
      </p>
      <div aria-hidden="true" className={`mt-6 ${gridClass}`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-[316px] rounded-xl border border-line bg-surface motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
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
      <h2 className="text-lg font-semibold">Impossible d&apos;afficher vos projets</h2>
      <p className="mt-2 text-sm">{message}</p>
      <button ref={retryRef} type="button" onClick={onRetry} className={`${primaryButton} mt-4`}>
        Réessayer
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold">Aucun projet pour le moment</h2>
      <p className="mt-1 text-ink/70">{texts.emptyBody}</p>
    </div>
  );
}

export function LoadMoreButton({
  pending,
  buttonRef,
  onClick,
}: {
  pending: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        // aria-disabled keeps the focus on the button during the call (§ 6.5).
        aria-disabled={pending ? true : undefined}
        onClick={() => {
          if (!pending) onClick();
        }}
        className={`${secondaryButton} w-full sm:w-auto`}
      >
        {pending ? "Chargement…" : "Afficher plus de projets"}
      </button>
    </div>
  );
}
