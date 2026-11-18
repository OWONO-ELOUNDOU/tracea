# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versionnage sémantique.

## [Unreleased]

### Security

- Limites de débit : l'adresse du client n'est plus lue dans `X-Forwarded-For` envoyé par n'importe qui. Nouvelle variable `TRUST_PROXY` (vide par défaut : aucun mandataire de confiance) listant les adresses ou plages CIDR des mandataires inverses ; `true`, `*`, `0.0.0.0/0`, `::/0` et les nombres sont refusés au démarrage (S2-SEC-01).
- Redirection après connexion (`suivant`) : seuls les chemins de l'application sont acceptés ; URL externes, barres obliques inverses et caractères de contrôle ramènent à « Mes projets » (S2-SEC-02).
- CI : jeton GitHub en lecture seule (`permissions: contents: read`, `pull-requests: read` pour l'analyse des secrets) (S2-SEC-11, partiel).

### Added

- Exploitation : tâche de purge quotidienne (service compose `purge` sous le profil `maintenance`, procédure de planification), `TRUST_PROXY` imposé vide dans compose.
- Projets (CU-02, EF-101, EF-102) : tables `projects` et `versions` (migration `0001_projects`), routes `GET`/`POST /projects`, `GET`/`PATCH`/`DELETE /projects/{id}`, `POST /projects/{id}/duplicate` avec pagination par curseur, suppression logique (corbeille de 30 jours), duplication avec la version courante, isolation par propriétaire (404 `PROJECT_NOT_FOUND` indiscernable), journal d'audit ; document OpenAPI complété.
- Écran « Mes projets » (`/projets`) aligné sur la maquette (écran 01) : liste paginée par curseur, création, renommage, duplication et suppression avec confirmation, états de chargement, vide et erreur, utilisation complète au clavier, noms accessibles contenant le texte visible (WCAG 2.5.3) ; client web des routes `/projects` ; tests de composants (Vitest, Testing Library).
- Purge quotidienne (D7) : commande `pnpm --filter @tracea/api purge` (`node dist/maintenance/cli.js`), à lancer une fois par jour par un planificateur externe ; supprime les sessions expirées et les projets en corbeille depuis plus de 30 jours avec leurs versions, journalise les deux compteurs et sort avec un code non nul en cas d'échec.
- Tests de bout en bout « Mes projets » : connexion, création d'un projet persistante après rechargement, analyse d'accessibilité WCAG 2 A/AA de `/connexion` et `/projets` (vide, dialogue ouvert, avec un projet), isolation entre deux comptes (liste et accès direct par l'API en 404).
- Tests de bout en bout : outillage Playwright + axe-core (paquet `e2e/`, commande `pnpm e2e`, API sur base embarquée avec comptes vérifiés insérés au démarrage, analyse WCAG 2 A/AA) et job CI `e2e` (Chromium) ; `eslint` rendu accessible aux scripts de lint des paquets sous pnpm 10 (`.npmrc`).
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

### Changed

- Tests de bout en bout : la pile lance le serveur standalone de l'application web, comme l'image `web` ; racine de traçage Next.js fixée (`outputFileTracingRoot`).
