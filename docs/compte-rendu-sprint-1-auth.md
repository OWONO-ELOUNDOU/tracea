# Tracea — Sprint 1 : compte et authentification (CU-01, EF-100)

| Champ    | Valeur                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Date     | 16 novembre 2026                                                                                             |
| Livrable | Archive `tracea-sprint-1.zip` (dépôt git : `main` → sprint 0, `develop` → sprint 1 fusionné, `feature/auth`) |
| Statut   | Approuvé par la chaîne planificateur → designer → frontend/backend → QA → sécurité → DevOps → réviseur       |

## Décisions prises

- **API Fastify confirmée** (question ouverte § 10.1 de l'architecture) : l'authentification et les sessions vivent dans la couche Node ; la bascule FastAPI n'est plus envisagée.
- Sessions serveur (cookie `HttpOnly` `SameSite=Lax` signé, 72 h), CSRF par double soumission sur toutes les mutations, Argon2id (64 Mio / 3 / 1).
- Tests d'intégration sur PostgreSQL embarqué (PGlite) avec les migrations réelles — exécutables sans Docker, en local comme en CI.
- Route ajoutée hors spécification initiale : `POST /auth/resend-verification` (reportée dans le document API).

## Ce qui a été livré

- **Dépôt initialisé** : premier commit `chore: bootstrap…` sur `main`, branche `develop`, sprint 1 en squash merge `feat(auth): …`. Auteur configuré localement sur l'adresse du porteur ; le nom (`Hermann Owono`) est à corriger si besoin via `git config user.name` puis `git commit --amend --reset-author`.
- **Documents de référence** versés dans `docs/specs/reference/` (contexte, cahier des charges, architecture, modèle et exports, API et qualité).
- **API** : `users`, `sessions`, `email_tokens`, `audit_log` (Drizzle, migration `0000_init_auth`), routes `/auth/csrf`, `register`, `resend-verification`, `verify-email`, `login`, `logout`, `logout-all`, `password/forgot`, `password/reset`, `GET/PATCH /me` ; réponses non révélatrices (adresse existante ou non) ; limitation de débit par route ; e-mails via port `Mailer` (SMTP + mémoire pour les tests). 17 tests.
- **Web** : pages `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification`, page `/projets` provisoire, client API avec CSRF ; jetons de couleur des fondations v0.1 (`paper #F4F1EA`, `primary #1E4A6E`, `accent #C97A2B`).
- **Spécification d'écran** `docs/specs/screens/auth.md` — les écrans d'authentification sont absents des maquettes v0.1 : structure provisoire signalée.
- **Infra** : `.env.example` (`SESSION_SECRET`, `NEXT_PUBLIC_API_URL`), compose et Dockerfiles ajustés (migrations dans l'image API, argument de build web).
- **Rapports** : `docs/plans/sprint-1-auth.md`, `docs/qa/sprint-1-auth.md`, `docs/security/sprint-1-auth.md`, `docs/ops/sprint-1-auth.md`, `docs/reviews/sprint-1-auth.md`.

## Vérifications

Lint, typage, formatage, tests : verts (40 tests TypeScript, 20 Python) ; build Next.js OK (6 routes) ; audits : 0 vulnérabilité haute/critique (2 modérées sur l'outillage de développement).

## Points à trancher par le porteur du projet

1. **Outil de maquettes** : les instructions du projet citent Google Stitch, le document des maquettes v0.1 est un fichier Figma. Lequel fait foi ? Les copies versionnées des documents parlent de « maquettes » sans nommer d'outil en attendant.
2. Ajouter l'écran « 05 · Connexion / Inscription » aux maquettes.
3. Relier le dépôt GitHub (non relié à cette session) pour pousser `main` et `develop` et activer la CI.

## Sprint 2 proposé

« Mes projets » (CU-02, EF-101/102) : tables `projects` / `versions`, routes `/projects`, écran 01 des maquettes, tests d'autorisation croisée (404), outillage Playwright + axe-core avec le premier parcours end-to-end (connexion → Mes projets → créer un projet), purge des sessions expirées.
