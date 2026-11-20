# Spécification d'écran — Décrire le bâtiment (CU-03, CU-04, EF-200 à EF-202)

| Champ      | Valeur                                                   |
| ---------- | -------------------------------------------------------- |
| Rôle       | Designer                                                 |
| Date       | 19 novembre 2026 (mise à jour : recette, A17 et A18)     |
| Maquette   | Écran 02, cadre `6:30`                                   |
| Route web  | `/projets/{id}`                                          |
| Références | CU-03, CU-04, EF-200 à EF-202, EF-206 ; plan du sprint 3 |

**Maquette de référence** : fichier Figma « Tracea — Maquettes v0.1 », page « 01 · Écrans », cadre `6:30` « 02 · Nouveau projet » (1440 × 1313), [lien](https://www.figma.com/design/WjdAD77A3iU3u4LL5eP0TB). La maquette fait foi (D1). Contrat, bornes et décisions : `docs/plans/sprint-3-project-description.md` (§ 3, D15 à D30, tranchées le 18 novembre 2026).

Portée de la consultation : la structure du cadre a été relevée en entier (calques, identifiants, textes, positions et tailles) ; aucune image n'a été consultée (quota d'accès à la maquette). En conséquence :

- **Relevés** : tous les textes posés directement dans le cadre (titres, phrase d'introduction, étapes, « Description libre », exemple de description, compteur, « Voir des exemples de descriptions », « Paramètres du bâtiment », « Niveaux », « Pièces » et les en-têtes du tableau, les cinq lignes de pièces, « Terrain », les textes de l'aperçu, « Enregistré automatiquement · il y a 12 s »), ainsi que toutes les positions et tailles citées au § 2.
- **Non relevés** : les libellés internes des instances `Champ de saisie` (`6:71`, `6:88`, `6:105`, `6:111`, `6:116`, `6:121`, `6:243`, `6:248`, `6:254`, `6:259`, `6:264`), `Puce` (`6:96`, `6:99`, `6:102`), `Bouton` (`6:178`, `6:221`, `6:224`, `6:269`, `6:276`, `6:279`) et `Étiquette` (`6:185`) ; les couleurs, polices, rayons, ombres et styles de trait. Les libellés proposés pour ces instances sont marqués **« à confirmer sur la maquette »** (liste au § 14.3) ; les valeurs visuelles reprennent les fondations v0.1 de `apps/web` et sont signalées comme telles. Aucun jeton n'est ajouté.
- **Sans maquette**, donc définis ici par l'équipe : les états de chargement, d'erreur et « Projet introuvable », tous les états de l'enregistrement automatique sauf « Enregistré automatiquement », les messages propres à l'écran, les champs ajoutés par D21, le dialogue d'exemples et ses textes (D30), les dialogues de confirmation et le comportement sous 1 440 px.

## 1. Objectif et périmètre

Un utilisateur connecté ouvre un de ses projets, le nomme, décrit librement son bâtiment, renseigne s'il le souhaite des paramètres structurés et définit son terrain. Tout est enregistré automatiquement, sans bouton.

- Route web : `/projets/{id}`, `id` étant l'identifiant renvoyé par l'API. On y arrive depuis « Mes projets » (carte ou création, D15, `docs/specs/screens/projects.md` § 3.2 et § 7.1). Aucune autre route n'est créée ; il n'y a pas de route `/projets/nouveau`.
- Toutes les données viennent du contrat du plan (§ 3) : `ProjectDetail` et l'en-tête `ETag` de `GET` et `PATCH /projects/{id}`, `PublicUser` de `GET /me`.
- **Aucune logique métier dans l'écran** (D17). Viennent de `@tracea/domain` : la validation et ses messages (`ProjectNameSchema`, `DescriptionTextSchema`, `ProjectParametersSchema`, `ProjectSiteSchema`), le comptage des caractères (`countCharacters`, `DESCRIPTION_MAX_LENGTH`), les conversions d'unités (`metresToMm`, `mmToMetres`, `squareMetresToMm2`, `mm2ToSquareMetres`), les listes de valeurs (`PARAMETER_ROOM_TYPES`, `ORIENTATIONS`, `BUILDING_TYPES`, `PARAMETER_ROOF_TYPES`, `ROOF_COVERINGS`, `GARAGE_KINDS`, `PROJECT_INPUT_LIMITS.garageSpaces`), le contour de la parcelle (`siteBoundaryPolygon`) et la zone constructible (`buildableZone`). L'API reste l'autorité : un refus de l'API l'emporte sur la validation locale.
- L'écran ne fait que de la présentation : lecture et mise en forme des nombres en français (§ 5.3), correspondance entre libellés français et valeurs du contrat (§ 6), mise à l'échelle de l'aperçu (§ 6.5), dates relatives (§ 8.3).
- L'aperçu du terrain est un schéma de la saisie, pas un plan de masse : il n'est ni exporté ni réutilisé ; le plan de masse dérivera de `BuildingModel` (hors périmètre).
- Hors périmètre et absents de l'écran (D24, plan § 7) : interprétation par le moteur Tracea, carte « Ce que le moteur a compris », demandes de clarification, génération, import de terrain, saisie d'un polygone.

## 2. Fondations et dimensions

Dimensions relevées sur le cadre `6:30` (largeur 1 440 px) :

- Barre supérieure : identique au cadre `5:2` (hauteur 64, marges 32, marque, navigation à 32 px de la marque, entrées de 36 px de haut avec marges intérieures 12 et espacement 4, avatar 32 × 32 à 32 px du bord droit). Le cadre `6:30` n'a pas de bouton dans la barre : la navigation porte deux entrées, « Mes projets » et « Nouveau projet » (`6:39`, `6:41`).
- Contenu : marges latérales 48, marge haute 32, largeur utile 1 344.
- Bloc de titre (`6:47`, hauteur 60) : titre sur une ligne de 36, phrase sur une ligne de 20 à 4 px du titre ; à droite, étapes (`6:52`, 439 × 24) centrées verticalement : pastille 24 × 24 avec son numéro (ligne de 16), libellé (ligne de 20) à 8 px de la pastille, trait de liaison 48 × 1 à 12 px de part et d'autre.
- Deux colonnes à 24 px sous le bloc de titre : gauche 900, gouttière 24, droite 420. Cartes empilées avec 20 px entre elles.
- Carte « Description » (`6:70`, 900 × 312) : bordure 1 et marges intérieures 24 (contenu à 25 px du bord). Champ en tête 850 × 64. Bloc de description à 20 px : libellé (ligne de 18), zone de texte à 6 px (850 × 132, texte à 13 px du bord, soit marges intérieures 12 et bordure 1, lignes de 22 : trois lignes occupent 66), ligne du compteur à 6 px sous la zone (hauteur 16) avec le compteur à gauche et le lien d'exemples aligné à droite.
- Champ type `Champ de saisie` (hauteur 64) : libellé sur une ligne de 18, contrôle de 40 à 6 px du libellé.
- Carte « Paramètres du bâtiment » (`6:85`, 900 × 592) : titre sur une ligne de 24 ; première rangée à 20 px du titre ; rangées de trois champs de 272,67 px avec 16 px entre eux, 20 px entre les rangées. Groupe « Niveaux » : libellé (ligne de 18), puis trois puces de 28 px de haut (82, 44 et 46 px de large) espacées de 8, centrées dans une hauteur de 40.
- Tableau « Pièces » (`6:126`) à 20 px de la seconde rangée : libellé (ligne de 18) ; en-têtes à 8 px (ligne de 16, texte décalé de 4 px) ; lignes de 40 px espacées de 8, la première à 8 px des en-têtes ; colonnes Type 522, Nombre 110, Surface mini 150, suppression 32 (bouton 32 × 32 centré verticalement), 12 px entre colonnes ; texte des cellules à 13 px du bord de la cellule (ligne de 20). Bouton d'ajout 147 × 40 à 8 px sous la dernière ligne.
- Carte « Terrain » (`6:227`, 420 × 498) : titre (ligne de 24) ; aperçu 370 × 200 à 14 px du titre ; rangées de champs à 14 px les unes des autres : deux champs de 177 px avec 16 px entre eux (`6:242`), puis trois champs de 112,67 px avec 16 px entre eux (`6:253`).
- Pied de page (`6:272`, 1 344 × 57) à 24 px sous les colonnes : texte d'état à gauche (ligne de 16, calé en bas) ; deux boutons de 40 à droite, à 17 px du haut du pied.

Valeurs non relevées, reprises des fondations v0.1 (`apps/web/src/app/globals.css`, `docs/design-notes.md`) et de `docs/specs/screens/projects.md` § 2, sans jeton nouveau :

