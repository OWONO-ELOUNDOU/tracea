# Revue de sécurité — sprint 2 (Mes projets)

| Champ                     | Valeur                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle                      | Sécurité (tâche S2-9)                                                                                                                                                                                                                                       |
| Date                      | 17 novembre 2026                                                                                                                                                                                                                                            |
| Périmètre                 | Branche `feature/projects`, travail non commité : routes et service `/projects`, migration `0001_projects`, purge (`apps/api/src/maintenance/`), API e2e (`apps/api/test/e2e-server.ts`), écran `/projets`, paquet `e2e/`, `.npmrc`, CI (job `e2e`), verrou |
| Références                | `docs/plans/sprint-2-projects.md` (S2-9, D4, D7, D8, D10), `docs/qa/sprint-2-projects.md` (A1 à A9), `docs/security/sprint-1-auth.md`, `docs/specs/reference/02-architecture.md` § 7 et § 8, `infra/`                                                       |
| Surface d'attaque touchée | Projets des utilisateurs (lecture, écriture, suppression, purge), limitation de débit de toute l'API, écran web connecté, chaîne CI et dépendances de test                                                                                                  |

## 1. Décision

**Fusion bloquée.** Un constat de gravité haute (S2-SEC-01, anomalie QA A1) : avec `trustProxy: true`, toute limite de débit de l'API est contournable en changeant l'en-tête `X-Forwarded-For`. La protection contre le forçage des mots de passe, l'abus d'envoi d'e-mails et la saturation par calcul Argon2id est inopérante. Le défaut date du sprint 1, mais la règle du rôle s'applique : un constat haut bloque la livraison.

Le blocage est levé dès que S2-SEC-01 est corrigé selon le § 4.1 et que la QA a relancé `pnpm test`, `pnpm e2e` et la sonde des limites de débit. Aucune autre condition : les constats moyens et bas sont des suites à planifier (§ 5), sans effet sur la fusion.

Le code propre au sprint (isolation des projets, validation, CSRF, pagination, purge, API e2e) ne présente aucun constat critique ou haut.

**Mise à jour du 18 novembre 2026 : blocage levé.** Les conditions ci-dessus sont remplies. S2-SEC-01 est corrigé selon le § 4.1 (`trustProxy: config.TRUST_PROXY ?? false`, variable `TRUST_PROXY` vide par défaut, valeurs `true`, `*`, plages `/0` et nombres refusées au démarrage, tests `apps/api/test/trust-proxy.test.ts`). La revérification QA (`docs/qa/sprint-2-projects.md`, § 12) a relancé `pnpm test` et `pnpm e2e` (verts) et la sonde des limites de débit : avec un `X-Forwarded-For` tournant, la connexion répond 429 dès la 11ᵉ tentative, `password/forgot` dès la 6ᵉ, et la limite globale tient. S2-SEC-02 est également corrigé et vérifié. Les suites du § 5 restent à planifier.

## 2. Contrôles effectués

Méthode : relecture du diff et des fichiers nouveaux ; sondes jetables hors du dépôt (application de production construite par `buildApp` en `NODE_ENV=development`, base embarquée, deux comptes, requêtes par `inject` de Fastify) ; `pnpm audit` ; relevé des licences du verrou. Aucun fichier du dépôt modifié hors de ce rapport.

