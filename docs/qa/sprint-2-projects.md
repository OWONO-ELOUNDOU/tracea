# Rapport QA — sprint 2 (Mes projets)

| Champ      | Valeur                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle       | QA (tâche S2-8)                                                                                                                                                  |
| Date       | 17 novembre 2026                                                                                                                                                 |
| Périmètre  | `docs/plans/sprint-2-projects.md` (S2-1 à S2-7, contrat § 3), branche `feature/projects`, travail non commité (`git status` : 23 fichiers modifiés, 17 nouveaux) |
| Références | `docs/specs/screens/projects.md`, `docs/specs/reference/` (CU-02, EF-101, EF-102, API § A.3, plan de qualité), `docs/qa/sprint-1-auth.md`                        |

## 1. Décision

**Accepté avec réserves. Passage au rôle Sécurité (S2-9).** Décision mise à jour le 18 novembre 2026 après revérification : voir le § 12.

Tous les critères d'acceptation vérifiables localement sont conformes, toutes les commandes passent, le parcours de bout en bout passe trois fois de suite et l'analyse axe-core ne relève aucune violation sur les dix états de l'écran contrôlés. Aucun écart P1. Un écart P2, antérieur au sprint et de nature sécurité (contournement des limites de débit par l'en-tête `X-Forwarded-For`), est transmis à S2-9 et doit être tranché avant la fusion. Deux écarts P3 sont renvoyés au frontend et au backend.

## 2. Environnement

- macOS 13, Node 24.15.0, pnpm 10.28.0 (via corepack), Chromium de Playwright 1.65 (plateforme forcée à `mac14` par variable de session, rien dans le dépôt).
- Absents de la machine : Docker, `uv`, `gh`. Conséquences au § 9.
- Aucun fichier du dépôt n'a été modifié en dehors de ce rapport ; les sondes jetables (serveurs API de sonde, scripts `curl`, scripts Playwright) ont été écrites hors du dépôt. `git status` compte le même nombre d'entrées avant et après la recette (les rapports Playwright sont ignorés par `.gitignore`).

## 3. Commandes exécutées

| Commande                                   | Résultat                                                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                        | OK — « All matched files use Prettier code style! »                                                                                                                                                       |
| `pnpm lint --force`                        | OK — code de sortie 0, « Tasks: 5 successful, 5 total » (`domain`, `api`, `web`, `e2e`, `config`), aucune erreur ni avertissement                                                                         |
| `pnpm typecheck --force`                   | OK — code de sortie 0, « Tasks: 5 successful, 5 total » (`api`, `domain`, `e2e`, `web`)                                                                                                                   |
| `pnpm test --force`                        | OK — `@tracea/domain` 3 fichiers / 23 tests ; `@tracea/api` 5 fichiers / 68 tests (22,3 s) ; `@tracea/web` 3 fichiers / 40 tests. Premier lancement à froid sans dépassement de délai                     |
| `pnpm contract`                            | Partiel — partie TypeScript OK (`[OK] house-rectangular.json`) ; partie Python non exécutée : « sh: uv: command not found » (code de sortie 1, cause environnementale)                                    |
| `pnpm --filter @tracea/web build`          | OK — 8 routes statiques dont `/projets` (9,58 kB, 115 kB au premier chargement). Avertissement Next.js sur la racine de l'espace de travail inférée (déjà présent, sans effet)                            |
| `pnpm e2e` (3 lancements consécutifs)      | OK — 5 tests passés à chaque lancement (14,4 s, 14,1 s, 14,0 s), aucun réessai (`retries` à 0 hors CI)                                                                                                    |
| `drizzle-kit generate` (sortie hors dépôt) | OK — « No schema changes, nothing to migrate » ; le dossier de sortie est identique à `apps/api/drizzle` (`diff -r` vide)                                                                                 |
| `git diff HEAD -- 0000_init_auth.sql`      | OK — diff vide                                                                                                                                                                                            |
| `uv run pytest`                            | Non exécuté : `uv` absent. Le moteur Python est hors périmètre du sprint (plan § 7) et `git status` ne montre aucune modification sous `engine/`                                                          |
| Couverture                                 | Non mesurée : seule `packages/domain` configure la couverture (inchangée) ; `apps/api` et `apps/web` n'en ont pas. Pas de baisse mesurable ; le nombre de tests passe de 17 à 68 (API) et de 0 à 40 (web) |

