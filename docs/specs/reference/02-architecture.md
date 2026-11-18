# Tracea — Dossier d'architecture technique

| Champ          | Valeur                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Version        | 1.0                                                                                                            |
| Date           | 13 novembre 2026                                                                                               |
| Statut         | Proposition — choix structurants à confirmer dans le dépôt (voir `docs/plans/` pour les décisions prises)      |
| Documents liés | Cahier des charges · Spécification du modèle du bâtiment et des exports · Spécification API et plan de qualité |

---

## 1. Vue d'ensemble

Tracea est découpée en quatre blocs déployables indépendamment :

```
┌──────────────────────────────────────────────────────────────────────┐
│  Navigateur                                                          │
│  Application web (Next.js) : saisie, visualisation 2D (SVG/Canvas),  │
│  visualisation 3D (Three.js), éditeur de plan                        │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS (REST + flux d'événements SSE)
┌───────────────▼──────────────────────────────────────────────────────┐
│  API (Node.js / Fastify, TypeScript)                                 │
│  Authentification, projets, versions, orchestration des tâches,      │
│  URL signées, quotas, audit                                          │
└──────┬──────────────────────────┬────────────────────────────────────┘
       │ SQL                      │ file de tâches (Redis / BullMQ)
┌──────▼────────┐        ┌────────▼─────────────────────────────────────┐
│ PostgreSQL    │        │  Moteur Tracea (travailleurs Python)         │
│ utilisateurs, │        │  interprétation → programme → solveur →      │
│ projets,      │        │  géométrie → rendus 2D/3D → exports           │
│ versions,     │        │  (shapely, ezdxf, IfcOpenShell, trimesh…)    │
│ tâches        │        └────────┬─────────────────────────────────────┘
└───────────────┘                 │ S3 API
                         ┌────────▼─────────┐
                         │ Stockage objet   │  fichiers exportés, aperçus
                         │ (S3 / MinIO)     │
                         └──────────────────┘
```

Principe directeur : **le modèle du bâtiment (`BuildingModel`, JSON versionné) est la source de vérité unique**. L'interface l'affiche, l'éditeur le modifie, les travailleurs le produisent et en dérivent tous les exports. Aucun export n'est calculé à partir d'un autre export.

---

## 2. Choix de la pile technique

### 2.1 Décision : API Node.js + moteur Python

| Bloc                             | Technologie                                                                                                                                                                                            | Justification                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Application web                  | **Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind CSS**                                                                                                                              | Conforme à l'orientation du projet ; rendu serveur pour les pages publiques, client pour l'éditeur ; écosystème Three.js mature |
| Rendu 2D                         | **SVG généré depuis le modèle** (composants React) avec repli Canvas au-delà de ~20 000 primitives                                                                                                     | SVG donne un rendu net à toute échelle, accessible (titres, rôles), et le même module produit l'export SVG                      |
| Rendu 3D                         | **Three.js via react-three-fiber + drei**                                                                                                                                                              | Standard de fait ; export glTF natif côté client ou serveur                                                                     |
| API                              | **Node.js 22 + Fastify + TypeScript**, validation **Zod**, ORM **Drizzle**                                                                                                                             | Partage des types avec le front (schémas Zod → types) ; Fastify pour la performance et les plugins (rate limit, CORS, helmet)   |
| Moteur de génération             | **Python 3.12** : `shapely` (géométrie 2D), `ezdxf` (DXF), `IfcOpenShell` (IFC), `trimesh` / `pygltflib` (maillage, glTF/OBJ), `reportlab` ou `cairo` (PDF vectoriel), `svgwrite`                      | Les bibliothèques de référence pour DXF et IFC sont en Python ; les reproduire en TypeScript serait un risque majeur            |
| File de tâches                   | **Redis 7 + BullMQ** côté API ; les travailleurs Python consomment la même file via un adaptateur BullMQ-compatible (ou **Celery** avec Redis si l'équipe préfère rester standard Python — voir § 2.2) | Générations longues hors du cycle requête/réponse, reprise sur échec, priorités                                                 |
| Base de données                  | **PostgreSQL 16** (+ PostGIS optionnel pour les terrains)                                                                                                                                              | Transactions, JSONB pour les modèles, historique                                                                                |
| Stockage objet                   | **S3 compatible** (MinIO en développement)                                                                                                                                                             | URL présignées, cycle de vie des fichiers                                                                                       |
| Authentification                 | Sessions côté serveur (cookie `HttpOnly`, `Secure`, `SameSite=Lax`) + **Argon2id** ; OAuth Google/Microsoft en option                                                                                  | Simplicité, révocation immédiate, pas de JWT long terme exposé au navigateur                                                    |
| Interprétation de la description | Service d'interprétation configurable derrière une interface `DescriptionInterpreter` (fournisseur et clé en variables d'environnement), avec repli sur l'analyseur de règles interne                  | Isolation du fournisseur ; aucune dépendance exposée dans l'application                                                         |
| Conteneurs / CI                  | **Docker**, `docker compose` en local, **GitHub Actions**, déploiement sur Kubernetes ou plateforme conteneurs managée                                                                                 | Environnements dev / staging / prod identiques                                                                                  |

