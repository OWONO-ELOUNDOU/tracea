# Rapport QA — sprint 0 (amorçage du dépôt)

| Champ     | Valeur                                      |
| --------- | ------------------------------------------- |
| Rôle      | QA                                          |
| Date      | 16 novembre 2026                            |
| Périmètre | `docs/sprint-0-plan.md`, tâches S0-1 à S0-9 |

## Commandes exécutées et résultats

| Commande                                              | Résultat                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                                        | OK                                                                                                                             |
| `pnpm format:check`                                   | OK — tous les fichiers au format Prettier                                                                                      |
| `pnpm lint` (ESLint strict, 3 paquets)                | OK — 0 erreur                                                                                                                  |
| `pnpm typecheck` (tsc strict, 3 paquets)              | OK                                                                                                                             |
| `pnpm test`                                           | OK — `@tracea/domain` 23 tests, `@tracea/api` 4 tests                                                                          |
| `pnpm --filter @tracea/domain schema`                 | OK — `schema/building-model.schema.json` exporté (draft 2020-12)                                                               |
| `pnpm contract`                                       | OK — fixture `house-rectangular` acceptée par Zod, par le JSON Schema et par Pydantic ; 0 violation d'invariant des deux côtés |
| `pnpm --filter @tracea/web build`                     | OK — sortie `standalone`, page `/` statique                                                                                    |
| `uv sync && uv run pytest`                            | OK — 20 tests (dont tests par propriétés hypothesis)                                                                           |
| `uv run ruff check . && uv run ruff format --check .` | OK                                                                                                                             |
| `uv run mypy` (strict)                                | OK — 13 fichiers                                                                                                               |

## Vérifications fonctionnelles

- `GET /health` renvoie `status: ok` et la version du schéma du modèle (`1.0`).
- Route inconnue → 404 au format Problem Details (`application/problem+json`, code `NOT_FOUND`).
- En-têtes de sécurité présents (`Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `X-RateLimit-Limit`).
- Invariants vérifiés par mutation de la fixture (TypeScript et Python donnent les mêmes codes) : `WALL_TOO_SHORT`, `WALL_THICKNESS_OUT_OF_RANGE`, `OPENING_OUT_OF_WALL`, `OPENING_SILL_INVALID`, `OPENINGS_OVERLAP`, `ROOM_NOT_ACCESSIBLE`, `ROOMS_OVERLAP`, `LEVEL_NOT_FOUND`, `LEVEL_NOT_CONNECTED`, `METRICS_MISMATCH`.
- Page d'accueil : textes en français, vocabulaire conforme (« moteur Tracea », « plan de masse », « coupes », « façades »).

## Écarts constatés

| Niveau | Constat                                                                                                                                                                                 | Décision                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| P3     | La règle « pièce accessible » (`ROOM_NOT_ACCESSIBLE`) vérifie la présence d'une porte sur le contour de la pièce, pas encore l'accessibilité depuis une circulation (graphe de pièces). | Accepté pour le sprint 0 ; à compléter avec le solveur (sprint 2). Noté dans `docs/sprint-0-plan.md`. |
| P3     | Le test de chevauchement de pièces repose sur sommets intérieurs + croisement d'arêtes ; deux polygones identiques décalés d'un sous-multiple ne sont pas distingués d'une adjacence.   | Accepté ; le solveur travaille sur grille de 10 cm, ce qui exclut ce cas.                             |
| P4     | `GET /v1/openapi.json` est un document de substitution ; la génération depuis Zod arrive avec les premières routes métier.                                                              | Accepté.                                                                                              |
| P4     | Un avis `moderate` subsiste dans `pnpm audit` (`minimatch` via `eslint-plugin-import`, outillage de développement uniquement).                                                          | Accepté ; suivi par Renovate.                                                                         |

## Décision

**Accepté.** Les critères d'acceptation du sprint 0 sont satisfaits ; passage au rôle Sécurité.
