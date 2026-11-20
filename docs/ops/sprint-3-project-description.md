# Note d'exploitation — sprint 3 (« Décrire le bâtiment »)

| Champ     | Valeur                                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle      | DevOps                                                                                                                                                     |
| Tâche     | S3-12                                                                                                                                                      |
| Date      | 19 novembre 2026                                                                                                                                           |
| Référence | `docs/plans/sprint-3-project-description.md` (S3-12, D27, D29), `docs/qa/sprint-3-project-description.md`, `docs/security/sprint-3-project-description.md` |
| Statut    | Prêt pour staging sous trois conditions : rôle `tracea_purge` créé (§ 4.5), A16 soldé au commit (§ 7.3), vérifications compose du § 9.2 consignées         |

## 1. Changements qui touchent l'exploitation

| Élément                            | Changement                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base de données                    | **Aucune migration.** Les colonnes `projects.parameters` et `projects.site` (`jsonb`, nulles) existent depuis `0001_projects` ; seul leur type TypeScript change                                        |
| `apps/web/next.config.ts`          | Cinq en-têtes de sécurité sur toutes les routes ; `connect-src` de la CSP calculé **à la construction** depuis `NEXT_PUBLIC_API_URL` ; HSTS émis par toute construction de production (§ 3)             |
| `apps/api/src/app.ts`              | CORS : `If-Match` admis, `ETag` et `Location` exposés ; `Cache-Control: no-store` sur toute réponse qui n'en pose pas (S3-SEC-02) ; `text/plain` refusé en 415                                          |
| `apps/api/src/config.ts`           | `TRUST_PROXY=false` (et `no`, `off`, `none`) **refusé au démarrage** avec un message qui indique de laisser la valeur vide (A10)                                                                        |
| `apps/api/src/maintenance/`        | Purge : configuration réduite (`loadMaintenanceConfig` : `DATABASE_URL`, `LOG_LEVEL`), troisième compteur `emailTokensDeleted`, ligne d'échec toujours écrite (§ 4)                                     |
| `docker-compose.yml`               | Service `purge` sans `env_file` : `DATABASE_URL` et `LOG_LEVEL` seulement (S3-9)                                                                                                                        |
| `.github/workflows/ci.yml`         | Chaque action épinglée par empreinte de commit complète, étiquette en commentaire (S2-SEC-11) ; le job `contract` échoue aussi sur un JSON Schema jamais commité (`git status --porcelain`, A16, § 7.3) |
| `.github/dependabot.yml` (nouveau) | Mises à jour hebdomadaires groupées des actions GitHub, PR vers `develop` (§ 7)                                                                                                                         |
| `packages/domain`                  | Deux JSON Schema exportés (`project-parameters`, `project-site`) ; le script `schema` passe la sortie par Prettier, si bien que la régénération en CI est identique au fichier versionné                |
| `.env.example`                     | Variables de la purge et valeurs refusées de `TRUST_PROXY` décrites ; **aucune nouvelle variable**                                                                                                      |
| `infra/README.md`                  | Purge des jetons d'e-mail de plus de 7 jours (A20), épinglage et Dependabot                                                                                                                             |
| `docs/ops/sprint-2-projects.md`    | Note de révision datée : passages devenus faux (purge et `SESSION_SECRET`, journal, `.env` du service, `TRUST_PROXY=false`)                                                                             |

## 2. Déploiement

### 2.1 Sans migration

L'API applique toujours les migrations au démarrage ; aucune n'est ajoutée, donc rien n'est joué. Contrôle après déploiement : `drizzle.__drizzle_migrations` compte toujours **2 lignes** (`1794831558087`, `1794835691692`), voir `docs/ops/sprint-2-projects.md` § 2.2. Le risque multi-instances du migrateur sans verrou ne se présente pas à ce déploiement.

### 2.2 Compatibilité entre versions

| Combinaison                  | Effet                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API nouvelle + web précédent | Compatible : `If-Match` est facultatif (sans lui, pas de contrôle 412) ; l'ancien écran n'envoie ni `parameters` ni `site`                                                                                                                              |
| API précédente + web nouveau | **Incompatible** : la requête préalable CORS d'un `PATCH` avec `If-Match` est refusée, l'`ETag` n'est pas lisible, et le schéma strict de l'ancienne API rejette `parameters` et `site` (422). L'écran « Décrire le bâtiment » ne peut rien enregistrer |

