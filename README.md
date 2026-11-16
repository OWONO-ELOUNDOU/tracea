# Tracea

Tracea génère, à partir d'une description, les plans architecturaux 2D et 3D d'un bâtiment (plan de masse, plans de niveaux, coupes, façades, maquette) et les exporte dans les formats du métier : DXF, PDF, SVG, PNG, IFC, glTF, OBJ.

## Prérequis

- Node.js 22, pnpm 10
- Python 3.12 et [uv](https://docs.astral.sh/uv/)
- Docker (environnement local complet)

## Démarrage

```
pnpm install
cd engine && uv sync && cd ..
cp .env.example .env
pnpm dev                   # web sur :3000, api sur :3001
```

Environnement complet (base, file, stockage, e-mail) : `docker compose up --build`.

## Vérifications

```
pnpm lint && pnpm typecheck && pnpm test
pnpm contract              # fixtures BuildingModel : Zod ⇄ JSON Schema ⇄ Pydantic
cd engine && uv run ruff check . && uv run mypy && uv run pytest
```

## Organisation

| Dossier           | Rôle                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/web`        | Interface (Next.js)                                                          |
| `apps/api`        | API (Fastify) : comptes, projets, orchestration des tâches                   |
| `packages/domain` | `BuildingModel` : schéma, invariants, métriques — source de vérité           |
| `packages/config` | Configuration ESLint, Prettier, TypeScript partagée                          |
| `engine`          | Moteur Tracea (Python) : interprétation, solveur, géométrie, rendus, exports |
| `infra`           | Dockerfiles, compose, déploiement                                            |
| `docs`            | Plans de sprint, spécifications, rapports QA / sécurité / exploitation       |

Les conventions de travail sont décrites dans `CLAUDE.md`.

## Licence

Propriétaire — tous droits réservés.