- Fond de page `paper` ; barre supérieure, cartes, dialogues et champs sur `surface` ; bordures `line` ; texte `ink` ; texte secondaire `ink` à 70 %, jamais moins ; action principale `primary` ; erreur et action destructive `danger`.
- Typographie : titre d'écran 28/36 semi-gras ; phrase d'introduction 14/20 en `ink` à 70 % ; titres de carte 16/24 semi-gras (ligne de 24 relevée) ; libellés de champ 14 médium sur la ligne de 18 relevée (les fondations indiquent 14/20 : la ligne relevée l'emporte) ; contrôles et cellules 14/20 ; zone de texte 14/22 (lignes de 22 relevées) ; aide, erreur de champ, compteur, en-têtes du tableau et texte d'état 12/16.
- Contrôles : hauteur 40, rayon 8 ; puces hauteur 28, rayon 8 ; cartes et dialogues rayon 12. Styles de bouton et contour de focus : ceux de `apps/web/src/components/projects/styles.ts` (principal, secondaire, destructif, `focusRing`).
- Champs : style de `TextField` (`apps/web/src/components/auth/fields.tsx`), appliqué aussi aux listes déroulantes et à la zone de texte.
- Le calque `6:80` (10 × 40, dans la zone de texte, sans contenu) n'a pas d'équivalent : probablement un repère de la maquette.

## 3. Structure

Rendu du sprint 3 à 1 440 px (les éléments masqués du § 3.1 n'y figurent pas ; `+` = ajouté par rapport à la maquette) :

```
┌──────────────────────────────────────────────────────────────────────┐
│ Tracea  Mes projets                           [Nouveau projet]  (HE) │
├──────────────────────────────────────────────────────────────────────┤
│ Décrire le bâtiment            (1) Description ─ (2) Terrain ─ (3) Génération
│ Le moteur Tracea combine votre description …                         │
│ [alerte de conflit, § 8.5, si besoin]                                │
│ ┌ Description ─────────────────────┐ ┌ Terrain ──────────────────┐   │
│ │ Nom du projet                    │ │ aperçu du terrain         │   │
│ │ Description libre                │ │ Largeur · Profondeur      │   │
│ │ 412 / 2 000 caractères · Exemples│ │ + Voie d'accès · + Nord   │   │
│ └──────────────────────────────────┘ │ Reculs avant, lat., arr.  │   │
│ ┌ Paramètres du bâtiment ──────────┐ │ + Pente · + Direction     │   │
│ │ + phrase d'aide                  │ └───────────────────────────┘   │
│ │ Type · Niveaux · Surface hab.    │                                 │
│ │ Toiture · Garage · Séjour        │                                 │
│ │ + Couverture · + Surface garage  │                                 │
│ │ Pièces (tableau), Ajouter        │                                 │
│ └──────────────────────────────────┘                                 │
├──────────────────────────────────────────────────────────────────────┤
│ Enregistré automatiquement · il y a 10 s              (barre d'état) │
└──────────────────────────────────────────────────────────────────────┘
```

Hiérarchie et ordre du DOM (ordre de lecture et de tabulation) :

- Lien d'évitement `Aller au contenu`, cible `#contenu`.
- `<header>` (barre supérieure, § 4.1) : marque `Tracea` (lien vers `/projets`) ; `<nav aria-label="Navigation principale">` avec le lien `Mes projets` ; bouton principal `Nouveau projet` ; avatar et menu du compte.
- `<main id="contenu" tabindex="-1">` :
  - en-tête de page : `<h1>` `Décrire le bâtiment`, phrase d'introduction, étapes (§ 4.3) ;
  - zone d'alerte de la page (§ 8.5), vide sauf en cas de conflit ;
  - contenu selon l'état (§ 7) ; à l'état prêt, dans cet ordre : carte Description (§ 6.1), carte Paramètres du bâtiment (§ 6.2 et § 6.3), carte Terrain (§ 6.4 et § 6.5). Sur deux colonnes, la carte Terrain occupe la colonne de droite ; l'ordre du DOM reste celui-ci.
- Barre d'état de l'enregistrement (§ 8.2), hors de `<main>`, dans un `<footer>` propre à l'écran.
- Région d'annonces masquée visuellement (`role="status"`, § 11.4).
- Dialogues (création de projet, exemples, confirmations) : hors du flux, un seul à la fois.

Formulaire : les trois cartes sont dans un `<form noValidate>` dont l'envoi est neutralisé (`Entrée` dans un champ d'une ligne n'envoie rien et ne recharge pas la page). Il n'y a aucun bouton d'envoi.

Titre du document : `Décrire le bâtiment — Tracea` pendant le chargement et en cas d'erreur ; `{nom} — Décrire le bâtiment — Tracea` à l'état prêt, `{nom}` étant le dernier `name` reçu de l'API (pas la saisie en cours) ; `Projet introuvable — Tracea` à l'état introuvable.

### 3.1 Éléments de la maquette et traitement au sprint 3

Pour chaque élément du cadre `6:30` (identifiant de calque entre parenthèses) :

- Barre supérieure (`6:31`)
  - Logo (`6:33`) : **masqué**, comme sur « Mes projets » (aucun fichier de logo).
  - Nom de marque « Tracea » (`6:37`) : **rendu**, lien vers `/projets`.
  - Navigation « Mes projets » (`6:39`) : **rendue**, lien vers `/projets`, sans `aria-current` (la page courante est un projet, pas la liste).
  - Navigation « Nouveau projet » (`6:41`) : **remplacée** par le bouton principal `Nouveau projet` de la barre de « Mes projets », qui ouvre le dialogue de création (D15, § 4.1). Une entrée de navigation suppose une page « Nouveau projet », qui n'existe pas.
  - Avatar « HE » (`6:44`) : **rendu**, menu du compte de « Mes projets ».
- En-tête de page
  - Titre « Décrire le bâtiment » (`6:49`) et phrase « Le moteur Tracea combine votre description et les paramètres. En cas d'écart, les paramètres priment. » (`6:50`) : **rendus** tels quels.
  - Étapes « Description », « Terrain », « Génération » (`6:52`) : **rendues** comme indicateur statique (§ 4.3), « Génération » présentée comme non disponible.
- Carte Description (`6:70`)
  - Champ `6:71` : **rendu**, `Nom du projet` (à confirmer sur la maquette).
  - « Description libre », zone de texte et exemple de texte (`6:77`, `6:78`, `6:79`) : **rendus** ; le texte de la maquette n'est pas prérempli (c'est un exemple de saisie).
  - Compteur « 412 / 2 000 caractères » (`6:82`) : **rendu** (§ 6.1).
  - « Voir des exemples de descriptions » (`6:84`) : **rendu**, ouvre le dialogue d'exemples (§ 6.6, D30).
- Carte Paramètres du bâtiment (`6:85`)
  - Titre (`6:86`) : **rendu**. Phrase d'aide sous le titre : **ajoutée** (§ 6.2).
  - Champ `6:88` : **rendu**, `Type de bâtiment` (à confirmer).
  - Groupe « Niveaux » et puces `6:96`, `6:99`, `6:102` : **rendus**, puces `Plain-pied`, `R+1`, `R+2` (à confirmer ; déduites des largeurs 82, 44 et 46 px).
  - Champ `6:105` : **rendu**, `Surface habitable cible (m²)` (à confirmer).
  - Champs `6:111`, `6:116`, `6:121` : **rendus**, `Toiture`, `Garage`, `Orientation du séjour` (à confirmer, ordre compris ; déduits des lignes de la carte `6:188`).
  - Champs `Couverture` et `Surface mini du garage (m²)` : **ajoutés** (EF-201, contrat § 3.1.1), sur une troisième rangée, chacun sous le champ dont il dépend.
  - Tableau « Pièces » (`6:126` à `6:177`) : **rendu**, éditable (§ 6.3) ; les cinq lignes de la maquette ne sont pas préremplies.
  - Bouton `6:178` (147 × 40) : **rendu**, `Ajouter une pièce` (à confirmer).
- Carte « Ce que le moteur a compris » (`6:181` à `6:226`), avec l'étiquette `6:185`, les lignes `6:188`, la précision `6:217` et les boutons `6:221`, `6:224` : **masquée** en entier (D24, interprétation hors périmètre). La carte Terrain monte en tête de la colonne de droite.
- Carte Terrain (`6:227`)
  - Titre « Terrain » (`6:228`) : **rendu**.
  - Aperçu du terrain (`6:229` à `6:241`) : **rendu** à partir des données (§ 6.5), avec alternative textuelle. Légende visible sous l'aperçu : **ajoutée**.
  - Champs `6:243`, `6:248` : **rendus**, `Largeur (m)` et `Profondeur (m)` (à confirmer).
  - Champs `6:254`, `6:259`, `6:264` : **rendus**, `Recul avant (m)`, `Recul latéral (m)`, `Recul arrière (m)` (à confirmer).
  - Champs `Voie d'accès`, `Orientation du nord (°)`, `Pente (%)`, `Direction de la pente (°)` : **ajoutés** (D21, EF-202).
  - Bouton `6:269` (250 × 40) : **masqué**. Libellé non relevé ; sa largeur et sa place laissent supposer un import de terrain (EF-203, hors périmètre). S'il s'agissait d'une autre action (saisie d'un contour), elle serait aussi hors périmètre (D20).
