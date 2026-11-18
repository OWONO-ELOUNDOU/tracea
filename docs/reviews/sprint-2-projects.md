# Revue technique — sprint 2 (Mes projets)

| Champ           | Valeur                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle            | Réviseur technique (tâche S2-11)                                                                                                                                                                     |
| Date            | 18 novembre 2026                                                                                                                                                                                     |
| Objet           | `git diff 0478c84 f5425f3` (squash de `feature/projects`, identique à `eb03805`, diff vide) et modifications non commitées de `develop` issues de S2-10                                              |
| Rapports joints | `docs/qa/sprint-2-projects.md` (§ 12 compris), `docs/security/sprint-2-projects.md` (blocage levé le 18 novembre), `docs/ops/sprint-2-projects.md`                                                   |
| Références      | `docs/plans/sprint-2-projects.md` (S2-1 à S2-11, D1 à D14), `docs/specs/screens/projects.md`, `docs/specs/reference/04-api-et-qualite.md`, `docs/reviews/sprint-1-auth.md`, `CLAUDE.md`              |
| Contexte        | Revue postérieure à la fusion dans `develop`, faite à la demande du porteur du projet. `f5425f3` n'est pas encore poussé (`origin/develop` = `0478c84`) : une correction reste possible avant envoi. |

## Décision

**Corrections demandées avant de commiter S2-10 et S2-11 sur `develop` et avant tout envoi de `develop`.**

Le code du sprint est de bonne facture : architecture conforme, typage strict sans contournement, tests nombreux et pertinents, rapports QA et sécurité sans point bloquant restant. Le verdict tient à un seul manquement au point 6 (règle de présentation), dans un document versé par `f5425f3` : `docs/compte-rendu-sprint-1-auth.md` (R1). Conformément à la règle du rôle, ce manquement bloque quelle que soit la qualité du reste. Il se corrige en quelques lignes. Trois corrections documentaires mineures (R2 à R4) sont à intégrer au même commit.

Une fois R1 à R4 faits, la décision devient **approuvé avec réserves**. Les réserves portent sur les vérifications impossibles sur ce poste (pile compose, exécution réelle de la CI) ; elles sont listées en § 8.

**Mise à jour du 18 novembre 2026 : approuvé avec réserves.** R1 à R4 sont corrigés :

- R1 : `docs/compte-rendu-sprint-1-auth.md` réécrit à la voix de l'équipe (livrable décrit par le dépôt, consigne sur l'auteur des commits et mention de session retirées, point sur l'outil de maquettes marqué tranché par D1).
- R2 : `docs/ops/sprint-2-projects.md`, migration attribuée à S2-2 et parcours sans restauration (D3).
- R3 : `CHANGELOG.md`, puce d'exploitation rattachée à la liste, jeton CI déplacé sous `Security`, pile e2e standalone sous `Changed`.
- R4 : `docs/plans/sprint-2-projects.md`, D1 marquée tranchée (Figma).

Les réserves du § 8 restent valables.

## Contrôles exécutés

Sur `develop` avec les modifications de S2-10 en place (macOS 13, Node 24, pnpm 10.28 via corepack) :

