# Rapport QA — sprint 3 (Décrire le bâtiment et définir le terrain)

| Champ      | Valeur                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle       | QA (tâche S3-10)                                                                                                                                                                                         |
| Date       | 19 novembre 2026                                                                                                                                                                                         |
| Périmètre  | `docs/plans/sprint-3-project-description.md` (S3-1 à S3-9, contrat § 3, décisions D15 à D30), branche `feature/project-description`, travail non commité (`git status` : 56 entrées avant la recette)    |
| Références | `docs/specs/screens/project-description.md`, `docs/specs/screens/projects.md`, `docs/specs/reference/` (CU-03, CU-04, EF-200 à EF-202, API § A.1 et § A.3, modèle § 2.4), `docs/qa/sprint-2-projects.md` |

## 1. Décision

**Accepté avec réserves. Passage au rôle Sécurité (S3-11).**

Toutes les commandes passent, le parcours de bout en bout passe trois fois de suite (14 tests), la sonde du contrat § 3 relève 167 contrôles conformes sur 169 (les deux écarts restants sont des attentes de la sonde, pas du code, § 5) et les sondes navigateur confirment l'enregistrement automatique, les états d'erreur, le départ de la page, le parcours clavier et l'absence de violation axe-core sur 15 états. Aucun écart P1, P2 ni P3. Neuf écarts P4 (A12 à A20) sont renvoyés aux rôles concernés ; aucun ne bloque la revue de sécurité.

## 2. Environnement

- macOS 13, Node 24.15.0, pnpm 10.28.0 (via corepack), Chromium de Playwright 1.65 (plateforme forcée à `mac14` par variable de session, rien dans le dépôt).
- Absents de la machine : Docker, `uv`, `gh`. Conséquences au § 10.
- Aucun fichier du dépôt n'a été modifié en dehors de ce rapport. Les sondes (API e2e sur base embarquée, serveur web autonome du build de production, scripts `fetch` et Playwright, mesure de couverture, `drizzle-kit generate`) ont été lancées hors du dépôt ; tous les serveurs ont été arrêtés à la fin (ports 3000 et 3001 libres).
- `pnpm --filter @tracea/domain schema` réécrit les trois fichiers de `packages/domain/schema` à l'identique (empreintes SHA-1 inchangées entre deux exécutions).

## 3. Commandes exécutées