**Ordre : API d'abord, web ensuite** ; au retour arrière, dans l'ordre inverse.

### 2.3 CSP liée à la construction de l'image `web`

`NEXT_PUBLIC_API_URL` était déjà figée dans le code client à la construction ; elle l'est désormais aussi dans la CSP (`connect-src 'self' <origine de l'API>`). Conséquences :

- **Une image `web` par environnement.** L'image construite pour staging ne peut appeler que l'API de staging : promue telle quelle en production, toutes les requêtes vers l'API de production seraient bloquées par le navigateur (violation `connect-src` dans la console, page sans données). L'image de production est reconstruite depuis l'étiquette `vX.Y.Z` avec l'argument de production ; seule cette valeur diffère de l'image validée en staging.
- **Étiquetage proposé** pour le futur job `deploy` : `tracea-web:<sha>-staging`, `tracea-web:<sha>-production` et `tracea-web:vX.Y.Z` (production). L'image `api` reste unique et promue de staging en production.
- **Valeur attendue** : l'origine publique exacte de l'API (schéma, hôte, port), en `https://`. Une origine `http://` en production serait de toute façon bloquée comme contenu mixte.
- **Contrôle** après chaque déploiement `web` :

```
curl -sI https://<hôte web>/connexion | grep -i '^content-security-policy'
# attendu : ... connect-src 'self' https://<hôte API>
```

- Dans compose, l'argument vaut `http://localhost:3001` (`docker-compose.yml`) : l'application doit être ouverte sur `http://localhost:3000`, l'API étant appelée sur `localhost:3001`.

### 2.4 En-têtes à l'entrée (D27)

L'application web émet `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options` et, pour toute construction de production (donc toute image `web`, et aussi la pile e2e), `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Les navigateurs ignorent HSTS reçu en HTTP : sans effet en local. L'API émet le sien (helmet) quand `NODE_ENV=production`.

Règles pour l'entrée (contrôleur d'entrée ou répartiteur) de staging et de production :

1. **TLS terminé à l'entrée**, HTTP redirigé vers HTTPS (301), pour le web comme pour l'API.
2. **Ne pas retirer ni réécrire** les en-têtes de l'application. Si l'entrée ajoute HSTS (confirmation demandée par D27), utiliser **exactement la même valeur** ; deux valeurs différentes ne sont pas fiables (le navigateur retient la première). Ne pas ajouter de seconde CSP : les deux politiques s'appliqueraient cumulativement.
3. **`includeSubDomains` pendant un an** : avant la mise en production sur un domaine donné, vérifier qu'aucun sous-domaine de l'hôte servi n'est encore en HTTP seul. Un HSTS reçu ne se retire pas côté navigateur avant son expiration ; en cas de doute en staging, l'entrée peut temporairement ramener `max-age` à une valeur courte, puis revenir à la valeur de l'application.
4. **Pas de cache devant l'API** (S3-SEC-02) : l'API répond `Cache-Control: no-store` ; l'entrée ou un CDN ne doit ni mettre en cache les réponses de l'API ni réécrire cet en-tête.
5. **`ETag` intact** : l'API compare `If-Match` en comparaison forte, une étiquette faible (`W/"…"`) ne correspond jamais. Une entrée qui compresse les réponses JSON et affaiblit l'`ETag` (comportement de nginx avec `gzip on` pour les types compressés) ferait échouer **chaque** enregistrement automatique en 412. Ne pas compresser à l'entrée les réponses de l'API, ou vérifier qu'elle conserve l'étiquette forte.
6. **Transmettre** `If-Match` (requête) et `ETag`, `Location` (réponse) sans filtrage.

Contrôles en staging :

