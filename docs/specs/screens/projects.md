# Spécification d'écran — Mes projets (CU-02, EF-101)

| Champ      | Valeur                                   |
| ---------- | ---------------------------------------- |
| Rôle       | Designer                                 |
| Date       | 17 novembre 2026                         |
| Maquette   | Écran 01, cadre `5:2`                    |
| Route web  | `/projets`                               |
| Références | CU-02, EF-101, EF-102 ; plan du sprint 2 |

**Maquette de référence** : fichier Figma « Tracea — Maquettes v0.1 », page « 01 · Écrans », cadre `5:2` « 01 · Mes projets » (1440 × 1014), [lien](https://www.figma.com/design/WjdAD77A3iU3u4LL5eP0TB). La maquette fait foi (décision D1 du plan `docs/plans/sprint-2-projects.md`, tranchée par le porteur du projet).

Portée de la consultation : la structure du cadre (calques, noms, textes, positions et tailles) a été relevée ; aucune image n'a été consultée. Les couleurs, polices, rayons, ombres et les libellés internes des instances (`Bouton`, `Segment`, `Étiquette`) ne figurent pas dans le relevé : ces valeurs reprennent les fondations v0.1 de `apps/web` et sont signalées comme telles. Sont également sans maquette, donc définis ici par l'équipe : les états de chargement, liste vide et erreur, la pagination, le menu des actions, les dialogues, le menu du compte et le comportement sous 1 440 px.

Le cadre montre de nombreux éléments sans donnée dans le contrat du sprint (§ 3 du plan) : le § 3.1 indique, pour chacun, s'il est rendu, masqué ou laissé en emplacement au sprint 2 ; le § 12 les liste comme écarts à arbitrer. Le contrat n'est pas modifié.

Révision après l'implémentation (S2-5) et le parcours de bout en bout (S2-7) : correction de deux non-conformités WCAG 2.5.3 induites par la version précédente (§ 3.4, § 3.6), messages du champ du nom alignés sur l'API (§ 8.3), écarts acceptés consignés au § 12.5.

## 1. Objectif et périmètre

Un utilisateur connecté retrouve ses projets, en crée un (nommé, vide), le renomme, le duplique et le supprime, entièrement au clavier s'il le souhaite.

- Une seule route web : `/projets`. Aucune autre route n'est créée.
- Toutes les données affichées viennent du contrat du plan (§ 3) : `ProjectSummary`, `ProjectDetail`, `nextCursor`, et de `GET /me` (`PublicUser`) pour l'en-tête.
- L'écran ne trie pas, ne borne pas et ne valide pas : l'ordre de la liste, les bornes du nom et les refus viennent de l'API. Les messages d'échec viennent de `errorMessage` (`apps/web/src/lib/api.ts`), sauf les deux cas listés au § 8.3. Seule la mise en forme des dates (§ 3.3) et des initiales (§ 3.4) est faite par l'interface.
- Un projet ne s'ouvre pas : la page de détail est hors périmètre du sprint. Le nom d'un projet est un titre, pas un lien, et la carte n'est pas cliquable.

## 2. Fondations et dimensions

Dimensions relevées sur le cadre `5:2` (largeur 1 440 px) :

- Barre supérieure : hauteur 64, marges latérales 32. Marque : logo 28 × 28 suivi du nom à 10 px. Navigation à 32 px de la marque, entrées de 36 px de haut, marges intérieures horizontales 12, espacement 4. Bouton principal hauteur 40. Avatar 32 × 32, à 32 px du bord droit.
- Contenu : marges latérales 48, marge haute 32 ; largeur utile 1 344 px à 1 440 px.
- Bloc de titre : titre sur une ligne de 36, sous-titre sur une ligne de 20 à 4 px du titre.
- Grille des cartes : 3 colonnes, gouttière horizontale 20, gouttière verticale 24, à 24 px du bloc qui précède.
- Carte : hauteur 316, bordure 1 ; vignette pleine largeur, hauteur 180 ; corps avec marges intérieures 16 ; ligne du nom de 24 ; ligne de résumé de 16 à 8 px du nom ; pied de 46 à 8 px du résumé, contenant le texte de date (ligne de 16, calé en bas) et un bouton de 40 de haut aligné à droite.
- Tuile « Nouveau projet » : même taille qu'une carte ; icône 48 × 48 centrée, libellé (ligne de 20) à 12 px sous l'icône, phrase (ligne de 16) à 12 px sous le libellé ; l'ensemble centré verticalement.

Valeurs non relevées, reprises des fondations v0.1 (`apps/web/src/app/globals.css`, voir `docs/design-notes.md`). Aucun jeton n'est ajouté.

- Fond de page `paper` ; barre supérieure, cartes, tuile, dialogues, menus et messages sur `surface` ; bordures `line` ; texte `ink` ; texte secondaire `ink` à 70 % (`text-ink/70`), jamais moins ; action principale `primary` ; erreur et action destructive `danger` ; succès `ok`. La barre supérieure est séparée du contenu par une bordure basse `line`.
- Typographie : titre d'écran 28/36 semi-gras (`text-[28px] font-semibold leading-9`, cohérent avec la ligne de 36 relevée) ; nom de projet 16/24 semi-gras (`font-semibold`, ligne de 24 relevée) ; entrées de navigation, libellé de la tuile et boutons 14/20 (`text-sm`) ; résumé, date et phrase de la tuile 12/16 (`text-xs`, lignes de 16 relevées) ; nom de la marque 18/24 semi-gras (`text-lg`, ligne de 24 relevée) en `primary`.
- Contrôles : hauteur 40 (`h-10`), rayon 8 (`rounded-lg`) ; cartes, tuile et dialogues rayon 12 (`rounded-xl`).
- Styles de bouton :
  - principal : `bg-primary text-white hover:bg-primary/90 disabled:opacity-60`, `px-4 font-medium` ;
  - secondaire : `border border-line`, texte `ink`, survol `bg-paper` ;
  - destructif : `bg-danger text-white hover:bg-danger/90 disabled:opacity-60`.
- Focus visible sur tous les éléments interactifs de l'écran : contour de 2 px `primary` décalé de 2 px (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`). Les classes sont posées sur les composants de l'écran ; `globals.css` n'est pas modifié.
- Conteneur du contenu : `mx-auto max-w-[1344px]` avec marges latérales 48 (`px-12`) ; au-delà de 1 440 px le contenu reste centré à 1 344 px (la maquette ne montre pas de largeur supérieure).

## 3. Structure

Rendu du sprint 2 (les éléments masqués du § 3.1 n'y figurent pas) :

```
┌──────────────────────────────────────────────────────────────┐
│ Tracea   Mes projets                  [Nouveau projet]  (HE) │  barre supérieure
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Mes projets                                                  │  titre
│                                                              │
│ ┌ zone de message (statut ou alerte) ──────────────────────┐ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ │   (vignette)    │ │   (vignette)    │ │                 │  │  grille
│ ├─────────────────┤ ├─────────────────┤ │        +        │  │
│ │ Nom du projet   │ │ Nom du projet   │ │ Nouveau projet  │  │
│ │ (état des plans)│ │ (état des plans)│ │ Décrivez, …     │  │
│ │ Modifié …       │ │ Modifié …       │ │                 │  │
│ │       [Actions] │ │       [Actions] │ │                 │  │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│                                                              │
│                  [Afficher plus de projets]                  │  pagination
└──────────────────────────────────────────────────────────────┘
```

Dans la carte, le texte de date et le bouton `Actions` sont sur la même ligne (pied de carte) ; le schéma les sépare faute de place.

Hiérarchie et ordre du DOM (c'est aussi l'ordre de lecture et de tabulation) :

- Lien d'évitement `Aller au contenu`, visible uniquement au focus, cible `#contenu`.
- `<header>` (barre supérieure) :
  - marque `Tracea` : lien vers `/projets` ;
  - `<nav aria-label="Navigation principale">` : une seule entrée, lien `Mes projets` vers `/projets`, `aria-current="page"`, entrée active sur fond `paper` ;
  - bouton principal `Nouveau projet` ;
  - bouton d'avatar ouvrant le menu du compte (§ 3.4).
- `<main id="contenu" tabindex="-1">` :
  - `<h1 id="projets-titre">` `Mes projets` ;
  - zone de message (§ 4, `Notice`) ;
  - contenu selon l'état (§ 6) : chargement, erreur, ou grille (liste vide ou non) ;
  - bouton de pagination, seulement si `nextCursor` n'est pas `null`.
- Dialogues (création, renommage, suppression) : rendus hors du flux, un seul à la fois.

Le titre du document (onglet du navigateur) est `Mes projets — Tracea`.

### 3.1 Éléments de la maquette et traitement au sprint 2

Pour chaque élément du cadre `5:2` (identifiant de calque entre parenthèses) :

- Barre supérieure
  - Logo 28 × 28 (`5:5`) : **masqué**. Aucun fichier de logo dans le dépôt ; la marque est le seul nom `Tracea`.
  - Nom de marque « Tracea » (`5:9`) : **rendu**.
  - Navigation « Mes projets » (`5:12`) : **rendue**, entrée courante.
  - Navigation « Modèles » et « Aide » (`5:14`, `5:16`) : **masquées**. Aucune route web autre que `/projets` au sprint 2.
  - Bouton 149 × 40 (`5:18`) : **rendu** avec le libellé `Nouveau projet` (libellé interne de l'instance non relevé, voir § 12.2).
  - Avatar « HE » (`5:21`) : **rendu**, initiales de l'utilisateur, ouvre le menu du compte (§ 3.4).
- Bloc de titre
  - Titre « Mes projets » (`5:26`) : **rendu**.
  - Sous-titre « 6 projets · 14 générations ce mois » (`5:27`) : **masqué**. Ni total de projets ni compteur de générations dans le contrat.
  - Recherche « Rechercher un projet… » (`5:30`) : **masquée**. `GET /projects` n'a pas de paramètre de recherche.
  - Segment de filtre 126 × 38 (`5:35`) : **masqué**. Contenu non relevé, aucun filtre dans le contrat.
- Indicateurs (`5:43`)
  - « GÉNÉRATIONS RESTANTES » — « 36 / 50 », « Plan Atelier · renouvelé le 1er décembre » (`5:44`) : **masqué**. Quotas (EF-105) hors périmètre.
  - « DERNIÈRE GÉNÉRATION » — « Il y a 2 h », « Maison Mbarga · version 4 » (`5:48`) : **masqué**. La génération n'existe pas encore.
  - « EXPORTS CE MOIS » — « 21 », « 9 PDF · 7 DXF · 5 IFC » (`5:52`) : **masqué**. Les exports n'existent pas encore.
  - La rangée entière est absente ; la grille suit directement la zone de message.
- Carte projet (`5:57` et suivantes)
  - Vignette dessinée (`5:58`) : **emplacement vide** de même taille (`thumbnailUrl` toujours `null`).
  - Nom (`5:70`) : **rendu**.
  - Étiquette à droite du nom (`5:72`) : **masquée**. Contenu non relevé, aucune donnée de statut dans le contrat.
  - Résumé, par exemple « Plain-pied · 118,6 m² hab. · 3 chambres · garage » (`5:75`) : **remplacé** par l'état des plans `Aucun plan généré` (§ 3.2).
  - Date, par exemple « Version 4 · modifié il y a 2 h » ou « Créé il y a 3 jours » (`5:77`, `5:124`) : **rendue** selon le § 3.2 (version si présente, date de modification relative).
  - Bouton du pied 64 × 40 (`5:79`) : **rendu** comme bouton `Actions` ouvrant le menu des actions (libellé interne non relevé, voir § 12.2).
- Tuile « Nouveau projet » (`5:172`), icône « + », phrase « Décrivez, générez, exportez » : **rendue**, dernière cellule de la grille (§ 3.6).

### 3.2 Carte de projet

Dans l'ordre du DOM :

- Emplacement de vignette : bloc décoratif de 180 px de haut, pleine largeur, fond `paper`, bordure basse `line`, `aria-hidden="true"`, vide. Au sprint 2, `thumbnailUrl` est toujours `null` ; s'il ne l'était pas, l'emplacement resterait vide (l'affichage d'une vignette sera spécifié avec la fonctionnalité).
- Nom : `<h2>`, texte de `name` tel que renvoyé par l'API. Sur la ligne de 24 de la maquette ; un nom trop long passe à la ligne (`overflow-wrap: anywhere`), la carte s'allonge, et toutes les cartes de la rangée prennent la même hauteur.
- État des plans (emplacement du résumé), `text-xs text-ink/70` : `Aucun plan généré` si `currentVersion` est `null` (toujours le cas au sprint 2). Si `currentVersion` n'est pas `null`, la ligne est absente : le résumé du bâtiment de la maquette demande des données hors contrat.
- Pied de carte, sur une ligne :
  - à gauche, texte de date `text-xs text-ink/70` : `Modifié {date}` si `currentVersion` est `null`, `Version {number} · modifié {date}` sinon ; `{date}` suit le § 3.3 et porte sur `updatedAt`. Le texte est dans un élément `<time>` dont l'attribut `datetime` porte la valeur ISO reçue ;
  - à droite, bouton secondaire `Actions` (hauteur 40) ; il ouvre le menu des actions (§ 3.5).

`createdAt` n'est pas affiché (écart avec « Créé il y a 3 jours » de la maquette, voir § 12.2).

### 3.3 Dates relatives

Le texte `{date}` est calculé à l'affichage à partir de `updatedAt` et de l'heure locale de l'appareil. Il n'est pas rafraîchi par une minuterie ; il est recalculé à chaque nouveau rendu de la carte. Les tests injectent l'heure courante.

Selon l'écart entre maintenant et `updatedAt`, la première règle qui s'applique donne le texte :

1. Moins d'une minute, ou date future : `à l'instant`.
2. De 1 à 59 minutes : `il y a {n} min`.
3. De 1 à 23 heures : `il y a {n} h`.
4. 24 heures ou plus, et `updatedAt` tombe la veille dans le calendrier local : `hier`.
5. De 2 à 6 jours calendaires : `il y a {n} jours`.
6. De 7 à 29 jours, `n` étant le nombre de semaines entières : `il y a 1 semaine`, `il y a {n} semaines`.
7. De 30 à 364 jours, `n` étant le nombre de périodes entières de 30 jours : `il y a {n} mois`.
8. 365 jours ou plus : `le {date longue}`, où `{date longue}` suit `Intl.DateTimeFormat("fr-FR", { dateStyle: "long" })`.

Exemples : `Modifié à l'instant`, `Version 4 · modifié il y a 2 h` (forme de la maquette), `Modifié hier`, `Modifié le 16 novembre 2025`.

### 3.4 Menu du compte

- Bouton d'avatar 32 × 32, rond, fond `paper`, bordure `line`, initiales en `text-xs font-semibold` `ink` (couleurs non relevées : fondations v0.1).
- Initiales : premières lettres des deux premiers mots de `displayName`, en majuscules ; si `displayName` n'a qu'un mot, ses deux premières lettres ; si `displayName` est `null`, les deux premiers caractères alphanumériques de la partie de `email` avant `@`, en majuscules.
- Les initiales sont le texte visible du bouton (sans `aria-hidden`). Nom accessible : `{initiales}, menu du compte`, par exemple `HE, menu du compte` (`aria-label`). Il commence par le texte visible, conformément au critère WCAG 2.5.3 (« Label in Name ») : une commande vocale « HE » active le bouton. `aria-expanded` et `aria-controls` vers le panneau.
- Panneau (motif de divulgation, pas `role="menu"`), ancré sous l'avatar, aligné à droite, sur `surface`, bordure `line`, rayon 8, largeur 240 :
  - identité : `displayName` sur une ligne `text-sm font-medium`, puis `email` en `text-xs text-ink/70` (le `displayName` est omis s'il est `null`), avec ellipse si trop long ;
  - séparateur ;
  - bouton `Se déconnecter`, pleine largeur, aligné à gauche, hauteur 40.
- Fermeture : `Échap` (le focus revient à l'avatar), clic en dehors, ou focus qui quitte le panneau.
- Ce panneau n'est pas dessiné dans la maquette (voir § 12.2).

### 3.5 Menu des actions

Menu déroulant ancré sous le bouton `Actions`, aligné à droite, sur `surface`, bordure `line`, rayon 8, ombre légère. Entrées de 40 px de haut, `text-sm` :

- `Renommer`
- `Dupliquer` (dépend de D2, voir § 11)
- séparateur
- `Supprimer`, en `text-danger`

L'entrée survolée ou active a un fond `paper`. Un seul menu (actions ou compte) est ouvert à la fois ; il se ferme à la sélection d'une entrée, sur `Échap`, au clic en dehors et quand le focus le quitte. Ce menu n'est pas dessiné dans la maquette (voir § 12.2).

### 3.6 Tuile « Nouveau projet »

- Dernière cellule de la grille, après les projets chargés et avant le bouton de pagination, dans tous les états où la grille est affichée (liste vide comprise).
- Aspect : un seul bloc visuel, fond `surface`, bordure pointillée `line` de 1 px (style de bordure non relevé), rayon 12 ; survol fond `paper`. Contenu centré : icône « + » 48 × 48 en `primary` ; libellé `Nouveau projet` en `text-sm font-medium` ; phrase `Décrivez, générez, exportez` en `text-xs text-ink/70`.
- Structure (WCAG 2.5.3) : tout texte visible à l'intérieur d'un bouton fait partie de son nom ; la phrase est donc placée **hors** du bouton.
  - `<button type="button">` couvrant toute la tuile, contenant l'icône (`aria-hidden="true"`) et le libellé `Nouveau projet`. Son nom accessible vient de son contenu : `Nouveau projet` (ni `aria-label` ni `aria-labelledby`).
  - `<p>` frère du bouton contenant `Décrivez, générez, exportez`, superposé au bouton dans la même cellule pour garder l'apparence d'un seul bloc, sans capter le pointeur (`pointer-events: none`) ; le bouton le référence par `aria-describedby`, la phrase est donc annoncée comme description.
- Même action que le bouton `Nouveau projet` de la barre supérieure (§ 7.1).

## 4. Composants

Tous dans `apps/web/src/components/projects/` (le paquet `packages/ui` est hors périmètre du sprint). Les noms sont indicatifs ; le découpage peut varier tant que les comportements sont respectés.

- `AppHeader` — barre supérieure : marque, navigation, `Nouveau projet`, avatar.
- `AccountMenu` — avatar et panneau du compte (§ 3.4).
- `ProjectsScreen` — conteneur d'état : chargement initial, liste, curseur, dialogue ouvert, message courant.
- `ProjectGrid`, `ProjectCard` et `NewProjectTile` — grille, carte (§ 3.2) et tuile (§ 3.6).
- `RelativeDate` — texte de date du § 3.3 dans un `<time>`.
- `ProjectActionsMenu` — bouton `Actions` et menu (§ 3.5, § 9.3).
- `Dialog` — base modale commune : titre, contenu, pied avec les boutons, gestion du focus (§ 9.2).
- `ProjectNameDialog` — formulaire à un champ, utilisé pour la création et le renommage.
- `DeleteProjectDialog` — confirmation de suppression.
- `Notice` — zone de message de la page : fond `surface`, bordure, rayon 8, `text-sm`, texte précédé d'un signe (`✓` ou `⚠`) et suivi d'un bouton `Fermer` (`aria-label="Fermer le message"`).
  - Succès et progression : bordure `ok` à 40 %, signe `✓` en `ok`, texte en `ink`.
  - Erreur : bordure `danger` à 40 %, signe `⚠` et texte en `danger`.
- `LoadMoreButton`, `EmptyState`, `ErrorState`, `LoadingState` — voir § 6.

Composants existants réutilisés par import depuis `apps/web/src/components/auth/`, sans changer le rendu des pages d'authentification : `TextField` (champ du nom), `SubmitButton` (action principale des dialogues, largeur à adapter par une classe ou une propriété), `Message` (erreur à l'intérieur d'un dialogue).

## 5. Données et appels

Fonctions du client (plan § 3.5) et usage par l'écran :

- À l'ouverture : `me()` et `listProjects()` (sans `limit` : la valeur par défaut de l'API s'applique), en parallèle.
- `Afficher plus de projets` : `listProjects({ cursor: nextCursor })`, avec le curseur reçu, renvoyé tel quel.
- Création : `createProject(name)` ; renommage : `updateProject(id, { name })` ; duplication : `duplicateProject(id)` ; suppression : `deleteProject(id)`.
- `getProject(id)` n'est pas utilisé par l'écran.

Les mutations renvoient un `ProjectDetail` ; la carte n'en lit que les champs communs avec `ProjectSummary` (`id`, `name`, `updatedAt`, `thumbnailUrl`, `currentVersion.number`).

Mise à jour de la liste après une action réussie, sans nouvel appel de liste et sans tri côté interface :

- projet créé ou dupliqué : inséré en tête de liste ;
- projet renommé : remplacé par la réponse et déplacé en tête de liste (l'API le classe désormais en premier, son `updatedAt` étant le plus récent) ;
- projet supprimé : retiré de la liste.

Un projet reçu dont l'`id` est déjà affiché est ignoré (garde contre un doublon d'affichage, par exemple après une action faite dans un autre onglet).

## 6. États de l'écran

Aucun de ces états n'est dessiné dans la maquette ; ils réutilisent ses blocs.

### 6.1 Chargement initial

- Barre supérieure avec la marque et la navigation seules ; `Nouveau projet` et l'avatar ne sont pas affichés.
- Titre `Mes projets`.
- `LoadingState` : paragraphe `role="status"` `Chargement de vos projets…`, suivi de trois cartes fantômes à la taille des cartes (`aria-hidden="true"`, fond `surface`, bordure `line`, pulsation uniquement sous `motion-safe`).
- La zone de contenu porte `aria-busy="true"` pendant le chargement.

### 6.2 Erreur au chargement initial

Quand `me()` ou `listProjects()` échoue pour une autre raison qu'une session absente (§ 6.6) :

- `ErrorState`, bloc `role="alert"` sur `surface`, bordure `line`, rayon 12 : titre `Impossible d'afficher vos projets` (`<h2>`), puis le message de `errorMessage(erreur)`, puis le bouton principal `Réessayer`.
- `Réessayer` relance les deux appels et revient à l'état de chargement ; à l'issue, le focus est placé sur `<main>` (succès) ou reste sur `Réessayer` (nouvel échec).
- `Nouveau projet`, l'avatar et la grille ne sont pas affichés.

### 6.3 Liste vide

Quand la liste est vide et que `nextCursor` est `null` :

- `EmptyState`, au-dessus de la grille, texte aligné à gauche :
  - titre (`<h2>`) : `Aucun projet pour le moment`
  - texte (`text-ink/70`) : `Un projet regroupe la description d'un bâtiment, ses plans et ses exports. Utilisez « Nouveau projet » pour créer le premier.`
- La grille ne contient que la tuile `Nouveau projet` (§ 3.6), en première cellule.

### 6.4 Liste

- Grille : `<ul role="list" aria-labelledby="projets-titre">` ; chaque projet est un `<li>` contenant un `<article>` étiqueté par son `<h2>` (`aria-labelledby`) ; la tuile est le dernier `<li>`.
- Colonnes : 1 sous 640 px, 2 à partir de 640 px, 3 à partir de 1 024 px ; gouttières 20 (horizontale) et 24 (verticale).
- Ordre : celui de l'API, complété par les règles du § 5.
- Aucun compteur de projets n'est affiché (le contrat ne fournit pas de total).

### 6.5 Pagination par curseur

- Le bouton secondaire `Afficher plus de projets` est affiché sous la grille, centré, à 24 px de celle-ci, tant que `nextCursor` n'est pas `null`. Il disparaît quand `nextCursor` devient `null`. La maquette ne montre pas de pagination.
- Pendant l'appel : libellé `Chargement…`, bouton marqué `aria-disabled="true"` (il garde le focus ; une nouvelle activation est sans effet tant que l'appel est en cours).
- Succès : les projets reçus sont ajoutés après les projets déjà affichés, la tuile restant en dernière position ; les projets déjà affichés sont ignorés (§ 5). La zone de statut annonce `{n} projets supplémentaires affichés.` (`1 projet supplémentaire affiché.` au singulier), `n` étant le nombre de projets effectivement ajoutés ; si la page reçue n'apporte aucun projet nouveau (page vide, ou uniquement des projets déjà affichés), elle annonce `Tous vos projets sont affichés.` Le focus est placé sur le bouton `Actions` du premier projet ajouté ; si aucun projet n'a été ajouté, sur `Nouveau projet` de la barre supérieure.
- Échec : la liste déjà chargée reste affichée, la zone de message affiche l'erreur (`errorMessage`), le bouton retrouve son libellé et garde le focus ; l'activer de nouveau relance l'appel avec le même curseur.
- Si une suppression vide la liste affichée alors que `nextCursor` n'est pas `null`, la page suivante est chargée automatiquement (état de chargement du § 6.1 dans la zone de contenu) ; l'état vide n'apparaît que lorsque la liste est vide et `nextCursor` `null`.

### 6.6 Session absente ou expirée

- À l'ouverture, une réponse 401 (`UNAUTHENTICATED`) de `me()` ou de `listProjects()` redirige vers `/connexion?suivant=/projets` par remplacement de l'entrée d'historique (comportement actuel conservé). Rien d'autre que l'état de chargement n'est affiché avant la redirection.
- En cours d'utilisation, une réponse 401 à n'importe quel appel (page suivante, création, renommage, duplication, suppression, déconnexion) déclenche la même redirection, immédiatement, sans message intermédiaire ; le dialogue ouvert est abandonné.
- Seul le code 401 redirige. Une erreur réseau ou une autre erreur à l'ouverture donne l'état du § 6.2.

## 7. Actions

Règles communes aux dialogues : un seul appel à la fois ; pendant l'appel, le bouton d'action affiche son libellé d'attente et est désactivé, `Annuler` est désactivé et `Échap` est sans effet ; le formulaire porte `noValidate` ; aucun contrôle du nom n'est fait côté interface.

### 7.1 Création

- Déclencheurs : bouton `Nouveau projet` de la barre supérieure, ou tuile `Nouveau projet`. Le « déclencheur » ci-dessous est celui des deux qui a été activé.
- Dialogue : titre `Nouveau projet` ; champ `Nom du projet` (`type="text"`, `name="name"`, `autocomplete="off"`, `required`, vide, focus initial) ; aide `120 caractères maximum.` ; boutons `Annuler` (secondaire) puis `Créer le projet` (principal, `type="submit"`), alignés à droite. `Entrée` dans le champ soumet.
- Attente : `Création…`.
- Succès (201) : le dialogue se ferme, le projet apparaît en tête de liste (l'état vide disparaît le cas échéant), la zone de statut affiche `Projet « {nom} » créé.` avec le `name` renvoyé par l'API, le focus revient sur le déclencheur.
- Refus du nom (422 `VALIDATION_ERROR` avec `fields.name`) : le dialogue reste ouvert, la valeur saisie est conservée, le texte de `fields.name` s'affiche sous le champ (propriété `error` de `TextField` : `aria-invalid="true"`, erreur reliée par `aria-describedby`), le focus revient dans le champ. L'erreur disparaît à la première modification du champ. Textes possibles au § 8.3.
- Autre échec (réseau, 403, 429, 422 sans `fields.name`, 5xx) : le dialogue reste ouvert, la valeur est conservée, un `Message` d'erreur (`role="alert"`) apparaît en tête du dialogue avec `errorMessage(erreur)` et reçoit le focus. L'utilisateur peut soumettre de nouveau.
- Annulation (`Annuler` ou `Échap`) : le dialogue se ferme sans appel, la saisie est perdue, le focus revient sur le déclencheur.

### 7.2 Renommage

- Déclencheur : entrée `Renommer` du menu d'un projet.
- Dialogue : titre `Renommer le projet` ; champ `Nom du projet` prérempli avec le nom actuel, texte entièrement sélectionné, focus initial ; aide `120 caractères maximum.` ; boutons `Annuler` puis `Enregistrer`.
- Attente : `Enregistrement…`.
- Si la valeur soumise est strictement identique au nom affiché, le dialogue se ferme sans appel et sans message.
- Succès (200) : le dialogue se ferme, la carte est mise à jour et passe en tête de liste (§ 5), la zone de statut affiche `Projet renommé en « {nom} ».`, le focus est placé sur le bouton `Actions` de ce projet.
- Refus du nom et autres échecs : comme pour la création.
- Projet introuvable (404 `PROJECT_NOT_FOUND`) : voir § 7.5.
- Annulation : le focus revient sur le bouton `Actions` du projet.

### 7.3 Duplication (dépend de D2)

- Déclencheur : entrée `Dupliquer` du menu d'un projet. Pas de dialogue.
- Attente : le menu se ferme, le focus revient sur le bouton `Actions` du projet, qui passe en `aria-disabled="true"` (il reste focalisable et n'ouvre plus le menu) ; la zone de statut affiche `Duplication de « {nom} » en cours…`.
- Succès (201) : la copie apparaît en tête de liste ; la zone de statut affiche `Projet dupliqué sous le nom « {nom de la copie} ».` avec le `name` renvoyé par l'API ; le bouton `Actions` du projet d'origine est réactivé ; le focus n'est pas déplacé.
- Échec : la zone de message affiche `errorMessage(erreur)` ; le bouton `Actions` est réactivé ; le focus n'est pas déplacé.
- Projet introuvable (404) : voir § 7.5.

### 7.4 Suppression avec confirmation

- Déclencheur : entrée `Supprimer` du menu d'un projet.
- Dialogue de confirmation (`role="alertdialog"`) :
  - titre : `Supprimer ce projet ?`
  - texte : `Le projet « {nom} » sera retiré de votre liste et placé dans la corbeille. Il y est conservé 30 jours, puis supprimé définitivement avec ses plans. La restauration depuis la corbeille n'est pas disponible dans l'application.` (dépend de D3, voir § 11)
  - boutons : `Annuler` (secondaire, focus initial) puis `Supprimer le projet` (destructif).
- Attente : `Suppression…`.
- Succès (204) : le dialogue se ferme, la carte disparaît, la zone de statut affiche `Projet « {nom} » supprimé.`, le focus est placé sur le bouton `Actions` du projet suivant dans la liste, à défaut du précédent, à défaut sur `Nouveau projet` de la barre supérieure.
- Échec (réseau, 403, 429, 5xx) : le dialogue reste ouvert, un `Message` d'erreur en tête du dialogue affiche `errorMessage(erreur)` et reçoit le focus ; le projet reste dans la liste.
- Projet introuvable (404) : voir § 7.5.
- Annulation (`Annuler` ou `Échap`) : aucun appel, le focus revient sur le bouton `Actions` du projet.

### 7.5 Projet introuvable pendant une action

Quand un renommage, une duplication ou une suppression reçoit 404 `PROJECT_NOT_FOUND` (projet déjà supprimé, par exemple depuis un autre onglet) : le dialogue éventuel se ferme, la carte est retirée de la liste, la zone de message affiche l'erreur du § 8.3, et le focus suit la règle de la suppression réussie (projet suivant, précédent, sinon `Nouveau projet` de la barre supérieure).

### 7.6 Déconnexion

- Depuis le menu du compte, `Se déconnecter` appelle `logout()` ; pendant l'appel, libellé `Déconnexion…`, bouton marqué `aria-disabled="true"` (il garde le focus, une nouvelle activation est sans effet), panneau maintenu ouvert.
- Succès : navigation vers `/connexion`.
- Échec : le panneau se ferme, la zone de message affiche `errorMessage(erreur)`, le focus revient sur l'avatar.

## 8. Textes

Les libellés ci-dessous sont exacts (casse, ponctuation, espaces insécables avant `?` et `:` et à l'intérieur des guillemets français). `{nom}` désigne le `name` du projet, inséré comme texte (jamais comme HTML). Les textes repris de la maquette sont `Tracea`, `Mes projets`, `Nouveau projet`, `Décrivez, générez, exportez` et la forme `Version {number} · modifié {date}` ; les autres sont définis par l'équipe.

### 8.1 Libellés

- Lien d'évitement : `Aller au contenu`
- Barre supérieure : `Tracea` ; `Navigation principale` (nom de la navigation) ; `Mes projets` ; `Nouveau projet` ; `{initiales}` (texte visible de l'avatar) ; `{initiales}, menu du compte` (nom accessible de l'avatar, par exemple `HE, menu du compte`)
- Menu du compte : `Se déconnecter` ; `Déconnexion…`
- Titre de page et titre du document : `Mes projets` ; `Mes projets — Tracea`
- Tuile : `Nouveau projet` (texte et nom accessible du bouton) ; `Décrivez, générez, exportez` (paragraphe hors du bouton, description du bouton)
- Chargement : `Chargement de vos projets…`
- Liste vide : `Aucun projet pour le moment` ; `Un projet regroupe la description d'un bâtiment, ses plans et ses exports. Utilisez « Nouveau projet » pour créer le premier.`
- Carte : `Aucun plan généré` ; `Modifié {date}` ; `Version {number} · modifié {date}` ; `Actions` ; formes de `{date}` au § 3.3
- Nom accessible du bouton d'actions : `Actions pour le projet {nom}`
- Menu des actions : `Renommer` ; `Dupliquer` ; `Supprimer`
- Pagination : `Afficher plus de projets` ; `Chargement…`
- Dialogue de création : `Nouveau projet` ; `Nom du projet` ; `120 caractères maximum.` ; `Annuler` ; `Créer le projet` ; `Création…`
- Dialogue de renommage : `Renommer le projet` ; `Nom du projet` ; `120 caractères maximum.` ; `Annuler` ; `Enregistrer` ; `Enregistrement…`
- Dialogue de suppression : `Supprimer ce projet ?` ; texte du § 7.4 ; `Annuler` ; `Supprimer le projet` ; `Suppression…`
- Zone de message : `Fermer` (nom accessible `Fermer le message`)

### 8.2 Messages de statut (`role="status"`)

- `Projet « {nom} » créé.`
- `Projet renommé en « {nom} ».`
- `Duplication de « {nom} » en cours…`
- `Projet dupliqué sous le nom « {nom} ».`
- `Projet « {nom} » supprimé.`
- `{n} projets supplémentaires affichés.` ; `1 projet supplémentaire affiché.` ; `Tous vos projets sont affichés.`

### 8.3 Messages d'erreur (`role="alert"`)

Textes propres à l'écran :

- Titre de l'erreur de chargement : `Impossible d'afficher vos projets`, suivi du message de `errorMessage` et de l'action `Réessayer`.
- Projet introuvable pendant une action (code `PROJECT_NOT_FOUND`, lu par `errorCode`) : `Ce projet est introuvable : il a peut-être déjà été supprimé. Il a été retiré de votre liste.`

Textes fournis par `errorMessage`, affichés tels quels (rappel des valeurs actuelles, aucune n'est redéfinie ici) :

- Service injoignable : `Impossible de joindre le service. Vérifiez votre connexion et réessayez.`
- Limite de débit (429) : `Trop de tentatives. Réessayez dans quelques minutes.`
- Réponse d'erreur sans corps exploitable : `Le service est momentanément indisponible. Réessayez dans un instant.`
- Autres cas (403 `CSRF_TOKEN_INVALID`, 422 sans champ) : `detail` de la réponse, à défaut `title`.

Textes fournis par l'API pour le champ du nom (`fields.name` de la réponse 422), affichés tels quels sous le champ ; l'écran ne les reformule pas :

- Nom vide ou composé uniquement d'espaces : `Le nom est requis.`
- Nom de plus de 120 caractères après nettoyage : `Le nom est limité à 120 caractères.`
- Nom contenant un caractère de contrôle : `Le nom contient des caractères non autorisés.`

Chaque message nomme la cause ; l'action attendue (saisir un nom, le raccourcir, retirer le caractère) découle du champ resté ouvert avec la saisie conservée.

## 9. Accessibilité

### 9.1 Clavier et ordre de tabulation

- Ordre : lien d'évitement → marque → `Mes projets` (navigation) → `Nouveau projet` → avatar → `Fermer` de la zone de message (si un message est affiché) → bouton `Actions` de chaque carte, dans l'ordre de la grille → tuile `Nouveau projet` → `Afficher plus de projets`.
- Tout est activable par `Entrée` et `Espace` (boutons), `Entrée` (liens). Aucun raccourci à une seule touche, aucun glisser-déposer, aucune action au survol seul.
- Le focus n'est jamais perdu : après chaque action, il est placé comme indiqué au § 7 ; si l'élément prévu n'existe plus, il va sur `Nouveau projet` de la barre supérieure.
- Fermer la zone de message par `Fermer` place le focus sur `Nouveau projet` de la barre supérieure.
- Deux contrôles portent le nom `Nouveau projet` (barre supérieure et tuile) et font la même chose : c'est voulu (maquette), et cohérent pour les technologies d'assistance.
- Critère WCAG 2.5.3 (« Label in Name ») : le nom accessible de chaque contrôle contient son texte visible, et en commence de préférence (bouton `Actions`, avatar) ; aucun texte visible n'est placé dans un contrôle sans faire partie de son nom (tuile, § 3.6).

### 9.2 Dialogues

- Élément conteneur avec `role="dialog"` (création, renommage) ou `role="alertdialog"` (suppression) et `aria-modal="true"`. L'élément `<dialog>` natif n'est pas utilisé (écart accepté, § 12.5) ; le comportement ci-dessous est assuré par le composant `Dialog`.
- `aria-labelledby` pointe le titre (`<h2>`). Le dialogue de suppression porte `aria-describedby` vers son texte.
- À l'ouverture, le focus va sur le champ (création, renommage) ou sur `Annuler` (suppression).
- Le focus est confiné au dialogue (`Tab` et `Maj+Tab` bouclent) ; le reste de la page est inerte et ne défile pas.
- `Échap` équivaut à `Annuler`, sauf pendant un appel. Un clic sur le fond assombri ne ferme pas le dialogue.
- À la fermeture, le focus va sur l'élément indiqué au § 7 (déclencheur ou élément de remplacement).
- Fond assombri : `ink` à 40 %. Largeur du dialogue : 440 px au plus, marge de 16 px avec les bords de la fenêtre, marges intérieures 24 px. Titre du dialogue 18/28 semi-gras (`text-lg font-semibold`).

### 9.3 Menus

Menu des actions :

- Bouton : `aria-haspopup="menu"`, `aria-expanded` (`true` ou `false`), `aria-controls` vers le menu, `aria-label="Actions pour le projet {nom}"` (le nom accessible commence par le libellé visible).
- Menu : `role="menu"`, `aria-labelledby` vers le bouton ; entrées `role="menuitem"` ; séparateur `role="separator"`.
- Ouverture : `Entrée`, `Espace` ou `Flèche bas` sur le bouton (focus sur la première entrée) ; `Flèche haut` (focus sur la dernière entrée).
- Dans le menu : `Flèche bas` et `Flèche haut` parcourent les entrées en boucle ; `Début` et `Fin` vont à la première et à la dernière ; `Entrée` ou `Espace` active l'entrée ; `Échap` ferme et rend le focus au bouton ; `Tab` ferme le menu et poursuit la tabulation.
- Les entrées ne sont pas dans l'ordre de tabulation (`tabindex="-1"`, focus géré par le menu).
- Après `Renommer` ou `Supprimer`, le focus passe au dialogue ; après `Dupliquer`, il revient au bouton.

Menu du compte (divulgation) :

- Avatar : `<button>` dont le texte visible est les initiales et le nom accessible `{initiales}, menu du compte` (§ 3.4), avec `aria-expanded` et `aria-controls` ; à l'ouverture, le focus va sur `Se déconnecter`.
- Le panneau est dans l'ordre de tabulation normal ; `Échap` le ferme et rend le focus à l'avatar ; `Tab` hors du panneau le ferme.

### 9.4 Annonces

- La zone de message contient deux conteneurs toujours présents dans le DOM, vides quand il n'y a rien à dire : un `role="status"` (succès, progression) et un `role="alert"` (erreurs hors dialogue). Le texte y est inséré au moment de l'événement, pour être annoncé.
- Un seul message à la fois : tout nouveau message remplace le précédent, statut ou alerte. Il reste affiché jusqu'au message suivant ou jusqu'à sa fermeture par `Fermer` ; aucune disparition temporisée.
- L'ouverture d'un dialogue efface le message courant.
- Les erreurs à l'intérieur d'un dialogue sont annoncées par le `Message` (`role="alert"`) ou par l'erreur du champ (`aria-invalid`, `aria-describedby`), jamais par la zone de la page.
- L'état de chargement initial est un `role="status"`.

### 9.5 Contrastes (jetons existants)

Rapports calculés selon WCAG 2.1 à partir des valeurs de `globals.css` ; à confirmer par l'analyse automatique du parcours de bout en bout (S2-7). Les couleurs de la maquette n'ayant pas été relevées, ces rapports seront recalculés si elles diffèrent des fondations v0.1.

- `ink` sur `paper` 14,7:1 ; `ink` sur `surface` 16,6:1.
- `ink` à 70 % sur `paper` 5,8:1 ; sur `surface` 6,1:1 (date, état des plans et phrase de la tuile en `text-xs` : texte courant, seuil 4,5:1 respecté).
- `primary` sur `paper` 8,2:1 et sur `surface` 9,3:1 (marque, icône de la tuile, contour de focus) ; blanc sur `primary` 9,3:1 (bouton principal).
- `danger` sur `surface` 6,5:1 (entrée `Supprimer`, texte d'erreur) ; blanc sur `danger` 6,5:1 (bouton destructif) ; `danger` sur fond `danger` à 5 % posé sur `surface` 6,0:1 (`Message` dans un dialogue).
- `ok` sur `surface` 5,0:1 ; `ok` sur `paper` 4,47:1, **insuffisant**. Conséquences : les messages de succès de la page sont sur `surface` avec un texte en `ink` (composant `Notice`) ; le composant `Message` de type succès n'est pas posé directement sur le fond de page.
- Aucun texte en `accent`, `warn` ou `line`, et aucun texte en `ink` sous 70 % d'opacité.
- Aucune information n'est portée par la couleur seule : les messages ont un signe et un texte, l'entrée `Supprimer` est un libellé explicite, l'erreur de champ est un texte, l'entrée de navigation courante porte `aria-current`.

### 9.6 Autres règles

- Niveaux de titre : `<h1>` `Mes projets` ; `<h2>` pour chaque nom de projet, pour le titre des états vide et erreur, et pour le titre des dialogues.
- Animations (pulsation des cartes fantômes, apparition des menus ou du dialogue) uniquement sous `motion-safe`, 150 ms au plus. L'apparition animée des menus n'est pas réalisée (écart accepté, § 12.5).
- Cibles : 40 px de haut au moins pour les boutons, les entrées de menu et le bouton `Actions` ; avatar 32 × 32 (maquette), au-dessus du minimum de 24 × 24 du critère WCAG 2.5.8.
- Langue : `lang="fr"` est déjà posé sur le document.

## 10. Comportement responsive

La maquette n'existe qu'en 1 440 px de large ; les règles ci-dessous sont définies par l'équipe.

- Largeur minimale prise en charge : 320 px, sans défilement horizontal, y compris à 200 % de zoom.
- Marges : 48 px à partir de 1 024 px, 24 px de 640 à 1 023 px, 16 px sous 640 px ; barre supérieure 32 px à partir de 1 024 px, 16 px en dessous.
- Barre supérieure : sous 640 px, la navigation est masquée (son unique entrée est la page courante, déjà signalée par le titre) et `Nouveau projet` est remplacé par un bouton carré de 40 px montrant l'icône « + », avec `aria-label="Nouveau projet"`.
- Grille : 1, 2 puis 3 colonnes (§ 6.4). Les cartes d'une même rangée ont la même hauteur ; le pied de carte est calé en bas.
- Menus : toujours entièrement visibles dans la fenêtre ; ils s'ouvrent vers le haut s'ils n'ont pas la place de s'ouvrir vers le bas.
- Dialogues : largeur de la fenêtre moins 32 px sous 472 px ; boutons sur une ligne, alignés à droite, qui passent à la ligne si nécessaire sans changer d'ordre ; contenu défilant si la hauteur manque.
- Pagination : bouton centré, pleine largeur sous 640 px.

## 11. Points dépendant d'une décision ouverte

Chaque point suit l'hypothèse de travail du plan. Ce qu'un arbitrage contraire changerait est décrit pour qu'il s'applique sans reprise du reste.

- **D1 — maquettes (tranchée).** La maquette Figma fait foi. Restent à compléter dans la maquette ou à arbitrer : les éléments listés au § 12.
- **D2 — duplication (incluse, retirable).** Sont propres à la duplication, et à eux seuls : l'entrée `Dupliquer` du menu (§ 3.5), le § 7.3, les deux messages de statut correspondants (§ 8.2) et l'appel `duplicateProject`. Si elle est retirée, le menu garde `Renommer`, le séparateur et `Supprimer` ; rien d'autre ne change.
- **D3 — corbeille sans restauration.** En dépendent : la dernière phrase du texte de confirmation (`La restauration depuis la corbeille n'est pas disponible dans l'application.`), l'absence d'action d'annulation dans le message `Projet « {nom} » supprimé.` et l'absence de tout accès à une corbeille. Si une restauration est décidée : retirer cette phrase et spécifier l'accès à la corbeille dans un complément ; le reste du § 7.4 est inchangé. Si la suppression devenait immédiate et définitive, le texte de confirmation serait à réécrire en entier.
- **D9 — doublons de nom autorisés.** L'écran ne compare pas les noms et n'a aucun message de doublon. Si l'unicité est décidée et que l'API la signale par `fields.name` dans un 422, l'écran l'affiche déjà sous le champ sans modification. Un autre code d'erreur (409, par exemple) demanderait une ligne de plus au § 7.1 et au § 7.2 ; la duplication (§ 7.3) devrait alors recevoir un nom unique de l'API.
- **D10 — pas de plafond de projets.** `Nouveau projet` et `Dupliquer` sont toujours disponibles ; aucun compteur ni message de quota. Si un plafond est décidé, le refus de l'API s'affiche déjà par `errorMessage` (dans le dialogue de création, dans la zone de message pour la duplication). L'indicateur « GÉNÉRATIONS RESTANTES » de la maquette concerne les générations (EF-105), pas le nombre de projets.

Les décisions D4 à D8 et D11 à D14 n'ont pas d'effet sur l'écran (identifiants opaques, préfixe et forme des réponses masqués par le client).

## 12. Écarts, limites et besoins hors périmètre

### 12.1 Écarts maquette / périmètre du sprint, à arbitrer

Éléments de la maquette non rendus au sprint 2 faute de donnée dans le contrat ou de fonctionnalité livrée. Les ajouter demanderait d'étendre le contrat § 3 ou le périmètre du plan.

1. Navigation « Modèles » et « Aide » (`5:14`, `5:16`) : masquées, aucune route web prévue.
2. Sous-titre « 6 projets · 14 générations ce mois » (`5:27`) : masqué ; demanderait un total de projets et un compteur de générations.
3. Recherche « Rechercher un projet… » (`5:30`) : masquée ; demanderait un paramètre de recherche sur `GET /projects` (un filtre côté interface ne porterait que sur les pages chargées).
4. Segment de filtre (`5:35`) : masqué ; contenu non relevé, aucun filtre dans le contrat.
5. Indicateurs « GÉNÉRATIONS RESTANTES », « DERNIÈRE GÉNÉRATION », « EXPORTS CE MOIS » (`5:43`) : masqués ; dépendent des quotas (EF-105), de la génération et des exports.
6. Étiquette de carte (`5:72` et suivantes) : masquée ; contenu non relevé, pas de statut de projet dans le contrat.
7. Résumé du bâtiment (« R+1 · 164 m² hab. · 4 chambres · toit 4 pans ») : remplacé par `Aucun plan généré` ; demanderait des données dérivées du `BuildingModel` ou des paramètres.
8. Vignette dessinée : emplacement vide ; `thumbnailUrl` toujours `null`.
9. Numéro de version : prévu par le contrat (`currentVersion.number`) et rendu s'il est présent, mais jamais visible au sprint 2 (`currentVersion` toujours `null`).

### 12.2 Écarts de présentation par rapport à la maquette

1. Date d'un projet sans version : la maquette affiche « Créé il y a 3 jours » (`5:124`) ; l'écran affiche `Modifié {date}` sur `updatedAt`, parce que le critère S2-1 demande la date de modification et que la liste est triée sur cette date. À confirmer.
2. Formes de date : la maquette mêle « modifié il y a 2 h », « modifié hier » et « il y a 1 semaine » sans « modifié » ; l'écran applique une forme unique (§ 3.3).
3. Logo (`5:5`) : non rendu, aucun fichier de logo dans le dépôt ; à exporter de la maquette.
4. Libellés internes des instances non relevés : bouton de la barre supérieure (`5:18`, rendu `Nouveau projet` d'après la description de l'écran), bouton du pied de carte (`5:79`, 64 × 40, rendu `Actions` : si son libellé est une ouverture du projet, cette action est hors périmètre et le menu des actions devra trouver une autre place), segment, étiquettes.
5. Éléments ajoutés, absents de la maquette : menu des actions, dialogues de création, de renommage et de suppression, menu du compte avec `Se déconnecter`, zone de message, pagination, états de chargement, vide et erreur. À dessiner dans la maquette pour validation.
6. Phrase de la tuile « Décrivez, générez, exportez » : reprise telle quelle, alors qu'au sprint 2 un projet créé ne peut encore être ni décrit ni généré. À confirmer.
7. Couleurs, polices, rayons, ombres, style des bordures : non relevés, fondations v0.1 appliquées (§ 2). À vérifier sur une capture de la maquette.
8. Comportement sous 1 440 px : non dessiné, défini au § 10.

### 12.3 Limites assumées

- Un projet créé ne s'ouvre pas : l'utilisateur reste sur la liste. L'ouverture arrivera avec la page de détail (hors périmètre du sprint).
- Aucun total de projets n'est affiché (absent du contrat).

### 12.4 Besoins repérés hors périmètre de S2-1

Non spécifiés ici :

- Message « session expirée » sur `/connexion` après une redirection en cours d'utilisation : demanderait une modification de l'écran de connexion.
- Bordure des champs de saisie : `line` sur `surface` donne 1,5:1, sous le seuil de 3:1 du critère WCAG 1.4.11 pour la limite d'un contrôle. Le défaut existe déjà sur les pages d'authentification (`TextField`) ; le corriger demande un nouveau jeton de bordure, donc un arbitrage sur les fondations.
- Texte en `ink` à 60 % sur `paper` dans le pied de la page d'accueil : 4,2:1, sous le seuil AA. Hors de cet écran.
- Style de focus commun à toute l'application : il est défini ici au niveau des composants de l'écran ; une règle globale dans `globals.css` concernerait aussi les pages d'authentification.
- Déplacement de `TextField`, `SubmitButton` et `Message` vers un dossier partagé : ils sont réutilisés par import depuis `components/auth/` en attendant `packages/ui`.
- Rôle designer (`.claude/agents/designer.md`) : il cite encore un autre outil de maquettes et le dossier `docs/design/stitch/` ; non modifié ici, traité à part.
- Pages d'authentification : absentes des maquettes v0.1, elles restent provisoires (`docs/specs/screens/auth.md`) et n'ont pas de barre supérieure commune avec cet écran.

### 12.5 Écarts acceptés à l'implémentation (S2-5, S2-7)

Écarts entre la version précédente de cette spécification et l'écran livré, acceptés et reportés dans le texte ci-dessus :

1. Dialogues : conteneur `role="dialog"` ou `role="alertdialog"` avec `aria-modal="true"` au lieu de l'élément `<dialog>` natif ; confinement du focus, inertie du fond, `Échap` et retour du focus sont assurés par le composant (§ 9.2).
2. `Afficher plus de projets` et `Se déconnecter` : `aria-disabled="true"` pendant l'appel au lieu de `disabled`, pour que le bouton garde le focus (un bouton `disabled` le perd et, pour `Se déconnecter`, fermerait le panneau) ; une activation pendant l'appel est sans effet (§ 6.5, § 7.6).
3. Animation d'apparition des menus : non réalisée ; les menus s'affichent sans transition (§ 9.6).
4. Page suivante sans projet nouveau : le message `Tous vos projets sont affichés.` est annoncé aussi quand la page reçue ne contient que des projets déjà affichés, et pas seulement quand elle est vide (§ 6.5).
5. Critère WCAG 2.5.3, relevé par l'analyse automatique du parcours de bout en bout : la version précédente donnait à l'avatar le nom `Menu du compte`, sans les initiales visibles, et plaçait la phrase de la tuile dans le bouton sous un nom réduit à `Nouveau projet`. Corrigé aux § 3.4 et § 3.6.
6. Messages du champ du nom : la version précédente recommandait des formulations différentes de celles de l'API ; le § 8.3 reprend désormais les textes renvoyés par l'API.
