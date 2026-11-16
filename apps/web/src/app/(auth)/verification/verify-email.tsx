"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard, Message } from "@/components/auth/auth-card";
import { SubmitButton, TextField } from "@/components/auth/fields";
import { api, errorMessage } from "@/lib/api";

type State = "pending" | "verified" | "invalid";

export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token.length === 0 ? "invalid" : "pending");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token.length === 0) return;
    api
      .verifyEmail(token)
      .then(() => setState("verified"))
      .catch(() => setState("invalid"));
  }, [token]);

  async function resend(event: { preventDefault(): void }) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.resendVerification(email);
      setResent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  if (state === "pending") {
    return (
      <AuthCard title="Vérification en cours">
        <p role="status">Un instant…</p>
      </AuthCard>
    );
  }

  if (state === "verified") {
    return (
      <AuthCard title="Adresse vérifiée">
        <Message kind="success">Votre compte est activé.</Message>
        <Link
          href="/connexion"
          className="block h-10 rounded-lg bg-primary text-center font-medium leading-10 text-white"
        >
          Se connecter
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Lien invalide" intro="Ce lien n'est plus valide. Recevez-en un nouveau.">
      {error ? <Message kind="error">{error}</Message> : null}
      {resent ? (
        <Message kind="success">
          Si un compte non vérifié existe pour cette adresse, un nouveau lien a été envoyé.
        </Message>
      ) : (
        <form onSubmit={(event) => void resend(event)} noValidate>
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <SubmitButton pending={sending} pendingLabel="Envoi…">
            Recevoir un nouveau lien
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