| Commande                                                                                              | Résultat                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @tracea/domain build`                                                                  | OK, sortie 0                                                                                                                                                                                                                                                          |
| `pnpm format:check`                                                                                   | OK — « All matched files use Prettier code style! »                                                                                                                                                                                                                   |
| `pnpm lint --force`                                                                                   | OK — sortie 0, « Tasks: 5 successful, 5 total », aucun avertissement                                                                                                                                                                                                  |
| `pnpm typecheck --force`                                                                              | OK — sortie 0, « Tasks: 5 successful, 5 total »                                                                                                                                                                                                                       |
| `pnpm test --force`                                                                                   | OK — `@tracea/domain` 4 fichiers / 121 tests (sprint 2 : 23) ; `@tracea/api` 7 fichiers / 139 tests en 37,0 s (sprint 2 : 83) ; `@tracea/web` 6 fichiers / 108 tests en 18,5 s (sprint 2 : 56)                                                                        |
| Couverture de `packages/domain` (copie hors dépôt, `@vitest/coverage-v8` 5.1.0)                       | Instructions 93,71 %, branches 85,55 %, fonctions 96,25 %, lignes 97,24 % ; `project-input.ts` : 98,09 % / 91,83 % / 100 % / 100 %. Seuil de 80 % respecté. Le dépôt ne déclare pas `@vitest/coverage-v8` : `vitest run --coverage` y échoue (« MISSING DEPENDENCY ») |
| `pnpm --filter @tracea/domain run contract`                                                           | OK — 14 fixtures : `house-rectangular.json`, 6 entrées valides acceptées, 7 invalides refusées (`[OK]` pour chacune)                                                                                                                                                  |
| `pnpm --filter @tracea/domain schema` puis `git diff --exit-code -- packages/domain/schema`           | OK — sortie 0 ; régénération déterministe. Les deux nouveaux fichiers ne sont pas suivis par Git : voir A16                                                                                                                                                           |
| `git diff develop -- packages/domain/src/schema.ts packages/domain/schema/building-model.schema.json` | Vide : `BuildingModel` et `SCHEMA_VERSION` (`1.0`) inchangés ; `domain` ne dépend que de `zod`                                                                                                                                                                        |
| `drizzle-kit generate` (configuration et sortie hors dépôt)                                           | OK — « No schema changes, nothing to migrate » ; `diff -r` avec `apps/api/drizzle` vide                                                                                                                                                                               |
| `pnpm --filter @tracea/web build`                                                                     | OK — `/projets/[id]` dynamique, 46,9 kB, **160 kB** au premier chargement (`/projets` : 117 kB ; socle partagé : 102 kB)                                                                                                                                              |
| `pnpm e2e` (3 lancements consécutifs)                                                                 | OK — 14 tests passés à chaque lancement (43,1 s, 41,6 s, 45,3 s), aucun réessai ; aucune attente fixe (`waitForTimeout` absent de `e2e/`)                                                                                                                             |
| `uv run pytest`, partie Python de `pnpm contract`                                                     | Non exécutés : `uv` absent ; aucune modification sous `engine/` (D23)                                                                                                                                                                                                 |

Tests e2e : `project-description.spec.ts` (parcours complet et rechargement, isolation entre comptes, conflit entre deux onglets), `projects.spec.ts` (création suivie de l'ouverture, tuile, isolation), `security-headers.spec.ts` (cinq en-têtes, aucune violation CSP, `connect-src` bloquant, encadrement refusé, fragment après connexion A11, `suivant` externe refusé), `smoke.spec.ts`.

## 4. Critères d'acceptation S3-1 à S3-9

| Tâche | Critère                                                                                                   | Verdict                      | Preuve                                                                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3-1  | Portée de la consultation du cadre `6:30`, libellés relevés ou non                                        | Conforme                     | En-tête de la spécification ; libellés non relevés listés au § 14.3                                                                                           |
| S3-1  | Reprise du § 4 du plan élément par élément, avec calques                                                  | Conforme                     | § 3.1 de la spécification ; éléments masqués absents de l'écran (sonde et test « Ce que le moteur a compris »)                                                |
| S3-1  | Route, titre, DOM, champs, pièces, exemples, aperçu, états, enregistrement, 412, zone vide, accessibilité | Conforme                     | § 3 à § 12 de la spécification, recoupés par les sondes du § 6                                                                                                |
| S3-1  | Aucune route web autre que `/projets` et `/projets/{id}`                                                  | Conforme                     | Build : aucune autre route ajoutée                                                                                                                            |
| S3-1  | Relecture par le frontend et le backend                                                                   | Non vérifiable               | Pas de trace écrite ; les reformulations du § 9.4 sont appliquées dans `domain`, mais le § 9.2 n'a pas été mis à jour (A17)                                   |
| S3-2  | Schémas, bornes, défauts, utilitaires, messages                                                           | Conforme                     | Sonde § 5 ; 121 tests ; messages en m et m²                                                                                                                   |
| S3-2  | `BuildingModel` inchangé, `domain` sans dépendance nouvelle                                               | Conforme                     | § 3                                                                                                                                                           |
| S3-2  | JSON Schema exportés et versionnés, contrôle CI vert                                                      | Conforme, réserve            | Régénération identique ; fichiers non suivis (A16)                                                                                                            |
| S3-2  | `contract` valide les fixtures valides et refuse les invalides                                            | Conforme                     | § 3                                                                                                                                                           |
| S3-2  | § 2.4 du document de modèle                                                                               | Conforme                     | `03-modele-et-exports.md` § 2.4 « Entrées du projet : paramètres et terrain »                                                                                 |
| S3-2  | Couverture de `domain` ≥ 80 %                                                                             | Conforme                     | 93,71 % des instructions (§ 3)                                                                                                                                |
| S3-2  | Tests attendus (bornes, doublon, garage, `null`, polygone, conversions, émoji)                            | Conforme                     | `project-input.test.ts` ; doublon masqué par une autre ligne sans type (A12)                                                                                  |
| S3-3  | Contrat § 3.2 et § 3.3                                                                                    | Conforme                     | Sonde § 5                                                                                                                                                     |
| S3-3  | Schémas importés de `@tracea/domain`, plus de schéma local                                                | Conforme                     | `routes/projects.ts`                                                                                                                                          |
| S3-3  | Comptage en points de code (A9, D26)                                                                      | Conforme                     | 2 000 émoji acceptés, 2 001 refusés ; copie d'un nom de 120 émoji : 112 émoji + « (copie) »                                                                   |
| S3-3  | Aucune migration                                                                                          | Conforme                     | § 3                                                                                                                                                           |
| S3-3  | Filtre `If-Match` dans le même `UPDATE` que le filtre propriétaire                                        | Conforme                     | Lecture de `projects/service.ts` ; deux `PATCH` simultanés avec le même `If-Match` : un 200, un 412                                                           |
| S3-3  | Audit sans contenu                                                                                        | Conforme                     | Test « audits the modified groups without their content » ; non observable par HTTP                                                                           |
| S3-3  | OpenAPI : composants issus de Zod, `ETag`, `If-Match`, 412                                                | Conforme                     | `GET /v1/openapi.json` : `ProjectParameters`, `ProjectSite` ; réponses `PATCH` 200, 400, 401, 403, 404, 412, 413, 415, 422, 429                               |
| S3-3  | § A.1 et § A.3 à jour, `/site/import` reporté                                                             | Conforme                     | Exemple `parameters.rooms.1.minArea`, débit « par adresse IP » (D29), ordre des contrôles (A5), états « Livré (sprint 3) » et « Reporté (CU-04) »             |
| S3-3  | Les 83 tests API existants restent verts                                                                  | Conforme                     | 139 tests verts                                                                                                                                               |
| S3-4  | Conforme à la spécification ; écarts dans la PR                                                           | Conforme ; PR non vérifiable | Sondes du § 6 ; aucune PR ouverte                                                                                                                             |
| S3-4  | Enregistrement automatique selon § 3.4                                                                    | Conforme                     | § 6.1                                                                                                                                                         |
| S3-4  | Aucune logique métier dans l'écran                                                                        | Conforme, réserve            | Bornes, validation, comptage, conversions, listes et zone constructible importés de `@tracea/domain` ; texte « Limite de 2 000 caractères » codé en dur (A19) |
| S3-4  | Aperçu SVG construit à partir de nombres, sans `dangerouslySetInnerHTML`                                  | Conforme                     | Aucune occurrence dans `apps/web/src` ; `site-preview.tsx`                                                                                                    |
| S3-4  | Éléments masqués absents ; utilisable au clavier                                                          | Conforme                     | § 6.3                                                                                                                                                         |
| S3-4  | Taille du JavaScript initial relevée                                                                      | Conforme                     | 160 kB (§ 3) ; à reporter dans la PR                                                                                                                          |
| S3-4  | Captures dans la PR                                                                                       | Non vérifiable               | Captures du frontend présentes hors dépôt (six états) ; pas de PR                                                                                             |
| S3-5  | Parcours complet, rechargement, retour, réouverture par la carte                                          | Conforme                     | `project-description.spec.ts`                                                                                                                                 |
| S3-5  | axe-core : vide, rempli, erreur de champ, dialogue d'exemples (plus conflit)                              | Conforme                     | 0 violation (WCAG 2 A / AA, 2.1)                                                                                                                              |
| S3-5  | Trois passages verts sans attente fixe ; isolation ; parcours du sprint 2 adapté                          | Conforme                     | § 3                                                                                                                                                           |
| S3-6  | Cinq en-têtes sur toutes les pages, CSP attendue, HSTS (D27)                                              | Conforme                     | `curl`, § 7                                                                                                                                                   |
| S3-6  | Pas de `script-src` ; aucune violation CSP ; encadrement refusé                                           | Conforme                     | `next.config.ts` ; `security-headers.spec.ts`                                                                                                                 |
| S3-6  | A11 : fragment conservé, attaques de `safeNext` refusées                                                  | Conforme                     | e2e et `redirect.test.ts`                                                                                                                                     |
| S3-7  | Erreurs du cadriciel traduites, code d'origine journalisé                                                 | Conforme, réserve            | Sonde § 5.6 ; `text/plain` donne 422 et non 415 (A13)                                                                                                         |
| S3-7  | `fields` plafonné à 20, clés à 64 caractères, ordre déterministe                                          | Conforme                     | Sonde § 5.6                                                                                                                                                   |
| S3-7  | `TRUST_PROXY=false` refusé avec indication                                                                | Conforme                     | « "false" is not a proxy address; to trust no proxy, leave TRUST_PROXY empty (TRUST_PROXY=) » ; idem `FALSE`, `off`, `no`, `none` ; vide accepté              |
| S3-8  | La purge ne lit que `DATABASE_URL` et `LOG_LEVEL`                                                         | Conforme, réserve            | § 8 ; `LOG_LEVEL=fatal` masque l'échec (A14)                                                                                                                  |
| S3-8  | Jetons d'e-mail purgés, troisième compteur, idempotence                                                   | Conforme (PGlite)            | `maintenance.test.ts` (8 jours supprimé, 6 jours conservé, second passage à zéro) ; PostgreSQL réel non vérifiable                                            |
| S3-9  | Chaque `uses:` épinglé par empreinte complète, étiquette en commentaire, vérifiée                         | Conforme                     | 25 `uses:` ; `grep -E "uses: [^@]+@v"` vide ; 8 empreintes recoupées avec `git ls-remote` des étiquettes publiées (§ 9)                                       |
| S3-9  | `dependabot.yml` : `github-actions`, `/`, hebdomadaire, groupé                                            | Conforme                     | YAML lu sans erreur ; groupe `github-actions` sur `*`, cible `develop`                                                                                        |
| S3-9  | Service `purge` sans `.env`                                                                               | Conforme                     | `docker-compose.yml` : pas d'`env_file`, `DATABASE_URL` et `LOG_LEVEL` seuls                                                                                  |
| S3-9  | Jobs CI verts ; premier passage réel consigné                                                             | Non vérifiable               | Pas d'accès GitHub (§ 10)                                                                                                                                     |

## 5. Contrat § 3 — sonde de l'API

API e2e (`apps/api/test/e2e-server.ts`, application de production sur base embarquée, deux comptes de sonde), interrogée par `fetch` avec cookies et jeton CSRF. **169 contrôles, 167 conformes** ; les deux écarts sont des attentes de la sonde : un `kind` de garage inconnu est signalé sous `parameters.garage.kind` (et non `parameters.garage`), une clé `__proto__` est refusée en 400 `INVALID_BODY` dès l'analyse JSON (et non en 422).

### 5.1 `ETag` et `If-Match`

- `POST /projects` : 201, `Location`, `ETag` fort (`"mwncyr45"`) ; `GET` renvoie le même `ETag`.
- `PATCH` de l'exemple de la maquette avec `If-Match` juste : 200, nouvel `ETag` ; corps de réponse identique au `GET`.
- `If-Match` périmé : 412 `PROJECT_MODIFIED`, « Projet modifié ailleurs » / « Ce projet a été modifié depuis une autre fenêtre. Rechargez-le pour retrouver la dernière version. », `application/problem+json` ; projet et `ETag` inchangés.
- `If-Match: *` : 200. Liste contenant l'`ETag` courant : 200. Sans `If-Match` : 200 (dernier écrit gagne).
- Valeurs faibles ou mal formées (`W/…`, sans guillemets, `"ZZZ"`, `"0"`, `""`, `garbage`, 12 caractères) : 412 à chaque fois.
- Six `PATCH` simultanés : six `ETag` distincts. Deux `PATCH` simultanés avec le même `If-Match` : un 200, un 412.
- `GET /projects/{id}` : pas de `Cache-Control` ; `If-None-Match` ignoré (200).

### 5.2 Isolation

Compte B sur le projet de A : `PATCH` avec `If-Match: *`, avec l'`ETag` courant ou avec un `ETag` périmé, `GET`, identifiant non UUID → 404 au corps **identique à l'octet** à celui d'un identifiant inexistant, jamais 412, aucun `ETag` ; projet de A intact.

### 5.3 Ordre des contrôles

| Cas                                       | Attendu                              | Obtenu |
| ----------------------------------------- | ------------------------------------ | ------ |
| Sans session, corps invalide              | 401                                  | 401    |
| Sans jeton CSRF, corps invalide           | 403                                  | 403    |
| Corps invalide, identifiant inexistant    | 422                                  | 422    |
| Corps invalide, identifiant non UUID (A5) | 422                                  | 422    |
| Corps invalide, `If-Match` périmé         | 422                                  | 422    |
| Corps invalide, projet d'un autre compte  | 422 (validation d'abord, sans fuite) | 422    |
| JSON mal formé, identifiant inexistant    | 400                                  | 400    |

### 5.4 Valeurs, `null` et remplacement

- `parameters` stocké tel quel, sans valeur par défaut (ordre des clés réorganisé par `jsonb`, contenu identique) ; `site` renvoyé complet : `northAngle` 0, `accessEdgeIndex` 0, `setbacks` à 0, `slope` à 0.
- Remplacement et non fusion : `{ levelsCount: 2 }` remplace l'objet entier. `null` efface `parameters` et `site` ; `{}` accepté et stocké `{}` ; `descriptionText: null` accepté ; `PATCH {}` → 422 ; `site` sans `boundary` → 422 `site.boundary`.
- Zone constructible vide (10 × 10 m, reculs avant et arrière de 5 m) : 200 (D28).
- Duplication : 201, `Location`, `ETag` ; paramètres et terrain copiés à l'identique.

### 5.5 Bornes et chemins

Pour chaque borne entière (`levelsCount`, `targetHabitableArea`, `rooms[].count`, `rooms[].minArea`, `garage.spaces`, `garage.minArea`, `boundary.width`, `boundary.depth`, les trois reculs, `accessEdgeIndex` d'un rectangle) : min − 1 et max + 1 refusés avec le bon chemin, min et max acceptés. Angles (`northAngle`, `slope.direction`) : −0,001 et 360 refusés, 0 et 359,999 acceptés. Pente : −0,01 et 30,01 refusés, 0 et 30 acceptés. Pièces : 0 et 10 lignes acceptées, 11 refusées (`parameters.rooms`). Polygone : 2 et 65 points refusés, 3 et 64 acceptés ; coordonnée −1 et 1 000 001 refusées, 1 000 000 acceptée ; 25 m² accepté, 4,999 × 5 m refusé ; nœud papillon refusé (`site.boundary.points`) ; `accessEdgeIndex` = n − 1 accepté, n refusé.

Chemins et messages relevés : `parameters.rooms.1.minArea` « La surface minimale doit être comprise entre 1 et 200 m². » ; doublon `parameters.rooms.1.type` « Ce type de pièce figure déjà dans la liste : modifiez plutôt le nombre de la ligne existante. » ; garage sans places `parameters.garage.spaces` « Indiquez le nombre de places du garage. » ; places avec `kind: "none"` → « Champ non autorisé. » ; largeur non entière « La largeur du terrain doit être arrondie au millimètre. ». Refusés aussi : toiture `shed` ou sans type, types `garage` et `hall`, clés imbriquées inconnues, `null` imbriqué (`levelsCount`, `garage`, `northAngle`, `setbacks`), largeur en chaîne ou à `1e308`, `buildingType` et orientation hors liste, `parameters` tableau, `site` chaîne, clé inconnue au premier niveau.

Point signalé par les rôles, confirmé : le doublon est signalé même si une autre ligne a un nombre invalide ou si une autre clé est invalide, mais **pas** si une autre ligne a un type absent ou hors liste (A12).

### 5.6 Erreurs du cadriciel (S3-7) et textes

| Requête                                                                 | Réponse                                                                                                           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| JSON mal formé                                                          | 400 `INVALID_BODY`, « Corps de requête invalide » / « Le corps de la requête n'est pas un document JSON valide. » |
| Corps JSON vide                                                         | 400 `INVALID_BODY`, « … est vide alors qu'un document JSON est attendu. »                                         |
| `{"__proto__": …}`                                                      | 400 `INVALID_BODY`                                                                                                |
| Corps de plus de 1 Mio                                                  | 413 `PAYLOAD_TOO_LARGE`, « Corps de requête trop volumineux »                                                     |
| `application/xml`                                                       | 415 `UNSUPPORTED_MEDIA_TYPE`, « Type de contenu non pris en charge »                                              |
| `text/plain` (contenu JSON)                                             | **422** `VALIDATION_ERROR`, `fields: { "_": "Corps de requête invalide." }` (A13)                                 |
| URL mal encodée (`/projects/%E0%A4%A`)                                  | 400 `REQUEST_ERROR`, « Requête invalide »                                                                         |
| `charset=utf-16` annoncé                                                | 200 (corps lu en UTF-8)                                                                                           |
| 1 000 clés inconnues ; 200 lignes de pièces invalides                   | 422, 20 entrées `fields` au plus, ordre identique d'un appel à l'autre                                            |
| Clé de 500 caractères                                                   | Coupée à 64 points de code, terminée par « … »                                                                    |
| Description contenant `\u0000`                                          | 422                                                                                                               |
| Nom ou description contenant une moitié de paire de substitution isolée | 200, caractère remplacé par U+FFFD au stockage (A15)                                                              |

Aucune réponse ne contient « Fastify » ni « FST_ ».

### 5.7 CORS

Requête préalable depuis `http://localhost:3000` : 204, en-têtes admis `content-type, x-csrf-token, x-request-id, if-match`, méthodes `GET, POST, PATCH, DELETE`. Réponses : `access-control-expose-headers: ETag, Location`. Requête préalable depuis une autre origine : origine non reflétée.

