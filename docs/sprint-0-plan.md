# Sprint 0 — Amorçage du dépôt

| Champ     | Valeur                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Rôle      | Planificateur                                                                                                  |
| Date      | 16 novembre 2026                                                                                               |
| Référence | Dossier d'architecture technique v1.0, Spécification du modèle v1.0, Spécification API et plan de qualité v1.0 |

## Objectif

Disposer d'un monorepo qui s'installe, se vérifie (lint, typage, tests) et se lance en local, avec le schéma `BuildingModel` 1.0 comme contrat partagé entre TypeScript et Python. Aucune fonctionnalité métier n'est livrée dans ce sprint ; il fixe le socle sur lequel les sprints suivants s'appuient.

## Découpage

| #     | Tâche                                                                              | Rôle     | Fichiers                                                                     | Critères d'acceptation                                                                                     |
| ----- | ---------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| S0-1  | Définition des rôles du workflow                                                   | Designer | `CLAUDE.md`, `.claude/agents/*.md`                                           | Un fichier par rôle, périmètre et livrable attendu explicites, règle de présentation rappelée              |
| S0-2  | Monorepo pnpm + Turborepo, configuration partagée                                  | Backend  | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `packages/config/*`     | `pnpm install` et `pnpm lint typecheck test` passent                                                       |
| S0-3  | Paquet `domain` : schéma Zod de `BuildingModel` 1.0, invariants de base, métriques | Backend  | `packages/domain/src/*`, `packages/domain/schema/building-model.schema.json` | Fixture `house-rectangular.json` validée ; invariants murs/ouvertures/niveaux testés ; JSON Schema exporté |
| S0-4  | API Fastify : démarrage, `/health`, `/v1/openapi.json`, en-têtes de sécurité       | Backend  | `apps/api/*`                                                                 | Démarre sans base ; `/health` répond 200 ; helmet et limitation de débit actifs                            |
| S0-5  | Application web Next.js : page d'accueil, design tokens de base                    | Frontend | `apps/web/*`                                                                 | `pnpm --filter web build` passe ; page en français, aucun texte de substitution anglophone                 |
| S0-6  | Moteur Python : modèle Pydantic miroir, chargement de fixture, validation          | Backend  | `engine/*`                                                                   | `pytest` passe ; la même fixture est acceptée par Zod et Pydantic (test de contrat)                        |
| S0-7  | Conteneurs et compose local                                                        | DevOps   | `infra/*`, `docker-compose.yml`                                              | `docker compose config` valide ; services web, api, worker, postgres, redis, minio, mailpit                |
| S0-8  | CI GitHub Actions                                                                  | DevOps   | `.github/workflows/ci.yml`                                                   | Jobs lint, test, contract, security ; aucun secret requis                                                  |
| S0-9  | Sécurité du socle                                                                  | Sécurité | `.env.example`, `.gitignore`, CI `security`                                  | Aucun secret versionné ; analyse de secrets en CI ; dépendances auditées                                   |
| S0-10 | Revue finale                                                                       | Réviseur | tout                                                                         | Conformité à la règle de présentation, aux règles de dépendance entre paquets, au nommage                  |

## Hors périmètre du sprint 0

- Interprétation des descriptions, solveur, rendus, exports.
- Authentification et persistance (la base est déclarée dans compose, pas encore utilisée par l'API).
- Conformité aux maquettes Stitch : les maquettes ne sont pas encore versionnées dans le dépôt ; voir `docs/design-notes.md`.

## Risques identifiés

- Décision Fastify / FastAPI (architecture § 10.1) toujours ouverte : le sprint 0 part sur Fastify, la bascule reste possible tant que l'API se limite à l'orchestration.
- IfcOpenShell n'est pas installé dans le sprint 0 (binaire lourd) ; le paquet Python le déclare en dépendance optionnelle `export`.

## Ordre d'exécution

S0-1 → S0-2 → S0-3 → S0-4 / S0-5 / S0-6 (parallèle) → S0-7 → S0-8 → S0-9 → S0-10.
