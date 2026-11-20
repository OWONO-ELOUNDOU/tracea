# Tracea — Spécification du modèle du bâtiment et des exports

| Champ          | Valeur                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| Version        | 1.0 (schéma `BuildingModel` 1.0)                                                             |
| Date           | 13 novembre 2026                                                                             |
| Statut         | Proposition                                                                                  |
| Documents liés | Cahier des charges · Dossier d'architecture technique · Spécification API et plan de qualité |

---

## 1. Principes du modèle `BuildingModel`

1. **Source de vérité unique** : tout rendu et tout export dérive du modèle ; l'éditeur modifie le modèle, jamais un rendu.
2. **Unités** : millimètres entiers pour toutes les longueurs, degrés décimaux pour les angles, millimètres carrés pour les surfaces calculées (affichage en m² à deux décimales).
3. **Repère** : origine au coin sud-ouest de la zone constructible, axe X vers l'est, axe Y vers le nord, Z vers le haut. L'orientation du nord par rapport à la parcelle est portée par `site.northAngle`.
4. **Identifiants** : chaque élément porte un `id` (ULID) stable entre versions pour permettre le suivi des modifications et le verrouillage (`locked`).
5. **Topologie explicite** : les pièces référencent leurs murs, les ouvertures référencent leur mur hôte ; la géométrie dérivée (polygones des pièces, surfaces) est recalculable à partir des murs et stockée pour l'affichage.
6. **Versionnage** : `schemaVersion` sémantique ; une migration est fournie à chaque changement majeur.

---

## 2. Structure du schéma (JSON Schema, extrait commenté)

```jsonc
{
  "schemaVersion": "1.0",
  "id": "01JCX…",                          // identifiant du modèle (= version)
  "project": { "name": "Maison Dupont", "revision": "A", "author": "…" },
  "site": {
    "boundary": [[0,0],[20000,0],[20000,30000],[0,30000]],   // polygone fermé implicite, mm
    "northAngle": 0,                       // angle du nord par rapport à +Y, degrés, sens horaire
    "setbacks": { "front": 5000, "side": 3000, "rear": 4000 },
    "accessEdgeIndex": 0,                  // arête de la parcelle donnant sur la voie
    "slope": { "direction": 0, "percent": 0 },
    "groundLevel": 0                       // altitude du terrain naturel de référence, mm
  },
  "levels": [
    {
      "id": "lvl_0", "name": "Rez-de-chaussée", "index": 0,
      "elevation": 0,                      // niveau fini du plancher, mm
      "height": 2700,                      // hauteur sous plafond
      "slabThickness": 200
    }
  ],
  "walls": [
    {
      "id": "w_01", "levelId": "lvl_0",
      "start": [0,0], "end": [12000,0],    // axe du mur, mm
      "thickness": 300,
      "kind": "exterior" | "loadBearing" | "partition",
      "height": 2700,                      // par défaut = hauteur du niveau
      "locked": false
    }
  ],
  "openings": [
    {
      "id": "o_01", "wallId": "w_01",
      "type": "door" | "window" | "frenchWindow" | "garageDoor" | "opening",
      "offset": 1200,                      // distance depuis start du mur jusqu'au bord gauche
      "width": 900, "height": 2100, "sillHeight": 0,
      "swing": { "side": "left" | "right", "direction": "in" | "out" } | null,
      "locked": false
    }
  ],
  "rooms": [
    {
      "id": "r_01", "levelId": "lvl_0",
      "name": "Séjour", "type": "living",  // énumération : living, kitchen, bedroom, bathroom, wc,
                                           // hall, corridor, office, laundry, storage, garage, technical
      "wallIds": ["w_01","w_02","w_05","w_07"],
      "polygon": [[150,150],[…]],          // dérivé, intérieur fini
      "area": 32450000,                    // dérivé, mm²
      "habitable": true,
      "locked": false
    }
  ],
  "stairs": [
    { "id": "s_01", "fromLevelId": "lvl_0", "toLevelId": "lvl_1",
      "footprint": [[…]], "type": "straight" | "quarterTurn" | "halfTurn" | "spiral",
      "upDirection": 90, "riserHeight": 170, "treadDepth": 280 }
  ],
  "roof": {
    "type": "flat" | "gable" | "hip" | "shed",
    "pitch": 35,                           // degrés
    "overhang": 400,
    "ridgeDirection": 0 | 90 | null,
    "material": "tile"
  },
  "slabs": [ { "id": "sl_0", "levelId": "lvl_0", "polygon": [[…]], "thickness": 200 } ],
  "annotations": {
    "dimensions": [ { "id": "d_01", "levelId": "lvl_0", "kind": "exterior" | "interior",
                      "points": [[0,0],[12000,0]], "offset": 1500 } ],
    "sectionLines": [ { "id": "sec_A", "name": "AA", "start": [-1000,6000], "end": [13000,6000], "lookDirection": 90 } ],
    "labels": []
  },
  "checks": [
    { "code": "ROOM_TOO_SMALL", "severity": "warning" | "error" | "info",
      "message": "La chambre 3 fait 8,2 m², en dessous des 9 m² recommandés.",
      "targetIds": ["r_05"], "levelId": "lvl_0" }
  ],
  "metrics": {
    "habitableArea": 118600000, "floorArea": 132000000, "footprintArea": 140000000,
    "siteCoverageRatio": 0.233
  },
  "generation": { "seed": 42, "engineVersion": "0.3.0", "programHash": "…" }
}
```