### 2.2 Alternative étudiée : backend tout-Python

API FastAPI + travailleurs Celery, front Next.js inchangé.

- **Avantages** : une seule langue côté serveur, partage direct des modèles Pydantic entre API et moteur, pas d'adaptateur de file.
- **Inconvénients** : perte du partage de types front/API (à compenser par génération OpenAPI → TypeScript), écosystème d'authentification/sessions moins riche, équipe front/back moins interchangeable.
- **Décision** : conserver Node pour l'API tant que l'équipe est majoritairement TypeScript ; **basculer vers FastAPI si la couche API reste mince** (CRUD + orchestration). Ce choix doit être tranché avant le sprint 2 ; les contrats (§ 6) sont conçus pour rendre la bascule indolore.

### 2.3 Alternatives écartées

- Moteur de géométrie en TypeScript (`@flatten-js`, `three-bvh-csg`) : viable pour la 2D et le glTF, insuffisant pour IFC et DXF de qualité professionnelle.
- WebAssembly d'IfcOpenShell côté navigateur : prometteur pour la lecture, immature pour l'écriture complète.
- Génération synchrone dans l'API : incompatible avec les temps de calcul (10 à 30 s) et la montée en charge.

---

## 3. Architecture modulaire du code

Monorepo **pnpm workspaces + Turborepo** pour la partie TypeScript, paquet Python séparé géré par **uv** dans le même dépôt.

```
tracea/
├── apps/
│   ├── web/                     # Next.js — interface
│   └── api/                     # Fastify — API
├── packages/
│   ├── domain/                  # BuildingModel : schémas Zod, types, invariants, utilitaires géométriques légers
│   ├── rendering-2d/            # modèle → primitives de dessin (lignes, hachures, cotes, symboles) → SVG
│   ├── rendering-3d/            # modèle → scène Three.js (côté client)
│   ├── ui/                      # composants d'interface partagés (design system issu des maquettes)
│   ├── api-contract/            # schémas des requêtes/réponses, client TypeScript généré
│   └── config/                  # ESLint, Prettier, tsconfig partagés
├── engine/                      # paquet Python « tracea_engine »
│   ├── tracea_engine/
│   │   ├── domain/              # modèle Pydantic miroir du schéma JSON (validé par les mêmes fixtures)
│   │   ├── interpretation/      # description → programme
│   │   ├── generation/          # programme + terrain → BuildingModel (solveur)
│   │   ├── geometry/            # résolution géométrique : murs, jonctions, ouvertures, toiture
│   │   ├── checks/              # vérifications de cohérence et règles d'usage
│   │   ├── rendering/           # vues 2D (primitives) et maillage 3D
│   │   ├── export/              # dxf/, pdf/, svg/, png/, ifc/, gltf/, obj/
│   │   └── worker/              # consommation de la file, cycle de vie des tâches
│   └── tests/
├── infra/                       # Dockerfiles, compose, manifestes de déploiement, scripts
├── docs/                        # documentation technique versionnée
├── .claude/agents/              # définition des rôles du workflow
├── CLAUDE.md
└── .env.example
```

Règles de dépendance (vérifiées par ESLint `no-restricted-imports` et par `import-linter` côté Python) :

