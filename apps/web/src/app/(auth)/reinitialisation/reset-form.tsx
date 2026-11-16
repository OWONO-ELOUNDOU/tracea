"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard, Message } from "@/components/auth/auth-card";
import { PasswordField, SubmitButton, passwordStrength } from "@/components/auth/fields";
import { api, errorCode, errorMessage } from "@/lib/api";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(token.length === 0);
  const [done, setDone] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
      if (errorCode(caught) === "TOKEN_INVALID") setInvalidLink(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Mot de passe modifié">
        <Message kind="success">Toutes vos sessions ont été fermées.</Message>
        <Link
          href="/connexion"
          className="block h-10 rounded-lg bg-primary text-center font-medium leading-10 text-white"
        >
          Se connecter
        </Link>
      </AuthCard>
    );
  }

  if (invalidLink) {
    return (
      <AuthCard title="Nouveau mot de passe">
        <Message kind="error">Ce lien n&apos;est plus valide.</Message>
        <Link
          href="/mot-de-passe-oublie"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nouveau mot de passe">
      {error ? <Message kind="error">{error}</Message> : null}
      <form onSubmit={(event) => void submit(event)} noValidate>
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          required
          help={`12 caractères minimum${passwordStrength(password) ? ` · ${passwordStrength(password)}` : ""}`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <SubmitButton pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
