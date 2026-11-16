# Note d'exploitation — sprint 0

| Champ | Valeur           |
| ----- | ---------------- |
| Rôle  | DevOps           |
| Date  | 16 novembre 2026 |

## Changement

Mise en place de l'environnement local (`docker-compose.yml`), des trois images (`infra/docker/*.Dockerfile`) et du pipeline CI (`.github/workflows/ci.yml`).

## Pipeline

| Job        | Contenu                                                                                                 | Dépend de      |
| ---------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| `lint`     | Prettier, ESLint, tsc, ruff, mypy                                                                       | —              |
| `test`     | Vitest, pytest                                                                                          | —              |
| `contract` | Export du JSON Schema (doit être identique au fichier versionné), fixtures validées par Zod et Pydantic | —              |
| `build`    | `pnpm build` puis construction des trois images étiquetées par SHA                                      | `lint`, `test` |
| `security` | `pnpm audit` (niveau haut), `pip-audit` sur les dépendances exportées, `gitleaks`                       | —              |

Aucun job ne requiert de secret. `deploy` et `e2e` sont ajoutés quand le staging et le premier parcours Playwright existent.

## Vérifications effectuées

- YAML de `docker-compose.yml` et du workflow validés.
- Dockerfiles relus : utilisateur non root, versions épinglées, `pnpm deploy --prod` pour l'API, sortie `standalone` pour le web, `uv sync --frozen --no-dev` pour le moteur.
- Construction des images non exécutée sur ce poste (démon Docker absent) : à confirmer au premier passage CI.

## Retour arrière

Aucun environnement déployé dans ce sprint ; le retour arrière consiste à revenir au commit précédent.