## 6. Écran `/projets/{id}` — sondes navigateur

Pile lancée à la main (API e2e, serveur autonome du build de production), Chromium à 1 440 × 900 sauf mention contraire, pilotée par Playwright.

### 6.1 Enregistrement automatique

| Contrôle                                                    | Résultat                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Une frappe                                                  | Un `PATCH` 1 041 ms plus tard ; barre « Enregistré automatiquement · à l'instant »                                                                                                                                               |
| Frappe continue pendant 12 s (une touche toutes les 150 ms) | Aucun `PATCH` pendant la frappe, barre « Modifications non enregistrées » ; un `PATCH` moins d'une seconde après la dernière touche                                                                                              |
| Sorties de champ toutes les 0,5 s pendant 15 s              | 6 `PATCH`, écarts 3 001, 3 001, 3 001, 3 001, 3 006 ms ; groupes réunis (`name+descriptionText`) ; soit 20 `PATCH` par minute au plus (D29)                                                                                      |
| `If-Match`                                                  | Présent sur chaque `PATCH`, égal au dernier `ETag` reçu                                                                                                                                                                          |
| API ralentie de 4 s                                         | Une seule requête en cours ; la suivante part après la réponse (écart 4 026 ms) ; barre « Enregistrement… »                                                                                                                      |
| Réponse tardive                                             | Le texte saisi pendant l'envoi n'est pas écrasé ; après rechargement, c'est lui qui est stocké                                                                                                                                   |
| Date relative                                               | « à l'instant », puis « il y a 5 s », 10, 20, 30, 40, 50 s, « il y a 1 min » à 60 s ; région `role="status"` : « Modifications enregistrées. » une seule fois                                                                    |
| Hors ligne (`setOffline`)                                   | « ⚠ Hors ligne : vos modifications seront enregistrées au retour de la connexion. », aucun envoi, état annoncé ; retour en ligne → `PATCH` immédiat (1 ms)                                                                       |
| Réseau coupé (requête interrompue)                          | « ⚠ Enregistrement en attente : le service est injoignable. Nouvel essai automatique dans quelques secondes. » + « Réessayer » ; nouveaux essais après 5 010 ms puis 15 009 ms ; « Réessayer » après rétablissement → enregistré |
| 503 ; 429                                                   | Même état, causes « le service est momentanément indisponible » et « trop de requêtes en peu de temps »                                                                                                                          |
| 403                                                         | « ⚠ Enregistrement impossible : Rechargez la page et réessayez. » + « Réessayer », aucun nouvel essai automatique                                                                                                                |
| 422 simulé sur `parameters.targetHabitableArea`             | Message sous le champ, `aria-invalid="true"`, barre « Certaines modifications… » ; modification du champ → erreur retirée, enregistré                                                                                            |
| 404 pendant un enregistrement                               | « Projet introuvable », titre « Projet introuvable — Tracea », focus sur `<main>`                                                                                                                                                |
| 401 pendant un enregistrement                               | `/connexion?suivant=%2Fprojets%2F{id}` ; après connexion, retour sur le projet                                                                                                                                                   |
| Deux onglets                                                | e2e : l'onglet périmé reçoit 412, alerte « Projet modifié ailleurs », barre « Enregistrement suspendu… », confirmation « Recharger le projet ? » (focus sur « Annuler »), rechargement puis enregistrement de nouveau possible   |
| Fermeture de l'onglet avec une modification non enregistrée | Dialogue `beforeunload`                                                                                                                                                                                                          |
| « Mes projets » pendant un envoi (API ralentie de 2 s)      | La navigation attend la fin de l'envoi (1 723 ms), barre « Enregistrement… » ; le texte est stocké                                                                                                                               |
| « Mes projets » avec une saisie invalide                    | `alertdialog` « Quitter cette page ? », focus sur « Rester sur la page » ; `Échap` rend le focus à « Mes projets »                                                                                                               |

