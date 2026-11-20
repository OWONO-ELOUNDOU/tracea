# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versionnage sémantique.

## [Unreleased]

### Security

- Limites de débit : l'adresse du client n'est plus lue dans `X-Forwarded-For` envoyé par n'importe qui. Nouvelle variable `TRUST_PROXY` (vide par défaut : aucun mandataire de confiance) listant les adresses ou plages CIDR des mandataires inverses ; `true`, `*`, `0.0.0.0/0`, `::/0` et les nombres sont refusés au démarrage (S2-SEC-01).
- Redirection après connexion (`suivant`) : seuls les chemins de l'application sont acceptés ; URL externes, barres obliques inverses et caractères de contrôle ramènent à « Mes projets » (S2-SEC-02).
- CI : jeton GitHub en lecture seule (`permissions: contents: read`, `pull-requests: read` pour l'analyse des secrets) (S2-SEC-11, partiel).
- CI : chaque action GitHub épinglée par empreinte de commit complète avec sa version en commentaire, mises à jour hebdomadaires groupées par Dependabot (`github-actions`) ; le service compose `purge` ne reçoit plus que `DATABASE_URL` et `LOG_LEVEL` (S2-SEC-11, S3-9).
- API : erreurs de requête du cadriciel renvoyées en Problem Details français (`INVALID_BODY`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_ERROR`) sans détail interne ; réponses 422 limitées à 20 entrées `fields`, clés coupées à 64 caractères ; `TRUST_PROXY=false` refusé au démarrage avec un message explicite (S2-SEC-05, S2-SEC-06, A10).
- Application web : en-têtes de sécurité sur toutes les pages (CSP avec `frame-ancestors 'none'` et `connect-src` limité à l'API, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, HSTS en production) ; le fragment d'une adresse de retour interne est conservé après connexion (S2-SEC-03, A11).
- Retour après connexion : les segments « . » et « .. » ne permettent plus de rediriger vers un autre site, le chemin rendu étant lui-même contrôlé (S3-SEC-01).
- Purge : la commande ne lit plus que `DATABASE_URL` (obligatoire) et `LOG_LEVEL`, sans `SESSION_SECRET` (S2-SEC-08) ; elle supprime aussi les jetons d'e-mail expirés ou utilisés depuis plus de 7 jours, avec un troisième compteur `emailTokensDeleted` (S2-SEC-12) ; son échec est journalisé quel que soit `LOG_LEVEL`.
- API : `Cache-Control: no-store` sur toutes les réponses ; corps `text/plain` refusé en 415 après le contrôle CSRF (S3-SEC-02, S3-SEC-04).

### Added

- Schémas d'entrée du projet `ProjectParameters` et `ProjectSite` dans `packages/domain` (bornes, valeurs par défaut, messages en français), conversions m ↔ mm et m² ↔ mm², comptage des caractères en points de code, contour et zone constructible du terrain, JSON Schema exportés et fixtures de contrat ; caractères incomplets (moitiés de paires de substitution) refusés avec un message ; doublon de type de pièce signalé même à côté d'une ligne invalide.
- Saisie des paramètres et du terrain d'un projet par `PATCH /projects/{id}` (schémas de `@tracea/domain`, groupes remplacés en entier, `null` efface), `ETag` sur les routes de projet et `If-Match` avec réponse 412 `PROJECT_MODIFIED`, CORS ouverte à `If-Match` et exposant `ETag`, nom et description comptés en points de code, composants OpenAPI `ProjectParameters` et `ProjectSite` générés depuis le domaine.
- Écran « Décrire le bâtiment » (`/projets/{id}`) : nom, description libre avec exemples et compteur, paramètres du bâtiment, pièces, terrain avec aperçu et zone constructible, enregistrement automatique (`If-Match`, conflit 412, nouvelles tentatives) ; « Mes projets » ouvre un projet depuis sa carte et après sa création (D15) ; titre d'onglet propre à l'écran (dont « Projet introuvable ») ; aperçu du terrain avec un symbole du nord lisible à tout angle.
- Parcours de bout en bout « Décrire et définir le terrain » : saisie complète et rechargement, isolation entre comptes, conflit entre deux onglets (412), analyse d'accessibilité des états vide, rempli, en erreur, dialogue d'exemples et conflit ; surveillance CSP étendue à l'enregistrement automatique de `/projets/{id}`.
- Exploitation : note du sprint 3 (déploiement sans migration, ordre API puis web, image web par environnement liée à la CSP, règles d'entrée pour HSTS, cache et `ETag`, purge à trois compteurs et rôle PostgreSQL dédié `tracea_purge`, revue des PR Dependabot) ; note du sprint 2 révisée.
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

- « Mes projets » : la carte ouvre le projet et la création ouvre directement le projet créé, sans message « Projet créé » (D15).
- Nom, description et copie d'un projet comptés en points de code, et non plus en unités UTF-16 (A9).
- CI : le job `contract` échoue aussi sur un JSON Schema exporté mais jamais commité (`git status --porcelain`).
- Tests de bout en bout : la pile lance le serveur standalone de l'application web, comme l'image `web` ; racine de traçage Next.js fixée (`outputFileTracingRoot`).