- Pied de page (`6:272`)
  - « Enregistré automatiquement · il y a 12 s » (`6:273`) : **rendu** et étendu à tous les états de l'enregistrement (§ 8), dans une barre d'état collante (écart § 14.2).
  - Boutons `6:276` (188 × 40) et `6:279` (197 × 40) : **masqués**. Libellés non relevés ; hypothèse : un enregistrement manuel (sans objet, l'enregistrement est automatique) et le lancement de la génération (CU-05, hors périmètre).

## 4. Composants

Dans `apps/web/src/components/project-description/`, sauf réutilisation. Noms indicatifs.

### 4.1 Réutilisés de « Mes projets »

- `AppHeader` : marque, navigation, `Nouveau projet`, compte. Deux variations pilotées par des propriétés : l'entrée `Mes projets` sans `aria-current` et sans fond `paper` ; la navigation visible à toutes les largeurs (§ 12).
- `AccountMenu`, `Dialog` et `DialogActions`, `ProjectNameDialog` (création), `TextField` et `Message` (`components/auth/fields.tsx`, `components/projects/`), styles de `styles.ts`.
- `Dialog` reçoit une propriété de largeur maximale (440 px par défaut, 640 px pour les exemples).
- `Nouveau projet` (bouton de la barre) : même dialogue et mêmes règles que sur « Mes projets » (`projects.md` § 7.1) ; en cas de succès, navigation vers `/projets/{id du projet créé}` en passant par la garde de départ (§ 8.7).

### 4.2 Nouveaux

- `ProjectDescriptionScreen` : chargement, états de page, valeurs locales, groupes, enregistrement.
- `useAutosave` (ou équivalent) : machine d'état du § 8, horloge injectable pour les tests.
- `PageHeading` : titre, phrase, étapes (§ 4.3).
- `DescriptionCard`, `ParametersCard`, `RoomsTable`, `SiteCard`, `SitePreview`.
- `DecimalField` : `TextField` pour un nombre affiché en unité de l'écran (§ 5.3).
- `SelectField` : liste déroulante native (`<select>`) avec libellé, aide et erreur, au style de `TextField`.
- `ChipGroup` : groupe de puces à sélection unique et désélectionnable (§ 6.2).
- `ExamplesDialog`, `ConfirmDialog` (`role="alertdialog"`, titre, texte, `Annuler` et action).
- `SaveStatusBar` : barre d'état (§ 8.2).
- `ConflictAlert` : alerte de conflit (§ 8.5).
- `PageLoading`, `PageError`, `ProjectNotFound` : états du § 7.

### 4.3 Étapes

- `<ol aria-label="Étapes du projet">` de trois `<li>` : pastille numérotée (`aria-hidden="true"`, le numéro étant donné par la liste) puis libellé ; traits de liaison décoratifs (`aria-hidden="true"`).
- `Description` et `Terrain` : pastille pleine `primary`, chiffre blanc, libellé `ink` 14/20 médium. Ces deux étapes sont l'objet de cet écran ; aucune n'est marquée « faite » ni « en cours » (aucun calcul de complétude).
- `Génération` : pastille à bordure tiretée `line` sur `surface`, chiffre et libellé en `ink` à 70 % ; libellé suivi d'un texte masqué visuellement ` (pas encore disponible)`. La différence ne repose pas sur la teinte seule (pastille pleine ou vide).
- Aucun élément n'est interactif. Couleurs des pastilles non relevées (fondations).

## 5. Données et appels

### 5.1 Appels

- À l'ouverture : `me()` et `getProject(id)` en parallèle. `getProject` rend `{ project, etag }` (plan § 3.5).
- Enregistrement : `updateProject(id, patch, { ifMatch: etag })`, `patch` ne contenant que les groupes modifiés et valides (§ 8.1).
- Rechargement après conflit : `getProject(id)`.
- Création depuis la barre : `createProject(name)`. Déconnexion : `logout()`.

### 5.2 Correspondance entre champs et contrat

Valeurs locales : chaque champ garde le texte saisi. Les groupes sont reconstruits à partir de ces textes, puis validés par leur schéma :

- Groupe `name` : texte du champ `Nom du projet`, tel quel (le schéma retire les espaces de bord).
- Groupe `descriptionText` : texte de la zone, tel quel ; une zone vidée envoie `""`. L'écran n'envoie jamais `null`.
- Groupe `parameters` : objet ne contenant que les clés renseignées (§ 6.2, § 6.3). Rien de renseigné : `{}`.
- Groupe `site` : `null` si le terrain est vierge (tous les champs texte vides et `Voie d'accès` sur sa valeur initiale) ; sinon `{ boundary: { kind: "rectangle", width?, depth? }, accessEdgeIndex, northAngle?, setbacks: { front?, side?, rear? }, slope: { direction?, percent? } }`, une clé vide étant omise (le schéma lui donne sa valeur par défaut). L'objet `boundary` est toujours construit, de sorte qu'une dimension manquante est signalée sur son propre champ. Terrain polygonal enregistré (D20) : `boundary` est renvoyé tel que reçu.
- À l'ouverture, les champs sont remplis à partir de `ProjectDetail` : valeur absente ou `null` → champ vide, liste sur « Selon la description », aucune puce. Le terrain stocké étant complet, des reculs, un nord et une pente à 0 s'affichent `0` après le premier enregistrement du terrain (comportement attendu : 0 est la valeur que le moteur utilisera).
- Une réponse de l'API ne réécrit jamais un champ (plan § 3.4) ; seuls l'`ETag`, l'état d'enregistrement et le titre du document en sont tirés. Un nom renvoyé sans ses espaces de bord n'est donc visible qu'au prochain chargement.

### 5.3 Saisie des nombres

Champs concernés : surfaces en m², longueurs en m, angles en degrés, pente en %, nombre de pièces. Contrôle `<input type="text" inputmode="decimal" autocomplete="off">` (pas de `type="number"` : séparateur décimal, molette et flèches qui modifient la valeur à l'insu de l'utilisateur).

Lecture (présentation, pas de règle métier) :

1. Retirer les espaces de bord et les espaces internes (espace, espace insécable, espace fine insécable) : `1 000` est lu `1000`.
2. Champ vide : valeur absente.
3. Le texte doit être de la forme `-` facultatif, chiffres, puis éventuellement une virgule ou un point suivi de chiffres (`12`, `12,5`, `12.5`, `-3`). Sinon : message d'interface `Saisissez un nombre, par exemple 12,5.` (§ 9.3), et le groupe est invalide.
4. Conversion par `@tracea/domain` : m² → `squareMetresToMm2`, m → `metresToMm` ; degrés, % et nombre de pièces passés tels quels. Les bornes, le caractère entier et les messages viennent ensuite du schéma.

Affichage d'une valeur reçue : `mm2ToSquareMetres` ou `mmToMetres`, puis `Intl.NumberFormat("fr-FR", { useGrouping: false, maximumFractionDigits: n })`, sans zéros inutiles, avec `n` = 3 pour les mètres, 6 pour les m² (valeur exacte au mm et au mm² près), 3 pour les degrés et les pourcentages. Exemples : `120`, `35,5`, `20`, `12,345`. La saisie n'est jamais reformatée pendant que le champ a le focus ; elle l'est seulement au chargement et au rechargement.

## 6. Contenu des cartes

### 6.1 Carte Description

- `<section aria-labelledby>` avec un titre `<h2>` masqué visuellement : `Description du projet`.
- `Nom du projet` : `TextField`, `autocomplete="off"`, valeur `name`. Aucune aide (hauteur de 64 de la maquette). Groupe `name`.
- `Description libre` : `<textarea>` de 132 px de haut (redimensionnable verticalement, hauteur minimale 132), sans attribut `maxlength` (il compterait les unités UTF-16 et non les caractères, A9). Groupe `descriptionText`. Valeur `descriptionText`, chaîne vide si `null`.
- Ligne sous la zone, à 6 px :
  - à gauche, compteur `{n} / 2 000 caractères`, `{n}` = `countCharacters(texte)` mis en forme par `Intl.NumberFormat("fr-FR")` (séparateur de milliers : espace fine insécable) ; `2 000` vient de `DESCRIPTION_MAX_LENGTH`, même mise en forme. Recalculé à chaque frappe. Texte `ink` à 70 % ; au-delà de la limite, texte `danger` précédé de `⚠` (`aria-hidden`). Le compteur est relié à la zone par `aria-describedby` ;
  - à droite, bouton `Voir des exemples de descriptions`, style de lien (`text-primary`, souligné, 12/16), hauteur de cible portée à 24 px au moins par ses marges intérieures. Il ouvre le dialogue du § 6.6.
- Erreur de la description (au-delà de 2 000 caractères, caractère interdit) : sous la ligne du compteur.

### 6.2 Carte Paramètres du bâtiment

- `<section aria-labelledby>` ; titre `<h2>` `Paramètres du bâtiment`.
- Phrase d'aide (ajoutée), 12/16 `ink` à 70 %, à 4 px sous le titre : `Facultatifs. Un paramètre laissé sur « Selon la description » ou vide est déduit de la description par le moteur Tracea ; un paramètre renseigné prime sur la description.`
- Rangée 1 :
  - `Type de bâtiment` : liste ; `Selon la description` (clé absente), `Maison individuelle` (`house`). Valeurs tirées de `BUILDING_TYPES`.
  - `Niveaux` : `ChipGroup` ; puces `Plain-pied` (1), `R+1` (2), `R+2` (3) ; aucune puce active = clé absente.
  - `Surface habitable cible (m²)` : `DecimalField` → `targetHabitableArea`.
- Rangée 2 :
  - `Toiture` : liste ; `Selon la description` (clé `roof` absente), `Toit plat` (`flat`), `2 pans` (`gable`), `4 pans` (`hip`).
  - `Garage` : liste combinant `kind` et `spaces` ; `Selon la description` (clé absente), `Pas de garage` (`{ kind: "none" }`), puis pour `attached` puis `detached` et chaque nombre de places de `PROJECT_INPUT_LIMITS.garageSpaces` : `Accolé, 1 place`, `Accolé, 2 places`, `Accolé, 3 places`, `Indépendant, 1 place`, `Indépendant, 2 places`, `Indépendant, 3 places`.
  - `Orientation du séjour` : liste ; `Selon la description`, puis dans l'ordre de `ORIENTATIONS` : `Nord`, `Nord-est`, `Est`, `Sud-est`, `Sud`, `Sud-ouest`, `Ouest`, `Nord-ouest`.
- Rangée 3 (ajoutée), chaque champ dans la colonne de celui dont il dépend, présent seulement quand il a un sens :
  - colonne 1, `Couverture`, si `Toiture` a une valeur : `Non précisée` (clé `covering` absente), `Tuiles`, `Ardoises`, `Couverture métallique`, `Membrane d'étanchéité` (`tile`, `slate`, `metal`, `membrane`) ;
  - colonne 2, `Surface mini du garage (m²)`, si `Garage` est accolé ou indépendant : `DecimalField` → `garage.minArea`.
  - Quand la condition cesse (toiture remise sur « Selon la description », garage sur « Pas de garage » ou « Selon la description »), le champ disparaît et sa valeur est effacée. La rangée n'occupe aucune hauteur si elle est vide.
- `ChipGroup` (puces de 28 px, marges intérieures horizontales 12) :
  - `<div role="group" aria-labelledby>` pointant le libellé `Niveaux` ; chaque puce est un `<button type="button" aria-pressed>`, nom = texte visible ;
  - activer une puce inactive la rend active et désactive les autres ; activer la puce active la désactive (retour à « non renseigné ») : c'est pourquoi des boutons bascule sont préférés à des boutons radio, qui ne se décochent pas ;
  - puce active : fond `primary`, texte blanc ; inactive : fond `surface`, bordure `line`, texte `ink` ; survol inactif `paper` ;
  - chaque puce est un arrêt de tabulation ; `Entrée` et `Espace` basculent ;
  - une erreur du groupe (API seulement) s'affiche sous les puces et est reliée au groupe par `aria-describedby`.

### 6.3 Tableau des pièces

- Libellé `Pièces` (ligne de 18), qui est aussi la légende du tableau : `<table>` avec `<caption>` `Pièces`, mise en forme comme un libellé de champ et alignée à gauche.
- En-têtes `<th scope="col">` : `Type`, `Nombre`, `Surface mini (m²)` et un quatrième en-tête masqué visuellement, `Supprimer`. Texte 12/16 `ink` à 70 %.
- Une ligne par élément de `rooms`, dans l'ordre reçu :
  - `Type` : liste ; première option `Choisir un type` (valeur vide, non envoyée), puis les types de `PARAMETER_ROOM_TYPES` dans cet ordre : `Séjour-cuisine` (`livingKitchen`), `Séjour` (`living`), `Cuisine` (`kitchen`), `Chambre` (`bedroom`), `Salle de bain ou salle d'eau` (`bathroom`), `WC` (`wc`), `Bureau` (`office`), `Buanderie` (`laundry`), `Cellier ou rangement` (`storage`), `Local technique` (`technical`). Tous les types restent proposés sur chaque ligne : un doublon est signalé par le schéma, l'écran ne filtre pas ;
  - `Nombre` : `DecimalField` → `count` ;
  - `Surface mini (m²)` : `DecimalField` → `minArea` ; vide = non renseignée, avec le signe `—` en texte indicatif (`placeholder`, couleur `ink` à 70 %), comme la maquette ;
  - bouton de suppression 32 × 32 montrant `×` (`aria-hidden`), sans bordure, survol `paper`.
- Noms accessibles (le libellé visible de chaque contrôle est l'en-tête de sa colonne ; le nom commence par lui, WCAG 2.5.3) : `Type, ligne {n}`, `Nombre, ligne {n}`, `Surface mini (m²), ligne {n}` ; bouton `Supprimer la ligne {n} : {libellé du type}`, ou `Supprimer la ligne {n}` si aucun type n'est choisi. `{n}` commence à 1 et suit l'ordre affiché.
- Ajout : bouton secondaire `Ajouter une pièce` précédé d'une icône `+` (`aria-hidden`), à 8 px sous la dernière ligne. Il ajoute en fin de tableau une ligne `Choisir un type`, `1`, vide, et place le focus sur sa liste `Type`. La valeur `1` est une commodité de saisie ; elle reste modifiable. Le bouton est toujours actif : au-delà de 10 lignes, le schéma refuse la liste et le message s'affiche sous le tableau.
- Suppression : la ligne disparaît ; le focus va sur le bouton de suppression de la ligne qui prend sa place, à défaut de la ligne précédente, à défaut sur `Ajouter une pièce`. Annonce `Ligne {n} supprimée.` (§ 11.4).
- Aucune ligne : le tableau n'est pas rendu ; à sa place, sous le libellé `Pièces` (alors un paragraphe), le texte `Aucune pièce indiquée : le moteur Tracea s'appuiera sur la description.` en `ink` à 70 %, puis `Ajouter une pièce`. Clé `rooms` absente.
- Erreurs : celle d'une cellule s'affiche sous son contrôle, dans la cellule (la ligne grandit) et est reliée par `aria-describedby` ; celle de la liste entière (`rooms`) s'affiche entre le tableau et le bouton d'ajout et est reliée au tableau par `aria-describedby`.
- Clavier : contrôles natifs parcourus par `Tab`, ligne par ligne (Type, Nombre, Surface mini, Supprimer). Pas de grille ARIA ni de navigation aux flèches entre cellules : les flèches gardent leur rôle dans les listes et les champs.

### 6.4 Carte Terrain : champs

`<section aria-labelledby>` ; titre `<h2>` `Terrain`. Ordre : aperçu (§ 6.5), puis :

1. Rangée de deux colonnes (`6:242`) : `Largeur (m)` → `boundary.width` ; `Profondeur (m)` → `boundary.depth`.
2. Rangée de deux colonnes (ajoutée) :
   - `Voie d'accès` : liste → `accessEdgeIndex` ; options `En bas de l'aperçu` (0), `À droite de l'aperçu` (1), `En haut de l'aperçu` (2), `À gauche de l'aperçu` (3), valeur initiale 0. Aide : `Côté de la parcelle qui donne sur la voie.` Terrain polygonal : options `Côté 1` à `Côté {nombre de côtés}`.
   - `Orientation du nord (°)` → `northAngle`. Aide : `0 : le nord est en haut de l'aperçu. L'angle se compte dans le sens des aiguilles d'une montre.`
3. Rangée de trois colonnes (`6:253`) : `Recul avant (m)`, `Recul latéral (m)`, `Recul arrière (m)` → `setbacks.front`, `.side`, `.rear`. Aide commune sous la rangée, reliée aux trois champs : `Distances minimales à respecter : l'avant depuis la voie d'accès, l'arrière depuis la limite opposée, le latéral depuis chacune des deux autres limites.`
4. Signalement de la zone constructible vide (D28), sous les reculs, quand le terrain est valide et que `buildableZone` rend `null` pour un rectangle : bloc sur `surface`, bordure `warn` (décorative), signe `⚠` en `warn` (`aria-hidden`), texte `ink` 12/16 : `Avec ces reculs, il ne reste aucune zone constructible sur le terrain. Réduisez les reculs ou agrandissez le terrain : la génération des plans sera impossible tant que la zone est vide.` Le terrain est tout de même enregistré. Apparition annoncée une fois (§ 11.4), le bloc lui-même n'étant pas une région vivante.
5. Rangée de deux colonnes (ajoutée) : `Pente (%)` → `slope.percent` ; `Direction de la pente (°)` → `slope.direction`, aide : `Sens de la descente, compté comme l'orientation du nord.`

Terrain polygonal enregistré (possible par l'API seule, D20) : les champs `Largeur` et `Profondeur` sont remplacés par le texte `Ce terrain a été défini par un contour de {nombre} côtés. Sa forme ne se modifie pas sur cet écran.` ; les autres champs restent modifiables ; aucune zone constructible n'est dessinée ni signalée (elle sera calculée à la génération).

### 6.5 Aperçu du terrain

`<figure>` de 370 × 200 à 1 440 px (rapport 37:20 conservé à toutes les largeurs, largeur maximale 480 px, centré). Il ne contient que des formes construites à partir de nombres ; aucune chaîne saisie n'y est insérée (pas de `dangerouslySetInnerHTML`).

Données : l'aperçu est recalculé quand le groupe `site` est validé (sortie d'un champ du terrain ou 1 000 ms sans frappe), à partir de la valeur analysée par `ProjectSiteSchema` (valeurs par défaut appliquées) : contour par `siteBoundaryPolygon`, zone par `buildableZone`. Il ne bouge donc pas à chaque frappe.

Dessin (`<svg viewBox="0 0 370 200">`, `role="img"`, `aria-labelledby` vers son `<title>` et sa `<desc>`), repère de la saisie avec l'axe Y vers le haut (l'arête 0 est en bas) :

- Fond (`6:230`) : `paper`.
- Zone de dessin : 290 × 160 à partir de (40, 20), relevée sur la maquette (parcelle `6:231`). La parcelle y est mise à l'échelle uniformément et centrée ; les proportions sont exactes (la maquette ne l'est pas : 288 × 160 pour 30 × 20 m).
- Parcelle (`6:231`) : fond `surface`, trait `ink` 1 px.
- Zone constructible (`6:232`) : trait `primary` 1 px tireté (4, 3), fond `primary` à 8 % ; libellé `zone constructible` (`6:233`) centré, 11 px, `ink` à 70 %. Zone vide : pas de zone ; à sa place, au centre de la parcelle, `aucune zone constructible`, 11 px, `ink`.
- Voie d'accès : arête d'accès en trait `ink` 3 px ; libellé `voie d'accès` (`6:241`), 11 px, `ink` à 70 %, à l'intérieur de la parcelle, à 6 px de l'arête et centré sur elle, tourné de 90° pour une arête verticale (lecture de bas en haut).
- Cotes, convention du calque `A-DIMS` (couleur `dim`) : cote horizontale (`6:240`) sous la parcelle, trait 1 px avec deux traits obliques à 45° de 6 px aux extrémités, texte (`6:234`) centré dessous ; cote verticale : texte (`6:235`) à gauche de la parcelle, centré verticalement, horizontal (la maquette n'a pas de ligne de cote verticale). Texte 11 px, valeur en mètres à deux décimales avec virgule : `30,00`, `20,00` (la maquette écrit `30.00`, écart § 14.2). La cote horizontale donne `width`, la verticale `depth`.
- Nord (`6:236`) : symbole de nord de plan de masse, dessiné par `SitePreview` (détail ci-dessous, A18). Le triangle plein 20 × 20 de la maquette est abandonné : presque équilatéral, il paraît pointer vers un autre côté dès qu'il tourne (à 20°, il semble pointer vers la gauche).
- Pente : non dessinée (limite, § 14.4).
- Traits avec `vector-effect="non-scaling-stroke"` ; textes en police de l'interface. Couleurs, épaisseurs et tiretés non relevés : conventions de plan de masse de l'équipe, à vérifier sur la maquette.
- Terrain polygonal : contour seul, arête d'accès et nord ; ni cotes ni zone.

Symbole du nord (composant `SitePreview`, groupe `<g>` propre, sans interaction) :

- Centre du symbole : (348, 34) dans le `viewBox`, hors de la zone de dessin sauf la lettre quand le nord pointe à l'ouest (voir le halo).
- Aiguille : losange étroit de 22 de long et 8 de large, centré sur le centre du symbole, dont l'axe long porte la direction du nord. Moitié nord (de la pointe au centre) **pleine** `ink` ; moitié sud **vide** : fond `surface`, trait `ink` 1 px. L'aiguille est asymétrique à tout angle : la pointe pleine désigne le nord, sans recours à la lettre ni à la couleur. Petit cercle de pivot de 2 de rayon, plein `ink`, au centre.
- Lettre `N` : 11 px semi-gras, `ink`, centrée sur un point situé à 17 du centre du symbole dans la direction du nord, au-delà de la pointe pleine. Seule sa **position** tourne avec l'aiguille ; le glyphe reste toujours droit (aucune rotation du texte), quel que soit l'angle.
- Rotation : l'aiguille tourne de `northAngle` degrés dans le sens horaire autour du centre du symbole (`transform="rotate(northAngle, 348, 34)"` sur l'aiguille seule) ; la position de la lettre est calculée pour le même angle (présentation, pas de règle métier). À 0°, pointe pleine et `N` en haut ; à 90°, à droite ; à 180°, en bas ; à 270°, à gauche.
- Halo : l'aiguille et la lettre portent un contour `paper` de 3 px peint sous le tracé (`paint-order="stroke"`), pour rester lisibles si elles touchent la parcelle ou une cote.
- Contrastes : `ink` sur `paper` et sur `surface` 16,6:1 au moins ; la moitié sud est un élément graphique tracé en `ink`, au-dessus de 3:1 (WCAG 1.4.11).
- Nom accessible : le `<svg>` porte `role="img"` ; ses éléments ne sont pas exposés un par un, le groupe du nord porte `aria-hidden="true"` et la lettre `N` n'est pas lue isolément. L'information du symbole est donnée par la phrase de `<desc>` : `Nord orienté à {angle}° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu.` (déjà présente pour le rectangle et le polygone ci-dessous), `{angle}` mis en forme comme au § 5.3 (`0`, `20`, `112,5`).
- Vérification attendue (S3-5) : pour 0°, 20°, 90°, 200° et 315°, la pointe pleine et la lettre `N` désignent la même direction ; la lettre reste droite et entière dans le `viewBox`.