### 6.2 Contenu et validation

- Compteur : 2 000 émoji → « 2 000 / 2 000 caractères » ; 2 001 → « ⚠ 2 001 / 2 000 caractères », annonce « Limite de 2 000 caractères dépassée. », description non envoyée, barre « À corriger ».
- Exemples : description vide → insertion, focus dans la zone, annonce « Exemple inséré dans la description. » ; description non vide → « Remplacer la description ? », focus sur « Annuler », `Échap` → retour au dialogue, focus sur l'exemple choisi ; confirmation → remplacement.
- Nombres : « abc » → « Saisissez un nombre, par exemple 12,5. » et « Aperçu indisponible… » ; « 4,9 » et « 1 000,5 » → message de borne en mètres ; « 12.3456 » → stocké au millimètre, réaffiché « 12,346 » ; recul latéral non saisi réaffiché « 0 » après rechargement (attendu, § 5.2 de la spécification).
- Zone constructible vide : bloc de signalement affiché et annoncé, terrain enregistré, `<desc>` « … Aucune zone constructible avec ces reculs. ».
- Terrain polygonal écrit par l'API : texte « Ce terrain a été défini par un contour de 4 côtés… », plus de champs largeur et profondeur, voie d'accès « Côté 1 » à « Côté 4 » ; une modification du nord conserve le polygone.
- Doublon de type de pièce : message sous « Type, ligne 2 » ; il disparaît dès qu'une ligne sans type est ajoutée (A12).
- États de chargement : erreur (requêtes coupées) → alerte « Impossible d'afficher le projet », « Réessayer », « Retour à Mes projets », titre « Décrire le bâtiment — Tracea » ; « Réessayer » → focus sur `<main>`. Identifiant non UUID → « Projet introuvable ».

### 6.3 Clavier

Ordre de tabulation relevé (toiture, garage accolé et une pièce renseignés) : `Aller au contenu` → `Tracea` → `Mes projets` → `Nouveau projet` → menu du compte → `Nom du projet` → `Description libre` → `Voir des exemples de descriptions` → `Type de bâtiment` → `Plain-pied`, `R+1`, `R+2` → `Surface habitable cible (m²)` → `Toiture` → `Garage` → `Orientation du séjour` → `Couverture` → `Surface mini du garage (m²)` → `Type, ligne 1`, `Nombre, ligne 1`, `Surface mini (m²), ligne 1`, `Supprimer la ligne 1 : Chambre` → `Ajouter une pièce` → `Largeur (m)` → `Profondeur (m)` → `Voie d'accès` → `Orientation du nord (°)` → trois reculs → `Pente (%)` → `Direction de la pente (°)`. Conforme au § 11.1 de la spécification.