| Commande                   | Résultat                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm format:check`        | OK — « All matched files use Prettier code style! »                                         |
| `pnpm lint --force`        | OK — « Tasks: 5 successful, 5 total »                                                       |
| `pnpm typecheck --force`   | OK — « Tasks: 5 successful, 5 total »                                                       |
| `pnpm test --force`        | OK — domain 3 fichiers / 23 tests ; api 6 fichiers / 83 tests ; web 4 fichiers / 56 tests   |
| `git diff eb03805 f5425f3` | Vide : le squash reproduit exactement la branche revue par la QA et la sécurité             |
| Sortie standalone          | `apps/web/.next/standalone/apps/web/server.js` présent (construction du 18 novembre, S2-10) |

`pnpm e2e` n'a pas été relancé : la QA l'a exécuté trois fois de suite après les correctifs (§ 12.1 de son rapport), puis le devops une fois avec le serveur standalone (§ 8.1 de sa note).

## 1. Périmètre

Les tâches S2-1 à S2-10 du plan sont livrées et leurs critères sont vérifiés par la QA. Le contrat du § 3 du plan est respecté à l'octet près, d'après la sonde QA (53 contrôles) et la relecture : six routes, formes `ProjectSummary` et `ProjectDetail`, 404 indiscernable, schémas stricts, audit sans contenu. Les hors-périmètre du § 7 sont tenus : aucune route de génération ni de restauration, pas d'écran de détail, pas de `packages/ui` ni de `packages/api-contract`, aucun changement sous `engine/` ni dans `BuildingModel`.

Écarts par rapport au plan, tous justifiés :

| Écart                                                                                                   | Origine                           | Avis                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRUST_PROXY` (`config.ts`, `app.ts`, `.env.example`, `trust-proxy.test.ts`), option `strictRateLimits` | S2-SEC-01, code du sprint 1       | Justifié : constat haut, bloquant. Correctif conforme au § 4.1 du rapport sécurité, vérifié par la QA (§ 12.2, § 12.3)                                                            |
| `apps/web/src/lib/redirect.ts` et tests, `login-form.tsx`                                               | S2-SEC-02, code du sprint 1       | Justifié : correctif court conseillé par la sécurité avec S2-SEC-01 ; vérifié en navigateur (QA § 12.4)                                                                           |
| Contour de focus des entrées de menu (`styles.ts`)                                                      | A2                                | Pas une extension : mise en conformité de S2-5 avec la spécification § 2                                                                                                          |
| `SubmitButton` accepte `className` (`components/auth/fields.tsx`)                                       | Réutilisation dans les dialogues  | Justifié, comportement par défaut inchangé pour les pages d'authentification                                                                                                      |
| `.npmrc` (`public-hoist-pattern[]=eslint`), `.gitignore` (`next-env.d.ts`)                              | Outillage pnpm 10, Next.js        | Justifié et commenté ; sans effet sur les images (avis sécurité)                                                                                                                  |
| Rubrique `### Security` du `CHANGELOG.md`                                                               | S2-SEC-01, S2-SEC-02              | Justifiée : catégorie standard de Keep a Changelog, pertinente pour un changement de comportement des limites de débit. Placée avant `Added` au lieu de la fin : sans conséquence |
| `docs/compte-rendu-sprint-1-auth.md` versé dans `docs/`                                                 | Annoncé dans le message de commit | Signalé, mais contenu non conforme au point 6 : voir R1                                                                                                                           |
| S2-10 : `permissions` de la CI                                                                          | S2-SEC-11, prévu au sprint 3      | Avance justifiée (une ligne, risque nul) ; l'épinglage par empreinte reste à faire                                                                                                |
| S2-10 : `e2e/playwright.config.ts` lance le serveur standalone                                          | A7                                | Justifié : la pile e2e teste désormais le serveur livré                                                                                                                           |
| S2-10 : `apps/web/next.config.ts` (`outputFileTracingRoot`)                                             | Conséquence de A7                 | Hors de la liste de fichiers de S2-10 ; **validé**, voir § 7. À mentionner dans le corps du commit de S2-10                                                                       |

Non livré, sans effet sur la décision : captures d'écran de S2-5 (aucune PR n'a été ouverte, la fusion ayant été faite directement ; la QA a comparé l'écran à la spécification), S2-SEC-05 et S2-SEC-08 (conseillés avec S2-SEC-01, non faits, reportés en § 8).

## 2. Architecture