Textes de l'aperçu :

- `<title>` : `Aperçu du terrain`.
- `<desc>` (rectangle) : `Terrain rectangulaire de {largeur} m de largeur sur {profondeur} m de profondeur. Voie d'accès {en bas | à droite | en haut | à gauche} de l'aperçu. Nord orienté à {angle}° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu. Reculs : avant {a} m, latéral {l} m, arrière {r} m. {Zone constructible représentée en tireté. | Aucune zone constructible avec ces reculs.}` Nombres mis en forme comme au § 5.3.
- `<desc>` (polygone) : `Terrain défini par un contour de {n} côtés. Voie d'accès sur le côté {k}. Nord orienté à {angle}° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu.`
- `<figcaption>` visible (ajoutée), 12/16 `ink` à 70 %, sous le dessin : `Aperçu du terrain : schéma de votre saisie, sans valeur de plan.`

Sans aperçu (pas de `<svg>` ; à la place, dans un bloc de même taille à bordure tiretée `line`, texte centré 12/16 `ink` à 70 %) :

- terrain vierge : `Indiquez la largeur et la profondeur du terrain pour afficher l'aperçu.`
- terrain invalide : `Aperçu indisponible : corrigez les valeurs du terrain signalées ci-dessous.`

### 6.6 Dialogue d'exemples (D30)

