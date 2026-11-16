import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <header className="mb-10 flex w-full max-w-[400px] items-center justify-between">
        <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-primary">
          Tracea
        </Link>
        <Link href="/" className="text-sm text-ink/70 underline-offset-4 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </header>
      <section className="w-full max-w-[400px] rounded-xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-[28px] font-semibold leading-9">{title}</h1>
        {intro === undefined ? null : <p className="mt-2 text-ink/70">{intro}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function Message({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error" ? "border-danger/40 bg-danger/5 text-danger" : "border-ok/40 bg-ok/5 text-ok";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      tabIndex={-1}
      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${styles}`}
    >
      {kind === "error" ? "⚠ " : "✓ "}
      {children}
    </div>
  );
}