| Domaine                 | Contrôle                                                                                                                                                                                                                                                                                                                                                                                            | Résultat                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Isolation par compte    | Chaque requête SQL sur un projet porte `owner_id`, `id` et `deleted_at IS NULL` dans son propre `WHERE` (`owned()`), mises à jour et suppression par `UPDATE … RETURNING` sans lecture préalable. Sonde : le compte B obtient sur `GET`, `PATCH`, `duplicate`, `DELETE` du projet de A, sur un UUID inexistant et sur un identifiant non UUID **un seul et même corps** 404 `PROJECT_NOT_FOUND`     | Conforme                     |
| Pagination              | Curseur de A rejoué par B : seule la liste de B est parcourue (vide). Curseur forgé (date future, UUID maximal) : uniquement les projets de B. Curseur contenant une charge SQL : 422. Le filtre `owner_id` est toujours appliqué avec le curseur, valeurs passées en paramètres liés. `limit` tableau → 422, bornes 1 à 50                                                                         | Conforme                     |
| Affectation de masse    | Schémas Zod stricts : `ownerId`, `id`, `deletedAt`, `parameters`, `site` refusés (422). `owner_id` vient de la session. `__proto__` et `constructor.prototype` refusés par l'analyseur JSON (400)                                                                                                                                                                                                   | Conforme                     |
| Entrées                 | Nom 1 à 120 après nettoyage, sans `\p{Cc}` ; description ≤ 2 000 unités et sans NUL ; corps ≤ 1 Mio ; `text/plain` → 422, formulaire → 415. Restent les caractères invisibles et bidirectionnels (S2-SEC-04) et la taille des réponses 422 (S2-SEC-06)                                                                                                                                              | Conforme, réserves basses    |
| Authentification        | Six routes → 401 sans session ; cookie de session `HttpOnly`, signé, `SameSite=Lax` (`Secure` en production, inchangé)                                                                                                                                                                                                                                                                              | Conforme                     |
| CSRF                    | Double soumission exigée sur `POST`, `PATCH`, `DELETE` de `/projects` (403 sans en-tête, sonde) ; le client web envoie `X-CSRF-Token` sur toute méthode autre que `GET`. CORS : origine unique `APP_URL`                                                                                                                                                                                            | Conforme                     |
| Limitation de débit     | Nominal conforme (connexion 10 / 15 min, e-mail 5 / 15 min, globale 60 / min). **Contournement par `X-Forwarded-For`** sur toutes les limites                                                                                                                                                                                                                                                       | **Non conforme** (S2-SEC-01) |
| Journalisation et audit | `project.create/update/duplicate/delete`, `metadata` limitée à `fields` (noms de clés) et `sourceProjectId` ; ni nom ni description (sonde sur la table). Purge : compteurs seuls ; en échec, classe et message d'erreur, sans contenu de ligne                                                                                                                                                     | Conforme                     |
| Suppression (CU-14)     | Suppression logique, 404 immédiat partout, purge définitive après 30 jours avec versions en cascade ; l'audit ne garde que des identifiants. Sessions expirées purgées (report du sprint 1 soldé)                                                                                                                                                                                                   | Conforme                     |
| Rendu web               | Nom affiché par React (échappé) ; aucun `dangerouslySetInnerHTML` ; un nom `<img src=x onerror=…>` est stocké tel quel et rendu en texte. Redirection après connexion : S2-SEC-02. En-têtes de sécurité de l'application web : S2-SEC-03                                                                                                                                                            | Réserves moyennes            |
| API e2e                 | `apps/api/test/e2e-server.ts` hors de `src/` donc hors de `dist/` ; l'image API ne contient que `dist` et `drizzle` (`pnpm deploy --prod`, champ `files`) et ni `tsx` ni PGlite ; refus explicite de `NODE_ENV=production` ; base **toujours** embarquée et en mémoire (ne lit jamais `DATABASE_URL`) ; écoute sur `localhost` ; comptes insérés seulement en base embarquée ; aucune route ajoutée | Conforme                     |
| Secrets                 | Aucun secret dans le diff. Le secret de session de l'API e2e et les mots de passe de `e2e/fixtures/accounts.ts` sont propres à une base en mémoire éphémère. Job `e2e` sans secret                                                                                                                                                                                                                  | Conforme                     |
| CI                      | Job `e2e` sur `pull_request` (pas `pull_request_target`), cache des navigateurs indexé sur la version, artefacts (rapport, traces) en cas d'échec seulement, 14 jours, contenant uniquement des données de test. Pas de bloc `permissions` dans le flux (S2-SEC-11)                                                                                                                                 | Conforme, réserve basse      |
| `.npmrc`                | `public-hoist-pattern[]=eslint` : outillage de développement seulement, aucun effet sur les images                                                                                                                                                                                                                                                                                                  | Conforme                     |
| Dépendances             | § 6                                                                                                                                                                                                                                                                                                                                                                                                 | Acceptable                   |

## 3. Constats

