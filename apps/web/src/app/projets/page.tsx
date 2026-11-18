import type { Metadata } from "next";
import { ProjectsRoute } from "@/components/projects/projects-route";

export const metadata: Metadata = {
  title: "Mes projets — Tracea",
};

export default function ProjectsPage() {
  return <ProjectsRoute />;
}