### 2.1 Invariants (vérifiés par `domain`, en TypeScript et en Python)

- Chaque `levelId` référencé existe ; les niveaux ont des `index` consécutifs.
- Un mur a une longueur ≥ 300 mm et une épaisseur comprise entre 70 et 600 mm.
- `offset + width ≤ longueur du mur` pour toute ouverture ; une fenêtre a `sillHeight ≥ 0` ; une porte a `sillHeight = 0`.
- Deux ouvertures d'un même mur ne se chevauchent pas.
- Chaque pièce est un polygone simple, fermé par les murs référencés ; les polygones des pièces d'un même niveau ne se chevauchent pas.
- Toute pièce habitable est accessible depuis une circulation ou une autre pièce par au moins une porte (sauf `storage` et `technical`).
- Chaque niveau au-dessus du premier est relié par au moins un escalier.
- `metrics` est recalculable : un test recalcule et compare à ± 1 mm².

### 2.2 Verrouillage et régénération partielle

`locked: true` sur un mur, une ouverture ou une pièce signifie « conservé tel quel ». Le solveur traite les éléments verrouillés comme des contraintes dures. Si le nouveau programme les rend insatisfiables, la génération échoue avec `LOCKED_CONFLICT` et la liste des éléments en cause ; l'interface propose de les déverrouiller.

### 2.3 Programme (sortie de l'interprétation, entrée du solveur)

```jsonc
{
  "buildingType": "house",
  "levelsCount": 1,
  "targetHabitableArea": 120000000,
  "rooms": [
    {
      "type": "living",
      "count": 1,
      "minArea": 30000000,
      "orientation": ["S", "SW"],
      "openTo": ["kitchen"],
    },
    { "type": "bedroom", "count": 3, "minArea": 10000000 },
    { "type": "bathroom", "count": 1 },
    { "type": "wc", "count": 1 },
    { "type": "garage", "count": 1, "minArea": 36000000, "attached": true, "habitable": false },
  ],
  "roof": { "type": "gable" },
  "constraints": [{ "kind": "adjacency", "a": "kitchen", "b": "living", "weight": 1.0 }],
  "ambiguities": [], // non vide → demande de clarification avant génération
}
```

### 2.4 Entrées du projet : paramètres et terrain