Tests e2e exécutés : `smoke.spec.ts` (page `/connexion` sans violation A / AA ; API e2e en service) et `projects.spec.ts` (connexion → état vide → création → rechargement ; tuile `Nouveau projet` ; isolation entre deux comptes, liste et accès direct à l'API en 404 au corps identique à celui d'un identifiant inexistant).

## 4. Critères d'acceptation S2-1 à S2-7

| Tâche | Critère                                                                                                     | Verdict            | Preuve                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2-1  | En-tête indiquant la consultation de la maquette                                                            | Conforme           | Cadre `5:2` cité, portée de la consultation explicite (structure relevée, aucune image)                                                                              |
| S2-1  | Contenu : en-tête, carte, « Nouveau projet », dialogues, corbeille 30 jours, duplication, pagination, états | Conforme           | § 3 à § 8 de la spécification ; texte de suppression avec la corbeille de 30 jours                                                                                   |
| S2-1  | Accessibilité : tabulation, focus, annonces, contraste AA                                                   | Conforme           | § 9 ; contrastes calculés (§ 9.5)                                                                                                                                    |
| S2-1  | Aucune route web autre que `/projets`, aucune donnée hors contrat                                           | Conforme           | Build : aucune nouvelle route ; éléments de maquette hors contrat masqués et listés (§ 3.1, § 12.1)                                                                  |
| S2-1  | `docs/design-notes.md` aligné sur `globals.css`                                                             | Conforme           | Fichier modifié (62 lignes) ; non recoupé valeur par valeur                                                                                                          |
| S2-2  | Tables, contraintes, index du § 4                                                                           | Conforme           | `0001_projects.sql` : clés étrangères en cascade et mise à nul, index partiel de liste, index `deleted_at`, unicité (`project_id`, `number`), contrôle `number >= 1` |
| S2-2  | `0000` inchangé, `generate` sans nouvelle migration                                                         | Conforme           | § 3                                                                                                                                                                  |
| S2-2  | Migration sur base vide et sur base en `0000`                                                               | Conforme (PGlite)  | Test « applies on a database already migrated to 0000 and keeps its data » ; PostgreSQL 16 non vérifiable (§ 9)                                                      |
| S2-2  | Tests de cascade, mise à nul, doublon                                                                       | Conforme           | `schema.test.ts`, 6 tests verts                                                                                                                                      |
| S2-3  | Six routes conformes au § 3                                                                                 | Conforme           | Tests `projects.test.ts` (42 tests) et sonde du § 5                                                                                                                  |
| S2-3  | Routes réduites à validation + appel du service ; filtre `owner_id` et `deleted_at` dans la même requête    | Conforme           | Relecture de `routes/projects.ts` et `projects/service.ts` (méthode `owned()` dans chaque `WHERE`, `UPDATE … RETURNING` sans lecture préalable)                      |
| S2-3  | Audit `project.create/update/duplicate/delete` sans nom ni description                                      | Conforme           | Test « writes one line per mutation without project content » ; `metadata` limitée à `fields` et `sourceProjectId`                                                   |
| S2-3  | OpenAPI décrit les six routes avec schémas                                                                  | Conforme           | Test « describes the six project routes with their schemas » ; sonde : chemins `/projects`, `/projects/{id}`, `/projects/{id}/duplicate`                             |
| S2-3  | § A.3 de la spécification API à jour, routes reportées marquées                                             | Conforme           | `04-api-et-qualite.md` : colonne « État » (livré, reporté CU-03 / CU-04, non planifié D3)                                                                            |
| S2-3  | Tests attendus (cycle, autorisation croisée, 401, 403, validation, 45 projets en 3 pages, duplication)      | Conforme           | Tous présents et verts                                                                                                                                               |
| S2-4  | `purgeExpired(db, now)`, compteurs, idempotence, bornes 29 / 31 jours                                       | Conforme           | `maintenance.test.ts`, 5 tests verts                                                                                                                                 |
| S2-4  | Journalisation des compteurs seuls ; D7 documenté ; un échec n'empêche pas l'API de démarrer                | Conforme           | Commande distincte de l'API (`cli.ts`) ; `CHANGELOG.md` ; sonde : base injoignable → ligne JSON `"purge failed"` et code de sortie 1                                 |
| S2-5  | Conforme à la spécification, client § 3.5, actions, états                                                   | Conforme           | Parcours clavier (§ 6) et tests web (17 tests d'écran)                                                                                                               |
| S2-5  | Texte provisoire supprimé, pas de `dangerouslySetInnerHTML`                                                 | Conforme           | Recherche dans `apps/web/src` : aucune occurrence                                                                                                                    |
| S2-5  | Non connecté → `/connexion?suivant=/projets`                                                                | Conforme           | Sonde navigateur, avant connexion et après déconnexion                                                                                                               |
| S2-5  | Entièrement utilisable au clavier                                                                           | Conforme, réserve  | § 6 ; indicateur de focus des entrées de menu insuffisant (A2, P3)                                                                                                   |
| S2-5  | Captures d'écran dans la PR                                                                                 | Non vérifiable     | Aucune PR ouverte (travail non commité)                                                                                                                              |
| S2-6  | `pnpm e2e` démarre la pile en une commande, sans secret ni contournement en production                      | Conforme           | API e2e dans `apps/api/test/e2e-server.ts` (hors `dist/`, refus de `NODE_ENV=production`), comptes insérés en base ; aucune route ajoutée                            |
| S2-6  | Job CI `e2e` : cache des navigateurs, rapport et traces en artefact                                         | Conforme (lecture) | `.github/workflows/ci.yml` ; exécution réelle non vérifiable (§ 9)                                                                                                   |
| S2-6  | Test de fumée axe sur `/connexion`                                                                          | Conforme           | `smoke.spec.ts`, 3 passages                                                                                                                                          |
| S2-7  | Parcours connexion → vide → création → rechargement ; axe sur 4 états ; 3 passages ; isolation              | Conforme           | `projects.spec.ts` : rôles et libellés, aucune attente fixe ; 3 lancements verts                                                                                     |

## 5. Contrat § 3 — sonde de l'API

Instance de l'application de production lancée hors dépôt (`NODE_ENV=development`, base embarquée, deux comptes vérifiés), interrogée par `fetch`. 53 contrôles, tous conformes :

- Sans session : 401 `UNAUTHENTICATED` sur les six routes.
- `POST /projects` `{ name: "  Maison Mbarga  " }` : 201, `Location: /projects/{id}`, nom nettoyé, forme `ProjectDetail` exacte (10 clés), projet vide, dates ISO en UTC.
- `GET /projects` : `{ items, nextCursor }`, forme `ProjectSummary` exacte (6 clés), tri `updatedAt` puis `id` décroissants.
- Isolation : le compte B reçoit sur `GET`, `PATCH`, `duplicate` et `DELETE` du projet de A, ainsi que sur un identifiant non UUID, un corps **identique à l'octet** à celui d'un UUID inexistant (`application/problem+json`, `PROJECT_NOT_FOUND`, « Projet introuvable ») ; liste de B vide ; projet de A intact ; `ownerId` et `deletedAt` jamais présents dans les réponses.
- CSRF : `POST` et `DELETE` sans jeton → 403 `CSRF_TOKEN_INVALID`.
- Validation (422 `VALIDATION_ERROR` avec `fields`) : nom vide, d'espaces, de 121 caractères, `ownerId`, `parameters`, `site`, `deletedAt`, `PATCH` vide, corps non vide sur `duplicate`, `limit` à 0 et à 51, curseur illisible.
- `PATCH` : 200, `updatedAt` avance ; `descriptionText: null` accepté. Duplication : 201, `Location`, nom `« … (copie) »`, copie d'un nom de 120 caractères ramenée à 120. `DELETE` : 204 sans corps ; ensuite 404 identique sur les quatre routes et projet absent de la liste.
- Limite globale (instance à `RATE_LIMIT_PER_MINUTE=60`) : après une soixantaine de requêtes dans la minute, 429 `RATE_LIMITED` en `application/problem+json`, `retry-after: 60`.

Observations hors contrat, reprises au § 8 : corps JSON mal formé (400 au titre `FastifyError`, détail en anglais), noms faits de caractères invisibles ou d'inversion bidirectionnelle acceptés, `PATCH` sur identifiant non UUID avec corps invalide → 422 avant 404 (sans fuite : la validation précède toute lecture).

## 6. Parcours utilisateur et clavier

Pile e2e lancée à la main (API sur base embarquée, `next start` du build de production), Chromium piloté uniquement au clavier, à 1 440 px sauf mention contraire.

| Étape                       | Résultat                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accès sans session          | Redirection vers `/connexion?suivant=/projets`                                                                                                                                                                                                   |
| Connexion au clavier        | Arrivée sur `/projets`, titre du document « Mes projets — Tracea », état vide                                                                                                                                                                    |
| Ordre de tabulation (vide)  | `Aller au contenu` → `Tracea` → `Mes projets` → `Nouveau projet` → `QA, menu du compte` → tuile `Nouveau projet` : conforme au § 9.1                                                                                                             |
| Ordre (3 projets + message) | avatar → `Fermer le message` → `Actions pour le projet …` ×3 dans l'ordre de la grille → tuile : conforme                                                                                                                                        |
| Lien d'évitement            | Visible au focus (16, 16, 137 × 36) ; `Entrée` place le focus sur `<main id="contenu">`                                                                                                                                                          |
| Dialogue de création        | Focus initial dans le champ ; `Tab` / `Maj+Tab` bouclent (champ → `Annuler` → `Créer le projet` → champ) ; `Échap` ferme sans appel, focus rendu au déclencheur                                                                                  |
| Nom vide soumis             | Dialogue ouvert, `aria-invalid="true"`, `aria-describedby` → « 120 caractères maximum. » et « Le nom est requis. », focus dans le champ ; l'erreur disparaît à la saisie                                                                         |
| Création                    | Statut « Projet « … » créé. », carte en tête, focus rendu au déclencheur                                                                                                                                                                         |
| Menu des actions            | `Flèche bas` ouvre sur `Renommer`, `Flèche haut` sur `Supprimer`, `Entrée` sur `Renommer` ; boucle, `Début` / `Fin` ; `Échap` rend le focus au bouton ; `Tab` ferme le menu et poursuit ; `aria-expanded` à jour                                 |
| Renommage                   | Texte entièrement sélectionné (0-11 / 11) ; statut « Projet renommé en « … ». », carte en tête, focus sur ses `Actions`                                                                                                                          |
| Duplication                 | Statut « Projet dupliqué sous le nom « … (copie) ». », copie en tête, focus inchangé sur `Actions` du projet d'origine                                                                                                                           |
| Suppression                 | `alertdialog`, focus initial sur `Annuler`, texte de corbeille exact ; annulation → focus sur `Actions` ; confirmation → statut « Projet « … » supprimé. », focus sur `Actions` du projet suivant                                                |
| Zone de message             | `Fermer` place le focus sur `Nouveau projet` de la barre supérieure                                                                                                                                                                              |
| Menu du compte              | Avatar « QA » (texte) / « QA, menu du compte » (nom) ; ouverture → focus sur `Se déconnecter` ; `Échap` → focus sur l'avatar, `aria-expanded="false"`                                                                                            |
| Pagination (25 projets)     | 20 cartes, `Afficher plus de projets` ; activation → statut « 5 projets supplémentaires affichés. », 25 cartes, focus sur `Actions` du premier ajouté, bouton retiré                                                                             |
| Erreur au chargement        | Requêtes `/projects` coupées : `role="alert"` « Impossible d'afficher vos projets » + « Impossible de joindre le service. Vérifiez votre connexion et réessayez. » + `Réessayer` ; après rétablissement, `Réessayer` place le focus sur `<main>` |
| 320 px et 640 px            | Aucun défilement horizontal (320/320, 640/640) ; navigation masquée sous 640 px ; dialogue de 288 px à 320 px                                                                                                                                    |
| Déconnexion                 | Retour à `/connexion` ; `/projets` redirige ensuite vers la connexion                                                                                                                                                                            |

Messages d'erreur : chacun nomme la cause (« Le nom est requis. », « Le nom est limité à 120 caractères. », « Impossible de joindre le service… »), l'action découle du champ resté ouvert ou du bouton `Réessayer` ; français correct, espaces insécables avant `?`, `:` et dans les guillemets.

Comparaison écran / spécification : textes, structure du DOM, rôles et comportements conformes aux § 3 à § 9. Comparaison visuelle avec la maquette Figma non réalisée (§ 9).

## 7. Accessibilité

axe-core (`@axe-core/playwright`, règles `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, plus `wcag22aa` dans la sonde) : **0 violation** sur chacun des états suivants :

- tests e2e : `/connexion`, `/projets` vide, dialogue de création ouvert, liste avec un projet ;
- sonde : dialogue de création avec erreur de champ, menu des actions ouvert, dialogue de renommage, dialogue de suppression, liste avec message de statut, menu du compte ouvert, liste de 20 projets avec pagination, largeur 320 px, état d'erreur.

Hors de portée de l'analyse automatique, relevé à la main : les entrées des menus (actions et compte) n'ont pas le contour de focus prévu par la spécification (§ 2) ; seul le fond change (`#f4f1ea` sur `#ffffff`, rapport 1,13:1). Voir A2.

## 8. Limites de débit (report P4 du sprint 1)

Instance locale de l'application de production en `NODE_ENV=development` (limites par route actives), base embarquée, requêtes `curl` avec jeton CSRF valide :

| Route                            | Essais | Codes obtenus                    | Verdict  |
| -------------------------------- | ------ | -------------------------------- | -------- |
| `POST /auth/login` (mauvais mdp) | 12     | 401 ×10, puis 429 ×2             | Conforme |
| `POST /auth/login` (bon mdp)     | 1      | 429 après blocage                | Conforme |
| `POST /auth/register`            | 7      | 201 ×5, puis 429 ×2              | Conforme |
| `POST /auth/password/forgot`     | 7      | 202 ×5, puis 429 ×2              | Conforme |
| `POST /auth/resend-verification` | 7      | 202 ×5, puis 429 ×2              | Conforme |
| `POST /auth/password/reset`      | 7      | 400 ×7 (pas de limite par route) | Conforme |

Réponse 429 : `application/problem+json`, `code: "RATE_LIMITED"`, titre « Trop de tentatives », détail « Réessayez dans quelques minutes. », en-têtes `x-ratelimit-limit: 10`, `retry-after: 899`. Le report du sprint 1 est **soldé** pour le fonctionnement nominal.

Deux constats :

- Une connexion portant `X-Forwarded-For: 203.0.113.7`, envoyée depuis la même machine juste après le blocage, répond **200** ; même résultat sur `password/forgot` (202). Cause : `trustProxy: true` dans `apps/api/src/app.ts`, l'adresse retenue pour la limite est celle fournie par le client. Voir A1.
- Les trois routes d'envoi d'e-mail ont chacune leur propre compteur de 5 : un même client peut provoquer 15 envois en 15 minutes. Voir A6.

## 9. Non vérifié ici

| Élément                                                 | Raison                                                                                                             | Qui / quand                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Exécution des jobs CI (`e2e` compris, cache, artefacts) | Pas d'accès GitHub (`gh` absent, rien n'est poussé)                                                                | Premier passage de la PR ; S2-11          |
| Migration `0001` sur PostgreSQL 16 et `docker compose`  | Docker absent ; vérifié sur PGlite seulement                                                                       | S2-10                                     |
| Purge sur PostgreSQL réel et planificateur              | Docker absent ; testée sur PGlite et en échec de connexion                                                         | S2-10                                     |
| `uv run pytest`, partie Python de `pnpm contract`       | `uv` absent ; aucun changement sous `engine/`                                                                      | CI (job `contract`)                       |
| Rendu visuel comparé à la maquette Figma                | Aucune capture de la maquette consultée ni dans le dépôt ; couleurs et polices non relevées (spécification § 12.2) | Designer, avec une capture du cadre `5:2` |
| Firefox, Safari, Edge ; lecteur d'écran réel            | Chromium seul (D12) ; pas de lecteur d'écran dans l'environnement                                                  | Sprint suivant                            |
| Captures d'écran de la PR (S2-5)                        | Pas de PR                                                                                                          | Frontend, à l'ouverture de la PR          |
| `pnpm audit`, licences des dépendances nouvelles        | Relève de S2-9                                                                                                     | S2-9                                      |

## 10. Écarts constatés

| #   | Niveau | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                      | Renvoi                                                  |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A1  | P2     | Limites de débit contournables : avec `trustProxy: true`, l'adresse cliente est lue dans `X-Forwarded-For`, que le client choisit. Après blocage de la connexion (10 / 15 min), une requête avec un autre `X-Forwarded-For` est acceptée (200) ; idem pour l'envoi d'e-mail. La protection contre le forçage de mot de passe et l'abus d'envoi est donc inopérante. Code du sprint 1, découvert par la vérification reportée                 | Sécurité (S2-9), puis backend ; à trancher avant fusion |
| A2  | P3     | Focus des entrées de menu (`Renommer`, `Dupliquer`, `Supprimer`, `Se déconnecter`) signalé uniquement par le fond `paper` sur `surface` (1,13:1), `focus-visible:outline-none` dans `menuItem` (`apps/web/src/components/projects/styles.ts`) annulant aussi `focusRing` sur `Se déconnecter`. Écart avec la spécification § 2 (contour 2 px `primary` sur tous les éléments interactifs) et indicateur peu perceptible (WCAG 2.4.7, 1.4.11) | Frontend                                                |
| A3  | P3     | Corps JSON mal formé sur une route `/projects` : 400 au titre `FastifyError`, code `FST_ERR_CTP_INVALID_JSON_BODY`, détail en anglais (« Body is not valid JSON… »). Contraire au § 3.1 (titre et détail en français). Gestionnaire d'erreurs commun, antérieur au sprint ; non atteignable depuis l'écran                                                                                                                                   | Backend                                                 |
| A4  | P4     | Le nom refuse les caractères de contrôle (`\p{Cc}`) mais accepte un nom fait uniquement d'un espace sans chasse (U+200B, carte au titre invisible) et les caractères d'inversion bidirectionnelle (U+202E)                                                                                                                                                                                                                                   | Sécurité (S2-9) pour avis, puis backend                 |
| A5  | P4     | `PATCH /projects/{id}` avec un identifiant non UUID et un corps invalide répond 422 avant 404 (la validation précède la recherche). Aucune fuite d'information ; le § 3.1 est muet sur cette combinaison                                                                                                                                                                                                                                     | Backend, à documenter ou laisser                        |
| A6  | P4     | « 5 envois d'e-mail / 15 min » s'entend par route : inscription, renvoi de vérification et mot de passe oublié ont chacun 5, soit 15 envois possibles par client                                                                                                                                                                                                                                                                             | Sécurité (S2-9) pour avis                               |
| A7  | P4     | `next start` signale « does not work with "output: standalone" » au démarrage de la pile e2e ; sans effet constaté, mais la pile e2e ne lance pas le serveur réellement livré                                                                                                                                                                                                                                                                | Devops                                                  |
| A8  | P4     | La commande de purge exige `SESSION_SECRET` (validation de `loadConfig`) alors qu'elle ne l'utilise pas : le planificateur doit recevoir un secret inutile                                                                                                                                                                                                                                                                                   | Backend, devops (S2-10)                                 |
| A9  | P4     | `copyName` compte en unités UTF-16 alors que la validation du nom compte en caractères : la copie d'un nom de 120 emoji est tronquée à 56 emoji au lieu de 112. Sans conséquence fonctionnelle                                                                                                                                                                                                                                               | Backend                                                 |

Écarts de maquette (§ 12.1 et § 12.2 de la spécification : indicateurs, recherche, filtre, logo, vignettes, « Créé il y a… ») : connus, documentés et à arbitrer par le porteur du projet ; non comptés ici.

## 11. Suite

- S2-9 : traiter A1 en priorité, donner un avis sur A4 et A6.
- Frontend : A2. Backend : A3, puis A5, A8, A9 au besoin. Devops : A7, A8 en S2-10.
- Une correction de A1 ou A2 repasse par la QA (plan § 6) : relancer `pnpm test`, `pnpm e2e` et la sonde des limites de débit.

## 12. Revérification du 18 novembre 2026 (S2-8 bis)

Objet : lever le blocage de la revue de sécurité (`docs/security/sprint-2-projects.md`, S2-SEC-01 = A1) après les correctifs non commités suivants : `TRUST_PROXY` (`apps/api/src/config.ts`, `apps/api/src/app.ts`, `apps/api/test/trust-proxy.test.ts`), redirection après connexion limitée à la même origine (`apps/web/src/lib/redirect.ts`, S2-SEC-02), contour de focus des menus (`apps/web/src/components/projects/styles.ts`, A2). Mêmes environnement et règles qu'au § 2 ; serveurs de sonde arrêtés à la fin.

### 12.1 Commandes

| Commande                              | Résultat                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                   | OK — « All matched files use Prettier code style! »                                                             |
| `pnpm lint --force`                   | OK — sortie 0, « Tasks: 5 successful, 5 total »                                                                 |
| `pnpm typecheck --force`              | OK — sortie 0, « Tasks: 5 successful, 5 total »                                                                 |
| `pnpm test --force`                   | OK — domain 23 tests ; API 6 fichiers / 83 tests (+15, `trust-proxy.test.ts`) ; web 4 fichiers / 56 tests (+16) |
| `pnpm e2e` (3 lancements consécutifs) | OK — 5 tests passés à chaque lancement (18,9 s, 18,6 s, 21,1 s), ports 3000 / 3001                              |

### 12.2 Limites de débit sans `TRUST_PROXY` (A1, S2-SEC-01)

Sonde de la sécurité (`sec.mts`, mode `ratelimit`, application de production en `NODE_ENV=development` sur base embarquée, injection Fastify) :

- connexion, même adresse : `401 ×10`, puis `429` ;
- 30 connexions suivantes, chacune avec un nouvel `X-Forwarded-For` : `429 ×30` ; bon mot de passe avec un `X-Forwarded-For` usurpé : `429` ;
- `password/forgot` ×8 avec `X-Forwarded-For` tournant : `202 ×5`, puis `429 ×3`.

Sonde HTTP réelle (`curl` sur une instance locale, sans `TRUST_PROXY`) :

| Essai                                                                           | Codes obtenus                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /auth/login` ×12, `X-Forwarded-For` différent à chaque fois               | `401 ×10`, `429 ×2`                                         |
| Connexion valide avec un nouvel `X-Forwarded-For`                               | `429`                                                       |
| Connexion avec `X-Forwarded-For: 198.51.100.78, 127.0.0.1`                      | `429`                                                       |
| `POST /auth/password/forgot` ×7, `X-Forwarded-For` tournant                     | `202 ×5`, `429 ×2`                                          |
| `POST /auth/register` ×7, `X-Forwarded-For` tournant                            | `201 ×5`, `429 ×2`                                          |
| `POST /auth/resend-verification` ×7, `X-Forwarded-For` et `X-Real-IP` tournants | `202 ×5`, `429 ×2`                                          |
| Limite globale (60 / min) : `GET /health` ×65, `X-Forwarded-For` tournant       | `200 ×59`, `429 ×6` (une requête de démarrage déjà comptée) |

La 11ᵉ connexion et la 6ᵉ demande `password/forgot` répondent 429 quel que soit l'en-tête ; la limite globale tient.

### 12.3 Démarrage avec `TRUST_PROXY`

`node src/index.ts` (via `tsx`), base volontairement injoignable pour distinguer l'échec de configuration de l'échec de connexion :

| Valeur                                                              | Résultat                                                                                                                                                                    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`                                                              | Refus, sortie 1 : « Invalid environment configuration: TRUST_PROXY: "true" would trust every sender; list the addresses or CIDR ranges of the proxies in front of the API » |
| `1`                                                                 | Refus, sortie 1 : « … TRUST_PROXY: "1" is a hop count, which Fastify ignores; list the addresses or CIDR ranges of the proxies instead »                                    |
| `TRUE`, `*`, `0.0.0.0/0`, `::/0`, `10.0.0.0/00`, `10.0.0.1, *`, `2` | Refus, sortie 1, « Invalid environment configuration »                                                                                                                      |
| `loopback`, `10.0.0.0/8`                                            | Configuration acceptée (échec ensuite sur la base injoignable, attendu)                                                                                                     |
| `false`                                                             | Configuration acceptée, puis Fastify refuse la valeur (« invalid IP address: false ») : l'API ne démarre pas, mais le message n'indique pas la cause attendue (A10)         |

Contrôle complémentaire du comportement de Fastify avec `loopback` et `10.0.0.0/8,127.0.0.1` : un client direct qui usurpe `X-Forwarded-For` garde sa propre adresse ; derrière un proxy de confiance (`127.0.0.1`), l'adresse transmise est retenue.

### 12.4 Redirection après connexion (S2-SEC-02)

Chromium, connexion réelle depuis `/connexion?suivant=…` :

| `suivant`               | Arrivée                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `/%5Csite.example`      | `/projets`                                                     |
| `//site.example`        | `/projets`                                                     |
| `/%2F%2Fsite.example`   | `/projets`                                                     |
| `https://site.example`  | `/projets`                                                     |
| `/%09/site.example`     | `/projets`                                                     |
| `/%5C%5Csite.example/x` | `/projets`                                                     |
| `javascript:alert(1)`   | `/projets`                                                     |
| `/projets?x=1#h`        | `/projets?x=1` (chemin interne conservé ; fragment perdu, A11) |

Aucune sortie de l'origine de l'application.

### 12.5 Contour de focus des menus (A2)

Chromium, focus au clavier (`:focus-visible` vrai) : `Renommer`, `Dupliquer`, `Supprimer` et `Se déconnecter` ont un contour `solid 2px rgb(30, 74, 110)` (`primary`) décalé de 2 px, en plus du fond `paper`. Capture vérifiée : contour nettement visible autour de l'entrée focalisée. Ouverture à la souris : pas de contour (`:focus-visible` faux), comportement attendu. axe-core, menu ouvert : 0 violation (règles WCAG 2 A / AA, 2.1 et 2.2 AA).

### 12.6 Statut des écarts

| Écart               | Statut                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 (P2) / S2-SEC-01 | **Corrigé et vérifié** (§ 12.2, § 12.3)                                                                                                               |
| A2 (P3)             | **Corrigé et vérifié** (§ 12.5)                                                                                                                       |
| S2-SEC-02           | **Corrigé et vérifié** (§ 12.4)                                                                                                                       |
| A3 à A9             | Inchangés, non bloquants (§ 10)                                                                                                                       |
| A10 (P4, nouveau)   | `TRUST_PROXY=false` passe la validation et l'API échoue ensuite avec « invalid IP address: false » : refus sûr, message peu explicite. Renvoi backend |
| A11 (P4, nouveau)   | Le fragment (`#…`) d'un `suivant` interne n'est pas conservé après connexion. Sans effet sur la sécurité. Renvoi frontend                             |

### 12.7 Décision finale

**Accepté.** Les écarts bloquants A1 (S2-SEC-01) et S2-SEC-02, ainsi que A2, sont corrigés et vérifiés ; toutes les commandes passent et le parcours e2e passe trois fois de suite. Restent des écarts P3 / P4 non bloquants (A3 à A11). Retour au rôle Sécurité pour lever le blocage de fusion, puis S2-10. Les points non vérifiables du § 9 demeurent.
