"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Message } from "@/components/auth/auth-card";
import { Dialog, DialogActions } from "./dialog";
import type { ActionOutcome } from "./outcome";
import { dangerButton, secondaryButton } from "./styles";
import { texts } from "./texts";
import { useMounted } from "./use-mounted";

/** Deletion confirmation (§ 7.4); the project goes to the 30-day trash on the API side. */
export function DeleteProjectDialog({
  projectName,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  onConfirm: () => Promise<ActionOutcome>;
  onCancel: () => void;
}) {
  const textId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (error !== null) bodyRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [error]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    const outcome = await onConfirm();
    if (!mounted.current || outcome.kind === "done") return;
    setPending(false);
    setError({ text: outcome.message });
  }

  return (
    <Dialog
      title={texts.deleteTitle}
      role="alertdialog"
      describedBy={textId}
      initialFocus={() => cancelRef.current}
      onCancel={onCancel}
      busy={pending}
    >
      <div ref={bodyRef}>
        {error === null ? null : <Message kind="error">{error.text}</Message>}
        <p id={textId} className="text-sm">
          {texts.deleteBody(projectName)}
        </p>
        <DialogActions>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={secondaryButton}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            className={dangerButton}
          >
            {pending ? "Suppression…" : "Supprimer le projet"}
          </button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
