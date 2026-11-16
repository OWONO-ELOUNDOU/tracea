"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, Message } from "@/components/auth/auth-card";
import { PasswordField, SubmitButton, TextField, passwordStrength } from "@/components/auth/fields";
import { ApiError, api, errorMessage } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!accepted) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await api.register(email, password);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError && caught.problem.fields)
        setFieldErrors(caught.problem.fields);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Vérifiez votre boîte de réception">
        <p>
          Nous avons envoyé un lien de vérification à <strong>{email}</strong>. Il expire dans 24
          heures.
        </p>
        {resent ? <Message kind="success">E-mail renvoyé.</Message> : null}
        <button
          type="button"
          onClick={() => void api.resendVerification(email).then(() => setResent(true))}
          className="mt-6 text-sm text-primary underline-offset-4 hover:underline"
        >
          Renvoyer l&apos;e-mail
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Créer un compte" intro="Décrivez votre projet, obtenez vos plans.">
      {error ? <Message kind="error">{error}</Message> : null}
      <form onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="new-password"
          required
          help={`12 caractères minimum${passwordStrength(password) ? ` · ${passwordStrength(password)}` : ""}`}
          value={password}
          error={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label className="mb-6 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1"
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" className="text-primary underline-offset-4 hover:underline">
              conditions d&apos;utilisation
            </Link>
            .
          </span>
        </label>
        <SubmitButton pending={pending} pendingLabel="Création…">
          Créer mon compte
        </SubmitButton>
      </form>
      <nav className="mt-6 text-sm">
        <Link href="/connexion" className="text-primary underline-offset-4 hover:underline">
          J&apos;ai déjà un compte
        </Link>
      </nav>
    </AuthCard>
  );
}
