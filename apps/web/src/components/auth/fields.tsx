"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  help?: string;
  error?: string;
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-danger";

export function TextField({ label, help, error, ...props }: FieldProps) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-ink/70">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({ label, help, error, ...props }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={inputClass}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="h-10 shrink-0 rounded-lg border border-line px-3 text-sm hover:bg-paper"
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
      {help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-ink/70">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel,
}: {
  children: string;
  pending: boolean;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 w-full rounded-lg bg-primary font-medium text-white hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function passwordStrength(password: string): string {
  if (password.length === 0) return "";
  if (password.length < 12) return "Trop court";
  if (password.length < 16) return "Acceptable";
  return "Solide";
}
