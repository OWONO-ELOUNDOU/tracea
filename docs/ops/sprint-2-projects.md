# Note d'exploitation — sprint 2 (« Mes projets »)

| Champ     | Valeur                                                   |
| --------- | -------------------------------------------------------- |
| Rôle      | DevOps                                                   |
| Tâche     | S2-10                                                    |
| Date      | 18 novembre 2026                                         |
| Référence | `docs/plans/sprint-2-projects.md` (S2-10, décision D7)   |
| Statut    | Prêt pour staging ; vérification compose à faire (§ 8.2) |
| Révision  | 19 novembre 2026 (S3-12), voir l'encadré ci-dessous      |

> **Révision du 19 novembre 2026 (S3-12).** Le sprint 3 a modifié la purge et la configuration ; le texte d'origine ci-dessous est conservé, les passages devenus faux sont signalés par un encadré « Révisé » à leur place :
>
> - la commande de purge ne valide plus toute la configuration de l'API : elle ne lit que `DATABASE_URL` (obligatoire, sans valeur par défaut) et `LOG_LEVEL` ; **`SESSION_SECRET` n'est plus exigé** et ne doit plus lui être transmis (A8, S2-SEC-08) ;
> - elle supprime aussi les jetons d'e-mail expirés ou utilisés depuis plus de 7 jours : la ligne de succès porte **trois** compteurs, dont `emailTokensDeleted` (S2-SEC-12) ;
> - le service compose `purge` **ne lit plus `.env`** ;
> - `TRUST_PROXY=false` (et `no`, `off`, `none`) est **refusé au démarrage** avec un message explicite (A10) ;
> - la tâche planifiée reçoit son propre secret (`DATABASE_URL` du rôle `tracea_purge`), sans `SESSION_SECRET`.
>
> Référence : `docs/ops/sprint-3-project-description.md` (§ 4 purge, § 5 `TRUST_PROXY`). Les résultats du § 8.1 restent ceux du 18 novembre 2026.

## 1. Changements

