import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "./verify-email";

export const metadata: Metadata = { title: "Vérification de l'adresse — Tracea" };

export default function VerificationPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