```
curl -sI https://<hôte web>/projets | grep -iE '^(content-security-policy|x-frame-options|referrer-policy|x-content-type-options|strict-transport-security)'
# attendu : cinq en-têtes, un seul strict-transport-security
curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' -H 'Cookie: <session de recette>' https://<hôte API>/projects/<id>
# attendu : etag: "<valeur>" sans W/, cache-control: no-store
curl -s -D - -o /dev/null -X OPTIONS https://<hôte API>/projects/<id> \
  -H 'Origin: https://<hôte web>' -H 'Access-Control-Request-Method: PATCH' \
  -H 'Access-Control-Request-Headers: content-type,if-match,x-csrf-token'
# attendu : 204, access-control-allow-headers contenant if-match
```

Puis, dans un navigateur, l'écran « Décrire le bâtiment » d'un projet de recette : saisie, état « Enregistré », rechargement, valeurs retrouvées, aucune violation CSP dans la console.

### 2.5 Procédure

Staging (automatique sur `develop` quand le job `deploy` existera), puis production (étiquette `vX.Y.Z` sur `main`, avec approbation) après validation en staging :

1. Prérequis staging : rôle `tracea_purge` créé et secret de la tâche de purge prêt (§ 4.5) ; `TRUST_PROXY` fixé (§ 5) ; règles d'entrée du § 2.4 en place.
2. Déployer `tracea-api:<sha>` ; attendre `/health` → 200 ; vérifier `__drizzle_migrations` (2 lignes) et l'en-tête CORS (§ 2.4).
3. Construire `tracea-web` avec `NEXT_PUBLIC_API_URL` de l'environnement (§ 2.3), le déployer, contrôler les en-têtes.
4. Mettre à jour la tâche de purge : image `tracea-api:<sha>`, variables du § 4.2 seulement ; la lancer une fois à la main et lire sa ligne `purge completed` à **trois** compteurs.
5. Parcours de recette du § 2.4.

### 2.6 Retour arrière

1. **Web d'abord** : revenir à l'image `web` précédente. L'écran `/projets/{id}` disparaît (404 de l'application) et les cartes de « Mes projets » ne l'ouvrent plus ; aucune donnée n'est touchée.
2. **API ensuite** : revenir à l'image `api` précédente. **Sans perte** : les colonnes `parameters` et `site` restent remplies ; l'ancienne version les lit comme objets libres, les renvoie dans `GET /projects/{id}` et les recopie à la duplication. Un redéploiement ultérieur retrouve les valeurs saisies.
3. **Tâche de purge : la laisser sur l'image du sprint 3.** Elle ne dépend que du schéma de base, inchangé, et fonctionne avec l'API précédente. Revenir à l'image précédente imposerait de lui rendre `SESSION_SECRET` (l'ancienne commande valide toute la configuration de l'API) et, avec le rôle `tracea_purge`, elle ne supprimerait que deux catégories. Si l'image du sprint 3 doit être retirée du registre, suspendre la tâche plutôt que de lui rendre le secret.
4. Aucune commande SQL.

## 3. En-têtes web : comportement attendu