- **Dépendances** : `packages/domain` n'est pas modifié et ne dépend toujours de rien. `apps/api` n'importe de `@tracea/domain` que le type `BuildingModel` pour typer `versions.model` (`db/schema.ts`), sens correct, dépendance déclarée dans `apps/api/package.json`. `apps/web` n'importe que `@tracea/domain` (préexistant). Le paquet `e2e/` interdit par ESLint l'import de `@tracea/api`, `@tracea/web` et `@tracea/domain` : les tests ne passent que par le navigateur et HTTP. Règles vérifiées par `pnpm lint`.
- **API** : découpage `routes/projects.ts` (validation Zod et appel du service uniquement) → `projects/service.ts` (requêtes, transactions, audit) → `db/schema.ts`. Le filtre propriétaire et `deleted_at` est porté par chaque `WHERE` via `owned()`, sans lecture préalable suivie d'une comparaison. La purge est séparée en fonction pure (`purge.ts`), commande (`command.ts`) et point d'entrée (`cli.ts`) : testable sans processus.
- **Web** : aucune logique métier. Bornes, tri et validation viennent de l'API ; le dialogue de nom ne contrôle rien côté client (commentaire explicite) et affiche `fields.name` de la réponse 422. Le placement d'un projet renommé ou créé en tête de liste reproduit l'ordre de l'API (commenté). `format.ts` (dates relatives, initiales) relève de la présentation. L'écran reçoit son client et son navigateur par injection (`projects-route.tsx`), ce qui permet les tests sans réseau.
- **Exports** : aucun export dans ce sprint. Le plan prévoit que la vignette sera dérivée du modèle, jamais d'un export : `thumbnailUrl` reste `null`.
- **Point d'attention** : les types `ProjectSummary`, `ProjectDetail` et `ProjectPage` existent deux fois (`apps/api/src/projects/service.ts` et `apps/web/src/lib/api.ts`), plus une troisième description dans `routes/openapi.ts`. Conforme au plan (pas de `packages/api-contract`, D13), mais source de dérive : suite en § 8.

## 3. Qualité

