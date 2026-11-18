# Tracea — Spécification de l'API et plan de qualité

| Champ          | Valeur                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Version        | 1.0                                                                                                        |
| Date           | 13 novembre 2026                                                                                           |
| Statut         | Proposition                                                                                                |
| Documents liés | Cahier des charges · Dossier d'architecture technique · Spécification du modèle du bâtiment et des exports |

---

## Partie A — API HTTP

### A.1 Conventions

- Base : `https://api.tracea.app/v1` (préfixe `/api/v1` en monolithe).
- JSON UTF-8 ; dates ISO 8601 UTC ; identifiants UUID v4 (aléatoires, 122 bits ; décision D4 du sprint 2) ; pagination par curseur (`?cursor=&limit=`).
- Authentification par cookie de session `HttpOnly` ; mutations protégées par en-tête `X-CSRF-Token`.
- Erreurs au format Problem Details (RFC 9457) :
  ```json
  {
    "type": "https://tracea.app/errors/program-contradiction",
    "title": "Programme contradictoire",
    "status": 422,
    "code": "PROGRAM_CONTRADICTION",
    "detail": "3 chambres de 20 m² minimum ne tiennent pas dans 60 m² habitables.",
    "fields": { "parameters.rooms[1].minArea": "trop élevé pour la surface cible" }
  }
  ```
- Limitation de débit : 60 req/min par session, 10 générations/heure par utilisateur en plan gratuit ; en-têtes `RateLimit-*`.
- Versionnage : préfixe `/v1` ; changements cassants → `/v2`.
- Spécification OpenAPI 3.1 générée depuis les schémas Zod et publiée sur `/v1/openapi.json`.

### A.2 Authentification

| Méthode | Route                       | Corps / réponse                                 | Notes                                                                                     |
| ------- | --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| POST    | `/auth/register`            | `{ email, password }` → 201                     | Envoie l'e-mail de vérification ; mot de passe ≥ 12 caractères, contrôle de compromission |
| POST    | `/auth/resend-verification` | `{ email }` → 202                               | Réponse identique que l'adresse existe ou non (ajouté au sprint 1)                        |
| POST    | `/auth/verify-email`        | `{ token }` → 204                               |                                                                                           |
| POST    | `/auth/login`               | `{ email, password }` → 200 `{ user }` + cookie | Rotation de session                                                                       |
| POST    | `/auth/logout`              | → 204                                           |                                                                                           |
| POST    | `/auth/logout-all`          | → 204                                           | Révoque toutes les sessions                                                               |
| POST    | `/auth/password/forgot`     | `{ email }` → 202                               | Réponse identique que l'e-mail existe ou non                                              |
| POST    | `/auth/password/reset`      | `{ token, password }` → 204                     |                                                                                           |
| GET     | `/me`                       | → `{ id, email, plan, quotas, createdAt }`      |                                                                                           |
| PATCH   | `/me`                       | `{ displayName? }`                              |                                                                                           |
| DELETE  | `/me`                       | → 202                                           | Suppression différée 14 jours, annulable                                                  |

### A.3 Projets

Contrat livré au sprint 2 (`docs/plans/sprint-2-projects.md` § 3). Routes montées à la racine, sans préfixe `/v1`, comme `/auth/*` et `/me` (décision ouverte D5) ; réponses enveloppées (D14).

