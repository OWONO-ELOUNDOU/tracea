"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { ProjectDescriptionScreen } from "./project-description-screen";

/** Binds the screen to the real API client and the Next.js router. */
export function ProjectDescriptionRoute({ projectId }: { projectId: string }) {
  const router = useRouter();
  const navigate = useMemo(
    () => ({
      replace: (href: string) => router.replace(href),
      push: (href: string) => router.push(href),
    }),
    [router],
  );
  // Keyed by project: opening another project (creation from this screen) starts afresh.
  return (
    <ProjectDescriptionScreen
      key={projectId}
      projectId={projectId}
      client={api}
      navigate={navigate}
    />
  );
}