| #         | Gravité | Constat                                                                                                     | Rôle                 | Bloquant |
| --------- | ------- | ----------------------------------------------------------------------------------------------------------- | -------------------- | -------- |
| S2-SEC-01 | Haute   | `trustProxy: true` : toutes les limites de débit contournables par `X-Forwarded-For` (A1)                   | Backend, puis devops | Oui      |
| S2-SEC-02 | Moyenne | Redirection ouverte après connexion : `?suivant=/\site-externe` envoie vers un autre domaine                | Frontend             | Non      |
| S2-SEC-03 | Moyenne | Application web servie sans CSP, sans `frame-ancestors` ni HSTS : `/projets` peut être encadrée             | Frontend, devops     | Non      |
| S2-SEC-04 | Basse   | Noms invisibles (U+200B), inversion bidirectionnelle (U+202E) et demi-paires de substitution acceptés (A4)  | Backend, frontend    | Non      |
| S2-SEC-05 | Basse   | Erreurs 4xx du cadriciel renvoyées brutes : titre `FastifyError`, code et message internes en anglais (A3)  | Backend              | Non      |
| S2-SEC-06 | Basse   | Réponse 422 qui recopie toutes les clés inconnues : 1,2 Mo renvoyés pour 0,8 Mo reçus                       | Backend              | Non      |
| S2-SEC-07 | Basse   | Limites d'e-mail par route et par adresse IP seulement : 15 envois / 15 min, aucune limite par destinataire | Backend              | Non      |
| S2-SEC-08 | Basse   | La commande de purge exige `SESSION_SECRET` sans l'utiliser (A8)                                            | Backend, devops      | Non      |
| S2-SEC-09 | Basse   | Aucun plafond de projets ni limite de débit par utilisateur sur les mutations (D10)                         | Backend              | Non      |
| S2-SEC-10 | Basse   | `projects.current_version_id` peut désigner une version d'un autre projet (aucune contrainte en base)       | Backend              | Non      |
| S2-SEC-11 | Basse   | CI sans bloc `permissions` ; actions référencées par étiquette et non par empreinte                         | Devops               | Non      |
| S2-SEC-12 | Basse   | Jetons d'e-mail expirés ou utilisés jamais purgés                                                           | Backend              | Non      |

### S2-SEC-01 — Limites de débit contournables (haute)

**Preuve.** `apps/api/src/app.ts` : `trustProxy: true`. Fastify prend alors comme adresse cliente la première valeur de `X-Forwarded-For`, choisie par le client ; `@fastify/rate-limit` compte par `request.ip`. Sonde (même connexion réseau, mauvais mot de passe) :

