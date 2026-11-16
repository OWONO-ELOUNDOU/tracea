"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type PublicUser } from "@/lib/api";

/** Placeholder for « Mes projets » (sprint 2); for now it only proves the session works. */
export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    api
      .me()
      .then((response) => setUser(response.user))
      .catch(() => router.replace("/connexion?suivant=/projets"));
  }, [router]);

  if (user === null) {
    return (
      <main className="px-6 py-16">
        <p role="status">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold">Mes projets</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink/70">{user.displayName ?? user.email}</span>
          <button
            type="button"
            onClick={() => void api.logout().then(() => router.push("/connexion"))}
            className="h-9 rounded-lg border border-line px-3 hover:bg-paper"
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <p className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-ink/70">
        Aucun projet pour le moment. La création de projet arrive avec la prochaine version.
      </p>
    </main>
  );
}
