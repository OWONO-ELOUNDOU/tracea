"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { Message } from "@/components/auth/auth-card";
import { SubmitButton, TextField } from "@/components/auth/fields";
import { Dialog, DialogActions } from "./dialog";
import type { ActionOutcome } from "./outcome";
import { focusRing, secondaryButton } from "./styles";
import { useMounted } from "./use-mounted";

const LABELS = {
  create: {
    title: "Nouveau projet",
    submit: "Créer le projet",
    pending: "Création…",
  },
  rename: {
    title: "Renommer le projet",
    submit: "Enregistrer",
    pending: "Enregistrement…",
  },
} as const;

/** Creation and renaming dialog (§ 7.1, § 7.2). The name is never checked here: the API decides. */
export function ProjectNameDialog({
  mode,
  initialName = "",
  onSubmit,
  onCancel,
}: {
  mode: "create" | "rename";
  initialName?: string;
  onSubmit: (name: string) => Promise<ActionOutcome>;
  onCancel: () => void;
}) {
  const labels = LABELS[mode];
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: "field" | "message" } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useMounted();

  const input = () =>
    formRef.current?.querySelector<HTMLInputElement>('input[name="name"]') ?? null;

  useEffect(() => {
    if (focusRequest === null) return;
    const target =
      focusRequest.target === "field"
        ? input()
        : formRef.current?.querySelector<HTMLElement>('[role="alert"]');
    target?.focus();
  }, [focusRequest]);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    const outcome = await onSubmit(name);
    if (!mounted.current || outcome.kind === "done") return;
    setPending(false);
    if (outcome.kind === "fieldError") {
      setFieldError(outcome.message);
      setFocusRequest({ target: "field" });
    } else {
      setFormError(outcome.message);
      setFocusRequest({ target: "message" });
    }
  }

  return (
    <Dialog title={labels.title} initialFocus={input} onCancel={onCancel} busy={pending}>
      <form ref={formRef} noValidate onSubmit={(event) => void handleSubmit(event)}>
        {formError === null ? null : <Message kind="error">{formError}</Message>}
        <TextField
          label="Nom du projet"
          type="text"
          name="name"
          autoComplete="off"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFieldError(undefined);
          }}
          help="120 caractères maximum."
          error={fieldError}
        />
        <DialogActions>
          <button type="button" onClick={onCancel} disabled={pending} className={secondaryButton}>
            Annuler
          </button>
          <SubmitButton
            pending={pending}
            pendingLabel={labels.pending}
            className={`h-10 px-4 text-sm ${focusRing}`}
          >
            {labels.submit}
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
