"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard, Message } from "@/components/auth/auth-card";
import { PasswordField, SubmitButton, TextField } from "@/components/auth/fields";
import { api, errorCode, errorMessage } from "@/lib/api";

function safeNext(value: string | null): string {
  return value !== null && value.startsWith("/") && !value.startsWith("//") ? value : "/projets";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setUnverified(false);
    try {
      await api.login(email, password);
      router.push(safeNext(params.get("suivant")));
    } catch (caught) {
      setError(errorMessage(caught));
      setUnverified(errorCode(caught) === "EMAIL_NOT_VERIFIED");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    await api.resendVerification(email);
    setResent(true);
  }

  return (
    <AuthCard title="Connexion" intro="Accédez à vos projets et à vos plans.">
      {error ? <Message kind="error">{error}</Message> : null}
      {resent ? <Message kind="success">E-mail de vérification renvoyé.</Message> : null}
      <form onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <SubmitButton pending={pending} pendingLabel="Connexion…">
          Se connecter
        </SubmitButton>
      </form>
      {unverified ? (
        <button
          type="button"
          onClick={() => void resend()}
          className="mt-3 w-full text-sm text-primary underline-offset-4 hover:underline"
        >
          Renvoyer l&apos;e-mail de vérification
        </button>
      ) : null}
      <nav className="mt-6 flex flex-col gap-2 text-sm">
        <Link
          href="/mot-de-passe-oublie"
          className="text-primary underline-offset-4 hover:underline"
        >
          Mot de passe oublié ?
        </Link>
        <Link href="/inscription" className="text-primary underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </nav>
    </AuthCard>
  );
}
