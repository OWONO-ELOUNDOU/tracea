"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, Message } from "@/components/auth/auth-card";
import { SubmitButton, TextField } from "@/components/auth/fields";
import { api, errorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.forgotPassword(email);
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      intro="Nous vous enverrons un lien pour en choisir un nouveau."
    >
      {error ? <Message kind="error">{error}</Message> : null}
      {done ? (
        <Message kind="success">
          Si un compte existe pour cette adresse, un e-mail vient d&apos;être envoyé.
        </Message>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate>
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <SubmitButton pending={pending} pendingLabel="Envoi…">
            Envoyer le lien
          </SubmitButton>
        </form>
      )}
      <nav className="mt-6 text-sm">
        <Link href="/connexion" className="text-primary underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </nav>
    </AuthCard>
  );
}