| En-tête                     | Valeur                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; connect-src 'self' <API>` |
| `X-Frame-Options`           | `DENY`                                                                                                     |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                          |
| `X-Content-Type-Options`    | `nosniff`                                                                                                  |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (construction de production)                                         |

Pas de `default-src` ni de `script-src` à cette étape (D27) : la politique ne limite ni les scripts ni les images. La seconde étape (nonce par requête) rendra toutes les pages dynamiques ; son effet sur la mémoire et le temps de réponse de l'image `web` sera mesuré à ce moment.

## 4. Purge quotidienne

### 4.1 Commande

Inchangée : `node dist/maintenance/cli.js` dans l'image `tracea-api` (répertoire `/app`, utilisateur `node`), une fois par jour à 03:30 UTC, mêmes paramètres de planification que dans `docs/ops/sprint-2-projects.md` § 3.1. Elle supprime :

| Catégorie                                                          | Compteur             |
| ------------------------------------------------------------------ | -------------------- |
| Sessions expirées                                                  | `sessionsDeleted`    |
| Projets en corbeille depuis plus de 30 jours (versions en cascade) | `projectsDeleted`    |
| Jetons d'e-mail expirés **ou** utilisés depuis plus de 7 jours     | `emailTokensDeleted` |

Les trois suppressions sont indépendantes (pas de transaction commune) et idempotentes. Au premier passage en staging et en production, `emailTokensDeleted` peut être élevé : tous les jetons accumulés depuis le sprint 1 sont supprimés d'un coup ; ensuite, il suit le volume quotidien d'inscriptions et de réinitialisations.

### 4.2 Variables

La commande lit **seulement** :

| Variable       | Règle                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | **Obligatoire, sans valeur par défaut** (une tâche qui purgerait une base locale par erreur serait pire qu'une tâche en échec). En staging et production : rôle `tracea_purge` (§ 4.5) |
| `LOG_LEVEL`    | Facultative ; **laisser `info` (ou absente)**, voir § 4.3                                                                                                                              |

`SESSION_SECRET`, `TRUST_PROXY`, accès SMTP et stockage ne sont plus lus : **ne pas les transmettre**. La tâche reçoit son propre secret (par exemple `tracea-purge`, contenant `DATABASE_URL`), et non plus celui de l'API. En compose, le service `purge` ne lit plus `.env` ; `LOG_LEVEL` y est interpolé depuis `.env` ou l'environnement du shell (`info` par défaut).

Exemple Kubernetes, en remplacement du bloc `envFrom` de la note du sprint 2 (§ 3.4) :

```yaml
containers:
  - name: purge
    image: <registre>/tracea-api:<sha-de-l-api-deployee>
    command: ["node", "dist/maintenance/cli.js"]
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: tracea-purge
            key: DATABASE_URL
      - name: LOG_LEVEL
        value: info
    resources:
      limits:
        memory: 256Mi
```

### 4.3 Journal

Une ligne JSON par exécution, compteurs seulement :

- succès (niveau 30) : `{"time":…,"level":30,"msg":"purge completed","sessionsDeleted":N,"projectsDeleted":M,"emailTokensDeleted":K}`, sortie 0 ;
- échec (niveau 50) : `{"time":…,"level":50,"msg":"purge failed","err":"…"}`, sortie 1. Le message contient la classe d'erreur, la requête SQL et son paramètre de date, la cause du pilote ; jamais de contenu de ligne.

`LOG_LEVEL` filtre les lignes comme pour l'API, à une exception près : **la ligne d'échec est toujours écrite**, même avec `LOG_LEVEL=fatal`. En revanche, avec `LOG_LEVEL` à `warn`, `error` ou `fatal`, la ligne de succès (niveau 30) est supprimée et l'alerte d'absence de purge (§ 4.4) se déclencherait chaque jour : la tâche doit tourner en `info`.

### 4.4 Alertes

- **Échec** : une ligne `"msg":"purge failed"` (niveau 50), ou une exécution terminée avec un code non nul.
- **Absence** : aucune ligne `purge completed` depuis 26 heures.
- **Anomalie de volume** (à régler après deux semaines d'observation) : un compteur très au-dessus de sa moyenne, en particulier `projectsDeleted`, peut révéler une horloge fausse ou une suppression massive.

Contrôle SQL juste après une exécution réussie (avec le rôle de l'application, pas `tracea_purge` qui ne peut pas compter les lignes) :

```sql
select count(*) from sessions where expires_at <= now();                                  -- ~0
select count(*) from projects where deleted_at < now() - interval '30 days';              -- 0
select count(*) from email_tokens
 where expires_at < now() - interval '7 days' or used_at < now() - interval '7 days';     -- 0
```

### 4.5 Rôle PostgreSQL dédié `tracea_purge` (S3-SEC-06, avant le premier staging)

La purge n'a plus aucun secret applicatif mais se connecte encore avec le rôle de l'application : une fuite de l'environnement du planificateur donnerait tous les droits sur la base. Rôle dédié, limité aux colonnes que lisent les trois requêtes (`delete … where <colonne de date> … returning "id"`) :

```sql
-- Once per environment (staging, then production), as the owner of the tables.
create role tracea_purge login connection limit 2;
-- Password: never in a versioned file. Set it interactively, then store the resulting
-- DATABASE_URL in the platform secret of the purge job (e.g. tracea-purge):
--   \password tracea_purge
alter role tracea_purge set statement_timeout = '5min';

