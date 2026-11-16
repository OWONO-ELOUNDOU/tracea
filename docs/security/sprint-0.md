# Revue de sécurité — sprint 0

| Champ                     | Valeur                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Rôle                      | Sécurité                                                                                    |
| Date                      | 16 novembre 2026                                                                            |
| Surface d'attaque touchée | Socle de l'API (en-têtes, limitation de débit, format d'erreur), configuration, dépendances |

## Contrôles effectués

| Domaine             | Contrôle                                                                                                                                                                                              | Résultat                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Secrets             | Recherche de clés, mots de passe et jetons dans les fichiers versionnés                                                                                                                               | Aucun ; `.env.example` ne contient que des valeurs vides ou locales ; `.gitignore` exclut `.env*` sauf l'exemple |
| Configuration       | Variables d'environnement validées par Zod au démarrage (`apps/api/src/config.ts`) ; démarrage refusé si invalide                                                                                     | Conforme                                                                                                         |
| En-têtes HTTP       | Helmet avec CSP `default-src 'none'`, `frame-ancestors 'none'` ; HSTS activé en production ; `X-Powered-By` désactivé (API et Next.js)                                                                | Conforme                                                                                                         |
| Limitation de débit | `@fastify/rate-limit`, 60 requêtes/minute par défaut, configurable                                                                                                                                    | Conforme                                                                                                         |
| CORS                | Origine restreinte à `APP_URL`, `credentials: true`, méthodes explicites                                                                                                                              | Conforme                                                                                                         |
| Erreurs             | Problem Details ; les erreurs 5xx ne renvoient aucun détail interne, la trace est journalisée avec `requestId`                                                                                        | Conforme                                                                                                         |
| Taille des corps    | `bodyLimit` 1 Mo sur l'API                                                                                                                                                                            | Conforme (les imports de terrain ≤ 5 Mo passeront par une route multipart dédiée)                                |
| Dépendances Node    | `pnpm audit` : 2 critiques et 2 hautes corrigées (mise à jour de Vitest 5, `postcss` ≥ 8.5.18 par override) ; 1 modérée restante (`minimatch` via `eslint-plugin-import`, outillage de développement) | Acceptable                                                                                                       |
| Dépendances Python  | `pip-audit` : aucune vulnérabilité sur les dépendances publiées (le paquet local n'est pas audité)                                                                                                    | Conforme                                                                                                         |
| Conteneurs          | Images non root, versions épinglées, pas de secret dans les Dockerfiles ni dans `docker-compose.yml` (identifiants MinIO/PostgreSQL de développement uniquement, surchargés par variables)            | Conforme                                                                                                         |
| CI                  | Job `security` : `pnpm audit`, `pip-audit`, `gitleaks` ; aucun secret requis par les jobs                                                                                                             | Conforme                                                                                                         |

## Constats

| Niveau      | Constat                                                                                                                                                                                                        | Suite                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Moyenne     | Les identifiants de développement de `docker-compose.yml` (`tracea/tracea`, `minioadmin`) ne doivent jamais être réutilisés hors poste développeur.                                                            | Documenté dans `infra/README.md` ; les environnements staging/prod utilisent les secrets de la plateforme. |
| Basse       | `minimatch` (modérée, outillage) en attente d'une mise à jour amont de `eslint-plugin-import`.                                                                                                                 | Suivi Renovate.                                                                                            |
| Information | Les fichiers `CLAUDE.md` et `.claude/agents/` décrivent l'organisation interne du travail. Si le dépôt devait devenir public, décider de leur maintien ou de leur déplacement dans un dépôt d'outillage privé. | À trancher avant toute ouverture du dépôt.                                                                 |

## Décision

**Approuvé** pour le sprint 0. Aucun constat critique ou haut. Les contrôles d'authentification, d'autorisation et de fichiers seront revus à leur mise en place (sprint 1).