- Ouverture par `Voir des exemples de descriptions`. `Dialog`, largeur maximale 640 px, contenu défilant.
- Titre : `Exemples de descriptions`. Texte d'introduction (relié par `aria-describedby`) : `Ces exemples montrent le niveau de détail utile au moteur Tracea : usage, surface, pièces et leurs liens, orientation, toiture, terrain. Utilisez-en un comme point de départ, puis adaptez-le.`
- Trois exemples, chacun : titre `<h3>`, texte en `<p>` (14/22), bouton secondaire `Utiliser cet exemple` dont le nom accessible est `Utiliser cet exemple : {titre}`. Séparateur `line` entre les exemples.
- Pied : bouton secondaire `Fermer`.
- Focus initial sur le premier `Utiliser cet exemple`. `Échap` et `Fermer` ferment sans rien changer ; le focus revient sur `Voir des exemples de descriptions`.
- `Utiliser cet exemple` :
  - description vide : le texte de l'exemple remplace la zone, le dialogue se ferme, le focus va dans la zone de texte (curseur en fin de texte), annonce `Exemple inséré dans la description.` ;
  - description non vide : le dialogue d'exemples se ferme et un `ConfirmDialog` s'ouvre (pas de dialogues imbriqués). Titre `Remplacer la description ?` ; texte `Le texte actuel de la description sera remplacé par l'exemple « {titre} ». Il ne pourra pas être récupéré.` ; boutons `Annuler` (focus initial) et `Remplacer la description` (destructif). Confirmer : remplacement, puis comme ci-dessus. `Annuler` ou `Échap` : retour au dialogue d'exemples, focus sur le bouton de l'exemple choisi.
- L'insertion est une modification ordinaire du groupe `descriptionText` (enregistrement automatique).

Textes des exemples (exacts ; chacun compte moins de 600 caractères, très en deçà de 2 000) :

1. Titre `Maison de plain-pied familiale`. Texte : `Maison de plain-pied d'environ 110 m² habitables pour un couple avec deux enfants. Entrée avec placard, séjour-cuisine ouvert d'environ 40 m² orienté sud-ouest et prolongé par une terrasse. Trois chambres de 11 à 13 m², regroupées dans une partie nuit, dont une avec dressing. Une salle de bain avec baignoire, un WC séparé et une buanderie accessible depuis le garage. Garage simple accolé. Toiture à deux pans en tuiles. Terrain plat d'environ 600 m², accès par le nord.`
2. Titre `Maison à étage sur terrain étroit`. Texte : `Maison R+1 d'environ 140 m² habitables sur un terrain de 12 m de large en ville. Au rez-de-chaussée : séjour traversant ouvert sur le jardin à l'arrière, cuisine fermée côté rue, WC, cellier et un bureau pouvant servir de chambre d'amis. À l'étage : quatre chambres, une salle de bain et une salle d'eau, un WC séparé. Garage simple intégré côté rue. Toiture à quatre pans en ardoises. Les pièces de vie doivent recevoir la lumière du sud.`
3. Titre `Petite maison à toit plat`. Texte : `Petite maison contemporaine de plain-pied d'environ 75 m² habitables pour une personne qui travaille à domicile. Grand séjour avec cuisine ouverte orienté sud, une chambre, un bureau lumineux, une salle d'eau avec douche de plain-pied et un WC séparé. Pas de garage : deux places de stationnement extérieures suffisent. Toit plat végétalisé. Terrain en légère pente vers le sud, recul de 5 m par rapport à la voie.`

## 7. États de la page

### 7.1 Chargement

- Barre supérieure : marque et navigation seules (ni `Nouveau projet` ni avatar).
- `<h1>` `Décrire le bâtiment` ; ni phrase ni étapes.
- `PageLoading` : paragraphe `role="status"` `Chargement du projet…`, puis deux colonnes de cartes fantômes aux hauteurs de la maquette (312 et 592 à gauche, 498 à droite), `aria-hidden="true"`, fond `surface`, bordure `line`, pulsation sous `motion-safe` seulement. Le conteneur porte `aria-busy="true"`.
- Pas de barre d'état.

### 7.2 Erreur au chargement

Quand `me()` ou `getProject()` échoue pour une autre raison que 401 ou 404 :

- `PageError`, bloc `role="alert"` sur `surface`, bordure `line`, rayon 12 : titre `<h2>` `Impossible d'afficher le projet`, message de `errorMessage(erreur)`, bouton principal `Réessayer`, puis lien `Retour à Mes projets`.
- `Réessayer` relance les deux appels (état du § 7.1) ; succès : focus sur `<main>` ; nouvel échec : focus sur `Réessayer`.

### 7.3 Projet introuvable

Quand `getProject` (ouverture ou rechargement) ou un enregistrement reçoit 404 `PROJECT_NOT_FOUND` : identifiant inexistant, non conforme, projet supprimé ou appartenant à un autre compte, indistinctement.

- `<h1>` `Projet introuvable` (remplace `Décrire le bâtiment`) ; ni phrase, ni étapes, ni barre d'état.
- Texte : `Ce projet n'existe pas ou n'est plus disponible : il a peut-être été supprimé, ou l'adresse est incorrecte.`
- Lien au style du bouton principal : `Retour à Mes projets` (`/projets`).
- Barre supérieure complète si `me()` a réussi.
- Survenu pendant l'utilisation : les modifications non enregistrées sont perdues (le projet n'existe plus) ; le focus est placé sur `<main>` et le nouveau titre est lu. L'avertissement de départ (§ 8.7) est levé.

### 7.4 Session absente ou expirée

Toute réponse 401, à l'ouverture comme en cours d'utilisation (enregistrement, rechargement, création, déconnexion), remplace l'entrée d'historique par `/connexion?suivant=/projets/{id}` (`id` encodé), immédiatement, dialogue ouvert abandonné. Les modifications saisies depuis le dernier envoi sont perdues (limite, § 14.4).

### 7.5 Prêt

Barre supérieure complète, en-tête de page, trois cartes remplies selon le § 5.2, barre d'état sur `Enregistré automatiquement · {date}` (§ 8.3). Aucun focus n'est déplacé à l'arrivée : l'annonceur de route de Next.js lit le titre du document.

## 8. Enregistrement automatique

Règles du plan § 3.4 et § 3.3, précisées ici pour l'écran.

### 8.1 Cycle

- Groupes : `name`, `descriptionText`, `parameters`, `site`. Un groupe est « modifié » quand sa valeur reconstruite diffère de la dernière valeur enregistrée (ou chargée) ; revenir à cette valeur le rend « non modifié ».
- Déclenchement : 1 000 ms après la dernière modification, ou à la sortie d'un champ modifié ; jamais plus d'une requête en cours ; au moins 3 000 ms entre le début de deux envois (une demande arrivée trop tôt attend). Activer une puce, changer une liste, ajouter ou supprimer une ligne compte comme une modification suivie d'une sortie de champ.
- Contenu : chaque groupe modifié est validé par son schéma ; seuls les groupes modifiés et valides partent, ensemble, dans un seul `PATCH`, avec `If-Match` = dernier `ETag` reçu.
- Succès (200) : nouvel `ETag` ; chaque groupe envoyé dont la valeur n'a pas changé depuis l'envoi devient « non modifié » ; les autres restent modifiés et repartent au cycle suivant.
- Validation locale en échec : le groupe reste local et non envoyé ; les erreurs s'affichent selon le § 9.1.

### 8.2 Barre d'état

- `<footer>` propre à l'écran, pleine largeur, fond `surface`, bordure haute `line`, marges intérieures verticales 8 ; contenu aligné sur la grille du contenu (même conteneur, mêmes marges). Il contient, dans l'ordre : le texte d'état (12/16 ; `ink` à 70 % pour les états courants, `danger` précédé de `⚠` pour les états d'échec), puis l'action de l'état s'il en a une (bouton secondaire de 40 px).
- Collante en bas de la fenêtre (`position: sticky; bottom: 0`) quand la fenêtre a au moins 600 px de haut ; dans le flux, sous le contenu, sinon. Le document porte alors `scroll-padding-bottom` égal à sa hauteur, pour qu'un élément focalisé ne soit jamais caché derrière elle (WCAG 2.4.11).
- Le texte visible n'est pas une région vivante (il change régulièrement) ; les annonces passent par la région du § 11.4.

### 8.3 États et textes

Un seul état est affiché, le premier applicable dans cet ordre de priorité :

1. **Conflit** (412 reçu) : `⚠ Enregistrement suspendu : ce projet a été modifié ailleurs.` Pas d'action dans la barre (l'action est dans l'alerte du § 8.5).
2. **Échec** (400, 403, 413, 415, ou tout autre 4xx que 401, 404, 412, 422 et 429) : `⚠ Enregistrement impossible : {errorMessage(erreur)}` ; action `Réessayer`. Pas de nouvel essai automatique.
3. **Hors ligne** (`navigator.onLine` faux) : `⚠ Hors ligne : vos modifications seront enregistrées au retour de la connexion.` ; aucun envoi tant que dure l'état ; au retour (`online`), envoi immédiat dans le respect des 3 000 ms.
4. **En attente** (réseau injoignable, 429, 5xx) : `⚠ Enregistrement en attente : {cause}. Nouvel essai automatique dans quelques secondes.` ; action `Réessayer` (envoi immédiat, dans le respect des 3 000 ms). `{cause}` : `le service est injoignable` (erreur réseau), `trop de requêtes en peu de temps` (429), `le service est momentanément indisponible` (5xx). Nouveaux essais après 5 s, 15 s, puis toutes les 30 s ; un succès remet la progression à zéro.
5. **À corriger** (au moins un groupe modifié invalide dont une erreur est affichée, ou un 422 reçu) : `⚠ Certaines modifications ne sont pas enregistrées : corrigez les champs signalés.` ; action `Aller au champ à corriger`, qui place le focus sur le premier champ en erreur dans l'ordre du DOM.
6. **Enregistrement** (requête en cours) : `Enregistrement…`
7. **Modifié** (groupe modifié en attente du déclenchement, ou invalide sans erreur encore affichée) : `Modifications non enregistrées`
8. **Enregistré** : `Enregistré automatiquement · {date}`, `{date}` portant sur l'heure du dernier succès (horloge de l'appareil) ou, avant tout enregistrement, sur `updatedAt` du projet chargé.