Les paramètres structurés (EF-201) et le terrain (EF-202) saisis par l'utilisateur sont des **entrées** du moteur Tracea, pas une représentation du bâtiment. Ils sont décrits par `ProjectParametersSchema` et `ProjectSiteSchema` (`packages/domain/src/project-input.ts`), distincts de `BuildingModel`, qui n'en dépend pas et n'est pas modifié. Ils sont stockés dans les colonnes `projects.parameters` et `projects.site`, sans numéro de version : leurs évolutions restent additives, tout resserrement passe par une migration des données.

Conventions : longueurs en millimètres entiers, surfaces en mm² entiers, angles en degrés décimaux ; objets stricts (clé inconnue refusée) ; `null` refusé à l'intérieur des objets. Les messages de validation sont en français et expriment les valeurs dans l'unité affichée (m, m²). Les JSON Schema (forme d'entrée, clés à valeur par défaut facultatives) sont exportés dans `packages/domain/schema/project-parameters.schema.json` et `project-site.schema.json` ; les règles qui portent sur plusieurs champs (type de pièce unique, polygone simple, surface minimale, arête d'accès) n'y figurent pas et restent vérifiées par Zod. Les fixtures vivent dans `packages/domain/fixtures/project-input/valid/` et `invalid/` (préfixe `parameters-` ou `site-`). Le miroir Pydantic est différé à CU-05 (D23).

```jsonc
// ProjectParameters : chaque clé est facultative ; absente = « non renseigné », le moteur s'appuie
// alors sur la description. {} est valide.
{
  "buildingType": "house",                 // seule valeur au MVP
  "levelsCount": 1,                        // 1 à 3
  "targetHabitableArea": 120000000,        // mm², 20 à 500 m²
  "rooms": [                               // 0 à 10 lignes, un même type au plus une fois
    { "type": "livingKitchen", "count": 1, "minArea": 40000000 },  // count 1 à 10 ; minArea 1 à 200 m², facultative
    { "type": "bedroom", "count": 3, "minArea": 10000000 },
    { "type": "bathroom", "count": 1 }
  ],
  "garage": { "kind": "attached", "spaces": 2, "minArea": 36000000 },  // ou { "kind": "none" } ; spaces 1 à 3 ; minArea 10 à 100 m²
  "roof": { "type": "gable", "covering": "tile" },  // flat | gable | hip ; tile | slate | metal | membrane
  "livingOrientation": "S"                 // N, NE, E, SE, S, SW, W, NW
}

// ProjectSite : boundary requis, autres clés complétées par leur valeur par défaut ;
// la forme stockée est toujours complète.
{
  "boundary": { "kind": "rectangle", "width": 20000, "depth": 30000 },  // mm, 5 à 500 m
  // ou { "kind": "polygon", "points": [[x, y], …] } : 3 à 64 points, coordonnées 0 à 1 000 m,
  // polygone simple d'au moins 25 m², fermeture implicite, sens libre
  "northAngle": 0,                         // [0, 360[, défaut 0, même sens que BuildingModel.site.northAngle
  "accessEdgeIndex": 0,                    // arête donnant sur la voie, 0 à n − 1 (0 à 3 pour un rectangle), défaut 0
  "setbacks": { "front": 5000, "side": 3000, "rear": 4000 },  // mm, 0 à 50 m, défaut 0
  "slope": { "direction": 0, "percent": 0 }  // direction de la descente [0, 360[, pente 0 à 30 %, défaut 0
}
```

**Repère de saisie du rectangle.** Sommets `(0,0)`, `(width,0)`, `(width,depth)`, `(0,depth)` ; l'arête `i` va du sommet `i` au sommet `i+1`. Le recul avant s'applique à l'arête d'accès, le recul arrière à l'arête opposée, le recul latéral aux deux autres. `siteBoundaryPolygon(site)` rend ce contour et `buildableZone(site)` la zone constructible d'un rectangle (`null` si elle est vide ou si la parcelle est un polygone, D20). Une zone vide est enregistrée et signalée à l'écran ; la génération la refusera (`SITE_TOO_SMALL`, D28). Cet aperçu n'est pas un plan de masse : le plan de masse dérive de `BuildingModel`.

