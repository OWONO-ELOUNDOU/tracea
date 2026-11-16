# Note d'exploitation — sprint 1 (authentification)

| Champ | Valeur           |
| ----- | ---------------- |
| Rôle  | DevOps           |
| Date  | 16 novembre 2026 |

## Changements

- `.env.example` : `NEXT_PUBLIC_API_URL` (lu au build de l'application web), `SESSION_SECRET` documenté avec sa commande de génération.
- `docker-compose.yml` : l'argument de build `NEXT_PUBLIC_API_URL` est passé au service `web` ; `api` lit `.env` (`SESSION_SECRET` obligatoire, démarrage refusé sinon).
- `infra/docker/api.Dockerfile` : le dossier `drizzle/` (migrations) est copié dans l'image ; les migrations sont appliquées au démarrage de l'API (`connectDatabase`).
- `infra/docker/web.Dockerfile` : `ARG NEXT_PUBLIC_API_URL`.
- Scripts `pnpm --filter @tracea/api db:generate` / `db:migrate`.

## Procédure locale

```
cp .env.example .env
# renseigner SESSION_SECRET (openssl rand -base64 48)
docker compose up --build
```

Les e-mails de vérification sont visibles sur Mailpit : http://localhost:8025.

## Points de contrôle staging

- `NODE_ENV=production` positionné (active `Secure` sur les cookies et HSTS).
- `APP_URL` = origine exacte de l'application web (CORS et liens des e-mails).
- `SMTP_URL` vers le relais de la plateforme ; `MAIL_FROM` sur un domaine avec SPF/DKIM.
- Les migrations sont appliquées par l'API au démarrage ; en cas de déploiement multi-instances, démarrer une instance avant les autres (verrou de migration Drizzle).

## Retour arrière

Revenir à l'image précédente ; la migration `0000_init_auth` crée uniquement de nouvelles tables et peut rester en place.