grant connect on database tracea to tracea_purge;
grant usage on schema public to tracea_purge;
grant select (id, expires_at), delete on sessions to tracea_purge;
grant select (id, deleted_at), delete on projects to tracea_purge;
grant select (id, expires_at, used_at), delete on email_tokens to tracea_purge;
```

- Aucun droit sur `versions` : la suppression en cascade s'exécute avec les droits du propriétaire de la table. Aucun droit sur `users`, `audit_log`, `drizzle.*`, aucune lecture de `name`, `description_text`, `parameters`, `site`, `token_hash`, `ip`, `user_agent`.
- `DATABASE_URL` de la tâche : `postgres://tracea_purge:<mot de passe>@<hôte>:5432/tracea` (avec les options TLS de l'environnement), dans le secret de la tâche seulement.
- **Migrations futures** : les droits par colonne survivent à l'ajout de colonnes ; une migration qui renomme ou recrée l'une de ces tables ou colonnes doit reprendre ces `grant` (sinon la purge échoue en `permission denied`, et l'alerte d'échec le signale). À inscrire dans la liste de contrôle des migrations.
- Retrait : `drop owned by tracea_purge; drop role tracea_purge;` après avoir remis la tâche sur un autre rôle.

Vérification après création (connecté **en tant que** `tracea_purge`) :

```sql
select name from projects;     -- attendu : permission denied for table projects
select email from users;       -- attendu : permission denied for table users
```

puis lancer la tâche une fois : ligne `purge completed` à trois compteurs, sortie 0. Le backend confirme que `purgeExpired` ne lit rien d'autre (S3-SEC-06).

En local, compose garde le rôle `tracea` : la base de développement n'a pas de données réelles. Le rôle peut y être essayé à la main avec le SQL ci-dessus (`docker compose exec postgres psql -U tracea tracea`), puis `docker compose run --rm -e DATABASE_URL=postgres://tracea_purge:<mot de passe>@postgres:5432/tracea purge`.

## 5. `TRUST_PROXY`

Règles inchangées (`docs/ops/sprint-2-projects.md` § 4) : vide en local, compose et e2e ; plage exacte du répartiteur en staging et production, avec la règle réseau qui n'admet que lui sur le port 3001. Changement : **`false`, `no`, `off`, `none` sont refusés au démarrage** avec le message `"false" is not a proxy address; to trust no proxy, leave TRUST_PROXY empty (TRUST_PROXY=)` ; l'API ne démarre pas, `/health` reste en échec et l'ancienne version continue de servir. La purge ignore désormais `TRUST_PROXY`.

**Limite de débit et enregistrement automatique (D29, S3-SEC-05).** La limite globale reste de `RATE_LIMIT_PER_MINUTE` (60) requêtes par minute **et par adresse IP** ; un onglet de l'écran « Décrire le bâtiment » envoie au plus 20 `PATCH` par minute, plus ses lectures. Trois onglets, ou trois personnes derrière une même adresse (bureau, réseau mobile), atteignent la limite ; l'écran affiche alors « Enregistrement en attente » et réessaie sans perte. Conséquences d'exploitation :

- un `TRUST_PROXY` erroné (vide derrière un répartiteur) donne à **tous** les utilisateurs l'adresse du répartiteur : 429 généralisés dès quelques utilisateurs simultanés. C'est le premier point à contrôler devant une hausse de 429 ;
- suivre le taux de réponses 429 par route (journaux de l'API ou de l'entrée) ; au-delà de quelques pour cent des `PATCH /projects/{id}`, prévenir le backend ;
- palliatif possible en staging seulement : relever `RATE_LIMIT_PER_MINUTE` (variable existante) ; la correction est une limite par utilisateur (S3-SEC-05), à livrer avant l'ouverture publique et avant CU-05.

## 6. CORS

| Élément             | Valeur                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| Origine admise      | `APP_URL` seulement, avec cookies (`credentials: true`)                  |
| Méthodes            | `GET`, `POST`, `PATCH`, `DELETE`                                         |
| En-têtes de requête | `Content-Type`, `X-CSRF-Token`, `X-Request-Id`, **`If-Match`** (nouveau) |
| En-têtes exposés    | **`ETag`**, **`Location`** (nouveaux)                                    |