- TypeScript strict et ESLint `strictTypeChecked` verts ; aucun `any`, aucun `@ts-ignore` ni `@ts-expect-error`, aucune désactivation de règle dans le diff.
- Assertions non nulles (`!`) uniquement dans les tests (règle désactivée dans la configuration partagée depuis le sprint 1). Un seul `as unknown as Database` (`apps/api/test/maintenance.test.ts`), commenté, pour simuler une base défaillante.
- Le type `Executor` (`PgDatabase<PgQueryResultHKT, typeof schema>`) contourne l'union de pilotes de `Database` sans transtypage : commenté dans `purge.ts` et `service.ts`.
- Choix non évidents documentés là où ils servent : précision milliseconde de `updated_at` pour le curseur, curseur canonique refusé s'il n'a pas été produit par le service, `copyName` qui ne coupe pas une paire de substitution, `setTimeout(…, 0)` sur `Tab` dans le menu des actions, NUL refusé par PostgreSQL.
- Nommage cohérent (anglais dans le code, textes d'interface en français centralisés dans `texts.ts`, typographie française avec espaces insécables).
- Écarts mineurs, déjà tracés par la QA : `copyName` compte en unités UTF-16 et la description est bornée en unités UTF-16 alors que les messages parlent de caractères (A9) ; `TRUST_PROXY=false` passe la validation puis fait échouer le démarrage avec un message peu explicite (A10).
- `next.config.ts` utilise `__dirname`, valide parce que `apps/web` n'est pas un paquet ESM (`"type"` absent) ; à remplacer par `import.meta.dirname` si le paquet passe un jour en ESM.

## 4. Tests

- 162 tests TypeScript (23 domain, 83 api, 56 web), 5 tests e2e. Contre 17 tests API et aucun test web à la fin du sprint 1.
- API : intégration sur PostgreSQL embarqué avec les migrations réelles ; autorisation croisée sur les quatre routes ciblées, corps 404 comparés ; 401 sur les six routes ; CSRF ; validation ; pagination de 45 projets avec `updatedAt` égaux ; duplication avec version courante ; cascade, mise à nul et unicité en base ; purge avec horloge injectée (bornes 29 / 31 jours, idempotence, 401 après purge) ; `TRUST_PROXY` (refus au démarrage, en-tête usurpé, mandataire de confiance) ; présence des six routes dans OpenAPI.
- Web : client simulé, horloge injectée ; tous les cas attendus par S2-5 ; client HTTP (`api.test.ts`) ; `safeNext` sur les cas d'attaque du rapport sécurité.
- e2e : sélecteurs par rôle et libellé, aucune attente fixe, listes vidées avant chaque test, `retries` à 0 en local ; trois passages consécutifs verts (QA).
- Déterminisme : pas de dépendance à l'heure réelle dans les assertions (les tests de purge travaillent en décalages relatifs) ; `hookTimeout` relevé et commenté pour le démarrage de PGlite.
- Rapports : QA « Accepté » (§ 12.7) ; sécurité « blocage levé » le 18 novembre. Restent des constats P3 / P4 et bas / moyens, non bloquants (§ 8).

## 5. Documentation

- `docs/specs/reference/04-api-et-qualite.md` : § A.3 à jour (contrat, colonne « État », routes reportées), UUID v4 (D4) ; `POST /auth/resend-verification` documenté (report de la revue du sprint 1 soldé).
- `docs/specs/reference/02-architecture.md` § 7 aligné sur D4.
- OpenAPI : six routes avec schémas de requête et de réponse, composants communs, testé.
- `.env.example` : `TRUST_PROXY` commenté. Aucune autre variable nouvelle (confirmé par la note S2-10).
- `CHANGELOG.md` : rubriques `Security` et `Added` à jour. Ligne d'exploitation de S2-10 à reprendre (R3).
- `docs/specs/screens/projects.md`, `docs/design-notes.md` : maquette Figma citée comme référence (D1). Le tableau des décisions du plan n'a pas suivi (R4).
- `infra/README.md` et `docs/ops/sprint-2-projects.md` : purge, `TRUST_PROXY` par environnement, migration et retour arrière, job `e2e`. Deux erreurs dans la note (R2).

## 6. Règle de présentation

Relus : le diff complet (code, commentaires, textes d'interface, documents, tests), les modifications non commitées et `docs/ops/sprint-2-projects.md`, le message de `f5425f3`.

- **Message de commit** : conforme. `feat(projects): projects list, CRUD API, purge command and e2e tooling`, type et portée Conventional Commits, sujet de 71 caractères, corps par domaine (`api`, `web`, `e2e`, `docs`). Ni ligne `Co-Authored-By`, ni lien de session, ni signature. Auteur : le porteur du projet.
- **Interface** : conforme. Aucune désignation du moteur ; « Aucun plan généré » et « Décrivez, générez, exportez » ne nomment aucun outil.
- **Code et commentaires** : conformes, ton technique, en anglais.
- **Documents** : conformes, à une exception près. **`docs/compte-rendu-sprint-1-auth.md` n'est pas conforme** (R1). Il est rédigé comme le compte rendu d'un intervenant extérieur au dépôt remis au porteur du projet, et en porte les marques :
  - ligne 6 : « Livrable : Archive `tracea-sprint-1.zip` » ;
  - ligne 18 : « Auteur configuré localement sur l'adresse du porteur ; le nom (`Hermann Owono`) est à corriger si besoin via `git config user.name` puis `git commit --amend --reset-author` » ;
  - ligne 34 : « Relier le dépôt GitHub (non relié à cette session) ».

  Ces passages révèlent un contexte de production étranger à l'équipe (référence à « cette session », consigne de réattribuer les commits). C'est ce que la règle de `CLAUDE.md` exclut. Le point 1 des « Points à trancher » est en outre périmé : D1 est tranchée.

Les autres mentions d'outils relevées (Figma, Stitch) désignent des outils de maquettes, sans rapport avec la règle.

## 7. Avis sur `apps/web/next.config.ts`

**Validé.**

- **Besoin réel** : sans racine explicite, Next.js déduit la racine du monorepo des fichiers de verrouillage trouvés au-dessus du dépôt. Sur ce poste, un `bun.lockb` existe dans le dossier personnel ; la sortie standalone se plaçait alors sous un chemin relatif à ce dossier et la commande e2e (`node .next/standalone/apps/web/server.js`) ne trouvait pas le serveur. Disposition constatée après le changement : `.next/standalone/apps/web/server.js`.
- **Option prévue pour ce cas** : `outputFileTracingRoot` est l'option documentée de Next.js pour fixer la racine de traçage d'un monorepo.
- **Image `web` inchangée** : dans `infra/docker/web.Dockerfile`, le dépôt est copié dans `/app`, déjà racine ; `join(__dirname, "../..")` vaut `/app`, la commande `node apps/web/server.js` reste correcte. Point 7 du § 8.2 de la note d'exploitation à confirmer avec Docker.
- **Qualité** : fichier couvert par `tsc` (inclus par `apps/web/tsconfig.json`), commentaire utile, une ligne. ESLint ignore `*.config.ts` (configuration partagée), sans incidence ici.
- **Périmètre** : extension de S2-10 (fichier absent de la liste du plan), signalée dans la note d'exploitation (§ 1, § 5.3). À reprendre dans le corps du commit de S2-10.

## Demandes de changement

| #   | Importance                    | Fichier                                                                       | Constat                                                                                                                                                      | Correction attendue                                                                                                                                                                                                                                                                                                                                                                                                          | Rôle                             |
| --- | ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| R1  | **Bloquant** (point 6)        | `docs/compte-rendu-sprint-1-auth.md`, lignes 6, 18, 34 (et point 1, ligne 32) | Compte rendu rédigé par un intervenant extérieur : archive de livraison, consigne de réattribution des commits, référence à « cette session »                | Réécrire à la voix de l'équipe : supprimer la ligne « Livrable », la phrase sur l'auteur et la parenthèse « non relié à cette session » ; marquer D1 comme tranchée (Figma). À défaut, retirer le fichier, dont le contenu est déjà couvert par `docs/plans`, `docs/qa`, `docs/security`, `docs/ops` et `docs/reviews` du sprint 1. Commit `docs:` distinct ou inclus dans celui de S2-10, **avant tout envoi de `develop`** | Planificateur, porteur du projet |
| R2  | Mineur, à corriger avec S2-10 | `docs/ops/sprint-2-projects.md`                                               | § 1 : `0001_projects.sql` attribué à « S2-1 » au lieu de S2-2. § 8.2, point 4 : « restauration » alors qu'aucune restauration n'existe (D3, plan § 7)        | Remplacer par « S2-2 » ; retirer « restauration » du parcours (création, renommage, duplication, suppression)                                                                                                                                                                                                                                                                                                                | Devops                           |
| R3  | Mineur, à corriger avec S2-10 | `CHANGELOG.md`, rubrique `Added`                                              | La ligne « Exploitation » est séparée des autres puces par une ligne vide (liste rendue comme liste lâche) et mêle ajout et durcissement                     | Supprimer la ligne vide ; déplacer « jeton CI en lecture seule » sous `Security` (S2-SEC-11) ; garder sous `Added` le service `purge` et la procédure ; mettre la pile e2e standalone sous `Changed`                                                                                                                                                                                                                         | Devops                           |
| R4  | Mineur                        | `docs/plans/sprint-2-projects.md`, § 9, ligne D1                              | La ligne D1 indique toujours « l'outil qui fait foi n'est toujours pas arbitré », alors que la spécification d'écran et `design-notes.md` la disent tranchée | Compléter la colonne « Hypothèse de travail » comme pour D4, D7 et D8 : « Tranchée : la maquette Figma fait foi »                                                                                                                                                                                                                                                                                                            | Planificateur                    |

Sans demande de changement, pour mémoire : `0478c84` (« initial commit », suppression de `apps/web/next-env.d.ts`) n'a pas de message Conventional Commits. Il précède le sprint, il est déjà sur `origin/develop` : ne pas réécrire l'historique, appliquer la convention à l'avenir.

Les corrections R1 à R4 sont purement documentaires : pas de nouvelle recette QA ni de nouvelle revue de sécurité. Une relecture de R1 par le réviseur suffit avant l'envoi.

## 8. Suites consolidées pour le sprint 3

Regroupement des suites de la QA (A3 à A11), de la sécurité (S2-SEC-03 à S2-SEC-12), de l'exploitation (§ 9 de la note) et de cette revue.

### Avant le premier staging

| Sujet                                                                                                                                                                                                            | Source                  | Rôle   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| Vérifications compose du § 8.2 de la note d'exploitation (volume en `0000`, volume neuf, index partiel et énumération sur PostgreSQL 16, purge, image `web`), résultat consigné : critère de S2-10 encore ouvert | Ops § 8.2, QA § 9       | Devops |
| Premier passage réel de la CI : job `e2e` (cache, artefacts), job `security` avec jeton en lecture seule (gitleaks)                                                                                              | QA § 9, ops § 6         | Devops |
| Job `deploy`, manifeste de la tâche de purge, valeur réelle de `TRUST_PROXY` et règle réseau associée                                                                                                            | Ops § 9, sécurité § 4.1 | Devops |
| Alerte d'absence de purge ; métrique de la purge avec l'observabilité                                                                                                                                            | Ops § 3.5, § 9          | Devops |

### Sprint 3

| Sujet                                                                                                                                                        | Source                     | Rôle              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ----------------- |
| En-têtes de sécurité de l'application web (CSP avec `frame-ancestors 'none'`, `X-Frame-Options`, `Referrer-Policy`, `nosniff`, HSTS en production), test e2e | S2-SEC-03 (moyenne)        | Frontend, devops  |
| Erreurs 4xx du cadriciel traduites (titre et détail en français, sans code interne)                                                                          | S2-SEC-05, A3              | Backend           |
| Configuration propre à la commande de purge, sans `SESSION_SECRET`                                                                                           | S2-SEC-08, A8              | Backend, devops   |
| Plafond des entrées `fields` des réponses 422                                                                                                                | S2-SEC-06                  | Backend           |
| Compteur d'e-mails commun aux trois routes et limite par destinataire                                                                                        | S2-SEC-07, A6              | Backend           |
| Purge des jetons d'e-mail expirés ou utilisés (troisième compteur)                                                                                           | S2-SEC-12                  | Backend           |
| Épinglage des actions par empreinte, Dependabot `github-actions`                                                                                             | S2-SEC-11, ops § 6         | Devops            |
| Message explicite pour `TRUST_PROXY=false`                                                                                                                   | A10                        | Backend           |
| Bornes et troncature du nom en caractères et non en unités UTF-16 (`copyName`, description)                                                                  | A9, revue § 3              | Backend           |
| Fragment `#…` conservé après connexion                                                                                                                       | A11                        | Frontend          |
| Ordre 422 / 404 sur `PATCH` avec identifiant invalide : documenter dans le § A.3                                                                             | A5                         | Backend           |
| Contrat partagé : génération d'OpenAPI depuis Zod ou types communs API / web, pour supprimer la triple description des projets                               | D13, revue § 2             | Backend, frontend |
| Rôle designer (`.claude/agents/designer.md`) : remplacer la référence à Stitch et `docs/design/stitch/` par la maquette Figma (D1)                           | Revue sprint 1, D1         | Porteur du projet |
| Comparaison visuelle avec le cadre `5:2` de la maquette ; écarts de maquette du § 12 de la spécification d'écran à arbitrer                                  | QA § 9, spécification § 12 | Designer, porteur |
| Firefox, Safari, Edge et lecteur d'écran réel                                                                                                                | D12, QA § 9                | QA, devops        |

### Avant l'écriture de versions, le partage ou les exports

| Sujet                                                                                                        | Source         | Rôle              |
| ------------------------------------------------------------------------------------------------------------ | -------------- | ----------------- |
| Refus des caractères bidirectionnels, des chaînes mal formées et des noms invisibles ; `<bdi>` à l'affichage | S2-SEC-04, A4  | Backend, frontend |
| Plafond provisoire de projets par compte et limite de débit des mutations par utilisateur                    | S2-SEC-09, D10 | Backend, porteur  |
| Contrainte composite garantissant que `current_version_id` appartient au même projet                         | S2-SEC-10      | Backend           |
| Verrou consultatif autour du migrateur si le déploiement est multi-instances                                 | Ops § 2.1, § 9 | Backend, devops   |
| Échappement du nom de projet dans chaque format d'export et dans `Content-Disposition`                       | Sécurité § 5   | Backend           |

### Décisions à porter au plan du sprint 3

D3 (restauration depuis la corbeille), D11 (`DELETE /me`), D5 et D14 (préfixe `/v1`, forme de `/me`), ainsi que les constats moyens du sprint 1 encore ouverts (contrôle des mots de passe compromis, cookie `Secure` en staging).
