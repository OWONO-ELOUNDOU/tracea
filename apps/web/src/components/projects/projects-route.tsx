"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { ProjectsScreen } from "./projects-screen";

/** Binds the screen to the real API client and the Next.js router. */
export function ProjectsRoute() {
  const router = useRouter();
  const navigate = useMemo(
    () => ({
      replace: (href: string) => router.replace(href),
      push: (href: string) => router.push(href),
    }),
    [router],
  );
  return <ProjectsScreen client={api} navigate={navigate} />;
}