- 11 tentatives sans en-tête : `401 ×10`, puis `429` ;
- 30 tentatives supplémentaires, chacune avec un `X-Forwarded-For` différent : `401 ×30`, aucune limite ;
- bon mot de passe avec un en-tête nouveau après blocage : `200` ;
- `POST /auth/password/forgot` ×8 avec en-tête tournant : `202 ×8` ;
- `POST /projects` ×80 en une minute avec en-tête tournant : 80 × `201` (la limite globale de 60 / min ne s'applique pas) ; sans en-tête, `429` dès la 34ᵉ.

**Gravité haute.** La limite de connexion est la seule protection contre le forçage et le bourrage d'identifiants (pas de verrouillage de compte, report du sprint 1). Chaque connexion calcule un Argon2id à 64 Mio : sans limite globale effective, quelques dizaines de requêtes simultanées suffisent à épuiser la mémoire du conteneur. L'adresse enregistrée dans `sessions.ip` est également falsifiable. Exploitable sans compte, à distance, en une ligne de `curl`.

**Correctif** : § 4.1. **Rôle** : backend (code et tests), puis devops (valeur par environnement dans la note S2-10).

### S2-SEC-02 — Redirection ouverte après connexion (moyenne)

**Preuve.** `apps/web/src/app/(auth)/connexion/login-form.tsx`, `safeNext` accepte toute valeur commençant par `/` mais pas par `//`. Or `new URL("/\\site-externe.example", origine)` donne `http://site-externe.example/` (les navigateurs traitent `\` comme `/`), et le routeur de Next.js 15.5 (`app-router-instance.js`, `isExternalURL`) effectue alors une navigation complète vers ce domaine. Lien piégé : `/connexion?suivant=/%5Csite-externe.example` → après une connexion réelle, l'utilisateur arrive sur une page tierce imitant Tracea (hameçonnage). Antérieur au sprint ; le sprint s'appuie dessus (`/connexion?suivant=/projets`).

**Correctif.** Dans `safeNext`, résoudre la valeur avec `new URL(value, window.location.origin)` et n'accepter que si `url.origin === window.location.origin`, puis renvoyer `url.pathname + url.search + url.hash` ; refuser aussi toute valeur contenant `\` ou un caractère de contrôle. Tests à ajouter (Vitest) : `/\site.example`, `/\/site.example`, `//site.example`, `https://site.example`, `/%5Csite.example` après décodage, `javascript:…` → `/projets` ; `/projets?x=1` conservé. **Rôle** : frontend.

### S2-SEC-03 — En-têtes de sécurité absents sur l'application web (moyenne)

**Preuve.** `apps/web/next.config.ts` ne définit pas `headers()` et il n'existe pas de `middleware.ts` : les pages servies par `next start` ou par l'image `standalone` ne portent ni `Content-Security-Policy`, ni `X-Frame-Options` / `frame-ancestors`, ni `Strict-Transport-Security`, ni `Referrer-Policy`. L'API, elle, les porte (helmet). Conséquence actuelle : `/projets` peut être encadrée par un site tiers (détournement de clic sur Dupliquer et Supprimer, qui demandent deux ou trois clics). Contraire à l'architecture § 7 (« CSP stricte, HSTS »). Antérieur au sprint, non relevé au sprint 1.

**Correctif.** Ajouter dans `next.config.ts` des en-têtes sur `/:path*` : `X-Frame-Options: DENY`, `Content-Security-Policy` avec au minimum `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; connect-src 'self' <NEXT_PUBLIC_API_URL>`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, et `Strict-Transport-Security` en production. Une `script-src` stricte sans `unsafe-inline` demande un nonce par requête (middleware) : à faire dans un second temps, à condition qu'axe et le parcours e2e restent verts. Test : e2e vérifiant la présence de `frame-ancestors 'none'` sur `/projets`. **Rôle** : frontend (configuration), devops (HSTS au niveau de l'entrée si elle termine TLS).

### S2-SEC-04 — Caractères invisibles et bidirectionnels dans les noms (basse, avis A4)

**Preuve.** Sonde : nom `"​​"` → 201 (carte sans titre visible) ; `"plan‮fdp.exe"` → 201 ; demi-paire de substitution `"a\ud800b"` → 201 (stockée remplacée par U+FFFD). U+FEFF seul est refusé (retiré par `trim`).

**Avis.** Pas de risque de sécurité au sprint 2 : le nom n'apparaît que dans l'écran de son propriétaire, rendu en texte. Le risque devient réel avec le partage (EF-103 : un nom piégé affiché chez un autre utilisateur) et les exports (nom de fichier dérivé du nom de projet : `plan‮fdp.exe` s'affiche `planexe.pdf`). À corriger **avant** le sprint des exports ou du partage, pas avant la fusion.

**Correctif.** `apps/api/src/routes/projects.ts`, schéma `name` : refuser les contrôles bidirectionnels (U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069) et les chaînes mal formées (`value.isWellFormed()`), et exiger au moins un caractère visible (la valeur privée de `\p{Cf}` et `\p{Z}` reste non vide). Ne pas refuser tout `\p{Cf}` : U+200D sert aux émojis composés. Tests : les trois cas de la sonde → 422 `fields.name` ; `"Maison 👨‍👩‍👧"` → 201. Côté écran, en défense supplémentaire, afficher le nom dans un élément `<bdi>` (ou avec `dir="auto"`). **Rôle** : backend, frontend pour `<bdi>`.

### S2-SEC-05 — Erreurs du cadriciel renvoyées brutes (basse, avis A3)

**Preuve.** `apps/api/src/problem.ts`, dernière ligne de `problemErrorHandler` : `problem(status, error.code, error.name, error.message)`. JSON mal formé → `400`, `title: "FastifyError"`, `code: "FST_ERR_CTP_INVALID_JSON_BODY"`, détail en anglais ; type de contenu non pris en charge → `415` `FST_ERR_CTP_INVALID_MEDIA_TYPE`.

**Avis.** Fuite d'information faible : le nom du cadriciel et des codes internes, rien sur les données, les comptes ou la configuration. Le vrai risque est futur : tout greffon qui lève une erreur 4xx avec un message détaillé le verra recopié tel quel au client.

**Correctif.** Pour toute erreur non `ApiError` de statut 4xx, ne jamais renvoyer `error.name` ni `error.message` : table de correspondance vers des codes et textes français (`FST_ERR_CTP_INVALID_JSON_BODY` et `FST_ERR_CTP_EMPTY_JSON_BODY` → 400 `INVALID_BODY` « Corps de requête invalide » ; 413 → `PAYLOAD_TOO_LARGE` ; 415 → `UNSUPPORTED_MEDIA_TYPE`), défaut 4xx → `REQUEST_ERROR` « Requête invalide » ; journaliser le code d'origine au niveau `info`. Test : JSON mal formé et `__proto__` → corps sans « Fastify » ni « FST_ », titre en français. **Rôle** : backend.

### S2-SEC-06 — Réponse 422 proportionnelle au nombre de clés inconnues (basse)

**Preuve.** `apps/api/src/validation.ts` crée une entrée `fields` par clé refusée, en recopiant son nom. Sonde : 20 000 clés inconnues (0,8 Mo, sous la limite de 1 Mio) → 422 de 1,2 Mo. Amplification modeste, pas d'injection (JSON).

**Correctif.** Plafonner à 20 entrées `fields` par réponse et tronquer les noms de clé à 64 caractères. Test : 1 000 clés inconnues → au plus 20 entrées. **Rôle** : backend.

### S2-SEC-07 — Limites d'envoi d'e-mail (basse, avis A6)

**Preuve.** `apps/api/src/routes/auth.ts` : `mailRateLimit` (5 / 15 min) appliqué séparément à `register`, `resend-verification` et `password/forgot` ; compteurs par adresse IP.

**Avis.** Les trois compteurs séparés (15 envois par client) sont acceptables en soi. Le manque réel est l'absence de limite par **adresse destinataire** : même après S2-SEC-01, un attaquant disposant de plusieurs adresses IP peut inonder la boîte d'une victime et dégrader la réputation d'envoi du domaine.

**Correctif.** (a) Compteur commun aux trois routes : option `groupId: "mail"` de `@fastify/rate-limit` (prise en charge par la version 10.3 installée). (b) Limite par destinataire dans `AuthService` (par exemple 3 e-mails par heure et par adresse, comptés en base sur `email_tokens.created_at`), au-delà de laquelle l'envoi est **ignoré sans changer la réponse** pour ne pas rouvrir l'énumération de comptes. Tests : 4ᵉ demande pour la même adresse en une heure → 202 et aucun e-mail dans `MemoryMailer`. **Rôle** : backend, sprint 3.

### S2-SEC-08 — Secret inutile dans la commande de purge (basse, avis A8)

**Preuve.** `apps/api/src/maintenance/cli.ts` appelle `loadConfig()`, qui exige `SESSION_SECRET` ; la purge n'utilise que `DATABASE_URL`. Le planificateur doit donc détenir le secret de signature des sessions : surface d'exposition élargie sans besoin (moindre privilège).

**Correctif.** Schéma de configuration propre à la commande (`DATABASE_URL`, `LOG_LEVEL`), sans `SESSION_SECRET`. Test : `loadMaintenanceConfig({ DATABASE_URL })` réussit sans secret. Devops : ne pas fournir `SESSION_SECRET` à la tâche planifiée (note S2-10). Idéalement, la tâche se connecte avec un rôle PostgreSQL limité à `DELETE` sur `sessions` et `projects`. **Rôle** : backend, devops.

### S2-SEC-09 — Pas de plafond de projets (basse, avis D10)

**Constat.** Aucun plafond par compte ; seule la limite globale par adresse IP (60 / min, inopérante tant que S2-SEC-01 n'est pas corrigé) borne la création et la duplication. Une fois S2-SEC-01 corrigé, un compte peut encore créer environ 86 000 projets par jour et par adresse. Au sprint 2, une ligne pèse au plus quelques kilo-octets ; avec les versions, chaque duplication copiera un `BuildingModel` (jusqu'à 300 Ko) : l'amplification deviendra significative.

**Avis D10.** Pas de blocage au sprint 2. Avant la première route qui écrit dans `versions` : plafond provisoire par compte (par exemple 500 projets, corbeille comprise ; 422 ou 409 avec un code dédié), et limite de débit des mutations `/projects` **par utilisateur** (`keyGenerator` sur `request.user.id`, par exemple 30 / min), en attendant les quotas d'EF-105. **Rôle** : backend, arbitrage du chiffre par le porteur du projet.

### S2-SEC-10 — Version courante non liée à son projet en base (basse)

**Constat.** `0001_projects.sql` : `projects.current_version_id → versions.id` sans garantie que la version appartienne au même projet. Aucune route actuelle ne permet de l'exploiter (la duplication crée sa propre version), mais une future route de restauration ou d'édition qui recevrait un identifiant de version du client pourrait faire pointer un projet vers la version d'un autre utilisateur, que `findDetail` et `duplicate` liraient ensuite.

**Correctif.** Avant les routes de versions : contrainte composite (`unique (project_id, id)` sur `versions`, clé étrangère `(id, current_version_id) → versions(project_id, id)` sur `projects`), et toute écriture de `current_version_id` faite par le service à partir d'une version filtrée sur le projet. Test : rattachement d'une version d'un autre projet refusé par la base. **Rôle** : backend.

### S2-SEC-11 — Permissions de la CI (basse)

**Constat.** `.github/workflows/ci.yml` n'a pas de bloc `permissions` : le `GITHUB_TOKEN` reçoit les droits par défaut du dépôt, qui peuvent inclure l'écriture. Les actions tierces sont référencées par étiquette mobile (`@v4`, `@v2`). Le nouveau job `e2e` n'aggrave rien (aucun secret, `pull_request`), mais exécute davantage de code tiers (navigateurs, Playwright).

**Correctif.** `permissions: contents: read` au niveau du flux ; droits supplémentaires au niveau d'un job seulement si nécessaire (par exemple `pull-requests: write` pour les commentaires de gitleaks). Épingler les actions par empreinte de commit avec l'étiquette en commentaire, et laisser Renovate ou Dependabot les tenir à jour. **Rôle** : devops.

### S2-SEC-12 — Jetons d'e-mail non purgés (basse, réponse au plan § 7)

**Constat.** `email_tokens` conserve indéfiniment les jetons expirés ou utilisés. Ils ne sont stockés que hachés et sont inutilisables : risque faible, mais conservation de données liées à un compte sans finalité.

**Correctif.** Ajouter à `purgeExpired` la suppression des jetons expirés ou utilisés depuis plus de 7 jours, avec un troisième compteur. Test d'intégration analogue à celui des sessions. **Rôle** : backend, sprint 3.

## 4. Décisions du rôle

### 4.1 A1 : bloquant, réglage de `trustProxy`

**A1 est bloquant pour la fusion** (S2-SEC-01, gravité haute).

**Architecture de déploiement.** `02-architecture.md` § 8 : Kubernetes managé ou plateforme de conteneurs (choix non arrêté, § 10.3), donc l'API sera derrière **un** répartiteur ou contrôleur d'entrée qui termine TLS et ajoute `X-Forwarded-For`. En local (`docker-compose.yml`), l'API est exposée directement (port 3001) et le navigateur l'appelle sans intermédiaire (`NEXT_PUBLIC_API_URL=http://localhost:3001`). L'API e2e et les tests n'ont aucun mandataire non plus.

**Fait technique à respecter.** Le Fastify installé (5.12.8) ignore un `trustProxy` numérique (« nombre de sauts ») : il ne fait alors confiance à rien, par sécurité (`lib/request.js`, `getTrustProxyFn`). Sonde : avec `trustProxy: 1`, une requête relayée par un mandataire en `10.1.1.1` est attribuée à `10.1.1.1`, si bien que tous les clients partageraient un seul compteur. Le réglage doit donc être une **liste d'adresses ou de plages** de mandataires de confiance. Sonde : avec `"10.0.0.0/8"`, un client direct qui falsifie l'en-tête garde sa vraie adresse, et un client relayé par `10.1.1.1` avec `X-Forwarded-For: <falsifiée>, <réelle>` est bien attribué à l'adresse réelle.

**Réglage retenu.**

1. `apps/api/src/config.ts` : nouvelle variable `TRUST_PROXY`, chaîne facultative, **vide par défaut = aucun mandataire de confiance** (`trustProxy: false`). Valeur non vide : liste séparée par des virgules d'adresses IP, de plages CIDR ou des mots-clés `loopback`, `linklocal`, `uniquelocal` (syntaxe `proxy-addr`). Refuser au démarrage `true`, `*`, `0.0.0.0/0`, `::/0` et toute valeur numérique, avec un message explicite.
2. `apps/api/src/app.ts` : `trustProxy: config.TRUST_PROXY === undefined ? false : config.TRUST_PROXY`, à la place de `true`.
3. `.env.example` : `TRUST_PROXY=` commenté (vide en local et en e2e ; en staging et production, plage d'adresses du répartiteur ou du contrôleur d'entrée).
4. Devops (note S2-10) : par environnement, la plage exacte des mandataires qui joignent l'API ; vérifier que l'API n'est joignable **que** par ce mandataire (pas de port de nœud ni d'adresse publique directe), sans quoi la plage de confiance devient elle-même falsifiable. Si la plateforme retenue ne publie pas d'adresses stables, `uniquelocal` n'est admissible que si le réseau de l'API est privé et réservé au répartiteur ; sinon, revenir vers le rôle sécurité.

**Tests à ajouter** (`apps/api/test/`) :

- configuration par défaut, limites strictes actives : 10 connexions refusées depuis une même adresse distante, puis une 11ᵉ avec un `X-Forwarded-For` nouveau → **429** ; même schéma sur `password/forgot` (6ᵉ → 429) ;
- `TRUST_PROXY="10.0.0.0/8"` : requête depuis `10.1.1.1` avec `X-Forwarded-For: 203.0.113.7, 198.51.100.9` → adresse retenue `198.51.100.9` (vérifiable par la clé de limitation ou une route de test locale à la suite) ; requête directe depuis `198.51.100.9` avec `X-Forwarded-For: 203.0.113.7` → `198.51.100.9` ;
- `loadConfig` refuse `TRUST_PROXY=true` et `TRUST_PROXY=1`.

Ces tests demandent que les limites strictes soient activables en test indépendamment de `NODE_ENV` (option explicite de `buildApp` plutôt que le seul `NODE_ENV !== "test"`) ; le comportement de l'API e2e reste inchangé.

La QA rejoue ensuite sa sonde du § 8 (`docs/qa/sprint-2-projects.md`) avec en-tête falsifié : attendu 429.

### 4.2 D4 : identifiants UUID v4

**Avis : conserver les UUID v4 (`gen_random_uuid()`) pour toutes les tables, et aligner la spécification sur le code.**

- Un UUID v4 de `gen_random_uuid()` porte 122 bits issus du générateur cryptographique de PostgreSQL ; un UUID v7 n'en porte qu'environ 74 aléatoires et expose l'instant de création en clair (48 bits de temps). Pour l'objectif « non devinables » de l'architecture § 7, v4 est **plus** sûr que v7.
- L'isolation ne repose pas sur l'imprévisibilité des identifiants : chaque requête filtre sur le propriétaire et répond 404 sans distinction (§ 2). L'imprévisibilité est une défense supplémentaire, pas la défense principale.
- Les identifiants de session sont aussi des UUID v4 de la base, signés par HMAC dans le cookie : ils **ne doivent pas** passer en v7 (horodatage visible, moins d'aléa). Si v7 est adopté un jour pour la localité des index, ce sera pour des identifiants non secrets seulement, jamais pour les sessions ni les jetons.
- À faire : remplacer dans `02-architecture.md` § 7 « UUID v7 non devinables » par « UUID v4 aléatoires (122 bits, générateur cryptographique de la base) ». Rôle : planificateur, décision finale du porteur du projet.

### 4.3 D10 : plafond de projets

Avis donné en S2-SEC-09 : pas de plafond exigé au sprint 2 ; plafond provisoire et limite de débit par utilisateur obligatoires avant la première écriture de versions.

### 4.4 Avis sur A4, A6, A8 et A3

Donnés en S2-SEC-04, S2-SEC-07, S2-SEC-08 et S2-SEC-05 : aucun n'est bloquant.

## 5. Suites

| Quand                                                   | Constats                                              | Rôle                        |
| ------------------------------------------------------- | ----------------------------------------------------- | --------------------------- |
| Avant la fusion                                         | S2-SEC-01, puis nouvelle recette ciblée par la QA     | Backend, devops (S2-10), QA |
| Avec S2-SEC-01 (conseillé, correctifs courts)           | S2-SEC-02, S2-SEC-05, S2-SEC-08                       | Frontend, backend           |
| Sprint 3                                                | S2-SEC-03, S2-SEC-06, S2-SEC-07, S2-SEC-11, S2-SEC-12 | Frontend, backend, devops   |
| Avant l'écriture de versions, le partage ou les exports | S2-SEC-04, S2-SEC-09, S2-SEC-10                       | Backend, frontend           |

Points d'attention pour les sprints suivants, sans constat aujourd'hui :

- Le nom de projet accepte du HTML et sera repris dans les exports (SVG, PDF, DXF, IFC) et les noms de fichiers : échappement propre à chaque format et nom de fichier assaini dans `Content-Disposition`.
- Après la purge, les données d'un projet restent dans les sauvegardes jusqu'à 30 jours (architecture § 8.5) : à mentionner dans l'information RGPD sur la suppression effective (CU-14).
- Les constats moyens du sprint 1 (contrôle de mots de passe compromis, `Secure` en staging) restent ouverts.

## 6. Dépendances

**`pnpm audit`** (17 novembre 2026) : 0 critique, 0 haute, **2 modérées**, identiques au sprint 1 et limitées à l'outillage de développement : `esbuild` ≤ 0.24.2 via `drizzle-kit` (serveur de développement d'esbuild, non utilisé), `minimatch` < 11.0.1 via `eslint-plugin-import`. Le job `security` (`--audit-level=high`) reste vert. `pip-audit` non exécuté ici (`uv` absent) ; aucun changement sous `engine/`, le job `security` de la CI le couvre.

**Verrou** : 47 paquets nouveaux (52 entrées en comptant les variantes de résolution), 2 entrées réécrites (`next` et `vitest`, seule la résolution des dépendances homologues change, versions identiques). Tous proviennent du registre public avec empreinte `sha512` ; aucune source Git ni archive distante ; aucune autorisation de script d’installation ajoutée (`onlyBuiltDependencies` absent).

**Licences des paquets ajoutés** :

| Licence       | Paquets                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| MIT           | 35, dont `@testing-library/dom`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `undici`, `parse5`, `whatwg-url` |
| Apache-2.0    | `@playwright/test`, `playwright`, `playwright-core`, `aria-query`, `xml-name-validator`                                             |
| BSD-2-Clause  | `entities`, `webidl-conversions`                                                                                                    |
| BSD-3-Clause  | `tough-cookie`                                                                                                                      |
| ISC           | `saxes`                                                                                                                             |
| BlueOak-1.0.0 | `lru-cache` (permissive)                                                                                                            |
| MPL-2.0       | `axe-core`, `@axe-core/playwright`                                                                                                  |

Toutes sont compatibles. MPL-2.0 est un copyleft limité au fichier : il ne s'applique qu'en cas de modification et de distribution des fichiers d'axe-core, ce qui n'arrive pas ici. Tous ces paquets sont des dépendances de développement (`apps/web` pour Testing Library et `jsdom`, `e2e/` pour Playwright et axe) : ils ne figurent ni dans l'image API (`pnpm deploy --prod`) ni dans la sortie `standalone` de l'application web. Justification fonctionnelle : tests d'écran (S2-5) et parcours e2e avec contrôle d'accessibilité (S2-6, S2-7), prévus au plan § 5.
