# Tracea — Guide du dépôt

Tracea est une application web qui génère, à partir d'une description, les plans architecturaux 2D et 3D d'un bâtiment et les exporte dans les formats du métier (DXF, PDF, SVG, PNG, IFC, glTF, OBJ).

## Règle de présentation (non négociable)

Tout ce qui sort de ce dépôt — code, commentaires, interface, documentation, commits, PR, tickets — est le travail de l'équipe Tracea. Aucune mention d'assistant, de modèle, d'outil de génération de texte ou de signature automatique n'y figure. Dans l'application, le moteur de génération s'appelle « le moteur Tracea » ou « génération automatique ». Les commits n'ont ni ligne `Co-Authored-By` ni lien de session.

## Structure

```
apps/web          Next.js — interface
apps/api          Fastify — API, orchestration des tâches
packages/domain   BuildingModel : schéma Zod, invariants, métriques (source de vérité)
packages/config   ESLint, Prettier, tsconfig partagés
engine/           tracea_engine (Python) : interprétation, solveur, géométrie, rendus, exports
infra/            Dockerfiles, compose, déploiement
docs/             documentation technique versionnée
.claude/agents/   rôles du workflow
```

Règles de dépendance : `domain` ne dépend de rien ; `rendering-*`, `export`, `api`, `web` dépendent de `domain`, jamais l'inverse ; aucune logique métier dans `apps/web`.

## Commandes

```
pnpm install                 # dépendances TypeScript
pnpm lint                    # ESLint + Prettier
pnpm typecheck               # tsc --noEmit sur tous les paquets
pnpm test                    # Vitest
pnpm contract                # fixtures BuildingModel validées par Zod et Pydantic
cd engine && uv sync && uv run pytest
docker compose up            # environnement local complet
```

## Conventions

- TypeScript strict, pas de `any` non justifié ; Python typé (mypy strict sur `tracea_engine`).
- Unités internes : millimètres entiers ; angles en degrés ; surfaces en mm².
- Langue : français pour l'interface, la documentation et les échanges ; anglais pour le code, les commits (Conventional Commits) et les commentaires techniques.
- Commenter uniquement ce qui n'est pas évident.
- Branches : `main`, `develop`, `feature/<nom>`, `fix/<nom>`.

## Workflow

Toute tâche suit la chaîne de rôles décrite dans `.claude/agents/` : planificateur → designer → frontend / backend → QA → sécurité → devops → réviseur technique. Chaque rôle laisse un résultat vérifiable (spécification, code testé, rapport). Le périmètre fixé par le planificateur ne change pas sans le signaler.

## Documents de référence

`docs/sprint-0-plan.md`, cahier des charges, dossier d'architecture, spécification du modèle et des exports, spécification API et plan de qualité (dans l'espace documentaire du projet ; à verser dans `docs/` au sprint 1).