- `domain` ne dépend de rien d'autre que ses utilitaires.
- `rendering-*` et `export` dépendent de `domain`, jamais l'inverse.
- `ui` et `apps/web` ne contiennent **aucune logique métier** : calculs de surfaces, validation, placement passent par `domain` ou par l'API.
- `apps/api` orchestre ; il ne génère rien lui-même.

---

## 4. Pipeline du moteur Tracea

```
description + paramètres + terrain
        │
        ▼
[1] Interprétation ──► Programme (pièces, surfaces, adjacences, orientations, contraintes)
        │                └─ ambiguïtés / contradictions → demande de clarification (arrêt propre)
        ▼
[2] Implantation ────► Enveloppe : emprise au sol dans la zone constructible (terrain − reculs), orientation
        ▼
[3] Zonage ──────────► Répartition jour/nuit/service par niveau, position de l'escalier et des gaines
        ▼
[4] Solveur de plan ─► Placement des pièces sur grille (pas 10 cm), satisfaction des surfaces et adjacences
        │                (recherche locale + recuit simulé ; fonction de coût : écart de surface, adjacences
        │                 violées, compacité, longueur de circulation, exposition du séjour)
        ▼
[5] Murs & ouvertures ► Extraction des murs (porteurs / cloisons), jonctions, portes (sens d'ouverture),
        │                fenêtres (dimensions selon type de pièce et orientation), escalier
        ▼
[6] Toiture & 3D ────► Toiture (plat / 2 pans / 4 pans) par squelette droit, planchers, maillage
        ▼
[7] Vérifications ───► Cohérence géométrique, règles d'usage, PMR indicatif → liste d'avertissements
        ▼
[8] BuildingModel v1 (JSON) persisté comme nouvelle version
        ▼
[9] Rendus et exports à la demande (2D : primitives → SVG/DXF/PDF/PNG ; 3D : maillage → glTF/OBJ ; BIM : IFC)
```

Points de conception :

- Les étapes 1 à 7 forment une **tâche `generate`** ; l'étape 9 est une **tâche `export`** distincte par format, mise en cache par (versionId, format, options).
- Chaque étape publie sa progression (`stage`, `percent`, `message`) sur la file ; l'API la relaie au navigateur par SSE.
- Le solveur est **déterministe à graine fixée** : une même entrée avec la même graine produit le même plan (reproductibilité des tests). L'utilisateur peut demander une « autre proposition » (nouvelle graine).
- La **régénération partielle** fige les éléments édités manuellement (marqués `locked` dans le modèle) et relance le solveur sur le reste.
- L'interprétation est isolée derrière `DescriptionInterpreter` ; le repli sur l'analyseur de règles couvre les descriptions simples (type, surface, nombre de pièces, orientation) si le service configuré est indisponible.

---

## 5. Modèle de données (PostgreSQL)

| Table             | Colonnes principales                                                                                                                                         | Notes                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `users`           | id (uuid), email (unique, citext), password_hash, email_verified_at, plan, created_at, deleted_at                                                            | Suppression logique puis purge planifiée |
| `sessions`        | id, user_id, expires_at, ip, user_agent, created_at                                                                                                          | Révocation par suppression               |
| `projects`        | id, owner_id, name, description_text, parameters (jsonb), site (jsonb), current_version_id, created_at, updated_at, deleted_at                               |                                          |
| `versions`        | id, project_id, number, model (jsonb, BuildingModel), model_schema_version, origin (`generated` / `edited` / `restored`), seed, warnings (jsonb), created_at | Immuable une fois créée                  |
| `jobs`            | id, project_id, version_id (nullable), type (`generate` / `export`), status, stage, percent, error (jsonb), payload (jsonb), started_at, finished_at         | Miroir de la file pour l'historique      |
| `exports`         | id, version_id, format, options_hash, object_key, size_bytes, checksum, created_at, expires_at                                                               | Cache des exports                        |
| `shares`          | id, project_id, token_hash, role, expires_at, revoked_at, created_at                                                                                         | Le jeton n'est stocké que haché          |
| `project_members` | project_id, user_id, role                                                                                                                                    | V2                                       |
| `audit_log`       | id, actor_id, action, target_type, target_id, metadata (jsonb), created_at                                                                                   | Actions sensibles                        |

