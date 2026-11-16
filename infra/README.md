# Infrastructure

## Environnement local

```
cp .env.example .env
docker compose up --build
```

Services : `web` (3000), `api` (3001), `engine-worker`, `postgres` (5432), `redis` (6379), `minio` (9000, console 9001), `mailpit` (SMTP 1025, interface 8025).

Les identifiants présents dans `docker-compose.yml` (`tracea/tracea`, `minioadmin`) servent uniquement au poste développeur. Staging et production reçoivent leurs secrets du gestionnaire de la plateforme ; aucun n'est versionné.

## Images

| Image           | Fichier                    | Base                                          | Utilisateur |
| --------------- | -------------------------- | --------------------------------------------- | ----------- |
| `tracea-web`    | `docker/web.Dockerfile`    | `node:22-alpine`, sortie Next.js `standalone` | `node`      |
| `tracea-api`    | `docker/api.Dockerfile`    | `node:22-alpine`, `pnpm deploy --prod`        | `node`      |
| `tracea-engine` | `docker/engine.Dockerfile` | `python:3.12-slim` + `uv`                     | `tracea`    |

Les dépendances natives du moteur (IfcOpenShell, cairo) seront ajoutées à `engine.Dockerfile` lorsque les exports correspondants arriveront ; elles sont déclarées en dépendances optionnelles dans `engine/pyproject.toml`.

## CI

`.github/workflows/ci.yml` : `lint`, `test`, `contract`, `build`, `security`. Les jobs `e2e` et `deploy` sont ajoutés avec le premier parcours utilisateur et le premier environnement de staging.