Forme de `{date}` : moins de 5 s ou date future : `à l'instant` ; de 5 à 9 s : `il y a 5 s` ; de 10 à 59 s : `il y a {n} s`, `n` arrondi à la dizaine inférieure (`il y a 10 s`, `il y a 20 s`) ; au-delà, règles 2 à 8 de `projects.md` § 3.3 (`il y a {n} min`, `il y a {n} h`, `hier`, …). Le texte est rafraîchi toutes les 5 s pendant la première minute, puis toutes les minutes. La maquette écrit `il y a 12 s` ; l'arrondi évite un texte qui change chaque seconde (écart mineur).

### 8.4 Refus de validation par l'API (422)

- Les messages de `fields` s'affichent sous les champs correspondants (§ 9.1) ; un chemin sans champ correspondant s'affiche en erreur de groupe, en bas de sa carte.
- Les groupes du `PATCH` refusé restent modifiés et ne repartent pas tant que l'utilisateur n'a pas modifié un champ du groupe en erreur ; les autres groupes valides repartent au cycle suivant (ils sont renvoyés seuls).
- Une erreur venue de l'API disparaît à la première modification du champ.

### 8.5 Conflit (412 `PROJECT_MODIFIED`)

- Envois suspendus jusqu'au rechargement ; les champs restent modifiables (l'utilisateur peut copier sa saisie), sans enregistrement.
- `ConflictAlert` dans la zone d'alerte sous l'en-tête de page : bloc `role="alert"` sur `surface`, bordure `danger` à 40 %, signe `⚠` en `danger` ; titre en gras `Projet modifié ailleurs` ; texte = `detail` de la réponse (à défaut `Ce projet a été modifié depuis une autre fenêtre. Rechargez-le pour retrouver la dernière version.`) ; bouton principal `Recharger le projet`. Pas de bouton `Fermer` : l'alerte reste jusqu'au rechargement.
- `Recharger le projet` : s'il existe des modifications non enregistrées (c'est le cas dès que le `PATCH` refusé portait une saisie), `ConfirmDialog` : titre `Recharger le projet ?` ; texte `Les modifications faites sur cette page depuis le dernier enregistrement seront perdues. Copiez d'abord le texte que vous souhaitez garder.` ; boutons `Annuler` (focus initial) et `Recharger le projet` (destructif), attente `Chargement…`. Sans modification non enregistrée, le rechargement part sans confirmation.
- Rechargement réussi : tous les champs sont remplacés par la version reçue, nouvel `ETag`, erreurs effacées, alerte retirée, état « Enregistré », focus sur `<main>`, annonce `Dernière version du projet chargée.` Échec : `Message` d'erreur en tête du dialogue (`errorMessage`) ; 401 et 404 selon le § 7.

### 8.6 Erreurs non liées à un champ

`Nouveau projet` (dialogue de création) et `Se déconnecter` gardent leurs règles de « Mes projets ». Il n'y a pas d'autre zone de message de page que l'alerte de conflit et la barre d'état.

### 8.7 Départ de la page

- Fermeture de l'onglet, rechargement, adresse saisie, lien externe : avertissement natif du navigateur (`beforeunload`) tant qu'un groupe est modifié, en cours d'envoi, à corriger, en attente, en échec ou en conflit.
- Navigation interne (marque, `Mes projets`, succès de `Nouveau projet`, `Se déconnecter`) : l'écran attend la fin de l'envoi en cours, puis envoie aussitôt les groupes modifiés et valides (dans le respect des 3 000 ms) ; pendant l'attente, la barre affiche `Enregistrement…` et la navigation part dès le succès. S'il reste des modifications non enregistrées (invalides, échec, conflit, hors ligne, ou attente de plus de 10 s) : `ConfirmDialog` titre `Quitter cette page ?`, texte `Certaines modifications ne sont pas enregistrées et seront perdues si vous quittez cette page.`, boutons `Rester sur la page` (focus initial) et `Quitter sans enregistrer` (destructif). `Rester sur la page` rend le focus à l'élément activé ; après une création réussie, il ajoute l'annonce `Projet « {nom} » créé. Il figure dans « Mes projets ».`
- Boutons Précédent et Suivant du navigateur : non interceptés (limite, § 14.4).

## 9. Validation et messages

### 9.1 Affichage des erreurs

- Un champ texte est validé à sa sortie : si son groupe est invalide à cet endroit, l'erreur s'affiche sous lui. Une fois affichée, l'erreur est recalculée à chaque frappe et disparaît dès que la valeur devient valide.
- Listes, puces, ajout et suppression de ligne : validation immédiate.
- Une erreur n'est pas affichée pendant la frappe, avant la sortie du champ (le compteur de la description signale toutefois le dépassement en direct, § 6.1).
- Champ en erreur : `aria-invalid="true"`, message 12/16 en `danger` sous le champ, relié par `aria-describedby` (après l'aide éventuelle), bordure `danger` (`TextField`).
- Correspondance entre le chemin d'une erreur (préfixé du groupe pour l'API, par exemple `parameters.rooms.1.minArea`) et le champ : nom de la clé, puis index de ligne pour les pièces. `parameters.rooms.{i}` sans sous-clé : cellule `Type` de la ligne. `parameters.garage` : liste `Garage`. `parameters.roof` : liste `Toiture`. `site.boundary` et `site.boundary.points…` : sous `Largeur`, ou sous le texte du contour pour un polygone. `site.setbacks` : sous l'aide des reculs. Groupe sans sous-chemin, ou chemin inconnu : erreur de groupe en bas de la carte (sous `Nom du projet` et `Description libre` pour leurs propres groupes).

### 9.2 Messages des schémas de `packages/domain`

Repris tels quels, à l'écran comme dans les réponses de l'API (relevés le 19 novembre 2026 dans `packages/domain/src/project-input.ts`, après application des reformulations du § 9.4 et des corrections A12 et A15 ; recette A17). L'écran ne les reformule pas ; toute reformulation se fait dans `domain`. Dans le code, l'espace avant `:` est une espace insécable (` `).

