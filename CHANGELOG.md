# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versionnage sémantique.

## [Unreleased]

### Added

- Authentification (CU-01) : inscription avec vérification d'e-mail, connexion par session serveur (cookie signé `HttpOnly`), déconnexion simple et globale, réinitialisation du mot de passe, profil `/me` ; Argon2id, CSRF par double soumission, limitation de débit sur les routes sensibles, journal d'audit.
- Base de données PostgreSQL via Drizzle (tables `users`, `sessions`, `email_tokens`, `audit_log`) et migrations versionnées ; tests d'intégration sur PostgreSQL embarqué.
- Envoi d'e-mails (port `Mailer`, adaptateur SMTP) avec gabarits de vérification et de réinitialisation.
- Pages web connexion, inscription, mot de passe oublié, réinitialisation, vérification ; page « Mes projets » provisoire ; jetons de couleur des fondations v0.1.
- Documents de référence versés dans `docs/specs/reference/`.

- Monorepo pnpm + Turborepo avec configuration ESLint, Prettier et TypeScript partagée.
- Paquet `@tracea/domain` : schéma Zod de `BuildingModel` 1.0, export JSON Schema, invariants structurels, métriques recalculables, fixture de référence `house-rectangular`.
- API Fastify : configuration validée, en-têtes de sécurité, limitation de débit, erreurs Problem Details, `GET /health`, `GET /v1/openapi.json`.
- Application web Next.js : page d'accueil, jetons de design provisoires.
- Moteur Python `tracea_engine` : modèle Pydantic miroir, géométrie légère, invariants identiques au paquet TypeScript, tests de contrat sur les fixtures.
- Environnement local Docker Compose, images `web`, `api`, `engine`, pipeline CI (lint, test, contract, build, security).
- Définition des rôles du workflow (`.claude/agents/`) et guide du dépôt (`CLAUDE.md`).