- Lien d'évitement : `Entrée` place le focus sur `<main id="contenu">`.
- Puces : `Espace` active, `Entrée` désactive (`aria-pressed` à jour).
- Pièces : `Entrée` sur « Ajouter une pièce » → focus sur la nouvelle liste `Type` ; suppression → focus sur le bouton de la ligne qui prend la place, puis de la ligne précédente, puis sur « Ajouter une pièce » ; annonce « Ligne 2 supprimée. » ; texte « Aucune pièce indiquée… » sans ligne.

Ces contrôles ont été conduits au clavier seul, par script ; aucun parcours avec lecteur d'écran réel.

### 6.4 Largeurs

320, 640, 1 024 et 1 280 px : aucun défilement horizontal de la page. Fenêtre de 700 px de haut : la barre d'état collante ne recouvre pas le champ focalisé `Direction de la pente (°)` (WCAG 2.4.11).

### 6.5 Comparaison écran / spécification / maquette

Textes, ordre du DOM, rôles, états et comportements conformes à la spécification (§ 3 à § 12). Les captures du frontend (vide, rempli, erreur et zone vide, exemples, conflit, mobile) ont été relues : écarts de présentation conformes au § 14.2 de la spécification (barre collante, cotes avec virgule, voie d'accès en bas par défaut). Flèche du nord : voir A18. Comparaison avec le cadre `6:30` lui-même non réalisée (§ 10), et les libellés « à confirmer sur la maquette » du § 14.3 restent non confirmés.

## 7. Accessibilité

axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, plus `wcag22aa` dans les sondes) : **0 violation** sur :

- e2e : écran vide, rempli, erreur de champ, dialogue d'exemples, conflit 412 ;
- sondes : hors ligne, enregistrement en attente, doublon de pièce, dialogue « Quitter cette page ? », confirmation « Remplacer la description ? », description au-delà de la limite, zone constructible vide, terrain polygonal, « Projet introuvable », 320 px.

Point ouvert hérité, non recompté ici : bordure `line` des champs sous 3:1 (spécification § 11.5).

## 8. Purge avec `DATABASE_URL` et `LOG_LEVEL` seuls

`env -i` (seul `PATH` en plus), `tsx src/maintenance/cli.ts`, base volontairement injoignable :

| Environnement                                | Résultat                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` + `LOG_LEVEL=info`            | Configuration acceptée sans `SESSION_SECRET` ; ligne `"level":50,"msg":"purge failed"` (ECONNREFUSED), sortie 1 |
| `DATABASE_URL` seul                          | Idem (`LOG_LEVEL` par défaut)                                                                                   |
| `LOG_LEVEL=info` seul ; `DATABASE_URL=` vide | « Invalid environment configuration: DATABASE_URL: DATABASE_URL is required », sortie 1                         |
| `LOG_LEVEL=error`                            | Ligne d'échec écrite, sortie 1                                                                                  |
| `LOG_LEVEL=fatal`                            | **Aucune ligne**, sortie 1 (A14)                                                                                |
| `LOG_LEVEL=verbose`                          | Refus de configuration explicite, sortie 1                                                                      |

Le message d'échec contient la requête SQL et son paramètre de date, aucun contenu de ligne. Le cas nominal (base réelle) n'est vérifié que par les tests sur PGlite.

## 9. En-têtes de sécurité et CI

`curl` sur le serveur autonome du build de production : `/connexion`, `/projets`, `/projets/{id}`, `/`, une page 404 et un script `/_next/static/…` portent tous :

```
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; connect-src 'self' http://localhost:3001
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Empreintes des actions vérifiées avec `git ls-remote` contre les étiquettes publiées : `actions/checkout` v4.4.0, `pnpm/action-setup` v4.3.0, `actions/setup-node` v4.4.0, `astral-sh/setup-uv` v5.4.2, `actions/cache` v4.3.0, `actions/upload-artifact` v4.6.2, `docker/setup-buildx-action` v3.12.0, `gitleaks/gitleaks-action` v2.3.9 : toutes concordantes. `ci.yml`, `dependabot.yml` et `docker-compose.yml` sont des YAML valides ; jobs `lint`, `test`, `contract`, `e2e`, `build`, `security`.

## 10. Non vérifié ici

| Élément                                                                                | Raison                                                                                                                                                                                            | Qui / quand                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Exécution réelle des jobs CI, Dependabot                                               | Pas d'accès GitHub (`gh` absent, rien n'est poussé)                                                                                                                                               | Premier passage de la PR ; S3-12 |
| Purge sur PostgreSQL 16, `docker compose run --rm purge`, interpolation de `LOG_LEVEL` | Docker absent ; PGlite et base injoignable seulement                                                                                                                                              | S3-12                            |
| `uv run pytest`, partie Python de `pnpm contract`                                      | `uv` absent ; aucun changement sous `engine/`                                                                                                                                                     | CI (job `contract`)              |
| Rendu comparé au cadre Figma `6:30`, libellés du § 14.3                                | Maquette non consultée dans cette recette                                                                                                                                                         | Designer, puis porteur du projet |
| Firefox, Safari, Edge ; lecteur d'écran réel                                           | Chromium seul (D12)                                                                                                                                                                               | Sprint suivant                   |
| PR (écarts, captures, taille du JavaScript)                                            | Pas de PR                                                                                                                                                                                         | Frontend, à l'ouverture de la PR |
| Volume réel de `audit_log` (D25)                                                       | Non observable par HTTP ; mesuré indirectement : une ligne par `PATCH` réussi, soit 20 lignes par minute au plus par onglet en sorties de champ continues, une ligne par pause en frappe continue | S3-11                            |
| Relecture de la spécification par le frontend et le backend                            | Pas de trace écrite                                                                                                                                                                               | Planificateur                    |

## 11. Écarts constatés