**Correspondance avec le programme (§ 2.3) et `BuildingModel`.** Elle est appliquée par le moteur au moment de la génération (CU-05) ; les entrées ne sont jamais recopiées telles quelles dans le modèle.

| Entrée                                      | Programme (§ 2.3) et `BuildingModel`                                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rooms[].type` (10 valeurs, D18)            | Même nom que `RoomType` pour `living`, `kitchen`, `bedroom`, `bathroom`, `wc`, `office`, `laundry`, `storage`, `technical`                                                  |
| `livingKitchen`                             | Séjour-cuisine ouvert : une pièce `living` du programme avec `openTo: ["kitchen"]` et la cuisine ouverte sur le séjour ; dans le modèle, pièces `living` et `kitchen`       |
| `hall`, `corridor`                          | Absents des entrées : les circulations sont produites par le moteur                                                                                                         |
| `garage` (paramètre distinct, D19)          | `{ kind: "attached" \| "detached" }` → ligne `{ "type": "garage", "count": 1, "minArea", "attached": kind === "attached", "habitable": false }` ; `spaces` guide la surface |
| `garage: { kind: "none" }`                  | Aucune pièce `garage` ; clé absente = le moteur suit la description                                                                                                         |
| `roof.type`                                 | `BuildingModel.roof.type` ; `shed` (monopente) existe dans le modèle mais n'est pas proposé à la saisie (EF-201)                                                            |
| `roof.covering`                             | `BuildingModel.roof.material` (`tile`, `slate`, `metal`, `membrane`)                                                                                                        |
| `livingOrientation`                         | `orientation` de la ligne `living` du programme                                                                                                                             |
| `boundary`                                  | `BuildingModel.site.boundary`, ramené au repère du modèle (origine au coin sud-ouest de la zone constructible, § 1)                                                         |
| `northAngle`, `accessEdgeIndex`, `setbacks` | Champs homonymes de `BuildingModel.site`                                                                                                                                    |
| `slope`                                     | `BuildingModel.site.slope` (bornes plus larges dans le modèle : pente jusqu'à 100 %)                                                                                        |
| (aucune)                                    | `BuildingModel.site.groundLevel` n'est pas une entrée : le moteur le fixe à la génération                                                                                   |

---

## 3. Conventions de représentation 2D

### 3.1 Calques (communs SVG, DXF, PDF)

| Calque         | Contenu                                          | Couleur (ACI / hex) | Épaisseur de trait (mm papier) | Type de ligne                                 |
| -------------- | ------------------------------------------------ | ------------------- | ------------------------------ | --------------------------------------------- |
| `A-WALL-EXT`   | murs extérieurs coupés                           | 7 / `#000000`       | 0,50                           | continu                                       |
| `A-WALL-INT`   | murs porteurs intérieurs                         | 7 / `#000000`       | 0,35                           | continu                                       |
| `A-WALL-PART`  | cloisons                                         | 8 / `#4D4D4D`       | 0,25                           | continu                                       |
| `A-WALL-HATCH` | hachures des murs coupés                         | 8                   | 0,13                           | continu (motif ANSI31 / solide pour porteurs) |
| `A-DOOR`       | portes et battements                             | 3 / `#008000`       | 0,25                           | continu                                       |
| `A-WINDOW`     | fenêtres (double trait + appui)                  | 4 / `#00A0A0`       | 0,25                           | continu                                       |
| `A-STAIR`      | escaliers, flèche de montée, ligne de foulée     | 7                   | 0,25                           | continu                                       |
| `A-ROOM-NAME`  | nom et surface des pièces                        | 7                   | texte 2,5 mm                   | —                                             |
| `A-DIMS`       | cotes                                            | 1 / `#C00000`       | 0,18                           | continu                                       |
| `A-ANNO`       | annotations, repères de coupe, nord              | 7                   | 0,18                           | continu                                       |
| `A-ROOF`       | toiture (vue de dessus, plan de masse)           | 9 / `#808080`       | 0,25                           | continu                                       |
| `A-ABOVE`      | éléments au-dessus du plan de coupe (projection) | 9                   | 0,13                           | tireté                                        |
| `S-SITE`       | limites de parcelle                              | 7                   | 0,35                           | mixte                                         |
| `S-SETBACK`    | reculs                                           | 1                   | 0,13                           | tireté                                        |
| `S-ACCESS`     | accès, voirie                                    | 8                   | 0,25                           | continu                                       |
| `T-SHEET`      | cadre de planche, cartouche                      | 7                   | 0,50 / 0,18                    | continu                                       |

