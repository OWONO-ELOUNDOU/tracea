# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versionnage sémantique.

## [Unreleased]

### Added

- Monorepo pnpm + Turborepo avec configuration ESLint, Prettier et TypeScript partagée.
- Paquet `@tracea/domain` : schéma Zod de `BuildingModel` 1.0, export JSON Schema, invariants structurels, métriques recalculables, fixture de référence `house-rectangular`.
- API Fastify : configuration validée, en-têtes de sécurité, limitation de débit, erreurs Problem Details, `GET /health`, `GET /v1/openapi.json`.
- Application web Next.js : page d'accueil, jetons de design provisoires.
- Moteur Python `tracea_engine` : modèle Pydantic miroir, géométrie légère, invariants identiques au paquet TypeScript, tests de contrat sur les fixtures.
- Environnement local Docker Compose, images `web`, `api`, `engine`, pipeline CI (lint, test, contract, build, security).
- Définition des rôles du workflow (`.claude/agents/`) et guide du dépôt (`CLAUDE.md`).