| Fichier                                  | Changement                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`                     | Service ponctuel `purge` (profil `maintenance`, même image que `api`, commande `node dist/maintenance/cli.js`, limite mémoire 256 Mo) ; image `api` nommée `tracea-api:local` ; `TRUST_PROXY: ""` forcé sur `api` |
| `.github/workflows/ci.yml`               | `permissions: contents: read` au niveau du flux (S2-SEC-11) ; job `security` : `contents: read`, `pull-requests: read` (gitleaks lit les commits de la PR)                                                        |
| `e2e/playwright.config.ts`               | La pile e2e lance le serveur standalone, comme l'image `web`, au lieu de `next start` (A7)                                                                                                                        |
| `apps/web/next.config.ts`                | `outputFileTracingRoot` fixé à la racine du dépôt : la sortie standalone ne dépend plus des fichiers de verrouillage situés au-dessus du dépôt (voir § 5.3)                                                       |
| `infra/README.md`                        | Purge et liste des jobs CI à jour                                                                                                                                                                                 |
| `apps/api/drizzle/0001_projects.sql`     | Inchangé (S2-2) ; appliqué au démarrage de l'API, voir § 2                                                                                                                                                        |
| `apps/api/src/maintenance/` (S2-4)       | Inchangé ; commande planifiée, voir § 3                                                                                                                                                                           |
| `.env.example`, `apps/api/src/config.ts` | Inchangés : `TRUST_PROXY` y est déjà documenté (S2-9) ; valeurs par environnement au § 4                                                                                                                          |

Aucune nouvelle variable d'environnement.

## 2. Migration `0001_projects`

### 2.1 Application

Comme `0000_init_auth`, la migration est appliquée **par l'API au démarrage** (`connectDatabase` → migrateur Drizzle, dossier `/app/drizzle` de l'image). Aucune action manuelle.

- Le migrateur lit `drizzle.__drizzle_migrations`, compare la date de la dernière migration enregistrée à celles du journal, et applique les migrations manquantes **dans une seule transaction**. Sur une base déjà en `0000`, seule `0001` est jouée ; un second démarrage ne rejoue rien (vérifié sur PGlite, § 8.1).
- `0001` ne fait que créer : type `version_origin`, tables `projects` et `versions`, clés étrangères vers `users` (cascade), deux index. Aucune table existante n'est modifiée : l'image du sprint 1 encore en service pendant un déploiement progressif n'est pas affectée.
- **Plusieurs instances.** Le migrateur Drizzle ne prend **aucun verrou** (lecture du code de `drizzle-orm` 0.45.4 ; la note du sprint 1 parlait à tort d'un verrou). Deux instances qui démarrent ensemble sur une base en `0000` tentent toutes deux la transaction ; la seconde échoue (`type "version_origin" already exists` ou attente puis doublon), l'API sort en erreur et est redémarrée par la plateforme, puis trouve `0001` enregistrée. Pour éviter ce bruit : déployer une instance d'abord (mise à jour progressive avec une seule instance nouvelle à la fois), les autres ensuite.
- **Si la migration échoue** : la transaction est annulée, la base reste en `0000`, l'API ne démarre pas (sonde `/health` en échec) et l'ancienne version continue de servir. Lire l'erreur dans les journaux de l'instance nouvelle, corriger, redéployer.

### 2.2 Vérification après déploiement

```sql
select id, hash, created_at from drizzle.__drizzle_migrations order by id;
-- attendu : 2 lignes, created_at 1794831558087 (0000) et 1794835691692 (0001)
select to_regclass('public.projects'), to_regclass('public.versions');
-- attendu : projects, versions
```

Puis `GET /health` → 200 et un parcours « Mes projets » (création, liste) sur le compte de recette.

### 2.3 Retour arrière

1. **Revenir à l'image `api` précédente** (étiquette SHA ou version du sprint 1). Les tables `projects` et `versions` **restent en place** : l'ancienne version les ignore. Aucune commande SQL.
2. **Suspendre la tâche de purge** (§ 3) : l'image du sprint 1 ne contient pas `dist/maintenance/cli.js`, la tâche échouerait chaque jour.
3. Redéploiement ultérieur de la nouvelle image : la migration est déjà enregistrée, rien n'est rejoué, les projets créés avant le retour arrière sont retrouvés.

Suppression des tables : **à éviter** ; si elle est exigée, uniquement après sauvegarde et en supprimant aussi la ligne `0001` de `drizzle.__drizzle_migrations`, sans quoi un redéploiement ne recréerait pas les tables :

```sql
begin;
drop table versions, projects cascade;
drop type version_origin;
delete from drizzle.__drizzle_migrations where created_at = 1794835691692;
commit;
```

## 3. Purge quotidienne (décision D7)

### 3.1 Principe

Une **commande dédiée**, lancée **une fois par jour** par un **planificateur externe** (tâche planifiée de la plateforme : `CronJob` Kubernetes ou équivalent). Elle supprime les sessions expirées et les projets en corbeille depuis plus de 30 jours (leurs versions suivent par cascade), écrit une ligne de journal JSON et se termine. L'API n'embarque aucune minuterie : un échec de la purge n'a aucun effet sur l'API.

| Élément        | Valeur                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Image          | `tracea-api`, **même étiquette (SHA) que l'API déployée** dans l'environnement                                                   |
| Commande       | `node dist/maintenance/cli.js` (répertoire de travail `/app`, utilisateur `node` de l'image)                                     |
| Horaire        | Tous les jours à **03:30 UTC** (`30 3 * * *`), hors des fenêtres de déploiement                                                  |
| Concurrence    | Une exécution à la fois (`concurrencyPolicy: Forbid`) ; la fonction est idempotente, un chevauchement accidentel est sans danger |
| Reprise        | 2 nouvelles tentatives au plus ; sinon la suivante a lieu le lendemain                                                           |
| Durée maximale | 10 minutes                                                                                                                       |
| Mémoire        | 256 Mo                                                                                                                           |
| Port, sonde    | Aucun ; ne pas reprendre le `HEALTHCHECK` HTTP de l'image                                                                        |
| Code de sortie | 0 si la purge a réussi, 1 sinon (configuration invalide, base injoignable, table absente)                                        |

### 3.2 Variables

La commande valide **toute** la configuration de l'API (`loadConfig()`), même les variables qu'elle n'utilise pas :

- **`DATABASE_URL`** : nécessaire (base de l'environnement, même rôle que l'API).
- **`SESSION_SECRET`** : non utilisé mais **exigé** (32 caractères minimum), sinon sortie 1. Écart A8, voir § 9.
- Toute autre variable présente est validée comme pour l'API : un `TRUST_PROXY` invalide (`1`, `true`…) fait aussi échouer la purge.

Le plus simple : donner à la tâche **le même jeu de secrets que l'API** (même référence au gestionnaire de secrets de la plateforme). Rien n'est versionné.

> **Révisé le 19 novembre 2026.** Ce paragraphe ne s'applique plus à partir de l'image du sprint 3 : la commande lit seulement `DATABASE_URL` (obligatoire) et `LOG_LEVEL` ; `SESSION_SECRET` et `TRUST_PROXY` sont ignorés. Ne plus partager le secret de l'API : la tâche reçoit son propre secret, avec la `DATABASE_URL` du rôle `tracea_purge`. Voir `docs/ops/sprint-3-project-description.md` § 4.2 et § 4.5.

### 3.3 Base non migrée

La commande **n'applique jamais les migrations** (deux processus qui migrent en même temps ne sont pas sûrs, § 2.1). Comportement vérifié (§ 8.1) :

| État de la base  | Effet                                                                                           | Sortie |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------ |
| Aucune migration | `purge failed … (cause: relation "sessions" does not exist)`, rien n'est supprimé               | 1      |
| `0000` seulement | Sessions expirées supprimées, puis `purge failed … (cause: relation "projects" does not exist)` | 1      |
| `0000` + `0001`  | `purge completed` avec les deux compteurs                                                       | 0      |

Les deux suppressions ne sont pas dans une même transaction : dans le deuxième cas, les sessions purgées le restent, ce qui est sans conséquence (fonction idempotente). Conséquence pour le déploiement : **mettre à jour l'image de la tâche après** que l'API nouvelle est saine ; l'horaire de 03:30 UTC hors fenêtre de déploiement évite le reste.

### 3.4 Exemple de tâche planifiée

La plateforme n'est pas arrêtée (architecture § 10.3) : aucun manifeste n'est versionné. À titre de référence, en Kubernetes :

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tracea-purge
spec:
  schedule: "30 3 * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 600
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: purge
              image: <registre>/tracea-api:<sha-de-l-api-deployee>
              command: ["node", "dist/maintenance/cli.js"]
              envFrom:
                - secretRef:
                    name: tracea-api
              resources:
                limits:
                  memory: 256Mi
```

