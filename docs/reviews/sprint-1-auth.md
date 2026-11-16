# Revue technique — sprint 1 (authentification)

| Champ           | Valeur                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------- |
| Rôle            | Réviseur technique                                                                        |
| Date            | 16 novembre 2026                                                                          |
| Rapports joints | `docs/qa/sprint-1-auth.md`, `docs/security/sprint-1-auth.md`, `docs/ops/sprint-1-auth.md` |

## 1. Périmètre

Conforme à `docs/plans/sprint-1-auth.md`. Deux écarts signalés par les rôles :

- Backend : ajout de `POST /auth/resend-verification` (absent de la spécification API § A.2) pour couvrir les états « renvoyer l'e-mail » de la spécification d'écran ; à reporter dans `docs/specs/reference/04-api-et-qualite.md`.
- Backend : les limites de débit par route sont désactivées en environnement de test (`strictRateLimits`) après que la suite de tests a déclenché la limite d'envoi d'e-mails — comportement attendu en production, documenté.

## 2. Architecture

- `apps/api` : séparation `db/` (schéma, client), `auth/` (service, plugin, mots de passe, jetons), `mail/` (port, SMTP, gabarits), `routes/` ; les routes ne contiennent que validation et appel du service.
- `apps/web` : aucune logique métier ; le client API centralise CSRF et erreurs ; les pages suivent la spécification d'écran.
- Règles de dépendance respectées (vérifiées par ESLint).
- Les tests d'intégration utilisent les migrations réelles sur PostgreSQL embarqué : la même SQL s'exécute en test et en production.

## 3. Qualité

TypeScript strict et ESLint `strictTypeChecked` verts ; deux règles ajustées dans la configuration partagée avec justification en commentaire (`no-confusing-void-expression` pour les gestionnaires d'événements React, `non-nullable-type-assertion-style` déjà au sprint 0). Un contournement documenté : `algorithm: 2` pour Argon2id, l'énumération de `@node-rs/argon2` étant une `const enum` incompatible avec `isolatedModules`.

## 4. Tests

40 tests TypeScript (23 domain, 17 api), 20 tests Python. Les parcours de CU-01 sont couverts côté API ; l'absence de test navigateur est tracée en P3 par la QA.

## 5. Documentation

Documents de référence versés dans `docs/specs/reference/` (contexte, cahier des charges, architecture, modèle et exports, API et qualité) ; spécification d'écran ; `.env.example`, changelog, note d'exploitation à jour. La décision Fastify est consignée dans `02-architecture.md` § 10.

## 6. Règle de présentation

Relecture du code, des gabarits d'e-mail, des pages, des rapports et des messages de commit : conforme. Les copies des documents de référence désignent les maquettes sans nommer d'outil, le fichier de maquettes v0.1 étant un fichier Figma alors que les instructions du projet mentionnent Google Stitch : **à clarifier par le porteur du projet** (quel outil fait foi).

## Demandes de changement

Aucune bloquante. À reporter au sprint 2 :

1. Documenter `POST /auth/resend-verification` dans la spécification API.
2. Outillage Playwright + axe-core et premier parcours end-to-end (connexion → Mes projets).
3. Écran « 05 · Connexion / Inscription » à ajouter au fichier de maquettes.

## Décision

**Approuvé.** Fusion de `feature/auth` dans `develop` par squash merge.
