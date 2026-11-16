# Rapport QA — sprint 1 (authentification)

| Champ     | Valeur                                                |
| --------- | ----------------------------------------------------- |
| Rôle      | QA                                                    |
| Date      | 16 novembre 2026                                      |
| Périmètre | `docs/plans/sprint-1-auth.md`, branche `feature/auth` |

## Commandes exécutées et résultats

| Commande                                           | Résultat                                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | OK — 0 erreur sur les 3 paquets (ESLint strict typé)                                                                             |
| `pnpm test`                                        | OK — `@tracea/domain` 23 tests, `@tracea/api` 17 tests (dont 13 d'intégration sur PostgreSQL embarqué avec migrations réelles)   |
| `pnpm --filter @tracea/web build`                  | OK — 6 routes statiques : `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification`, `/projets` |
| `drizzle-kit generate`                             | Migration `0000_init_auth.sql` versionnée ; appliquée par les tests                                                              |
| `uv run pytest`, ruff, mypy                        | OK — inchangé (20 tests)                                                                                                         |

## Parcours vérifiés par les tests d'intégration

- Inscription → e-mail de vérification (objet et lien contrôlés) → vérification → connexion → `/me` → modification du nom affiché → déconnexion → `/me` refusé (401).
- Inscription sur une adresse existante : 201 identique, aucun e-mail supplémentaire.
- Mot de passe < 12 caractères : 422 `PASSWORD_TOO_WEAK` ; e-mail invalide : 422 `VALIDATION_ERROR` avec `fields.email`.
- Mauvais mot de passe et compte inexistant : réponses strictement identiques (401 `INVALID_CREDENTIALS`).
- Connexion avant vérification : 403 `EMAIL_NOT_VERIFIED`.
- Jeton de vérification réutilisé : 400 `TOKEN_INVALID`.
- Réinitialisation : 202 pour toute adresse ; nouveau mot de passe accepté, ancien refusé, sessions fermées ; jeton inconnu refusé.
- CSRF : mutation sans jeton → 403 ; jeton différent du cookie → 403.
- `logout-all` révoque les sessions de deux navigateurs.
- Cookie de session `HttpOnly`, `SameSite=Lax`, signé.

## Vérifications manuelles de l'interface

- Textes conformes à `docs/specs/screens/auth.md` ; message unique pour les identifiants invalides ; état « e-mail envoyé » identique que l'adresse existe ou non.
- Libellés reliés aux champs, aide et erreur en `aria-describedby`, zone de message `role="alert"` / `role="status"`, bouton « Afficher le mot de passe » avec `aria-pressed`.
- Redirection après connexion limitée aux chemins internes (`?suivant=/…`).

## Écarts constatés

| Niveau | Constat                                                                                                                                                        | Décision                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| P3     | Pas de test end-to-end navigateur (Playwright) : le parcours CU-01 n'a été vérifié qu'au niveau API + revue des pages.                                         | Accepté ; l'outillage Playwright et axe-core arrive avec le sprint 2 (« Mes projets ») qui ouvre le premier parcours complet. |
| P3     | Le contrôle de mot de passe compromis se limite à une liste courte de mots de passe courants.                                                                  | Accepté ; intégration d'une vérification par préfixe de hachage planifiée (sprint 3).                                         |
| P4     | Les limites de débit par route (10 connexions / 15 min, 5 envois d'e-mail / 15 min) ne sont pas exercées par les tests (désactivées en environnement de test). | Accepté ; vérifiées manuellement sur l'instance locale au sprint 2.                                                           |
| P4     | `GET /v1/openapi.json` reste un document écrit à la main (routes listées sans schémas).                                                                        | Accepté ; génération depuis Zod planifiée avec les routes projets.                                                            |

## Décision

**Accepté.** Passage au rôle Sécurité.