Index : `versions(project_id, number)`, `exports(version_id, format, options_hash)` unique, `jobs(status, created_at)`. Les modèles JSONB sont compressés par PostgreSQL ; au-delà de 2 Mo un modèle est déporté dans le stockage objet et référencé.

---

## 6. Contrats entre composants

- **Schéma `BuildingModel`** : JSON Schema versionné (`schemaVersion: "1.0"`) publié dans `packages/domain/schema/` ; les types TypeScript (Zod) et Pydantic sont générés ou validés contre les **mêmes fixtures** en CI (tests de contrat).
- **Messages de la file** : `GenerateJob { jobId, projectId, input: { description, parameters, site, seed?, lockedElements? } }`, `ExportJob { jobId, versionId, format, options }`, événements `JobProgress`, `JobCompleted`, `JobFailed { code, message, details }`.
- **API HTTP** : OpenAPI 3.1 généré depuis les schémas Zod ; client TypeScript généré pour `apps/web`.
- **Codes d'erreur métier** (exposés à l'utilisateur en français) : `PROGRAM_CONTRADICTION`, `SITE_TOO_SMALL`, `UNSOLVABLE_LAYOUT`, `INTERPRETATION_UNAVAILABLE`, `EXPORT_VALIDATION_FAILED`, etc. Chaque code porte un message explicatif et, si possible, la contrainte en cause.

---

## 7. Sécurité

| Domaine          | Mesures                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentification | Argon2id (m = 64 Mo, t = 3, p = 1), vérification d'e-mail, limitation de débit sur connexion / réinitialisation, sessions serveur avec rotation à la connexion, déconnexion de toutes les sessions                                                                                  |
| Autorisation     | Vérification `owner_id` ou appartenance sur chaque accès projet ; les identifiants sont des UUID v4 aléatoires (122 bits) non devinables, qui ne révèlent pas leur date de création (décision D4 du sprint 2) ; les liens de partage sont des jetons 256 bits hachés en base        |
| Entrées          | Validation Zod sur toutes les routes ; description limitée à 2 000 caractères ; paramètres bornés (surfaces, niveaux) ; fichiers importés : taille ≤ 5 Mo, type vérifié par contenu, analysés dans le travailleur (processus isolé, délai maximal, mémoire limitée)                 |
| Web              | Helmet (CSP stricte sans `unsafe-inline`, HSTS), CSRF par cookie `SameSite` + jeton double soumission sur les mutations, échappement systématique, pas de `dangerouslySetInnerHTML` sur du contenu utilisateur (les SVG générés le sont depuis le modèle, jamais depuis une saisie) |
| Fichiers         | Stockage objet privé ; URL présignées ≤ 15 min ; en-têtes `Content-Disposition: attachment` ; purge des exports expirés                                                                                                                                                             |
| Secrets          | Variables d'environnement, gestionnaire de secrets en production, `.env.example` documenté, analyse de secrets en CI                                                                                                                                                                |
| Dépendances      | Audit automatique (pnpm audit, pip-audit), Dependabot/Renovate, verrouillage des versions                                                                                                                                                                                           |
| Journalisation   | Journal d'audit pour connexion, partage, suppression, export ; aucun mot de passe ni jeton en clair dans les journaux                                                                                                                                                               |
| Données          | Chiffrement au repos (base et stockage), TLS 1.2+ partout, suppression effective sur demande (RGPD)                                                                                                                                                                                 |

---

## 8. Infrastructure et exploitation

### 8.1 Environnements

| Environnement | Usage                                                                                      | Déploiement                                                            |
| ------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `dev`         | poste développeur, `docker compose up` (web, api, worker, postgres, redis, minio, mailpit) | manuel                                                                 |
| `staging`     | validation QA, données de test                                                             | automatique sur `develop`                                              |
| `prod`        | utilisateurs                                                                               | automatique sur étiquette `vX.Y.Z` depuis `main`, approbation manuelle |

### 8.2 Conteneurs

- `web` : image Node alpine, sortie `standalone` de Next.js.
- `api` : image Node alpine, utilisateur non root, port 3001.
- `engine-worker` : image Python slim avec dépendances natives précompilées (IfcOpenShell, cairo) ; démarre N processus selon le CPU ; limites mémoire explicites.
- Mise à l'échelle : `web` et `api` sur la latence, `engine-worker` sur la longueur de la file.