> **Révisé le 19 novembre 2026.** Remplacer `envFrom` (secret entier de l'API) par les deux seules variables `DATABASE_URL` (secret `tracea-purge`) et `LOG_LEVEL: info` : exemple dans `docs/ops/sprint-3-project-description.md` § 4.2.

### 3.5 Vérifier son exécution

- **Journal** (une seule ligne JSON par exécution, compteurs seulement, aucune donnée de ligne) :
  - succès : `{"time":…,"level":30,"msg":"purge completed","sessionsDeleted":N,"projectsDeleted":M}` ;
  - échec : `{"time":…,"level":50,"msg":"purge failed","err":"…"}`.

  > **Révisé le 19 novembre 2026.** Depuis le sprint 3, la ligne de succès porte trois compteurs : `{"time":…,"level":30,"msg":"purge completed","sessionsDeleted":N,"projectsDeleted":M,"emailTokensDeleted":K}`. La ligne d'échec est écrite quel que soit `LOG_LEVEL` ; la ligne de succès, elle, disparaît au-dessus de `info` : garder `LOG_LEVEL=info` pour que l'alerte d'absence fonctionne. Contrôle SQL des jetons : `docs/ops/sprint-3-project-description.md` § 4.4.

- **Statut de la tâche** sur la plateforme (Kubernetes : `kubectl get jobs -l` … / `kubectl logs job/<nom>`).
- **Alerte à poser** : aucune ligne `purge completed` depuis 26 heures, ou une ligne `level: 50`.
- **Contrôle SQL** juste après une exécution réussie :

```sql
select count(*) from sessions where expires_at <= now();                           -- ~0
select count(*) from projects where deleted_at < now() - interval '30 days';       -- 0
```

### 3.6 En local

```
docker compose up -d --build
docker compose run --rm purge
```

Le service `purge` n'est pas lancé par `docker compose up` (profil `maintenance`). `run` démarre ses dépendances et attend une API saine, donc une base migrée. Il lit `.env` (pour `SESSION_SECRET`) et la même `DATABASE_URL` que `api`. Sans Docker : `pnpm --filter @tracea/api purge:dev` (avec `.env` chargé dans l'environnement).