| Méthode | Route                        | Requête                                                                     | Succès                                                | Erreurs propres                                 | État                   |
| ------- | ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | ---------------------- |
| GET     | `/projects`                  | `?limit=` (1 à 50, défaut 20) et `?cursor=`                                 | 200 `{ items: ProjectSummary[], nextCursor }`         | 422 `VALIDATION_ERROR` (`limit`, `cursor`)      | Livré (sprint 2)       |
| POST    | `/projects`                  | `{ name }`                                                                  | 201 `{ project: ProjectDetail }` + en-tête `Location` | 422 `VALIDATION_ERROR`                          | Livré (sprint 2)       |
| GET     | `/projects/{id}`             | —                                                                           | 200 `{ project: ProjectDetail }`                      | 404 `PROJECT_NOT_FOUND`                         | Livré (sprint 2)       |
| PATCH   | `/projects/{id}`             | `{ name?, descriptionText? }`, au moins une clé                             | 200 `{ project: ProjectDetail }`                      | 404 `PROJECT_NOT_FOUND`, 422 `VALIDATION_ERROR` | Livré (sprint 2)       |
| POST    | `/projects/{id}/duplicate`   | Corps vide                                                                  | 201 `{ project: ProjectDetail }` + en-tête `Location` | 404 `PROJECT_NOT_FOUND`                         | Livré (sprint 2)       |
| DELETE  | `/projects/{id}`             | —                                                                           | 204                                                   | 404 `PROJECT_NOT_FOUND`                         | Livré (sprint 2)       |
| PATCH   | `/projects/{id}`             | `parameters`, `site`                                                        | —                                                     | —                                               | Reporté (CU-03, CU-04) |
| POST    | `/projects/{id}/site/import` | `multipart/form-data` (GeoJSON ou DXF ≤ 5 Mo) → terrain proposé à confirmer | —                                                     | —                                               | Reporté (CU-04)        |
| —       | Restauration de la corbeille | —                                                                           | —                                                     | —                                               | Non planifié (D3)      |

Erreurs communes : 401 `UNAUTHENTICATED` sans session valide ; 403 `CSRF_TOKEN_INVALID` sur `POST`, `PATCH`, `DELETE` sans en-tête `X-CSRF-Token` égal au cookie `tracea_csrf` ; 429 `RATE_LIMITED` (limite globale).

```ts
interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null; // null tant que les vignettes n'existent pas
  currentVersion: { number: number } | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  descriptionText: string | null;
  parameters: Record<string, unknown> | null; // null tant que CU-03 n'est pas livré
  site: Record<string, unknown> | null; // null tant que CU-04 n'est pas livré
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  currentVersion: {
    id: string;
    number: number;
    origin: "generated" | "edited" | "restored";
    createdAt: string;
  } | null;
  lastJob: null; // réservé : la table jobs n'existe pas encore
}
```

Règles :

