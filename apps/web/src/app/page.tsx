import { SCHEMA_VERSION } from "@tracea/domain";

const EXPORT_FORMATS = ["DXF", "PDF", "SVG", "PNG", "IFC", "glTF", "OBJ"] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Tracea</p>
        <h1 className="text-4xl font-semibold leading-tight">
          De la description aux plans d&apos;architecte
        </h1>
        <p className="text-lg text-ink/80">
          Décrivez votre maison ou votre immeuble ; le moteur Tracea produit le plan de masse, les
          plans de niveaux, les coupes, les façades et la maquette 3D, prêts à être exportés.
        </p>
      </header>

      <section aria-labelledby="formats-title" className="flex flex-col gap-3">
        <h2 id="formats-title" className="text-xl font-semibold">
          Formats d&apos;export
        </h2>
        <ul className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((format) => (
            <li key={format} className="rounded border border-ink/20 px-3 py-1 text-sm font-medium">
              {format}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-ink/60">
        Modèle de bâtiment, schéma version {SCHEMA_VERSION}. Document d&apos;esquisse — ne vaut pas
        plan d&apos;exécution.
      </footer>
    </main>
  );
}