> **Révisé le 19 novembre 2026.** Le service `purge` ne lit plus `.env` : il reçoit seulement `DATABASE_URL` (même base que `api`) et `LOG_LEVEL`, interpolée depuis `.env` ou le shell (`info` par défaut). Sans Docker, seule `DATABASE_URL` est nécessaire.

## 4. `TRUST_PROXY` par environnement

| Environnement               | Valeur                                                                              | Raison                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Local (`pnpm dev`)          | vide                                                                                | Le navigateur appelle l'API directement                               |
| `docker compose`            | vide, **forcé** dans `docker-compose.yml` quel que soit `.env`                      | API exposée directement sur le port 3001                              |
| e2e (`pnpm e2e`, job `e2e`) | vide (non transmis par `e2e-server.ts`)                                             | Aucun mandataire                                                      |
| Staging                     | **plage exacte** (adresses ou CIDR) du répartiteur / contrôleur d'entrée de staging | Seul ce mandataire peut fixer l'adresse cliente par `X-Forwarded-For` |
| Production                  | **plage exacte** du répartiteur / contrôleur d'entrée de production                 | Idem                                                                  |

Règles :

- Syntaxe `proxy-addr` : liste séparée par des virgules d'adresses, de plages CIDR, ou `loopback`, `linklocal`, `uniquelocal`.
- **Jamais de nombre de sauts** : Fastify ignore une valeur numérique et ne fait alors confiance à personne (tous les clients partagent le compteur du répartiteur). L'API refuse `1`, `true`, `*`, `0.0.0.0/0`, `::/0` au démarrage. `false` passe la validation mais fait échouer le démarrage (A10) : laisser vide à la place.
  > **Révisé le 19 novembre 2026.** `false`, `no`, `off` et `none` sont désormais refusés dès la validation, avec un message qui indique de laisser `TRUST_PROXY` vide (A10 soldé).
- **Exigence réseau** : l'API ne doit être joignable **que** par ce mandataire. Pas de port de nœud, pas d'adresse publique directe, pas d'autre service dans la plage de confiance capable d'envoyer du trafic arbitraire ; règle de pare-feu, groupe de sécurité ou `NetworkPolicy` n'admettant en entrée du port 3001 que la plage du répartiteur. Sinon la plage de confiance devient falsifiable et les limites de débit tombent.
- Si la plateforme ne publie pas d'adresses stables pour son répartiteur, `uniquelocal` n'est admissible que si le réseau de l'API est privé et réservé au répartiteur ; sinon, revenir vers le rôle sécurité avant la mise en service.
- La valeur est **à fixer au choix de la plateforme** (premier staging) ; elle n'est pas connue aujourd'hui.

Contrôle en staging : dix connexions refusées depuis un poste, puis une onzième avec un `X-Forwarded-For` inventé → **429** attendu ; et deux postes distincts derrière le répartiteur ont des compteurs distincts.

## 5. Tests de bout en bout

### 5.1 Job `e2e` (CI)

