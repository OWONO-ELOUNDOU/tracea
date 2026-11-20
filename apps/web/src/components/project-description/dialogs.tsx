"use client";

import { useId, useRef, useState } from "react";
import { Message } from "@/components/auth/auth-card";
import { Dialog, DialogActions } from "@/components/projects/dialog";
import { dangerButton, secondaryButton } from "@/components/projects/styles";
import { useMounted } from "@/components/projects/use-mounted";
import { DESCRIPTION_EXAMPLES } from "./examples";
import { texts } from "./texts";

/**
 * Confirmation with « Annuler » focused first. `onConfirm` may be asynchronous: the action then
 * shows `pendingLabel` and an error message comes back at the top of the dialog.
 */
export function ConfirmDialog({
  title,
  body,
  cancelLabel = texts.cancel,
  confirmLabel,
  pendingLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  pendingLabel?: string;
  /**
   * Synchronous action (`null`), or a call resolving to an error message to show, or to `null`
   * when the screen has taken over.
   */
  onConfirm: () => Promise<string | null> | null;
  onCancel: () => void;
}) {
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();

  async function confirm() {
    if (pending) return;
    const result = onConfirm();
    if (result === null) return;
    setPending(true);
    setError(null);
    const message = await result;
    if (!mounted.current) return;
    setPending(false);
    setError(message);
  }

  return (
    <Dialog
      title={title}
      role="alertdialog"
      describedBy={bodyId}
      initialFocus={() => cancelRef.current}
      onCancel={onCancel}
      busy={pending}
    >
      {error === null ? null : <Message kind="error">{error}</Message>}
      <p id={bodyId} className="text-sm">
        {body}
      </p>
      <DialogActions>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={secondaryButton}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={pending}
          className={dangerButton}
        >
          {pending && pendingLabel !== undefined ? pendingLabel : confirmLabel}
        </button>
      </DialogActions>
    </Dialog>
  );
}

/** Three description examples (spec § 6.6). */
export function ExamplesDialog({
  focusIndex = 0,
  onUse,
  onClose,
}: {
  /** Example whose button gets the focus on opening (back from the replace confirmation). */
  focusIndex?: number;
  onUse: (index: number) => void;
  onClose: () => void;
}) {
  const introId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog
      title={texts.examplesTitle}
      describedBy={introId}
      initialFocus={() =>
        listRef.current?.querySelectorAll<HTMLElement>("button")[focusIndex] ?? null
      }
      onCancel={onClose}
      busy={false}
      maxWidthClass="max-w-[640px]"
    >
      <p id={introId} className="text-sm text-ink/70">
        {texts.examplesIntro}
      </p>
      <div ref={listRef} className="mt-4 divide-y divide-line">
        {DESCRIPTION_EXAMPLES.map((example, index) => (
          <div key={example.title} className="py-4">
            <h3 className="text-sm font-semibold">{example.title}</h3>
            <p className="mt-2 text-sm leading-[22px]">{example.text}</p>
            <button
              type="button"
              aria-label={texts.useExampleLabel(example.title)}
              onClick={() => onUse(index)}
              className={`${secondaryButton} mt-3`}
            >
              {texts.useExample}
            </button>
          </div>
        ))}
      </div>
      <DialogActions>
        <button type="button" onClick={onClose} className={secondaryButton}>
          {texts.close}
        </button>
      </DialogActions>
    </Dialog>
  );
}