### 8.3 CI/CD (GitHub Actions)

1. `lint` : ESLint, Prettier, ruff, mypy, tsc `--noEmit`.
2. `test` : unitaires (Vitest, pytest), tests de contrat sur les fixtures `BuildingModel`, validation des exports (ezdxf, IfcOpenShell, validateur glTF, contrôle PDF).
3. `e2e` : Playwright sur le parcours critique contre un environnement éphémère.
4. `security` : audit des dépendances, analyse de secrets, analyse statique.
5. `build` : images Docker, étiquetées par SHA et par version.
6. `deploy` : staging puis prod avec approbation.

### 8.4 Observabilité

- Journaux structurés JSON (pino côté Node, structlog côté Python) avec `requestId` / `jobId` propagés.
- Métriques Prometheus : durée par étape du pipeline, taux d'échec par code, longueur de file, latence API, taille des exports.
- Traces OpenTelemetry sur requête → tâche → export.
- Alertes : taux d'échec de génération > 10 % sur 15 min, file > 100 tâches pendant 10 min, erreurs 5xx > 1 %.

### 8.5 Sauvegardes et reprise

- PostgreSQL : sauvegarde complète quotidienne + archivage WAL, rétention 30 jours, test de restauration trimestriel.
- Stockage objet : versionnage activé, règle de cycle de vie sur les exports (suppression après expiration).
- Objectifs : RPO 1 h, RTO 4 h.

---

## 9. Performance et dimensionnement

| Élément                                          | Budget                                                    |
| ------------------------------------------------ | --------------------------------------------------------- |
| Génération maison individuelle (étapes 1–8)      | ≤ 30 s P95, cible 10 s                                    |
| Génération petit collectif R+4                   | ≤ 120 s P95 (V2)                                          |
| Export DXF / SVG / PNG                           | ≤ 5 s                                                     |
| Export PDF dossier complet                       | ≤ 15 s                                                    |
| Export IFC maison individuelle                   | ≤ 20 s                                                    |
| Scène 3D maison individuelle                     | ≤ 150 000 triangles, ≤ 20 matériaux, textures ≤ 2 048 px  |
| Charge utile `BuildingModel` maison individuelle | ≤ 300 Ko JSON                                             |
| Travailleur Python                               | 1 vCPU, 1 Go RAM par génération ; 2 Go pour IFC collectif |

Leviers : cache des exports par (version, format, options) ; instanciation des ouvertures en 3D ; chargement différé de la 3D ; SVG segmenté par calque pour l'éditeur.

---

## 10. Décisions à confirmer avant le sprint 2

1. API Node (Fastify) **ou** FastAPI (§ 2.2). — **Tranché au sprint 1 : Fastify** (`docs/plans/sprint-1-auth.md`).
2. BullMQ avec adaptateur Python **ou** Celery (si FastAPI, Celery s'impose).
3. Hébergement cible (Kubernetes managé vs plateforme conteneurs) selon le budget.
4. Fournisseur du service d'interprétation et stratégie de repli.
5. Activation de PostGIS dès la V1 (import cadastre) ou report en V2.
6. Bibliothèque PDF : `reportlab` (licence BSD, mature) vs `cairo` via `pycairo` (rendu identique au SVG).

---

## 11. Risques techniques spécifiques

- **Jonctions de murs et nettoyage de la géométrie** : point classique de fragilité ; prévoir une bibliothèque de tests géométriques (murs en T, en L, en croix, murs obliques).
- **Toitures** : le squelette droit gère les toits à pans sur polygones simples ; les emprises concaves complexes imposent une décomposition. Limiter les formes acceptées en V1 (rectangles, L, T, U).
- **IFC** : la cohérence des `IfcRelVoidsElement` / `IfcRelFillsElement` et des placements locaux est la principale source de fichiers rejetés ; valider systématiquement avec IfcOpenShell et un second visualiseur.
- **DXF** : les hachures (`HATCH`) et les cotes (`DIMENSION`) sont les entités les plus sensibles à l'interopérabilité ; tester dans AutoCAD, LibreCAD et un visualiseur en ligne.
- **Version du schéma `BuildingModel`** : prévoir dès la V1 un mécanisme de migration des versions stockées.