- **Isolation** : un projet inexistant, supprimé, appartenant à un autre utilisateur ou un `{id}` qui n'est pas un UUID reçoivent la même réponse 404 `PROJECT_NOT_FOUND` (« Projet introuvable »), au corps identique. Jamais 403. Chaque requête SQL filtre sur le propriétaire et `deleted_at` dans sa propre clause `WHERE`. `ownerId` et `deletedAt` ne sont jamais exposés.
- **Validation** : schémas Zod stricts ; toute clé inconnue (`ownerId`, `id`, `parameters`, `site`, …) donne 422 avec `fields.<clé>`. `name` : espaces de bord retirés, 1 à 120 caractères, sans caractère de contrôle, doublons autorisés (D9). `descriptionText` : 0 à 2 000 caractères ou `null`.
- **Liste** : projets non supprimés de l'utilisateur, triés par `updatedAt` décroissant puis `id` décroissant. `nextCursor` est une chaîne opaque (base64url de la dernière paire `updatedAt`, `id` de la page) ou `null` sur la dernière page ; un curseur illisible donne 422 `fields.cursor`. `projects.updated_at` est stocké à la milliseconde (`timestamp(3)`) pour que la valeur du curseur soit exacte : aucun projet n'est sauté ni répété quand plusieurs partagent le même `updatedAt`.
- **Modification** : met à jour `updatedAt`.
- **Duplication** : nouveau projet nommé `« <nom> (copie) »` (nom d'origine tronqué pour rester ≤ 120 caractères), mêmes `descriptionText`, `parameters`, `site` ; la version courante, s'il y en a une, est copiée comme version numéro 1 et devient la version courante. Une seule transaction.
- **Suppression** : logique (corbeille de 30 jours, purge par tâche planifiée) ; un second `DELETE` répond 404.
- **Audit** : `project.create`, `project.update` (liste des champs modifiés), `project.duplicate` (identifiant du projet source), `project.delete`, avec `target_type = "project"` ; ni nom ni description.

Le document `GET /v1/openapi.json` décrit ces six routes avec leurs schémas de requête et de réponse (document tenu à la main, D13).

### A.4 Génération et versions

| Méthode | Route                                | Description                                                                                                                                                                |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/projects/{id}/interpret`           | Retourne le **programme** compris à partir de la description et des paramètres, avec `ambiguities[]` ; ne génère rien. Permet l'écran « Voici ce que le moteur a compris » |
| POST    | `/projects/{id}/generate`            | `{ seed?, keepLocked?: boolean, clarifications?: {...} }` → 202 `{ jobId }` ; refuse (422) si `ambiguities` non résolues                                                   |
| GET     | `/jobs/{jobId}`                      | `{ status: queued                                                                                                                                                          | running | succeeded | failed, stage, percent, message, versionId?, error? }`    |
| GET     | `/jobs/{jobId}/events`               | Flux SSE : `progress`, `completed`, `failed`                                                                                                                               |
| POST    | `/jobs/{jobId}/cancel`               | → 202                                                                                                                                                                      |
| GET     | `/projects/{id}/versions`            | Liste `{ id, number, origin, createdAt, metrics, warningsCount }`                                                                                                          |
| GET     | `/versions/{versionId}`              | `BuildingModel` complet (+ `ETag`)                                                                                                                                         |
| GET     | `/versions/{versionId}/views/{view}` | SVG d'une vue : `site`, `level/{index}`, `section/{name}`, `elevation/{n                                                                                                   | e       | s         | w}`; option`?scale=100&sheet=A3` pour l'aperçu de planche |
| GET     | `/versions/{versionId}/checks`       | Liste des vérifications                                                                                                                                                    |
| GET     | `/versions/{versionId}/mesh`         | GLB d'affichage (cache long, immuable)                                                                                                                                     |
| POST    | `/versions/{versionId}/restore`      | → 201 nouvelle version `origin = restored`                                                                                                                                 |
| GET     | `/versions/{a}/diff/{b}`             | Éléments ajoutés / supprimés / modifiés (par `id`) pour la comparaison visuelle                                                                                            |

### A.5 Édition

| Méthode | Route                  | Description                                                                                                                                         |
| ------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/projects/{id}/edits` | `{ baseVersionId, operations: EditOperation[] }` → 201 nouvelle version `origin = edited`, ou 409 si `baseVersionId` n'est plus la version courante |

`EditOperation` (discriminée par `op`) :

```ts
| { op: "moveWall"; wallId; delta: [dx, dy] }
| { op: "setWallThickness"; wallId; thickness }
| { op: "addOpening"; wallId; opening: OpeningInput }
| { op: "updateOpening"; openingId; patch: Partial<OpeningInput> }
| { op: "removeOpening"; openingId }
| { op: "renameRoom"; roomId; name; type? }
| { op: "setLocked"; targetId; locked: boolean }
```

Le serveur applique les opérations dans `domain`, recalcule pièces, surfaces et vérifications, rejette toute opération violant un invariant (422 avec l'invariant en cause).

### A.6 Exports

| Méthode | Route                           | Description                                               |
| ------- | ------------------------------- | --------------------------------------------------------- |
| POST    | `/versions/{versionId}/exports` | `{ format: "dxf"                                          | "pdf" | "svg" | "png" | "gltf" | "glb" | "obj" | "ifc", options }`→ 202`{ jobId }`ou 200`{ downloadUrl, expiresAt }` si déjà en cache |
| GET     | `/exports/{exportId}`           | `{ status, format, sizeBytes, downloadUrl?, expiresAt? }` |
| GET     | `/exports/{exportId}/download`  | Redirection 302 vers l'URL présignée (≤ 15 min)           |

Options par format :

- `pdf` : `{ sheets: ["site","level:0","section:AA",…] | "all", sheetSize: "A4"|"A3"|"A2"|"A1", scale?: 50|100|200|500, pdfA?: boolean }`
- `dxf` : `{ version: "R2010"|"R2018", layouts: boolean, views: [...] }`
- `svg` / `png` : `{ view, scale?, width?: number, transparent?: boolean }`
- `ifc` : `{ schema: "IFC4"|"IFC2X3", units: "mm"|"m", includeSpaces: boolean }`
- `gltf`/`glb`/`obj` : `{ includeSite: boolean, includeOpenings: boolean }`

### A.7 Partage

| Méthode | Route                   | Description                                                                            |
| ------- | ----------------------- | -------------------------------------------------------------------------------------- |
| POST    | `/projects/{id}/shares` | `{ role: "viewer", expiresAt? }` → 201 `{ url, token }` (jeton affiché une seule fois) |
| GET     | `/projects/{id}/shares` | Liste (sans jeton)                                                                     |
| DELETE  | `/shares/{shareId}`     | Révocation                                                                             |
| GET     | `/shared/{token}`       | Accès lecture seule : projet, version courante, vues, exports PDF/PNG uniquement       |

### A.8 Administration (rôle `admin`)

`GET /admin/metrics`, `GET /admin/users`, `PATCH /admin/users/{id}` (suspension, quotas), `GET /admin/jobs?status=failed`, `GET /admin/audit`.

### A.9 Événements internes (file)

| Message              | Producteur → consommateur | Charge utile                                      |
| -------------------- | ------------------------- | ------------------------------------------------- |
| `generate.requested` | API → moteur              | `{ jobId, projectId, input, seed, lockedModel? }` |
| `export.requested`   | API → moteur              | `{ jobId, versionId, format, options, model }`    |
| `job.progress`       | moteur → API              | `{ jobId, stage, percent, message }`              |
| `job.completed`      | moteur → API              | `{ jobId, result: { model }                       | { objectKey, size, checksum } }` |
| `job.failed`         | moteur → API              | `{ jobId, code, message, details, retryable }`    |

Étapes publiées par `generate` : `interpreting`, `siting`, `zoning`, `solving`, `walls`, `roof`, `checking`, `finalizing`.

---

## Partie B — Plan de qualité et de tests

### B.1 Stratégie

| Niveau                 | Périmètre                                                                           | Outils                                                              | Seuil                                       |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| Unitaire TS            | `domain`, `rendering-2d`, `api-contract`, composants `ui`                           | Vitest, Testing Library                                             | couverture ≥ 80 % `domain`                  |
| Unitaire Python        | `domain`, `geometry`, `generation`, `checks`, `export`                              | pytest, hypothesis (tests par propriétés sur la géométrie)          | couverture ≥ 80 % `export`                  |
| Contrat                | Fixtures `BuildingModel` validées par Zod **et** Pydantic ; OpenAPI ↔ client généré | script CI dédié                                                     | 100 % des fixtures                          |
| Intégration API        | Routes avec PostgreSQL et Redis réels (testcontainers)                              | Vitest + supertest                                                  | parcours CRUD, auth, autorisations croisées |
| Validation des exports | Chaque format contre son validateur (voir spécification des exports § 6)            | ezdxf, pypdf, gltf-validator, IfcOpenShell                          | 0 erreur                                    |
| Rendu visuel           | Captures SVG/PNG des vues de référence comparées pixel à pixel (tolérance 0,1 %)    | Playwright + comparaison d'images                                   | pas de régression non approuvée             |
| End-to-end             | Parcours CU-01 → CU-11, partage, restauration                                       | Playwright                                                          | 100 % des parcours critiques verts          |
| Performance            | Génération des 50 descriptions de référence, exports                                | scripts k6 / pytest-benchmark                                       | P95 dans les budgets                        |
| Sécurité               | Dépendances, secrets, analyse statique, tests d'autorisation, scan DAST sur staging | pnpm audit, pip-audit, gitleaks, Semgrep, ZAP                       | 0 critique / haute                          |
| Accessibilité          | Écrans principaux                                                                   | axe-core dans Playwright, revue manuelle clavier et lecteur d'écran | 0 violation AA bloquante                    |

### B.2 Jeu de descriptions de référence

50 descriptions versionnées dans `engine/tests/fixtures/descriptions/`, réparties ainsi :

- 20 maisons plain-pied (60 à 200 m², 2 à 5 chambres, avec/sans garage, toitures variées) ;
- 15 maisons R+1 (escalier, répartition jour/nuit) ;
- 5 extensions / surélévations ;
- 5 petits collectifs (V2, marqués `skip` avant) ;
- 5 descriptions volontairement contradictoires ou ambiguës (attendu : `PROGRAM_CONTRADICTION` ou `ambiguities` non vide, jamais un plan).

Pour chaque description : programme attendu (tolérances), métriques attendues (surface habitable ± 5 %), nombre de pièces, absence d'erreur `error` dans `checks`. Un rapport de non-régression est produit à chaque exécution (taux de réussite, durée, écart de surface moyen).

### B.3 Tests géométriques ciblés

- Jonctions de murs : L, T, croix, murs obliques à 30°/45°, murs très courts.
- Ouvertures : en bout de mur, adjacentes, dans un mur courbe refusé, porte-fenêtre d'angle.
- Pièces : rectangulaires, en L, en U, pièce traversante, pièce sans fenêtre (attendu : avertissement).
- Toitures : 2 pans sur rectangle, 4 pans sur L, plat avec acrotère, combinaison avec garage accolé plus bas.
- Terrain : parcelle en drapeau, parcelle trapézoïdale, pente 10 %, reculs rendant le terrain inconstructible (attendu : `SITE_TOO_SMALL`).

### B.4 Définition de « terminé » (Definition of Done)

Une tâche est terminée lorsque :

1. le code respecte lint, format et typage stricts ;
2. les tests unitaires et de contrat concernés passent et la couverture ne baisse pas ;
3. pour un export : le fichier produit passe son validateur et a été ouvert dans au moins un logiciel tiers ;
4. pour un écran : conformité à la maquette vérifiée, écart documenté le cas échéant, axe-core sans violation ;
5. pour une route : OpenAPI mis à jour, tests d'autorisation (accès d'un autre utilisateur → 404) ;
6. la revue de sécurité est faite si la surface d'attaque change ;
7. la documentation (`docs/`, `.env.example`, changelog) est à jour ;
8. relecture de conformité à la règle de présentation : aucune mention des technologies de génération dans le code, les commentaires, l'interface, les commits ou la documentation.

### B.5 Revue et livraison

- Branches `feature/<nom>` et `fix/<nom>` depuis `develop` ; PR obligatoire avec au moins une revue ; squash merge ; messages Conventional Commits en anglais, sans signature ni lien automatique.
- Checklist de PR : description, captures pour l'UI, tests ajoutés, lint vert, impact sécurité, impact sur le schéma `BuildingModel` (migration fournie ?).
- Release : étiquette `vX.Y.Z` sur `main`, changelog généré depuis les commits puis relu, déploiement staging → prod avec approbation.
- Déroulé des rôles du workflow sur chaque tâche : planificateur → designer → frontend / backend → QA → sécurité → DevOps → réviseur technique ; chaque rôle laisse un résultat vérifiable (spécification, PR, rapport de tests, rapport de revue).

### B.6 Suivi des incidents

- Niveaux : P1 (génération ou connexion indisponible), P2 (un format d'export en échec), P3 (défaut visuel), P4 (amélioration).
- Délais de prise en charge : P1 1 h, P2 1 jour ouvré, P3 1 semaine.
- Post-mortem écrit pour tout P1, archivé dans `docs/postmortems/`.

---

## Partie C — Variables d'environnement

Voir `.env.example` à la racine du dépôt (source de vérité) ; chaque variable y est commentée.
