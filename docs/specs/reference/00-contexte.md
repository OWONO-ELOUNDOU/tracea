# Tracea — Contexte du projet

## Produit

**Tracea** est une application web qui génère, à partir d'une description en langage naturel, les plans architecturaux **2D et 3D** d'une structure (maison, immeuble, bâtiment commercial, extension, etc.) et permet de les **exporter dans les formats officiels** attendus par les professionnels du bâtiment.

## Proposition de valeur

- Passer d'une idée décrite en quelques phrases (« maison plain-pied de 120 m², 3 chambres, garage double, orientation sud ») à un jeu de plans cohérents, cotés et exploitables.
- Produire des livrables conformes aux usages du métier, pas de simples images : plans de masse, plans de niveaux, coupes, façades, maquette 3D.
- Permettre l'itération : modifier la description ou éditer le plan, puis régénérer sans repartir de zéro.

## Utilisateurs cibles

1. **Particuliers / auto-constructeurs** — veulent visualiser et pré-dimensionner un projet avant de consulter un professionnel.
2. **Architectes, dessinateurs, bureaux d'études** — veulent un gain de temps sur l'esquisse et l'avant-projet sommaire (APS), avec export vers leurs outils (AutoCAD, Revit, ArchiCAD, SketchUp).
3. **Promoteurs, agences immobilières, constructeurs de maisons individuelles** — veulent produire rapidement des variantes présentables à un client.

## Périmètre fonctionnel (vision cible)

| Domaine          | Fonctionnalités                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Saisie           | Description textuelle ; paramètres structurés (surface, niveaux, pièces, contraintes du terrain, style) ; import d'un terrain / cadastre |
| Génération 2D    | Plan de masse, plans de niveaux, coupes, façades, cotation automatique, nomenclature des pièces et surfaces                              |
| Génération 3D    | Maquette volumétrique, vue extérieure, visite intérieure, rendu simple                                                                   |
| Édition          | Déplacement de murs/ouvertures, redimensionnement, régénération partielle, historique des versions                                       |
| Vérification     | Contrôles de cohérence (circulation, surfaces minimales, ouvertures, accessibilité PMR) et avertissements réglementaires indicatifs      |
| Export 2D        | **DXF**, **DWG** (si faisable via bibliothèque), **PDF** (A3/A1 avec cartouche), **SVG**, **PNG**                                        |
| Export 3D        | **IFC** (BIM, priorité), **glTF/GLB**, **OBJ**, **SKP** si faisable                                                                      |
| Compte & projets | Authentification, espace projets, partage par lien, rôles (propriétaire / lecteur)                                                       |

## Formats et normes de référence

- Dessin technique : conventions de représentation du bâtiment (épaisseurs de traits, hachures, symboles portes/fenêtres), échelles usuelles 1/50, 1/100, 1/200, 1/500.
- Cartouche normalisé sur chaque planche exportée (nom du projet, échelle, date, indice de révision, numéro de planche).
- Unités : système métrique, **millimètres en interne**, affichage en mètres/centimètres.
- Interopérabilité BIM : IFC 2x3 ou IFC4 pour la 3D ; DXF R2010+ pour la 2D.

## Outils et organisation du projet

- **Design UI/UX** : maquettes « Tracea — Maquettes v0.1 » (fichier Figma) ; les écrans font foi pour l'interface.
- **Réalisation** : workflow multi-rôles (planificateur, designer, frontend, backend, QA, sécurité, DevOps, réviseur technique) défini dans `.claude/agents/` et `CLAUDE.md`.
- **Langue de travail** : français pour les échanges, la documentation et l'interface ; anglais pour le code (noms de variables, fonctions, commits, commentaires techniques).

## Stack technique

- **Frontend** : Next.js + React + TypeScript, Tailwind CSS ; rendu 2D en SVG ; rendu 3D avec Three.js (react-three-fiber).
- **Backend** : API Fastify en Node.js/TypeScript ; file de tâches pour les générations longues.
- **Moteur de génération** : pipeline description → modèle sémantique du bâtiment (JSON interne : niveaux, pièces, murs, ouvertures) → résolution géométrique → rendus 2D/3D → exports. Le modèle interne est la **source de vérité unique** ; tous les exports en dérivent.
- **Exports** : `ezdxf` pour DXF ; `IfcOpenShell` pour IFC ; génération PDF vectorielle ; glTF via Three.js ou `pygltflib`.
- **Données** : PostgreSQL (projets, utilisateurs, versions) ; stockage objet pour les fichiers exportés.
- **Infra** : conteneurs Docker, CI/CD, environnements dev / staging / prod.

## Glossaire minimal

- **APS / APD** : avant-projet sommaire / définitif.
- **Plan de masse** : implantation du bâtiment sur le terrain.
- **Coupe** : vue verticale à travers le bâtiment.
- **Façade / élévation** : vue extérieure verticale.
- **Emprise au sol** : projection verticale du volume bâti.
- **Surface habitable** : somme des surfaces de plancher des pièces, hors murs, cloisons, combles non aménagés, etc.
- **IFC** : format d'échange BIM ouvert.
- **DXF / DWG** : formats de dessin 2D (ouvert / propriétaire Autodesk).
- **Cartouche** : bloc d'identification d'une planche de plan.