Les épaisseurs sont exprimées en millimètres papier ; le rendu écran et SVG applique `stroke-width = épaisseur × facteur d'échelle d'affichage`.

### 3.2 Hauteur du plan de coupe

1 000 mm au-dessus du niveau fini. Les éléments au-dessus (poutres, toiture, mezzanines) sont projetés en tireté sur `A-ABOVE`.

### 3.3 Symboles

- **Porte** : vantail à 90° avec arc de débattement ; sens et côté d'ouverture issus de `swing`.
- **Fenêtre** : deux traits parallèles dans l'épaisseur du mur + trait d'allège ; porte-fenêtre sans trait d'allège.
- **Escalier** : marches, ligne de foulée avec flèche « montée », numérotation de la première et dernière marche.
- **Nord** : flèche normalisée en haut à droite du plan de masse et de chaque plan de niveau.
- **Repères de coupe** : lettres (AA, BB) avec flèches de regard.

### 3.4 Cotation

- Cotes extérieures : trois chaînes par façade (ouvertures, trumeaux/ouvertures cumulés, hors-tout), offsets 1 000 / 1 700 / 2 400 mm papier-équivalent.
- Cotes intérieures : dimensions de chaque pièce (longueur × largeur) sur une ligne de cote intérieure ou dans l'étiquette.
- Texte : hauteur 2,5 mm papier, police sans empattement, valeurs en mètres à deux décimales (`4.20`) sur les plans, en centimètres sur les détails.
- Niveaux : symbole de niveau avec valeur en mètres (`+0.00`, `+2.90`).

### 3.5 Étiquette de pièce

```
SÉJOUR
32,45 m²
```