Sur `push` (`main`, `develop`) et `pull_request`, sans secret ni service externe, 20 minutes au plus :

1. `pnpm install --frozen-lockfile` ;
2. version de Playwright lue dans `e2e/node_modules`, cache `~/.cache/ms-playwright` indexé sur cette version ; Chromium seul (D12), coquille sans interface installée avec ses dépendances système, ou seulement les dépendances système si le cache est trouvé ;
3. `pnpm e2e` : construction de `@tracea/web` (Turborepo), puis Playwright démarre :
   - l'API e2e sur le port 3001 (`apps/api/test/e2e-server.ts` : application réelle sur PostgreSQL embarqué, migrations identiques, comptes de test vérifiés, e-mails en mémoire) ;
   - le **serveur standalone** de l'application web sur le port 3000 : copie de `.next/static` à côté de `server.js`, puis `node .next/standalone/apps/web/server.js`, exactement comme l'image `web` ;
4. en cas d'échec seulement : artefact `playwright-report` (rapport HTML et traces), 14 jours, données de test uniquement.

### 5.2 `pnpm e2e` en local

```
pnpm install
pnpm --filter @tracea/e2e exec playwright install chromium   # une fois
pnpm e2e
```

- **Ports 3000 et 3001 libres** : les serveurs existants ne sont jamais réutilisés ; une pile de développement ou `docker compose` en cours fait échouer le lancement plutôt que de tester la mauvaise API. Vérifier avec `lsof -iTCP:3000 -iTCP:3001 -sTCP:LISTEN`.
- **macOS 13** : Playwright 1.65 ne publie plus de navigateurs pour macOS 13 ; exporter `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14` avant l'installation et l'exécution.
- POSIX seulement (la commande de démarrage du serveur web utilise `cp`) : macOS, Linux, WSL.
- Rapport : `e2e/playwright-report/index.html`.

### 5.3 Correction de A7 et racine de traçage

`next start` ne prend pas en charge `output: "standalone"` (avertissement relevé par la QA, A7) : la pile e2e ne testait pas le serveur livré. Elle lance désormais `server.js` de la sortie standalone.

En le faisant, un second défaut est apparu : Next.js déduit la racine du monorepo des fichiers de verrouillage trouvés **au-dessus** du dépôt. Sur un poste qui contient par exemple un `bun.lockb` dans le dossier personnel, la sortie standalone devenait `.next/standalone/<chemin depuis le dossier personnel>/apps/web/server.js` au lieu de `.next/standalone/apps/web/server.js` (avertissement « multiple lockfiles » à la construction). `outputFileTracingRoot` est maintenant fixé à la racine du dépôt dans `apps/web/next.config.ts` : même disposition sur tous les postes, en CI et dans l'image (dans l'image, `/app` était déjà la racine : aucun changement de disposition attendu).

## 6. CI : permissions et épinglage (S2-SEC-11)

- **Fait** : `permissions: contents: read` au niveau du flux ; tous les jobs reçoivent un jeton en lecture seule. Le job `security` déclare `contents: read` et `pull-requests: read` (gitleaks liste les commits de la PR par l'API ; une déclaration au niveau d'un job remplace celle du flux). Sans `pull-requests: write`, gitleaks ne peut pas commenter la PR : une fuite fait toujours échouer le job, le détail est dans le journal du job.
- **Non fait, à planifier** : épinglage des actions par empreinte de commit (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `astral-sh/setup-uv`, `actions/cache`, `actions/upload-artifact`, `docker/setup-buildx-action`, `gitleaks/gitleaks-action`). Les empreintes n'ont pas pu être résolues ici de façon vérifiable (pas d'accès GitHub) ; aucune empreinte n'a été inscrite. À faire depuis un poste avec accès : `git ls-remote https://github.com/<action>.git refs/tags/<étiquette>` (déréférencer les étiquettes annotées, `^{}`), inscrire `uses: <action>@<empreinte> # <étiquette>`, puis activer Dependabot (`package-ecosystem: github-actions`) pour les tenir à jour.