| #   | Niveau | Constat                                                                                                                                                                                                                                                                                                                                                    | Renvoi                                   |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| A12 | P4     | Un type de pièce en double n'est pas signalé quand une autre ligne a un type absent ou hors liste : l'erreur d'énumération interrompt la vérification `superRefine` de la liste. À l'écran, le message sous « Type, ligne 2 » disparaît dès qu'une ligne « Choisir un type » est ajoutée, et revient une fois le type choisi. Le refus final reste garanti | Backend (`packages/domain`)              |
| A13 | P4     | `PATCH` en `text/plain` : 422 `VALIDATION_ERROR` avec `fields: { "_": "Corps de requête invalide." }` au lieu de 415. Le plan (§ 3.2, S3-7) range le type de contenu refusé en 415 ; la clé `_` n'a pas de sens pour un client. `text/plain` ne déclenche pas de requête préalable CORS : seul le jeton CSRF protège ces requêtes                          | Backend ; avis Sécurité (S3-11)          |
| A14 | P4     | `LOG_LEVEL=fatal` supprime la ligne d'échec de la purge (niveau 50) ; seul le code de sortie 1 signale l'échec. Écrire la ligne d'échec quel que soit le niveau, ou documenter que `fatal` rend la tâche muette                                                                                                                                            | Backend                                  |
| A15 | P4     | Une moitié de paire de substitution isolée dans le nom ou la description est acceptée (200) et remplacée sans message par U+FFFD au stockage                                                                                                                                                                                                               | Sécurité (S3-11) pour avis, puis backend |
| A16 | P4     | `project-parameters.schema.json` et `project-site.schema.json` ne sont pas suivis par Git ; `git diff --exit-code` du job `contract` ignore les fichiers non suivis : un futur schéma exporté mais non commité laisserait la CI verte. Commiter les deux fichiers ; contrôler plutôt `git status --porcelain -- packages/domain/schema`                    | Devops                                   |
| A17 | P4     | Spécification § 9.2 : messages « relevés le 19 novembre 2026, S3-2 en cours », désormais périmés (reformulations du § 9.4 appliquées dans `domain` : « Raccourcissez-le. », doublon, 10 lignes, voie d'accès)                                                                                                                                              | Designer                                 |
| A18 | P4     | Flèche du nord : triangle 20 × 20 presque équilatéral ; tourné (20° par exemple), il paraît pointer vers la gauche ; seule la lettre « N » lève l'ambiguïté. Conforme à la spécification, lisibilité à revoir                                                                                                                                              | Designer                                 |
| A19 | P4     | `texts.ts` écrit « Limite de 2 000 caractères dépassée. » en dur au lieu de dériver la limite de `DESCRIPTION_MAX_LENGTH`, comme le compteur                                                                                                                                                                                                               | Frontend                                 |
| A20 | P4     | `infra/README.md` décrit encore la purge comme « sessions expirées, corbeille de plus de 30 jours », sans les jetons d'e-mail (`.env.example` est à jour)                                                                                                                                                                                                  | Devops                                   |

Observation, non comptée : `.claude/agents/designer.md` est modifié dans l'arbre de travail alors que le plan (§ 2.2, § 7) en fait un fichier du porteur du projet, hors périmètre. À confirmer par le porteur avant le commit.

### 11.1 Anomalies du sprint 2 reprises

| Écart    | Statut au 19 novembre 2026                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| A3 (P3)  | **Corrigé et vérifié** : JSON mal formé → 400 `INVALID_BODY` en français, sans « Fastify » ni « FST_ » (§ 5.6) |
| A5 (P4)  | **Documenté et vérifié** : § A.3 ; non UUID + corps invalide → 422, corps valide → 404 (§ 5.3)                 |
| A6 (P4)  | **Inchangé** : hors du périmètre du sprint (D26 ne le reprend pas) ; routes d'authentification non modifiées   |
| A8 (P4)  | **Corrigé et vérifié** : la purge démarre sans `SESSION_SECRET` (§ 8) ; compose sans `.env`                    |
| A9 (P4)  | **Corrigé et vérifié** : copie d'un nom de 120 émoji → 112 émoji + « (copie) » ; description en points de code |
| A10 (P4) | **Corrigé et vérifié** : `TRUST_PROXY=false` refusé avec indication (§ 4)                                      |
| A11 (P4) | **Corrigé et vérifié** : `suivant=/projets#x` → `/projets#x` ; `//site.example#x` refusé (e2e)                 |

## 12. Suite

- S3-11 : avis sur A13 et A15 ; débit de l'enregistrement automatique face à la limite globale par adresse IP (au plus 20 `PATCH` par minute et par onglet : trois onglets derrière une même adresse atteignent les 60 par minute, D29) ; volume d'audit (§ 10).
- Backend : A12, A13, A14. Frontend : A19. Designer : A17, A18. Devops : A16 (avant le commit), A20.
- Ces écarts étant P4, leur correction ne repasse par la QA que s'ils touchent le code de l'enregistrement automatique ou du contrat : relancer alors `pnpm test`, `pnpm e2e` et la sonde du § 5.

## 13. Revérification du 19 novembre 2026 (S3-10 bis)

Objet : lever les conditions de la revue de sécurité (`docs/security/sprint-3-project-description.md`, « fusion autorisée sous conditions ») après les correctifs non commités du frontend (S3-SEC-01, A19, titre du document par `MutationObserver`), du backend (A12, A13 / S3-SEC-04, A14, A15 / S3-SEC-03, S3-SEC-02) et du designer (A17, A18). Mêmes environnement et règles qu'au § 2 ; serveurs de sonde arrêtés à la fin (ports 3000 et 3001 libres, aucun navigateur résiduel). `git status` : 58 entrées.

### 13.1 Commandes

| Commande                                                       | Résultat                                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                            | OK — « All matched files use Prettier code style! »                                                                   |
| `pnpm lint --force`                                            | OK — « Tasks: 5 successful, 5 total »                                                                                 |
| `pnpm typecheck --force`                                       | OK — « Tasks: 5 successful, 5 total »                                                                                 |
| `pnpm test --force`                                            | OK — domain 129 tests (+8), API 145 (+6), web 113 (+5)                                                                |
| `pnpm --filter @tracea/domain run contract`                    | OK — 14 fixtures `[OK]`                                                                                               |
| `schema` puis `git diff --exit-code -- packages/domain/schema` | Sortie 0 ; régénération identique (SHA-1) ; les deux nouveaux fichiers restent non suivis (A16)                       |
| `pnpm --filter @tracea/web build`                              | OK — `/projets/[id]` 47,2 kB, 160 kB au premier chargement                                                            |
| `pnpm e2e` (3 lancements consécutifs)                          | OK — 17 tests passés à chaque lancement (35,4 s, 36,1 s, 36,4 s), dont les 3 nouvelles connexions à segments de point |
| Sonde du contrat (§ 5, rejouée)                                | 167 contrôles conformes sur 169 ; les deux mêmes écarts d'attente de la sonde qu'au § 5                               |

### 13.2 Redirection après connexion (S3-SEC-01)

Chromium, connexion réelle depuis `/connexion?suivant=…` :

| `suivant`                                                                                                                       | Arrivée                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `/.//site-externe.example`, `/%2e//site-externe.example`, `/%2E%2E//site-externe.example`, `/././/site-externe.example`         | `/projets`                                   |
| `/projets/..//site-externe.example/connexion`, `/projets/../..//site-externe.example`, `/.%2F/site.example`                     | `/projets`                                   |
| `//site.example`, `/%2F%2Fsite.example`, `/%5Csite.example`, `/%09/site.example`, `https://site.example`, `javascript:alert(1)` | `/projets`                                   |
| `/projets#x` ; `/projets?x=1#h` ; `/projets/../projets`                                                                         | `/projets#x` ; `/projets?x=1#h` ; `/projets` |

Aucune sortie de l'origine ; les chemins internes et leur fragment (A11) sont conservés. `safeNext` vérifie désormais le chemin rendu (`//` en tête refusé, origine recalculée). **S3-SEC-01 corrigé et vérifié.**

### 13.3 API

| Contrôle                      | Résultat                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cache-Control` (S3-SEC-02)   | `no-store` sur `GET /auth/csrf`, `POST /auth/login`, `POST /projects`, `GET /me`, `GET /projects`, `GET /projects/{id}` (200 et 404), `PATCH /projects/{id}`, `GET /health`                                                                                                                                                       |
| `text/plain` (A13, S3-SEC-04) | Avec jeton CSRF : 415 `UNSUPPORTED_MEDIA_TYPE` « Type de contenu non pris en charge » / « Envoyez le corps au format JSON (Content-Type: application/json). » ; sans jeton : 403 `CSRF_TOKEN_INVALID` ; corps vide, `POST /projects`, `POST /auth/login` : 415                                                                    |
| Demi-paires (A15, S3-SEC-03)  | `\ud800`, `\udc00` dans la description, `\udfff` dans le nom (`PATCH`) et `\ud800` dans le nom (`POST`) : 422, « La description contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau. » (même forme pour le nom) ; paire valide (`😀`) : 200, stockée intacte |
| Doublons de pièces (A12)      | Signalés sous `parameters.rooms.1.type` à côté d'une ligne sans type, d'un type inconnu, d'une ligne `null` ou d'un nombre invalide ; trois `wc` : lignes 2 et 3 signalées ; 11 lignes : seule l'erreur de longueur                                                                                                               |

### 13.4 Écran

- Doublon (A12) : deux lignes `WC` puis une troisième ligne vide : « Type, ligne 2 » garde `aria-invalid="true"` et son message ; axe-core : 0 violation (WCAG 2 A / AA, 2.1, 2.2 AA).
- Demi-paire collée dans la description ou le nom, puis sortie du champ : message « … caractère incomplet … » sous le champ, `aria-invalid="true"`, aucun `PATCH`, barre « Certaines modifications ne sont pas enregistrées… ».
- A19 : `limitExceeded` dérivé de `DESCRIPTION_MAX_LENGTH` ; annonce relevée « Limite de 2 000 caractères dépassée. ».
- Titre du document sur `/projets/{id}` : en chargement direct (trois essais), après création, après rechargement, depuis la carte et pour un identifiant non UUID, « Décrire le bâtiment — Tracea » puis le titre attendu (« {nom} — Décrire le bâtiment — Tracea » ou « Projet introuvable — Tracea »), stable sur 2,5 s.
- **Régression** : après navigation interne vers « Mes projets » (lien `Mes projets`, marque `Tracea` ou `Retour à Mes projets` de l'état introuvable), le titre de l'onglet **reste celui du projet quitté** (« Sonde titre — Décrire le bâtiment — Tracea », « Projet introuvable — Tracea ») au lieu de « Mes projets — Tracea », encore 5 s après l'affichage de la liste. Au premier chargement de `/projets`, le titre est juste. Voir A21.

Sur l'approche par `MutationObserver` : elle combat le titre que Next.js écrit à chaque navigation au lieu de le lui fournir. Pendant la transition, l'observateur, encore branché, réécrit le titre de la page quittée par-dessus celui de la page d'arrivée : c'est la cause probable de A21. L'approche est fragile ; il serait plus sûr de produire le titre par les métadonnées de la route (`generateMetadata` côté serveur, ou un titre posé sans `metadata.title` statique concurrent) ou, à défaut, de débrancher l'observateur dès le départ de la page et de ne corriger que les titres de cette route.

### 13.5 Purge (A14)

`env -i`, base injoignable : `LOG_LEVEL=fatal` → ligne `"level":50,"msg":"purge failed"` écrite, sortie 1 ; `error` et sans `LOG_LEVEL` : idem ; `DATABASE_URL` absente avec `fatal` : « DATABASE_URL is required », sortie 1 ; `LOG_LEVEL=verbose` : refus explicite, sortie 1. **A14 corrigé et vérifié.**

### 13.6 Sondes de la sécurité

Le dossier de sondes ne contient que la sonde `sec.mts` du sprint 2 (modes `ratelimit` et `projects`) ; les points demandés (redirection, `text/plain`, demi-paires, `Cache-Control`, doublons, purge) ont été rejoués par les sondes de la QA ci-dessus, avec les cas de `docs/security/sprint-3-project-description.md` (§ 3 à § 5).

### 13.7 Statut des écarts

| Écart                           | Statut                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3-SEC-01 (condition de fusion) | **Corrigé et vérifié** (§ 13.2)                                                                                                                                                                                                                                                                                                                                                 |
| S3-SEC-02                       | **Corrigé et vérifié** (§ 13.3)                                                                                                                                                                                                                                                                                                                                                 |
| A12                             | **Corrigé et vérifié** (API et écran)                                                                                                                                                                                                                                                                                                                                           |
| A13 / S3-SEC-04                 | **Corrigé et vérifié** ; ordre CSRF (403) avant type de contenu (415)                                                                                                                                                                                                                                                                                                           |
| A14                             | **Corrigé et vérifié** (§ 13.5)                                                                                                                                                                                                                                                                                                                                                 |
| A15 / S3-SEC-03                 | **Corrigé et vérifié** (API et écran)                                                                                                                                                                                                                                                                                                                                           |
| A16 (P4)                        | Ouvert : fichiers de schéma toujours non suivis ; contrôle CI inchangé. Devops, avant le commit                                                                                                                                                                                                                                                                                 |
| A17 (P4)                        | **Corrigé** : § 9.2 de la spécification aligné sur `domain`                                                                                                                                                                                                                                                                                                                     |
| A18 (P4)                        | Spécification mise à jour (aiguille à moitié pleine, § 6.5 et § 14.2) ; **code non modifié** (`site-preview.tsx` dessine encore le triangle 20 × 20). Renvoi frontend                                                                                                                                                                                                           |
| A19 (P4)                        | **Corrigé et vérifié**                                                                                                                                                                                                                                                                                                                                                          |
| A20 (P4)                        | Ouvert : `infra/README.md` inchangé. Devops                                                                                                                                                                                                                                                                                                                                     |
| **A21 (P2, nouveau)**           | Titre de l'onglet erroné sur « Mes projets » après avoir quitté un projet par la navigation interne (§ 13.4) : WCAG 2.4.2 (niveau A) non respecté sur le chemin nominal de retour. Introduit ou laissé par le correctif `MutationObserver` de `project-description-screen.tsx`. Aucun test (web ou e2e) ne vérifie le titre de « Mes projets » après le retour. Renvoi frontend |

### 13.8 Décision

**Renvoyé au frontend pour A21, puis nouvelle revérification courte.** Les conditions de la revue de sécurité sont levées côté QA : S3-SEC-01 est corrigé et vérifié, ainsi que S3-SEC-02, S3-SEC-03 et S3-SEC-04 ; toutes les commandes passent et le parcours e2e passe trois fois de suite. A21 n'est pas un constat de sécurité, mais c'est une régression d'accessibilité de niveau A sur le chemin nominal, introduite par un correctif de ce cycle : elle doit être corrigée avant la fusion, avec un test du titre de « Mes projets » après retour d'un projet. Revérification attendue : `pnpm test`, `pnpm e2e` (3 fois) et la sonde des titres (§ 13.4). A16, A18 (code) et A20 restent P4 et non bloquants.

## 14. Revérification finale du 19 novembre 2026 (S3-10 ter)

Objet : vérifier les derniers correctifs non commités : A21 (titre par un élément `<title>` React rendu par l'écran, `metadata = { title: null }` sur `app/projets/[id]/page.tsx`, plus de `MutationObserver`), A18 (symbole du nord dans `site-preview.tsx`, test `site-preview.test.tsx`), A20 (`infra/README.md`, notes d'exploitation) et A16 (contrôle CI par `git status --porcelain`). Mêmes environnement et règles qu'au § 2 ; serveurs de sonde arrêtés à la fin (ports 3000 et 3001 libres, aucun navigateur résiduel). `git status` : 60 entrées avant l'ajout de ce paragraphe.

### 14.1 Commandes

| Commande                              | Résultat                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                   | OK — « All matched files use Prettier code style! »                                                                                                                                                                                                                       |
| `pnpm lint --force`                   | OK — « Tasks: 5 successful, 5 total »                                                                                                                                                                                                                                     |
| `pnpm typecheck --force`              | OK — « Tasks: 5 successful, 5 total »                                                                                                                                                                                                                                     |
| `pnpm test --force`                   | OK — domain 129 tests ; API 145 ; web 7 fichiers / 119 tests (+6, dont `site-preview.test.tsx`)                                                                                                                                                                           |
| `pnpm --filter @tracea/web build`     | OK — `/projets/[id]` 47,3 kB, 160 kB au premier chargement                                                                                                                                                                                                                |
| `pnpm e2e` (3 lancements consécutifs) | OK — 21 tests passés à chaque lancement (43,0 s, 42,5 s, 42,1 s), dont « the project title stays in place once the page has settled » et « « Mes projets » gets its title back after leaving by » `Mes projets`, `Tracea` et `Retour à Mes projets` ; aucune attente fixe |

### 14.2 Titres du document (A21)

Sonde Chromium, titre relevé toutes les 100 ms pendant 1 à 4 s après chaque étape :

| Étape                                                                     | Titres successifs                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `/projets` après connexion                                                | « Mes projets — Tracea »                                                              |
| Création (navigation client)                                              | « Décrire le bâtiment — Tracea » → « Sonde titre ter — Décrire le bâtiment — Tracea » |
| Renommage enregistré                                                      | « Sonde titre renommée — Décrire le bâtiment — Tracea »                               |
| Rechargement                                                              | « Sonde titre renommée — Décrire le bâtiment — Tracea »                               |
| Retour par `Mes projets` ; par `Tracea`                                   | « Mes projets — Tracea » (stable 4 s)                                                 |
| Carte → projet (navigation client), deux fois                             | « Décrire le bâtiment — Tracea » → « Sonde titre renommée — … »                       |
| Retour arrière du navigateur vers `/projets`                              | « Mes projets — Tracea » (stable 4 s)                                                 |
| Avance du navigateur vers le projet                                       | « Décrire le bâtiment — Tracea » → « Sonde titre renommée — … »                       |
| Identifiant inexistant, chargement direct (3 fois) ; identifiant non UUID | « Décrire le bâtiment — Tracea » → « Projet introuvable — Tracea » (stable)           |
| `Retour à Mes projets` depuis l'état introuvable                          | « Mes projets — Tracea » (stable 4 s)                                                 |
| Retour arrière vers l'état introuvable, puis vers le projet               | « Projet introuvable — Tracea », puis « Sonde titre renommée — … »                    |

Un seul élément `<title>` dans le document, placé dans `<head>`. Le titre transitoire « Décrire le bâtiment — Tracea » pendant le chargement est celui prévu par la spécification (§ 3). **A21 corrigé et vérifié.**

Au passage, hors sprint et antérieur à celui-ci : `/inscription` et `/mot-de-passe-oublie` portent le titre générique « Tracea — Plans architecturaux 2D et 3D » (les autres pages d'authentification ont un titre propre : « Connexion — Tracea », « Nouveau mot de passe — Tracea », « Vérification de l'adresse — Tracea »). Non compté comme écart du sprint ; à planifier.

### 14.3 Symbole du nord (A18)

Captures de l'aperçu (30 × 20 m, échelle 3) à 0°, 20°, 90°, 135°, 200° et 315,5° : aiguille à moitié pleine (côté nord) et moitié vide, lettre `N` droite au-delà de la pointe. À chaque angle, la moitié pleine et la lettre désignent sans ambiguïté la direction saisie (à 135°, vers le bas à droite ; à 315,5°, vers le haut à gauche). `<desc>` : « … Nord orienté à 315,5° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu. … ». axe-core : 0 violation. Conforme à la spécification mise à jour (§ 6.5). **A18 corrigé et vérifié** ; le report dans la maquette Figma reste à faire par le designer.

### 14.4 CI et exploitation (A16, A20)

- A16 : le job `contract` exécute `test -z "$(git status --porcelain -- packages/domain/schema)"` après l'export. Rejoué localement, le contrôle **échoue** tant que `project-parameters.schema.json` et `project-site.schema.json` ne sont pas suivis (sortie 1, les deux fichiers listés en `??`) : il détecte bien un schéma jamais commité. Il passera une fois les deux fichiers ajoutés au commit, comme annoncé. **Corrigé**, sous réserve de cet ajout.
- A20 : `infra/README.md` décrit la purge des jetons d'e-mail expirés ou utilisés depuis plus de 7 jours et la ligne de journal à trois compteurs ; `docs/ops/sprint-3-project-description.md` existe. **Corrigé** (relecture ; contenu des notes d'exploitation non recetté ici, il relève de S3-12).

### 14.5 Statut final des anomalies du sprint

| Écart                | Niveau | Statut final                                                                                       |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| A12                  | P4     | Corrigé et vérifié (§ 13.3, § 13.4)                                                                |
| A13 / S3-SEC-04      | P4     | Corrigé et vérifié (§ 13.3)                                                                        |
| A14                  | P4     | Corrigé et vérifié (§ 13.5)                                                                        |
| A15 / S3-SEC-03      | P4     | Corrigé et vérifié (§ 13.3, § 13.4)                                                                |
| A16                  | P4     | Corrigé ; les deux schémas doivent figurer dans le commit, sinon le job `contract` échoue (§ 14.4) |
| A17                  | P4     | Corrigé (§ 13.7)                                                                                   |
| A18                  | P4     | Corrigé et vérifié (§ 14.3) ; maquette Figma à mettre à jour                                       |
| A19                  | P4     | Corrigé et vérifié (§ 13.4)                                                                        |
| A20                  | P4     | Corrigé (§ 14.4)                                                                                   |
| A21                  | P2     | Corrigé et vérifié (§ 14.2)                                                                        |
| S3-SEC-01, S3-SEC-02 | —      | Corrigés et vérifiés (§ 13.2, § 13.3)                                                              |

Les points non vérifiables du § 10 demeurent (CI réelle, Docker et PostgreSQL 16, moteur Python, comparaison au cadre Figma `6:30`, autres navigateurs, PR).

### 14.6 Décision finale

**Accepté.** Toutes les commandes passent, le parcours de bout en bout passe trois fois de suite (21 tests), les conditions de la revue de sécurité sont levées et toutes les anomalies A12 à A21 sont corrigées. Une seule condition de commit : ajouter `packages/domain/schema/project-parameters.schema.json` et `project-site.schema.json` au commit du sprint. Suite : S3-12 (exploitation), puis S3-13 (revue technique).