Centrée dans le polygone (point de pôle d'inaccessibilité, pas le centroïde, pour les pièces en L).

### 3.6 Planches et cartouche

| Format | Dimensions (mm) | Marges | Usage                                 |
| ------ | --------------- | ------ | ------------------------------------- |
| A4     | 210 × 297       | 10     | plan de niveau 1/100 petite maison    |
| A3     | 420 × 297       | 10     | plans de niveau 1/50 – 1/100, façades |
| A2     | 594 × 420       | 10     | dossier maison complète               |
| A1     | 841 × 594       | 10     | collectif                             |

Cartouche en bas à droite (180 × 60 mm) : logo/nom Tracea, nom du projet, maître d'ouvrage, titre de la planche, échelle, date, indice de révision, numéro de planche (`PL-01/06`), auteur. Mention de pied : « Document d'esquisse — ne vaut pas plan d'exécution ».

Échelle choisie automatiquement : la plus grande échelle normalisée (1/50, 1/100, 1/200, 1/500) telle que la vue tienne dans la zone utile ; l'utilisateur peut la forcer.

---

## 4. Exports 2D

### 4.1 DXF

- Bibliothèque : `ezdxf` (licence MIT). Version de fichier **AC1024 (R2010)** par défaut, option R2018.
- `$INSUNITS = 4` (millimètres), `$MEASUREMENT = 1`, `$LTSCALE = 1`.
- Espace objet en vraies dimensions ; **un espace papier (layout) par planche** avec fenêtre (`VIEWPORT`) à l'échelle et cartouche en bloc.
- Entités : `LWPOLYLINE` pour murs (contours fermés), `HATCH` pour les hachures (motif `ANSI31` échelle 25 pour la maçonnerie, `SOLID` pour le béton), `INSERT` de blocs pour portes/fenêtres (`TRACEA_DOOR_90`, `TRACEA_WINDOW`, paramétrés par échelle X/Y), `DIMENSION` aligné avec style `TRACEA_DIM` (texte 2,5, flèches obliques), `MTEXT` pour les étiquettes, `TEXT` dans le cartouche.
- Styles de texte : `TRACEA_TXT` (police `isocp`/Arial de repli).
- Calques créés selon § 3.1 avec couleur et épaisseur (`lineweight`).
- Validation : réouverture par `ezdxf.readfile` + `audit()` sans erreur ; comptage des entités par calque ; contrôle de la bounding box.

### 4.2 PDF

- Génération vectorielle (`reportlab` ou `cairo`) à partir des mêmes primitives que le SVG ; pas de rasterisation.
- Dimensions de page exactes ; `MediaBox` conforme ; polices embarquées ; métadonnées (titre, auteur, sujet, mots-clés) ; PDF 1.7, option PDF/A-2b pour archivage.
- Une planche par vue, ou dossier complet : page de garde (récapitulatif, surfaces, index des planches), plan de masse, plans de niveaux, coupes, façades, nomenclature.
- Validation : lecture par `pypdf` (nombre de pages, dimensions), vérification de l'échelle en mesurant la longueur d'un mur de référence dans le flux de dessin.

### 4.3 SVG

- `viewBox` en millimètres réels ; un `<g id="layer-A-WALL-EXT">` par calque ; classes CSS pour les épaisseurs ; `<title>` sur les pièces (accessibilité) ; textes en `<text>` (non vectorisés).
- Le même générateur alimente l'affichage dans l'application et l'export (fichier identique).

### 4.4 PNG

- Rasterisation du SVG côté serveur (`cairosvg` ou `resvg`) ; résolutions 1 920, 3 840 px ou DPI pour un format papier donné ; fond blanc ou transparent.
- Vue 3D : capture hors écran (Three.js headless via `puppeteer` ou rendu `pyrender` côté travailleur) ; résolution ≤ 4 096 px.

---

## 5. Exports 3D et BIM

### 5.1 Maillage de référence

Produit une seule fois par version par le module `rendering/mesh` (Python, `shapely` + `trimesh`) :

- Murs : extrusion des polygones de mur (épaisseur réelle) sur la hauteur du niveau, soustraction des volumes d'ouverture (CSG via `manifold3d`).
- Planchers et dalles : extrusion des polygones de niveau.
- Toiture : squelette droit (`polyskel` ou implémentation interne) → faces inclinées + débords.
- Menuiseries : cadres et vitrages simplifiés (boîtes) ; matériaux : enduit, béton, bois, tuile, vitrage, sol.
- Terrain : plan ou surface inclinée de la parcelle.
- Repère : Y vers le haut pour glTF (conversion depuis le repère interne Z-haut), mètres.

### 5.2 glTF 2.0 / GLB

- `pygltflib` ou export Three.js (`GLTFExporter`) selon l'origine du maillage ; un nœud par élément (`name = id`), hiérarchie `Building > Level > Wall/Slab/Roof/Opening`, matériaux PBR métal/rugosité, extension `KHR_materials_variants` non utilisée en V1.
- Attributs `extras` : `traceaId`, `levelId`, `type`, surfaces.
- Validation : `gltf-validator` (Khronos) sans erreur ; nombre de triangles dans le budget.

### 5.3 OBJ (+ MTL)

- Un groupe `g` par élément, matériaux par `usemtl`, normales incluses, unités mètres, Y haut.

### 5.4 IFC

- Bibliothèque : **IfcOpenShell** (LGPL, utilisée dynamiquement). Schéma **IFC4** par défaut (IFC4 ADD2 TC1), option **IFC2X3** pour les logiciels anciens.
- Arborescence spatiale : `IfcProject` (unités mm → `IfcSIUnit` LENGTHUNIT MILLI METRE, ou mètres selon option) → `IfcSite` (polygone de parcelle en `IfcSite.Representation` « FootPrint ») → `IfcBuilding` → `IfcBuildingStorey` (Elevation = `level.elevation`).
- Éléments :
  | Modèle  | Entité IFC                                                                                                                       | Représentation                                                                          |
  | ------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
  | wall    | `IfcWall` (PredefinedType `STANDARD`/`PARTITIONING`)                                                                             | `SweptSolid` : `IfcExtrudedAreaSolid` du rectangle du mur ; `Axis` : polyligne de l'axe |
  | opening | `IfcOpeningElement` + `IfcRelVoidsElement` ; porte/fenêtre `IfcDoor` / `IfcWindow` + `IfcRelFillsElement`, `OverallHeight/Width` | boîte extrudée                                                                          |
  | slab    | `IfcSlab` (`FLOOR` / `ROOF`)                                                                                                     | extrusion du polygone                                                                   |
  | roof    | `IfcRoof` agrégé (`IfcRelAggregates`) de `IfcSlab` `ROOF` par pan                                                                | extrusion ou `IfcFacetedBrep`                                                           |
  | stair   | `IfcStair` (V1 : volume enveloppe `IfcStairFlight`)                                                                              | brep simplifié                                                                          |
  | room    | `IfcSpace` (`INTERNAL`), `LongName` = nom affiché                                                                                | extrusion du polygone sur la hauteur ; `IfcRelContainedInSpatialStructure` au niveau    |
- Propriétés : `Pset_WallCommon` (IsExternal, LoadBearing), `Pset_SpaceCommon`, `Qto_SpaceBaseQuantities` (NetFloorArea, Height), `Qto_WallBaseQuantities` (Length, Width, Height). Matériaux par `IfcMaterialLayerSet` (une couche en V1).
- Placements : `IfcLocalPlacement` relatifs au niveau ; GUID stables dérivés de l'`id` interne (hash → base64 IFC) pour conserver les identifiants entre versions.
- Validation : réouverture par IfcOpenShell, `ifcopenshell.validate` (schéma + règles), génération de la géométrie par `ifcopenshell.geom` sans exception, contrôle du nombre d'espaces et de la somme des surfaces (± 1 %) ; test manuel périodique dans BIMvision / BlenderBIM / Revit.

### 5.5 DWG et SKP (sous réserve)

- **DWG** : aucune bibliothèque libre d'écriture n'est aujourd'hui jugée suffisamment fiable et compatible en licence pour être promise ; les solutions commerciales (ODA SDK, Autodesk APS) impliquent licence et/ou service distant. Décision : **DXF R2010+ affiché « compatible AutoCAD »** ; étude DWG à réévaluer à chaque jalon, et toute intégration passe par validation juridique.
- **SKP** : le SDK SketchUp est propriétaire ; glTF et OBJ s'importent dans SketchUp. Non prévu.

---

## 6. Matrice de validation des exports (CI)

| Format   | Outil de validation                              | Critères bloquants                                                                 |
| -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| DXF      | `ezdxf` audit, ouverture LibreCAD en test manuel | 0 erreur d'audit, calques présents, unités mm, layouts à l'échelle                 |
| PDF      | `pypdf`, `qpdf --check`, mesure d'échelle        | pages au bon format, échelle exacte ± 0,5 %, polices embarquées                    |
| SVG      | parseur XML strict, `svglint`                    | document valide, calques présents, `viewBox` cohérente                             |
| PNG      | `Pillow`                                         | dimensions demandées, non vide                                                     |
| glTF/GLB | `gltf-validator`                                 | 0 erreur, triangles ≤ budget                                                       |
| OBJ      | `trimesh.load`                                   | maillage étanche par élément, normales                                             |
| IFC      | `ifcopenshell.validate`, `ifcopenshell.geom`     | 0 erreur de schéma, géométrie générée pour 100 % des éléments, surfaces cohérentes |

Chaque format dispose de fixtures : maison plain-pied rectangulaire, maison en L R+1 avec garage, petit collectif R+2 (V2), cas limites (mur oblique, pièce en U, toit 4 pans sur L).
