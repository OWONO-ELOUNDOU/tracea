import type { Metadata } from "next";
import { ProjectDescriptionRoute } from "@/components/project-description/project-description-route";

// `null` cancels the default title of the root layout for this route only: the screen renders its
// own <title> (project name, « Projet introuvable »), so the two never compete for the document.
export const metadata: Metadata = { title: null };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDescriptionRoute projectId={id} />;
}