> **Révisé le 19 novembre 2026.** Fait au sprint 3 : actions épinglées par empreinte (vérifiées par `git ls-remote`) et `.github/dependabot.yml` ajouté. Voir `docs/ops/sprint-3-project-description.md` § 7.

## 7. Procédure de déploiement

Staging (automatique sur `develop`, dès que le job `deploy` existera) puis production (étiquette `vX.Y.Z` sur `main`, avec approbation), après validation en staging :

1. Vérifier que les secrets de l'environnement contiennent `DATABASE_URL`, `SESSION_SECRET`, et fixer `TRUST_PROXY` (§ 4) avec la règle réseau associée.
   > **Révisé le 19 novembre 2026.** Ces secrets sont ceux de l'API. La tâche de purge (étape 5) a son propre secret, `DATABASE_URL` du rôle `tracea_purge`, sans `SESSION_SECRET` : `docs/ops/sprint-3-project-description.md` § 2.5.
2. Déployer `tracea-api:<sha>` en mise à jour progressive, **une instance nouvelle d'abord** (§ 2.1) ; attendre `/health` → 200.
3. Contrôler la migration (§ 2.2).
4. Déployer `tracea-web:<sha>`.
5. Créer ou mettre à jour la tâche de purge avec `tracea-api:<sha>` (§ 3.4) ; la lancer une fois à la main et lire sa ligne `purge completed` (§ 3.5).
6. Poser l'alerte d'absence de purge (§ 3.5).

Retour arrière : § 2.3 (image précédente, tables laissées en place, tâche de purge suspendue).

## 8. Vérifications

### 8.1 Faites ici (18 novembre 2026, macOS 13, Node 24.15.0, sans Docker)

| Vérification                                                                            | Résultat                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration incrémentale sur PGlite : base en `0000`, puis démarrage avec `0000` + `0001` | `__drizzle_migrations` : 2 lignes (`1794831558087`, `1794835691692`) ; tables `audit_log, email_tokens, projects, sessions, users, versions` ; second passage : toujours 2 lignes, rien n'est rejoué |
| Purge sur base vide (PGlite)                                                            | `purge failed … (cause: relation "sessions" does not exist)`, sortie 1                                                                                                                               |
| Purge sur base en `0000` (PGlite, une session expirée)                                  | `purge failed … (cause: relation "projects" does not exist)`, sortie 1 ; session expirée supprimée (0 restante)                                                                                      |
| Purge sur base en `0001` (PGlite)                                                       | `{"level":30,"msg":"purge completed","sessionsDeleted":0,"projectsDeleted":0}`, sortie 0                                                                                                             |
| `node dist/maintenance/cli.js` compilé, sans `SESSION_SECRET`                           | `purge failed … SESSION_SECRET: Invalid input: expected string, received undefined`, sortie 1                                                                                                        |
| Idem, base injoignable                                                                  | `purge failed … (cause: connect ECONNREFUSED 127.0.0.1:59999)`, sortie 1                                                                                                                             |
| Idem, `TRUST_PROXY=1`                                                                   | `purge failed … TRUST_PROXY: "1" is a hop count…`, sortie 1                                                                                                                                          |
| `docker-compose.yml`, `ci.yml` analysés (js-yaml)                                       | YAML valide ; service `purge` (profil, commande, sonde désactivée, dépendances, 256 Mo) et `TRUST_PROXY: ""` présents ; `permissions` du flux et du job `security` présents                          |
| `pnpm e2e` avec le serveur standalone                                                   | 5 tests passés ; plus d'avertissement « standalone » ni « multiple lockfiles »                                                                                                                       |
| `pnpm format:check`, `lint`, `typecheck`, `test`                                        | Verts                                                                                                                                                                                                |

Les essais PGlite ont été faits avec un script jetable (non versionné) qui appelle `runPurgeCommand` et le migrateur Drizzle de PGlite ; PGlite n'est pas PostgreSQL 16, d'où le § 8.2.

### 8.2 À vérifier sur la pile compose (PostgreSQL 16), faute de Docker ici