`APP_URL` doit être l'origine publique exacte de l'application web de l'environnement (même valeur que celle qu'utilise la CSP de l'image `web` dans l'autre sens). Une origine erronée bloque tout l'écran connecté, pas seulement l'enregistrement.

## 7. CI et Dependabot

### 7.1 Épinglage

Toutes les actions de `ci.yml` sont épinglées par empreinte de commit complète, l'étiquette en commentaire. Empreintes vérifiées par la QA avec `git ls-remote` contre les étiquettes publiées : `actions/checkout` v4.4.0, `pnpm/action-setup` v4.3.0, `actions/setup-node` v4.4.0, `astral-sh/setup-uv` v5.4.2, `actions/cache` v4.3.0, `actions/upload-artifact` v4.6.2, `docker/setup-buildx-action` v3.12.0, `gitleaks/gitleaks-action` v2.3.9. Toute action ajoutée plus tard suit la même forme : `uses: <action>@<empreinte de 40 caractères> # <étiquette>`.

### 7.2 Dependabot

- **Activation** : GitHub ne lit `.github/dependabot.yml` que sur la **branche par défaut** (`main`). Rien ne se passe tant que le fichier n'y est pas fusionné, bien que les PR visent `develop` (`target-branch`). Après la fusion dans `main`, vérifier dans l'onglet « Insights → Dependency graph → Dependabot » que la configuration est lue sans erreur, et activer les alertes de sécurité Dependabot dans les réglages du dépôt si ce n'est pas déjà fait.
- **Fonctionnement** : le lundi (fuseau Europe/Paris), une **seule PR groupée** (`groups.github-actions`, toutes les actions) vers `develop`, titre préfixé `ci`, qui réécrit l'empreinte **et** le commentaire de version de chaque action mise à jour. Cinq PR ouvertes au plus. Les PR de Dependabot reçoivent un jeton en lecture seule et pas les secrets du dépôt : les jobs `lint`, `test`, `contract`, `e2e` n'en ont pas besoin ; `security` n'utilise que `GITHUB_TOKEN`.
- **Le groupe inclut les versions majeures** (par exemple `actions/checkout` v4 → v5). Elles arrivent dans la même PR que les correctifs.

Revue d'une PR groupée (devops, avant fusion) :