- Nom : `Le nom est requis.` ; `Le nom est limité à 120 caractères. Raccourcissez-le.` ; `Le nom contient des caractères non autorisés.` ; `Le nom contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.` (moitié isolée d'une paire de substitution, A15).
- Description : `La description est limitée à 2 000 caractères. Raccourcissez-la.` ; `La description contient un caractère non autorisé.` ; `La description contient un caractère incomplet, souvent un émoji coupé lors d'un copier-coller. Supprimez-le ou saisissez-le de nouveau.` (A15) ; `La description doit être un texte.` (API seulement : l'écran envoie toujours une chaîne).
- Type de bâtiment : `Choisissez un type de bâtiment de la liste.`
- Niveaux : `Le nombre de niveaux doit être un nombre entier compris entre 1 et 3.`
- Surface habitable : `La surface habitable doit être comprise entre 20 et 500 m².` ; `La surface habitable doit être arrondie au millimètre carré.`
- Pièces, liste : `La liste des pièces est limitée à 10 lignes : supprimez une ligne ou regroupez des pièces.`
- Pièce, type : `Indiquez le type de pièce.` (ligne sans type) ; `Ce type de pièce figure déjà dans la liste : modifiez plutôt le nombre de la ligne existante.` (sur la cellule `Type` de la seconde occurrence et des suivantes ; signalé même quand une autre ligne est en erreur, par exemple une ligne sans type, A12 ; seules les lignes dont le type est valide sont comparées) ; `Choisissez un type de pièce de la liste.`
- Pièce, nombre : `Indiquez le nombre de pièces.` ; `Le nombre de pièces doit être un nombre entier compris entre 1 et 10.`
- Pièce, surface mini : `La surface minimale doit être comprise entre 1 et 200 m².` ; `La surface minimale doit être arrondie au millimètre carré.`
- Garage : `Choisissez une option de garage de la liste.` ; `Le nombre de places du garage doit être un nombre entier compris entre 1 et 3.` ; `Indiquez le nombre de places du garage.` ; `La surface du garage doit être comprise entre 10 et 100 m².` ; `La surface du garage doit être arrondie au millimètre carré.`
- Toiture : `Indiquez le type de toiture.` ; `Choisissez un type de toiture de la liste.` ; `Choisissez une couverture de la liste.`
- Orientation du séjour : `Choisissez une orientation du séjour de la liste.`
- Terrain, dimensions : `Indiquez la largeur du terrain.` ; `La largeur du terrain doit être comprise entre 5 et 500 m.` ; `La largeur du terrain doit être arrondie au millimètre.` ; mêmes formes pour `profondeur` ; `Indiquez les dimensions du terrain.`
- Terrain, forme et contour (API seulement) : `Choisissez une forme de terrain de la liste.` ; `Le contour du terrain doit compter entre 3 et 64 points.` ; `Chaque point du contour doit avoir deux coordonnées.` ; `Le contour du terrain ne doit pas se recouper.` ; `La surface du terrain doit être d'au moins 25 m².` ; `Les coordonnées du contour doivent être comprises entre 0 et 1 000 m.` ; `Les coordonnées du contour doivent être arrondies au millimètre.`
- Orientation du nord : `L'orientation du nord doit être comprise entre 0 et 360° (360 exclu).`
- Voie d'accès : `Choisissez le côté du terrain qui donne sur la voie d'accès.`
- Reculs : `Le recul avant doit être compris entre 0 et 50 m.` ; mêmes formes pour `latéral` et `arrière` ; `Le recul avant doit être arrondi au millimètre.` (et suivants).
- Pente : `La pente doit être comprise entre 0 et 30 %.` ; `La direction de la pente doit être comprise entre 0 et 360° (360 exclu).`
- Messages de structure (`Champ non autorisé.`, `La liste des pièces est invalide.`, `Cette ligne de pièce est invalide.`, `Le garage est invalide.`, `La toiture est invalide.`, `Les paramètres du bâtiment sont invalides.`, `Le contour du terrain est invalide.`, `Les reculs sont invalides.`, `La pente est invalide.`, `Le terrain est invalide.`) : réservés aux appels directs à l'API ; l'écran ne peut pas les provoquer. S'ils arrivaient, ils s'afficheraient en erreur de groupe.

Les messages « arrondi au millimètre » et « au millimètre carré » ne peuvent pas apparaître à l'écran : les conversions de `domain` arrondissent avant la validation.

Les messages du caractère incomplet et le contrôle des doublons ont été modifiés par le backend pendant cette mise à jour (A12, A15) ; ils sont repris dans l'état du fichier à la dernière relecture. Si leur texte change encore avant la fusion, le § 9.2 est à réaligner.

### 9.3 Message propre à l'écran

- Saisie illisible comme nombre (§ 5.3) : `Saisissez un nombre, par exemple 12,5.` Il s'agit du format de saisie, pas d'une règle métier ; il précède toute validation par le schéma pour ce champ.

### 9.4 Reformulations appliquées dans `domain` (plan § 3.1.4)

Proposées par le designer pour S3-2 et appliquées par le backend (constat de la recette, A17) ; le § 9.2 donne les textes en vigueur :

- Doublon de type de pièce : ajout de l'action `modifiez plutôt le nombre de la ligne existante`.
- Liste des pièces : ajout de l'action `supprimez une ligne ou regroupez des pièces`.
- Voie d'accès : `L'arête d'accès doit désigner un côté du terrain.` remplacé par `Choisissez le côté du terrain qui donne sur la voie d'accès.` (« arête » n'apparaît nulle part à l'écran).
- Nom et description : ajout de `Raccourcissez-le.` et `Raccourcissez-la.` Le message du nom est aussi affiché sur « Mes projets » : la modification vaut pour les deux écrans.

## 10. Textes

Libellés exacts : casse, ponctuation, espaces insécables avant `:`, `?`, `%` et `°` précédé d'un nombre, et à l'intérieur des guillemets français. `{nom}` et `{titre}` sont insérés comme texte. Repris de la maquette : `Tracea`, `Mes projets`, `Nouveau projet`, `Décrire le bâtiment`, la phrase d'introduction, `Description`, `Terrain`, `Génération`, `Description libre`, la forme `{n} / 2 000 caractères`, `Voir des exemples de descriptions`, `Paramètres du bâtiment`, `Niveaux`, `Pièces`, `Type`, `Nombre`, `Surface mini (m²)`, `—`, `zone constructible`, `voie d'accès`, `N`, la forme `Enregistré automatiquement · il y a {n} s`. Les autres sont définis par l'équipe.

- Barre supérieure et compte : ceux de `projects.md` § 8.1.
- En-tête : `Décrire le bâtiment` ; `Le moteur Tracea combine votre description et les paramètres. En cas d'écart, les paramètres priment.` ; `Étapes du projet` ; `Description` ; `Terrain` ; `Génération` ; ` (pas encore disponible)` (masqué visuellement).
- Carte Description : `Description du projet` (titre masqué) ; `Nom du projet` ; `Description libre` ; `{n} / 2 000 caractères` ; `Voir des exemples de descriptions`.
- Carte Paramètres : `Paramètres du bâtiment` ; phrase d'aide du § 6.2 ; `Type de bâtiment` ; `Selon la description` ; `Maison individuelle` ; `Niveaux` ; `Plain-pied` ; `R+1` ; `R+2` ; `Surface habitable cible (m²)` ; `Toiture` ; `Toit plat` ; `2 pans` ; `4 pans` ; `Garage` ; `Pas de garage` ; `Accolé, 1 place` à `Accolé, 3 places` ; `Indépendant, 1 place` à `Indépendant, 3 places` ; `Orientation du séjour` ; `Nord` ; `Nord-est` ; `Est` ; `Sud-est` ; `Sud` ; `Sud-ouest` ; `Ouest` ; `Nord-ouest` ; `Couverture` ; `Non précisée` ; `Tuiles` ; `Ardoises` ; `Couverture métallique` ; `Membrane d'étanchéité` ; `Surface mini du garage (m²)`.
- Pièces : `Pièces` ; `Type` ; `Nombre` ; `Surface mini (m²)` ; `Supprimer` (en-tête masqué) ; `Choisir un type` ; libellés des types du § 6.3 ; `—` ; `Type, ligne {n}` ; `Nombre, ligne {n}` ; `Surface mini (m²), ligne {n}` ; `Supprimer la ligne {n} : {type}` ; `Supprimer la ligne {n}` ; `Ajouter une pièce` ; `Aucune pièce indiquée : le moteur Tracea s'appuiera sur la description.` ; `Ligne {n} supprimée.`
- Terrain : `Terrain` ; `Largeur (m)` ; `Profondeur (m)` ; `Voie d'accès` ; `En bas de l'aperçu` ; `À droite de l'aperçu` ; `En haut de l'aperçu` ; `À gauche de l'aperçu` ; `Côté {k}` ; `Orientation du nord (°)` ; `Recul avant (m)` ; `Recul latéral (m)` ; `Recul arrière (m)` ; `Pente (%)` ; `Direction de la pente (°)` ; aides, signalement et texte du terrain polygonal du § 6.4.
- Aperçu : `Aperçu du terrain` ; `zone constructible` ; `aucune zone constructible` ; `voie d'accès` ; `N` ; cotes `{valeur}` ; `<desc>`, légende et textes de remplacement du § 6.5.
- Exemples : textes du § 6.6 ; `Exemples de descriptions` ; `Utiliser cet exemple` ; `Utiliser cet exemple : {titre}` ; `Fermer` ; `Remplacer la description ?` ; `Annuler` ; `Remplacer la description` ; `Exemple inséré dans la description.`
- États de la page : `Chargement du projet…` ; `Impossible d'afficher le projet` ; `Réessayer` ; `Retour à Mes projets` ; `Projet introuvable` ; texte du § 7.3.
- Enregistrement : textes du § 8.3 ; `Aller au champ à corriger` ; `Projet modifié ailleurs` ; `Recharger le projet` ; `Recharger le projet ?` ; texte du § 8.5 ; `Chargement…` ; `Dernière version du projet chargée.` ; `Quitter cette page ?` ; texte du § 8.7 ; `Rester sur la page` ; `Quitter sans enregistrer` ; `Projet « {nom} » créé. Il figure dans « Mes projets ».`
- Annonces : § 11.4.

## 11. Accessibilité

### 11.1 Clavier et ordre de tabulation

- Ordre : lien d'évitement → marque → `Mes projets` → `Nouveau projet` → avatar → `Recharger le projet` (si conflit) → `Nom du projet` → `Description libre` → `Voir des exemples de descriptions` → `Type de bâtiment` → `Plain-pied`, `R+1`, `R+2` → `Surface habitable cible` → `Toiture` → `Garage` → `Orientation du séjour` → `Couverture` et `Surface mini du garage` (si présents) → lignes du tableau (Type, Nombre, Surface mini, Supprimer) → `Ajouter une pièce` → `Largeur` → `Profondeur` → `Voie d'accès` → `Orientation du nord` → trois reculs → `Pente` → `Direction de la pente` → action de la barre d'état (si présente).
- Sur deux colonnes, la carte Terrain est à droite mais après les paramètres dans l'ordre : l'ordre suit le sens de la saisie (description, paramètres, terrain), comme les étapes.
- Contrôles natifs uniquement (champs, listes, boutons, liens) ; `Entrée` et `Espace` activent les boutons ; aucun raccourci à une touche, aucun glisser-déposer. L'écran n'a pas de raccourci clavier propre ; `Ctrl+S` / `Cmd+S` n'est pas intercepté.
- Le focus n'est jamais perdu : placements définis aux § 6.3 (pièces), § 6.6 (exemples), § 7 (états), § 8.5 (rechargement), § 8.7 (départ). Si l'élément prévu n'existe plus, le focus va sur `<main>`.

### 11.2 Libellés et descriptions

- Chaque champ a un `<label>` visible relié ; les unités sont dans le libellé (`(m)`, `(m²)`, `(°)`, `(%)`). Aides et erreurs reliées par `aria-describedby`.
- WCAG 2.5.3 : le nom accessible de chaque contrôle contient son texte visible et en commence (cellules du tableau, `Utiliser cet exemple : {titre}`). Le bouton de suppression montre un symbole (`×`), son nom est descriptif. Aucun texte visible n'est placé dans un contrôle sans faire partie de son nom ; le lien d'exemples et `Ajouter une pièce` ont pour nom leur texte.
- Aucune aide en `placeholder` : le seul texte indicatif est `—` (surface mini), doublé par l'en-tête et sans information propre.
- Titres : `<h1>` `Décrire le bâtiment` (ou `Projet introuvable`) ; `<h2>` pour chaque carte (celui de la carte Description masqué visuellement), pour les titres d'état et de dialogue ; `<h3>` pour les exemples.

### 11.3 Dialogues

Règles de `projects.md` § 9.2 (`role="dialog"` ou `role="alertdialog"`, `aria-modal`, focus confiné, page inerte, `Échap` sauf pendant un appel, retour du focus). Focus initial : création → champ ; exemples → premier `Utiliser cet exemple` ; confirmations → `Annuler` ou `Rester sur la page`. Les dialogues de confirmation portent `aria-describedby` vers leur texte.

### 11.4 Annonces

- Une région `role="status"` masquée visuellement, toujours présente, reçoit les annonces ; un nouveau texte remplace le précédent. Annonces :
  - à l'entrée dans un état de la barre : `Modifications enregistrées.` (Enregistré ; au plus une fois toutes les 30 s pendant une saisie continue) et les textes complets des états Échec, Hors ligne, En attente et À corriger (sans le signe) ; pas d'annonce pour `Modifications non enregistrées` ni `Enregistrement…` (trop fréquents) ;
  - `Ligne {n} supprimée.` ; `Exemple inséré dans la description.` ; `Dernière version du projet chargée.` ; `Projet « {nom} » créé. Il figure dans « Mes projets ».` ;
  - `Limite de 2 000 caractères dépassée.`, une fois à chaque passage au-dessus de la limite ;
  - le texte du signalement de zone constructible vide, à son apparition.
- Rafraîchissement de `il y a {n} s` : jamais annoncé.
- L'alerte de conflit et l'erreur de chargement sont des `role="alert"` ; les erreurs de champ ne sont pas des régions vivantes (le passage à l'état « À corriger » est annoncé).

### 11.5 Contrastes

Rapports WCAG 2.1 calculés sur les jetons de `globals.css` (à confirmer par axe-core en S3-5 ; à recalculer si les couleurs de la maquette diffèrent) :

- Textes et contrôles : ceux de `projects.md` § 9.5 (`ink` 16,6:1 sur `surface`, `ink` à 70 % 6,1:1 sur `surface` et 5,8:1 sur `paper`, blanc sur `primary` 9,3:1, `danger` 6,5:1 sur `surface`).
- Puce active : blanc sur `primary` 9,3:1 ; écart entre puce active et inactive : `primary` contre `surface` 9,3:1.
- Étape indisponible : `ink` à 70 % sur `paper` 5,8:1.
- Aperçu : cotes en `dim` sur `paper` 5,7:1 ; libellés en `ink` à 70 % sur `surface` 6,1:1 et sur le fond de la zone (`primary` à 8 % sur `surface`) environ 5,8:1 ; contour de la zone en `primary` sur `surface` 9,3:1 ; parcelle et symbole du nord en `ink`.
- Signalement de zone vide : texte `ink` sur `surface` ; le signe et la bordure en `warn` (3,3:1 sur `surface`) sont des éléments graphiques, au-dessus du seuil de 3:1.
- Barre d'état : texte `ink` à 70 % ou `danger` sur `surface`.
- Aucun texte en `accent`, `warn`, `line`, ni en `ink` sous 70 %. Aucune information par la couleur seule : erreurs écrites, signes `⚠`, puces actives pleines, étape indisponible décrite.
- Point ouvert hérité (`projects.md` § 12.4) : la bordure `line` des champs, des listes et des puces inactives (1,5:1 sur `surface`) reste sous le seuil de 3:1 du critère 1.4.11. Non corrigé ici (nouveau jeton, arbitrage des fondations).

### 11.6 Autres règles

- Cibles : 40 px de haut pour les contrôles ; puces 28 px de haut ; bouton de suppression 32 × 32 ; lien d'exemples 24 px au moins ; tous au-dessus de 24 × 24 (WCAG 2.5.8).
- Animations sous `motion-safe` seulement, 150 ms au plus.
- `lang="fr"` déjà posé. Zoom 200 % et largeur 320 px sans perte (§ 12).

## 12. Comportement responsive

La maquette n'existe qu'en 1 440 px ; règles de l'équipe, cohérentes avec `projects.md` § 10.

- Marges du contenu : 48 px à partir de 1 024 px, 24 px de 640 à 1 023 px, 16 px sous 640 px.
- Barre supérieure : comme « Mes projets » (bouton carré `+` sous 640 px), sauf la navigation, **visible à toutes les largeurs** sur cet écran (c'est le chemin de retour vers la liste) ; sous 640 px, espacements de la barre réduits à 16 px.
- En-tête de page : étapes à droite du titre à partir de 1 024 px ; en dessous, à 16 px de la phrase, sous 1 024 px ; traits de liaison réduits à 24 px sous 640 px.
- Colonnes : deux colonnes (gauche fluide, droite 420 px, gouttière 24) à partir de 1 280 px ; une seule colonne en dessous, dans l'ordre Description, Paramètres, Terrain.
- Rangées de champs : à partir de 1 280 px, celles de la maquette (paramètres sur trois colonnes ; terrain sur deux, reculs sur trois colonnes de 112,67 px, les libellés passant à la ligne si besoin et les champs restant alignés en bas). De 640 à 1 279 px (une seule colonne de cartes), mêmes rangées, à largeur fluide. Sous 640 px, un champ par ligne.
- Tableau des pièces : largeur minimale 420 px ; en dessous, il défile horizontalement dans son conteneur (exception des tableaux, WCAG 1.4.10) ; le bouton d'ajout reste hors du défilement.
- Aperçu : rapport 37:20, largeur maximale 480 px, centré.
- Barre d'état : collante si la fenêtre a au moins 600 px de haut (§ 8.2) ; texte et action passent sur deux lignes si nécessaire.
- Dialogues : comme `projects.md` § 10 ; dialogue d'exemples 640 px au plus.

## 13. Points dépendant d'une décision

Les décisions D15 à D30 sont tranchées (18 novembre 2026) selon les hypothèses du plan. Effets sur l'écran, et ce qu'un changement modifierait :

- **D15** : accès par « Mes projets » uniquement (carte ou création), aucune route `/projets/nouveau` ; `Nouveau projet` de la barre ouvre le dialogue de création (§ 4.1). Voir `projects.md`.
- **D16** : `ETag` / `If-Match`, conflit 412 (§ 8.5). Sans `If-Match`, le § 8.5 disparaîtrait.
- **D17** : validation locale par les schémas de `domain` (§ 9). Sans elle, l'écran enverrait tout et n'afficherait que les 422.
- **D18** : énumération propre des types de pièce, doublons refusés (§ 6.3).
- **D19** : garage paramètre distinct (§ 6.2, liste `Garage`).
- **D20** : saisie du rectangle seul ; polygone affiché en lecture (§ 6.4).
- **D21** : `Voie d'accès`, `Orientation du nord`, `Pente`, `Direction de la pente` ajoutés (§ 6.4), à reporter dans la maquette.
- **D22** : bornes ; l'écran n'en code aucune (elles viennent des schémas et de `PROJECT_INPUT_LIMITS`).
- **D24** : carte d'interprétation, boutons `6:269`, `6:276`, `6:279` masqués (§ 3.1).
- **D25**, **D29** : sans effet visible, sinon le rythme d'envoi du § 8.1.
- **D28** : zone constructible vide enregistrée et signalée (§ 6.4).
- **D30** : trois exemples statiques (§ 6.6).

## 14. Écarts, limites et besoins hors périmètre

### 14.1 Écarts maquette / périmètre du sprint

1. Carte « Ce que le moteur a compris » (`6:181`), son étiquette, ses lignes, sa précision et ses deux boutons : masqués (D24, interprétation CU-05 et EF-205 hors périmètre).
2. Bouton du terrain `6:269` : masqué (import EF-203 supposé, hors périmètre).
3. Boutons du pied `6:276`, `6:279` : masqués (enregistrement manuel sans objet ; génération hors périmètre).
4. Étape « Génération » : affichée mais indisponible.
5. La maquette est intitulée « Nouveau projet » et suppose une page de création ; l'écran est celui d'un projet existant (D15), sa navigation `Nouveau projet` devient le bouton de création.

### 14.2 Écarts de présentation

1. Navigation « Nouveau projet » (`6:41`) remplacée par le bouton principal de la barre de « Mes projets ».
2. Champs ajoutés : `Couverture`, `Surface mini du garage (m²)` (EF-201) ; `Voie d'accès`, `Orientation du nord (°)`, `Pente (%)`, `Direction de la pente (°)` (D21), avec leurs aides. À dessiner dans la maquette.
3. Phrase d'aide de la carte Paramètres, légende de l'aperçu, texte « Aucune pièce indiquée », signalement de zone vide : ajoutés.
4. Barre d'état collante au lieu d'un pied de page dans le flux : la page mesure 1 313 px à 1 440 px de large et l'état doit rester visible pendant la saisie. À valider.
5. Aperçu à l'échelle exacte (la maquette ne l'est pas) ; cotes avec virgule (`30,00` au lieu de `30.00`) ; voie d'accès en bas par défaut (arête 0), alors que la maquette la montre en haut.
6. Valeurs de la maquette (description, paramètres, pièces) non préremplies.
7. `il y a {n} s` arrondi à la dizaine (§ 8.3).
8. Couleurs, polices, rayons, ombres, traits de l'aperçu : non relevés, fondations v0.1 et conventions de l'équipe.
9. Comportement sous 1 440 px : non dessiné, défini au § 12.
10. Symbole du nord (`6:236`) : le triangle plein 20 × 20 de la maquette est remplacé par une aiguille à moitié pleine et moitié vide, avec la lettre `N` maintenue droite au-delà de la pointe (§ 6.5, recette A18). Justification : une fois tourné, le triangle presque équilatéral ne désigne pas une direction sans ambiguïté. Le cadre validé `6:30` n'est pas modifié ; le nouveau symbole est à dessiner dans un cadre de la page « 02 · Brouillons » (non fait dans cette mise à jour) puis à faire valider par le porteur du projet.

### 14.3 Libellés à confirmer sur la maquette

`6:71` `Nom du projet` ; `6:88` `Type de bâtiment` (valeur `Maison individuelle`) ; `6:96`, `6:99`, `6:102` `Plain-pied`, `R+1`, `R+2` ; `6:105` `Surface habitable cible (m²)` ; `6:111`, `6:116`, `6:121` `Toiture`, `Garage`, `Orientation du séjour` (ordre compris) ; `6:178` `Ajouter une pièce` ; `6:243`, `6:248` `Largeur (m)`, `Profondeur (m)` ; `6:254`, `6:259`, `6:264` `Recul avant (m)`, `Recul latéral (m)`, `Recul arrière (m)` ; `6:269`, `6:276`, `6:279`, `6:221`, `6:224`, `6:185` (masqués, libellés inconnus ; s'ils révélaient une action dans le périmètre, l'écran serait à compléter).

### 14.4 Limites assumées

- Session expirée en cours de saisie : les modifications des dernières secondes sont perdues (redirection immédiate, § 7.4).
- Précédent et Suivant du navigateur non interceptés : une navigation par l'historique peut perdre les modifications des dernières secondes ou une saisie invalide.
- Pente non dessinée dans l'aperçu.
- Aucun brouillon local ni édition hors ligne (plan § 7).
- Retour à « Mes projets » : le focus n'est pas replacé sur la carte du projet quitté.

### 14.5 Besoins repérés hors périmètre de S3-1

- Rôle designer (`.claude/agents/designer.md`) : aligné sur la maquette Figma pendant le sprint 3, à la demande du porteur du projet (soldé).
- Bordure des champs sous 3:1 (§ 11.5) : nouveau jeton à arbitrer.
- Dossier de composants partagés (`TextField`, `Dialog`, styles) utilisés par plusieurs écrans : à déplacer quand `packages/ui` sera ouvert.
- Message « session expirée » sur `/connexion` après une redirection en cours d'utilisation (déjà relevé au sprint 2).
- Validation par le porteur du projet des champs ajoutés (D21) et des états d'enregistrement, puis report dans la maquette.
