# Sprint 1 — Compte et authentification (CU-01, EF-100)

| Champ      | Valeur                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| Rôle       | Planificateur                                                                                |
| Date       | 16 novembre 2026                                                                             |
| Branche    | `feature/auth` depuis `develop`                                                              |
| Références | Cahier des charges § 4.1 (EF-100), architecture § 5 et § 7, API § A.2, plan de qualité § B.4 |

## Objectif

Un utilisateur crée un compte, vérifie son adresse, se connecte, se déconnecte et réinitialise son mot de passe, depuis l'interface, avec les protections décrites dans le dossier d'architecture. Les projets (EF-101) arrivent au sprint 2.

## Décisions prises pour ce sprint

- **API Node / Fastify confirmée** (architecture § 10.1) : la couche API porte désormais l'authentification et les sessions, ce qui justifie de rester sur Fastify + Drizzle plutôt que de basculer vers FastAPI.
- Sessions côté serveur, cookie `HttpOnly` `Secure` `SameSite=Lax` signé ; CSRF par double soumission (cookie lisible + en-tête `X-CSRF-Token`) sur toutes les mutations.
- Tests d'intégration sur PostgreSQL embarqué (PGlite) pour rester exécutables sans Docker ; les mêmes migrations servent en production sur PostgreSQL 16.
- E-mail derrière un port `Mailer` : adaptateur SMTP (Mailpit en local) et adaptateur mémoire pour les tests.

## Découpage

| #    | Tâche                                                                             | Rôle                           | Fichiers                                               | Critères d'acceptation                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-1 | Versement des documents de référence                                              | Planificateur                  | `docs/specs/reference/*.md`                            | Les cinq documents (contexte, cahier des charges, architecture, modèle et exports, API et qualité) sont dans le dépôt                                            |
| S1-2 | Spécification des écrans d'authentification                                       | Designer                       | `docs/specs/screens/auth.md`                           | Structure, états, textes, accessibilité ; absence de maquette signalée                                                                                           |
| S1-3 | Schéma de base et migrations                                                      | Backend                        | `apps/api/src/db/*`, `apps/api/drizzle/*`              | Tables `users`, `sessions`, `email_tokens`, `audit_log` ; migration générée et appliquée dans les tests                                                          |
| S1-4 | Routes `/auth/*` et `/me`                                                         | Backend                        | `apps/api/src/auth/*`, `apps/api/src/routes/*`         | Conformes à API § A.2 ; Argon2id ; rotation de session ; réponses identiques que l'e-mail existe ou non ; limitation de débit sur connexion et réinitialisation  |
| S1-5 | Tests d'intégration                                                               | Backend                        | `apps/api/test/auth.test.ts`                           | Inscription → vérification → connexion → `/me` → déconnexion ; mauvais mot de passe ; compte non vérifié ; réinitialisation ; CSRF manquant → 403 ; jeton expiré |
| S1-6 | Pages connexion, inscription, mot de passe oublié, réinitialisation, vérification | Frontend                       | `apps/web/src/app/(auth)/*`, `apps/web/src/lib/api.ts` | Formulaires accessibles (libellés, erreurs annoncées), messages en français, redirection vers « Mes projets » après connexion                                    |
| S1-7 | QA, sécurité, exploitation, revue                                                 | QA, Sécurité, DevOps, Réviseur | `docs/qa`, `docs/security`, `docs/ops`, `docs/reviews` | Rapports produits, aucun constat bloquant                                                                                                                        |

## Hors périmètre

- OAuth Google / Microsoft (option de l'architecture, non planifiée).
- Suppression de compte différée (`DELETE /me`) : sprint 2 avec les projets, pour supprimer aussi les fichiers.
- Quotas et plans d'abonnement (EF-105).

## Risques

- `@node-rs/argon2` embarque un binaire natif ; vérifier sa disponibilité sur l'image `node:22-alpine` (musl) au job `build`.
- Les écrans d'authentification n'existent pas dans les maquettes v0.1 : la structure proposée est provisoire et devra être alignée dès que les maquettes seront complétées.