1. Pour chaque action : lire les notes de version entre les deux étiquettes ; une version **majeure** (changement de moteur Node.js de l'action, entrée renommée, comportement par défaut modifié) est examinée à part et, au besoin, sortie du groupe (`@dependabot ignore this major version` en commentaire de la PR, puis PR dédiée).
2. Vérifier que l'empreinte correspond bien à l'étiquette annoncée : `git ls-remote https://github.com/<action>.git 'refs/tags/<étiquette>*'` (pour une étiquette annotée, la ligne `^{}` donne le commit).
3. Vérifier que l'éditeur de l'action n'a pas changé (dépôt transféré, nouvel éditeur) : une action venue d'un autre propriétaire n'est pas fusionnée sans avis du rôle sécurité.
4. Tous les jobs verts sur la PR, `e2e` compris (cache Playwright, artefact en cas d'échec).
5. Fusion par l'équipe (pas de fusion automatique), message de commit conventionnel `ci: …`.

### 7.3 Contrôle des JSON Schema (A16)

Le job `contract` régénère les JSON Schema puis vérifie `git status --porcelain -- packages/domain/schema`, qui voit aussi les fichiers jamais commités (`git diff --exit-code` les ignorait : c'était A16). En cas d'écart, il affiche l'état et le diff, puis échoue. Ce contrôle est livré au sprint 3 et vérifié par la QA (§ 14.4 de la recette) ; les deux fichiers `project-parameters.schema.json` et `project-site.schema.json` sont commités avec le sprint.

Le passage du script `schema` par Prettier rend la sortie identique au formatage du dépôt : `pnpm format:check` et le contrôle `contract` ne se contredisent plus.

### 7.4 Premier passage réel de la CI

**Non réalisé** : rien n'est poussé et l'accès GitHub n'est pas disponible depuis le poste de travail. À consigner ici au premier passage de la PR `feature/project-description` → `develop` :

| Point                                                                          | Résultat attendu                                                 | Résultat |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------- |
| Résolution des huit actions épinglées                                          | Aucun « Unable to resolve action »                               | À faire  |
| `lint`, `test`, `contract` (dont partie Python, `uv run pytest`)               | Verts                                                            | À faire  |
| `e2e` : cache Playwright (premier passage : manqué, second : trouvé), 21 tests | Vert ; artefact absent si succès                                 | À faire  |
| `security` : `pnpm audit`, `pip-audit`, gitleaks avec jeton en lecture seule   | Vert ; gitleaks lit les commits de la PR (`pull-requests: read`) | À faire  |
| `build` : trois images                                                         | Vert                                                             | À faire  |
| Durée totale, durée de `e2e` (limite 20 min)                                   | Consignée                                                        | À faire  |
| Dependabot après fusion dans `main`                                            | Configuration lue, première PR groupée le lundi suivant          | À faire  |

## 8. Observabilité

Aucune métrique ni trace nouvelle à ce sprint. Signaux à suivre dès le staging, à partir des journaux :

- taux de `412 PROJECT_MODIFIED` sur `PATCH /projects/{id}` : quelques-uns sont normaux (deux onglets) ; une proportion élevée indique une entrée qui affaiblit l'`ETag` (§ 2.4, point 5) ;
- taux de `429` (§ 5) ;
- lignes de purge (§ 4.4).

Le volume du journal d'audit augmente : une ligne par `PATCH` (D25), soit jusqu'à 20 par minute et par onglet actif. Durée de conservation de `audit_log` à fixer avec CU-14 (revue de sécurité § 4.3) ; surveiller la taille de la table en staging.

## 9. Vérifications

### 9.1 Faites ici (19 novembre 2026, macOS 13, Node 24.15.0, sans Docker ni accès GitHub)

| Vérification                                                                                                                                                   | Résultat                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/maintenance/cli.ts` (tsx), environnement vide                                                                                                             | `{"level":50,"msg":"purge failed","err":"Error: Invalid environment configuration: DATABASE_URL: DATABASE_URL is required"}`, sortie 1                                                                                                  |
| Idem, `DATABASE_URL` injoignable, `LOG_LEVEL=fatal`, `TRUST_PROXY=1`, sans `SESSION_SECRET`                                                                    | Ligne d'échec écrite malgré `fatal`, cause `connect ECONNREFUSED 127.0.0.1:59999`, sortie 1 ; `TRUST_PROXY` et l'absence de `SESSION_SECRET` sans effet                                                                                 |
| Idem, `TRUST_PROXY=false`                                                                                                                                      | Même résultat (variable ignorée par la purge)                                                                                                                                                                                           |
| Rôle `tracea_purge` sur PGlite (migrations `0000` + `0001`, SQL du § 4.5 sans `login` ni mot de passe, `set role`)                                             | Les trois `delete … returning "id"` réussissent (1 session, 1 projet et sa version en cascade, 2 jetons sur 3) ; lecture de `projects.name`, `email_tokens.token_hash`, `users`, `versions`, `update` et `insert` : `permission denied` |
| Diff des fichiers d'exploitation (`docker-compose.yml`, `ci.yml`, `dependabot.yml`, `next.config.ts`, `app.ts`, `config.ts`, `maintenance/`, `web.Dockerfile`) | Relu ; constats reportés aux § 2 à 7                                                                                                                                                                                                    |

Le script PGlite est jetable et non versionné. PGlite n'est pas un serveur PostgreSQL 16 avec authentification : la connexion réelle du rôle, `connection limit` et `statement_timeout` sont à vérifier au § 9.2. Résultats de la QA et de la sécurité repris sans les rejouer : purge des jetons sur PGlite, en-têtes web en e2e, épinglage vérifié par `git ls-remote`, YAML valides.

### 9.2 À vérifier sur la pile compose (PostgreSQL 16), faute de Docker ici

Reprise des réserves du sprint 2 (`docs/ops/sprint-2-projects.md` § 8.2) : **aucune n'a pu être soldée** sur ce poste. Les points 1 à 7 restent à faire tels quels ; le point 8 change (le service `purge` ne lit plus `.env`). S'y ajoutent :

1. **Purge à trois compteurs** : `docker compose run --rm purge` → `purge completed` avec `emailTokensDeleted`, sortie 0. Insérer à la main un jeton expiré depuis 8 jours et un autre utilisé depuis 8 jours, un jeton expiré depuis 6 jours ; relancer → `emailTokensDeleted: 2` ; relancer → 0.
2. **Service sans `.env`** : `docker compose run --rm purge env` (remplace la commande) → seules `DATABASE_URL`, `LOG_LEVEL` et les variables de l'image apparaissent, pas `SESSION_SECRET`. Avec `TRUST_PROXY=1` dans `.env`, la purge réussit (solde le point 8 du sprint 2).
3. **Interpolation de `LOG_LEVEL`** : `LOG_LEVEL=fatal docker compose run --rm purge` → aucune ligne (succès filtré), sortie 0 ; `LOG_LEVEL=fatal docker compose run --rm --no-deps -e DATABASE_URL=postgres://x:y@postgres:1/x purge` → ligne d'échec écrite, sortie 1.
4. **Rôle `tracea_purge`** : SQL du § 4.5 dans `psql`, puis purge avec ce rôle (fin du § 4.5) → succès ; `psql -U tracea_purge` : lectures interdites.
5. **Image `web`** : `docker compose build web` puis `curl -sI http://localhost:3000/connexion` → cinq en-têtes, `connect-src 'self' http://localhost:3001`, HSTS présent (ignoré en HTTP) ; écran « Décrire le bâtiment » sur http://localhost:3000 : saisie, enregistrement, rechargement, aucune violation CSP dans la console.
6. **`TRUST_PROXY=false`** au démarrage d'une API hors compose (`pnpm --filter @tracea/api dev` avec `TRUST_PROXY=false`) → refus explicite (couvert par les tests unitaires ; contrôle de bout en bout seulement).

Non vérifiables ici : exécution réelle de la CI (§ 7.4), activation de Dependabot, comportement de l'entrée de staging (§ 2.4), aucune plateforme n'étant encore choisie.

## 10. Suites

| Sujet                                                                                                                         | Rôle             | Quand                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------- |
| A16 : commiter les deux JSON Schema                                                                                           | Équipe du sprint | Au commit du sprint                       |
| S3-SEC-06 : rôle `tracea_purge` créé en staging puis en production, secret `tracea-purge` (§ 4.5) ; confirmation backend      | Devops, backend  | Avant le premier staging                  |
| Règles d'entrée du § 2.4 (TLS, HSTS identique, pas de cache, `ETag` fort, `If-Match` transmis)                                | Devops           | Premier environnement staging             |
| Job `deploy` : image `web` par environnement et étiquetage du § 2.3                                                           | Devops           | Premier environnement staging             |
| Vérifications compose du § 9.2 et du sprint 2, résultat consigné ici                                                          | Devops           | Avant le premier staging                  |
| Premier passage réel de la CI et activation de Dependabot (§ 7.4)                                                             | Devops           | Première PR vers `develop`, fusion `main` |
| S3-SEC-05 avec S2-SEC-09 : limite par utilisateur ; d'ici là, suivi des 429 (§ 5)                                             | Backend          | Avant l'ouverture publique et CU-05       |
| CSP seconde étape (nonce) : mesure de l'effet du rendu dynamique sur l'image `web`                                            | Devops, frontend | Avec D27 seconde étape                    |
| Métrique de la purge (dernière réussite, trois compteurs), métriques 412 et 429                                               | Devops           | Avec l'observabilité                      |
| Conservation de `audit_log` (CU-14) et suivi de sa taille                                                                     | Porteur, devops  | Avant la production                       |
| Grouper à part les versions majeures dans `dependabot.yml` (`update-types`) si les PR groupées deviennent difficiles à relire | Devops           | Selon l'expérience des premières PR       |