Sur un poste avec Docker, consigner le résultat dans cette note :

1. **Volume déjà en `0000`** : créer le volume `postgres-data` avec la version du sprint 1 (`git switch --detach 0478c84`, dernier commit en `0000`, puis `docker compose up --build`, puis `docker compose down` sans `-v`), revenir sur `develop` et relancer `docker compose up --build`. Attendu : l'API démarre, `__drizzle_migrations` compte 2 lignes, `projects` et `versions` existent (§ 2.2).
2. **Volume neuf** : `docker compose down -v && docker compose up --build` ; mêmes contrôles.
3. **Index partiel et énumération** sur PostgreSQL 16 (risque du plan) : `\d projects` montre `projects_owner_updated_idx … WHERE deleted_at IS NULL` ; `\dT version_origin`.
4. **Parcours** : inscription (e-mail sur Mailpit, http://localhost:8025), connexion, création, renommage, duplication, suppression (corbeille, sans restauration : D3) sur http://localhost:3000.
5. **Purge** : `docker compose run --rm purge` → ligne `purge completed`, sortie 0. Puis, en SQL, une session expirée et un projet avec `deleted_at = now() - interval '31 days'` insérés à la main ; relancer → compteurs à 1 ; relancer → 0.
6. **Purge sur base non migrée** : `docker compose run --rm --no-deps purge` sur un volume neuf avant le premier démarrage de l'API → sortie 1, `relation "sessions" does not exist`.
7. **Image `web`** avec `outputFileTracingRoot` : `docker compose build web` puis page de connexion servie avec ses styles.
8. **`TRUST_PROXY` forcé** : avec `TRUST_PROXY=1` dans `.env`, l'API compose démarre quand même (valeur vide imposée par le compose) ; le service `purge`, lui, lit `.env` et échouerait : laisser `TRUST_PROXY=` vide dans `.env`.
   > **Révisé le 19 novembre 2026.** Le service `purge` ne lit plus `.env` et la commande ignore `TRUST_PROXY` : avec `TRUST_PROXY=1` dans `.env`, la purge doit réussir. Ce point et les compléments du sprint 3 sont repris dans `docs/ops/sprint-3-project-description.md` § 9.2.

Non vérifiables ici non plus : exécution réelle des jobs CI (cache Playwright, artefacts, gitleaks avec le jeton restreint), au premier passage de la PR.

## 9. Suites

| Sujet                                                                                                                  | Rôle            | Quand                         |
| ---------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------- |
| Vérifications compose du § 8.2, résultat consigné ici                                                                  | Devops          | Avant le premier staging      |
| Épinglage des actions par empreinte + Dependabot `github-actions` (S2-SEC-11, § 6)                                     | Devops          | Sprint 3                      |
| A8 : la purge exige `SESSION_SECRET` qu'elle n'utilise pas (validation partielle de la configuration pour la commande) | Backend         | Sprint 3                      |
| Manifeste de la tâche de purge et job `deploy` versionnés, au choix de la plateforme ; valeur réelle de `TRUST_PROXY`  | Devops          | Premier environnement staging |
| Métrique de la purge (dernière réussite, compteurs) : passerelle Prometheus ou métrique dérivée des journaux           | Devops          | Avec l'observabilité          |
| Verrou de migration (verrou consultatif PostgreSQL autour du migrateur) si le déploiement multi-instances le demande   | Backend, devops | À la mise en production       |
| S2-SEC-12 : purge des jetons d'e-mail (troisième compteur, journal à adapter)                                          | Backend         | Sprint 3                      |
| A10 : message explicite pour `TRUST_PROXY=false`                                                                       | Backend         | Sprint 3                      |

> **Révisé le 19 novembre 2026.** Soldés au sprint 3 : épinglage et Dependabot, A8, S2-SEC-12, A10. Toujours ouverts : vérifications compose, manifeste et job `deploy`, valeur de `TRUST_PROXY`, métrique de la purge, verrou de migration. Suites à jour : `docs/ops/sprint-3-project-description.md` § 10.
