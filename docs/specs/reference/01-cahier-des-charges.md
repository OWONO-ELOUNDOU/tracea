# Tracea — Cahier des charges

| Champ               | Valeur                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Produit             | Tracea — génération de plans architecturaux 2D/3D à partir d'une description                                                 |
| Version du document | 1.0                                                                                                                          |
| Date                | 13 novembre 2026                                                                                                             |
| Statut              | Proposition — à valider par le porteur du projet                                                                             |
| Documents liés      | Dossier d'architecture technique · Spécification du modèle du bâtiment et des exports · Spécification API et plan de qualité |

---

## 1. Contexte et objectifs

### 1.1 Contexte

La phase d'esquisse d'un projet de construction (particulier qui réfléchit à sa maison, architecte qui prépare un avant-projet sommaire, promoteur qui compare des variantes) repose encore largement sur des outils lourds (AutoCAD, Revit, ArchiCAD) ou sur des croquis non exploitables. Il manque un outil qui transforme rapidement une intention décrite en français en un jeu de plans cohérents, cotés et exportables dans les formats du métier.

### 1.2 Objectif général

Tracea permet, à partir d'une description textuelle et de paramètres structurés, de **générer automatiquement** les plans 2D (plan de masse, plans de niveaux, coupes, façades) et la maquette 3D d'un bâtiment, de les **éditer**, puis de les **exporter** dans des formats professionnels (DXF, PDF, SVG, PNG, IFC, glTF/GLB, OBJ).

### 1.3 Objectifs mesurables (cible V1)

| Indicateur                                                 | Cible                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Délai description → premier jeu de plans affiché           | ≤ 30 s pour une maison individuelle (≤ 250 m², ≤ 3 niveaux)       |
| Taux de générations abouties sans erreur bloquante         | ≥ 90 % sur le jeu de descriptions de référence                    |
| Exports réouverts sans erreur dans un lecteur de référence | 100 % des fichiers DXF, IFC et PDF produits par la suite de tests |
| Écart de surface entre programme demandé et plan généré    | ≤ 5 % sur la surface habitable totale                             |
| Disponibilité de la plateforme                             | ≥ 99,5 % mensuel                                                  |

### 1.4 Positionnement du moteur

Dans toute communication (interface, documentation, marketing), la génération est présentée comme **« le moteur Tracea »** ou **« génération automatique »**. Les technologies internes ne sont pas exposées à l'utilisateur.

---

## 2. Périmètre

### 2.1 Dans le périmètre

- Bâtiments résidentiels : maison individuelle (plain-pied, R+1, R+2), petit collectif (jusqu'à R+4), extension / surélévation.
- Bâtiments tertiaires simples : bureaux en plateau, local commercial en rez-de-chaussée (V2).
- Terrain : parcelle rectangulaire ou polygonale saisie manuellement ou importée (GeoJSON / DXF de géomètre), avec orientation, pente simple, reculs réglementaires.
- Production 2D et 3D, édition, vérifications de cohérence, exports, gestion de compte et de projets, partage.

### 2.2 Hors périmètre (toutes versions)

- Calculs de structure (descente de charges, dimensionnement béton/bois/acier).
- Études thermiques réglementaires (RE2020 ou équivalents), acoustique, études de sol.
- Constitution du dossier de permis de construire (formulaires administratifs) — Tracea fournit les pièces graphiques, pas le dossier.
- Chiffrage détaillé des travaux (un ordre de grandeur indicatif pourra être ajouté en V2+).
- Bâtiments à géométrie complexe (courbes libres, structures tendues, grands ouvrages).
- Export DWG natif et SKP natif tant qu'aucune solution licite et stable n'est validée (voir § 9 Risques).

### 2.3 Versions

| Version        | Contenu                                                                                                                                                                                                  | Horizon indicatif |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **MVP (V0.x)** | Compte, projet, description + paramètres, génération d'une maison individuelle plain-pied ou R+1, plan de niveaux + plan de masse + 3D volumétrique, export PDF/PNG/SVG/DXF/glTF, pas d'édition fine     | Sprints 1 à 6     |
| **V1**         | Coupes et façades, cotation complète, nomenclature des pièces, édition des murs et ouvertures, régénération partielle, historique des versions, export IFC, vérifications de cohérence, partage par lien | Sprints 7 à 14    |
| **V2**         | Petit collectif, tertiaire simple, import cadastre, rendu 3D amélioré et visite intérieure, OBJ, rôles collaboratifs, estimations indicatives                                                            | Après V1          |

---

## 3. Utilisateurs et cas d'usage

### 3.1 Profils

| Profil                                         | Besoin principal                                                     | Niveau d'exigence sur les exports        |
| ---------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| **Particulier / auto-constructeur**            | Visualiser et pré-dimensionner avant de consulter un professionnel   | PDF, PNG, 3D navigable                   |
| **Architecte / dessinateur / bureau d'études** | Gagner du temps sur l'esquisse et l'APS, reprendre dans son logiciel | DXF, IFC, PDF à l'échelle avec cartouche |
| **Promoteur / agence / constructeur**          | Produire vite plusieurs variantes présentables                       | PDF, PNG, 3D, comparaison de variantes   |
| **Administrateur Tracea**                      | Supervision, support, gestion des comptes et quotas                  | —                                        |

### 3.2 Cas d'usage principaux

| ID    | Cas d'usage                          | Acteur                  | Résultat attendu                                                                  |
| ----- | ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- |
| CU-01 | Créer un compte et se connecter      | Tous                    | Compte vérifié par e-mail, session sécurisée                                      |
| CU-02 | Créer un projet                      | Tous                    | Projet nommé, vide, rattaché à l'utilisateur                                      |
| CU-03 | Décrire le bâtiment                  | Tous                    | Description textuelle + paramètres structurés enregistrés                         |
| CU-04 | Définir le terrain                   | Tous                    | Parcelle, orientation, reculs enregistrés                                         |
| CU-05 | Lancer la génération                 | Tous                    | Jeu de plans 2D + maquette 3D, ou message d'erreur explicite                      |
| CU-06 | Consulter les plans 2D               | Tous                    | Navigation par niveau et par type de vue, zoom, cotes lisibles                    |
| CU-07 | Consulter la maquette 3D             | Tous                    | Orbite, zoom, coupe horizontale par niveau                                        |
| CU-08 | Éditer le plan                       | Pro, particulier averti | Déplacer un mur ou une ouverture, redimensionner une pièce, puis régénérer        |
| CU-09 | Modifier la description et régénérer | Tous                    | Nouvelle version conservant les modifications manuelles compatibles               |
| CU-10 | Consulter les vérifications          | Tous                    | Liste d'avertissements (circulation, surfaces, PMR) avec localisation sur le plan |
| CU-11 | Exporter                             | Tous                    | Fichier téléchargeable dans le format choisi, via lien signé à durée limitée      |
| CU-12 | Partager un projet                   | Propriétaire            | Lien de lecture seule, révocable                                                  |
| CU-13 | Gérer l'historique                   | Tous                    | Liste des versions, restauration d'une version                                    |
| CU-14 | Supprimer un projet / un compte      | Tous                    | Suppression effective des données et fichiers                                     |

### 3.3 Parcours critique (test de bout en bout)

**Décrire → Générer → Exporter** : un utilisateur connecté crée un projet, saisit « Maison plain-pied de 120 m², 3 chambres, séjour-cuisine ouvert orienté sud, garage double accolé, terrain 20 × 30 m », lance la génération, obtient un plan de niveau coté, un plan de masse et une 3D, puis télécharge un PDF A3 au 1/100 et un DXF qui s'ouvre sans erreur.

---

## 4. Exigences fonctionnelles

Priorité : **M** (must, MVP) · **S** (should, V1) · **C** (could, V2).

### 4.1 Compte et projets

| ID     | Exigence                                                                                                         | Prio |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---- |
| EF-100 | Inscription par e-mail + mot de passe avec vérification d'adresse ; connexion ; réinitialisation du mot de passe | M    |
| EF-101 | Espace « Mes projets » : liste, création, renommage, duplication, suppression                                    | M    |
| EF-102 | Un projet contient : description, paramètres, terrain, versions générées, exports                                | M    |
| EF-103 | Partage par lien en lecture seule, révocable, avec date d'expiration optionnelle                                 | S    |
| EF-104 | Rôles par projet : propriétaire, éditeur, lecteur                                                                | C    |
| EF-105 | Quotas par plan d'abonnement (nombre de générations / mois, taille des exports)                                  | S    |

### 4.2 Saisie

| ID     | Exigence                                                                                                                                                                                                                  | Prio |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| EF-200 | Zone de description en français libre (≤ 2 000 caractères) avec exemples guidés                                                                                                                                           | M    |
| EF-201 | Paramètres structurés : type de bâtiment, nombre de niveaux, surface habitable cible, liste des pièces (type, quantité, surface mini optionnelle), garage, style de toiture (plat, 2 pans, 4 pans), orientation du séjour | M    |
| EF-202 | Terrain : dimensions ou polygone, orientation (nord), reculs (avant, latéraux, arrière), pente simple                                                                                                                     | M    |
| EF-203 | Import de terrain : GeoJSON, DXF (polyligne fermée)                                                                                                                                                                       | S    |
| EF-204 | Import cadastre par référence parcellaire (source selon pays, à confirmer)                                                                                                                                                | C    |
| EF-205 | Le moteur demande une clarification si la description est ambiguë ou contradictoire (ex. : 3 chambres de 20 m² dans 60 m²) plutôt que de produire un plan incohérent                                                      | M    |
| EF-206 | Fusion description ↔ paramètres : les paramètres structurés priment ; les écarts sont signalés                                                                                                                            | M    |

### 4.3 Génération 2D

| ID     | Exigence                                                                                                                                                                         | Prio                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| EF-300 | Plan de niveau pour chaque étage : murs porteurs et cloisons différenciés, portes avec sens d'ouverture, fenêtres, escaliers avec sens de montée, nom et surface de chaque pièce | M                   |
| EF-301 | Plan de masse : parcelle, emprise au sol, reculs, accès, orientation nord, cotes aux limites                                                                                     | M                   |
| EF-302 | Cotation automatique : cotes extérieures (chaînes par façade), cotes intérieures principales, niveaux altimétriques                                                              | M (ext.) / S (int.) |
| EF-303 | Coupes : au moins une coupe longitudinale et une transversale, avec hauteurs sous plafond, épaisseurs de plancher, toiture                                                       | S                   |
| EF-304 | Façades : quatre élévations avec ouvertures, toiture, niveau du terrain naturel                                                                                                  | S                   |
| EF-305 | Nomenclature : tableau des pièces (nom, niveau, surface), surface habitable, emprise au sol, surface de plancher                                                                 | S                   |
| EF-306 | Représentation conforme aux usages : épaisseurs de traits par calque, hachures des murs coupés, symboles normalisés portes/fenêtres, échelle affichée                            | M                   |
| EF-307 | Échelles disponibles : 1/50, 1/100, 1/200, 1/500 ; format de planche A4, A3, A2, A1 ; cartouche sur chaque planche                                                               | M                   |

### 4.4 Génération 3D

| ID     | Exigence                                                                                    | Prio |
| ------ | ------------------------------------------------------------------------------------------- | ---- |
| EF-400 | Maquette volumétrique : murs, planchers, toiture, ouvertures (percements), terrain          | M    |
| EF-401 | Visualisation : orbite, zoom, panoramique, isolement d'un niveau, coupe horizontale         | M    |
| EF-402 | Matériaux simples (enduit, tuile, bois, vitrage) et ombrage solaire selon l'orientation     | S    |
| EF-403 | Visite intérieure à hauteur d'œil                                                           | C    |
| EF-404 | Performances : ≥ 30 images/s sur un ordinateur portable récent pour une maison individuelle | M    |

### 4.5 Édition et versions

| ID     | Exigence                                                                                                                                                                           | Prio |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| EF-500 | Déplacement d'un mur intérieur avec recalcul des pièces adjacentes et des surfaces                                                                                                 | S    |
| EF-501 | Déplacement, redimensionnement, ajout, suppression d'une porte ou d'une fenêtre                                                                                                    | S    |
| EF-502 | Renommage d'une pièce, changement de type                                                                                                                                          | S    |
| EF-503 | Régénération partielle : les modifications manuelles sont conservées si elles restent compatibles avec la nouvelle description ; sinon elles sont listées et l'utilisateur arbitre | S    |
| EF-504 | Historique : chaque génération ou édition validée crée une version horodatée ; comparaison visuelle de deux versions ; restauration                                                | S    |
| EF-505 | Annuler / rétablir dans l'éditeur                                                                                                                                                  | S    |

### 4.6 Vérifications

| ID     | Exigence                                                                                                                                                                          | Prio |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| EF-600 | Cohérence géométrique : pas de pièce enclavée sans accès, pas d'ouverture hors mur, pas de chevauchement                                                                          | M    |
| EF-601 | Règles d'usage paramétrables : surfaces minimales par type de pièce, largeur de passage, hauteur sous plafond                                                                     | S    |
| EF-602 | Accessibilité PMR indicative : largeur des portes, aire de rotation dans les pièces d'eau, absence de ressaut                                                                     | S    |
| EF-603 | Chaque avertissement est localisé sur le plan et explique la règle appliquée ; mention explicite que les contrôles sont indicatifs et ne remplacent pas l'avis d'un professionnel | M    |

### 4.7 Exports

| ID     | Exigence                                                                                                                                               | Format                    | Prio |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ---- |
| EF-700 | Export 2D vectoriel par calques normalisés, unités mm, version R2010 ou supérieure                                                                     | DXF                       | M    |
| EF-701 | Planches à l'échelle avec cartouche (nom du projet, échelle, date, indice, numéro de planche, auteur) ; une planche par vue ou dossier complet         | PDF                       | M    |
| EF-702 | Export vectoriel web d'une vue                                                                                                                         | SVG                       | M    |
| EF-703 | Image matricielle d'une vue 2D ou d'une vue 3D, résolution choisie                                                                                     | PNG                       | M    |
| EF-704 | Modèle 3D pour visionneuses et moteurs temps réel                                                                                                      | glTF/GLB                  | M    |
| EF-705 | Modèle BIM : IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey → IfcWall / IfcSlab / IfcDoor / IfcWindow / IfcRoof / IfcSpace, propriétés de base | IFC 4 (IFC 2x3 en option) | S    |
| EF-706 | Maillage 3D générique                                                                                                                                  | OBJ (+ MTL)               | C    |
| EF-707 | DWG : proposé uniquement si une bibliothèque sous licence compatible est validée ; à défaut, l'interface indique « DXF (compatible AutoCAD) »          | DWG                       | C    |
| EF-708 | SKP : même règle que DWG                                                                                                                               | SKP                       | C    |
| EF-709 | Les fichiers sont produits de façon asynchrone, stockés et servis par URL signée (durée ≤ 15 min) ; l'utilisateur est notifié à la fin                 | —                         | M    |

### 4.8 Administration

| ID     | Exigence                                                                                       | Prio |
| ------ | ---------------------------------------------------------------------------------------------- | ---- |
| EF-800 | Tableau de bord : nombre d'utilisateurs, de projets, de générations, taux d'échec, temps moyen | S    |
| EF-801 | Gestion des comptes : suspension, réinitialisation, quotas                                     | S    |
| EF-802 | Journal d'audit des actions sensibles                                                          | S    |

---

## 5. Exigences non fonctionnelles

| ID     | Domaine              | Exigence                                                                                                                                                                                                                                                                       |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ENF-01 | Performance          | Génération d'une maison individuelle ≤ 30 s (P95) ; affichage d'un plan 2D ≤ 2 s ; chargement 3D ≤ 5 s                                                                                                                                                                         |
| ENF-02 | Capacité             | 200 générations simultanées en file sans dégradation de l'interface ; mise à l'échelle horizontale des travailleurs de génération                                                                                                                                              |
| ENF-03 | Disponibilité        | 99,5 % mensuel ; sauvegardes quotidiennes de la base, rétention 30 jours ; restauration testée trimestriellement                                                                                                                                                               |
| ENF-04 | Sécurité             | Mots de passe hachés (Argon2id), sessions sécurisées, protection CSRF/XSS/injection, limitation de débit, validation stricte des entrées et des fichiers importés, isolation stricte des projets entre utilisateurs, URL signées pour les fichiers, aucun secret dans le dépôt |
| ENF-05 | Données personnelles | Conformité RGPD : consentement, droit d'accès et de suppression, registre des traitements, hébergement documenté                                                                                                                                                               |
| ENF-06 | Accessibilité        | WCAG 2.1 niveau AA : contrastes, navigation clavier complète dans l'éditeur, libellés explicites, alternatives textuelles                                                                                                                                                      |
| ENF-07 | Compatibilité        | Navigateurs : deux dernières versions de Chrome, Firefox, Edge, Safari ; écrans ≥ 1 280 px pour l'éditeur, consultation possible sur tablette                                                                                                                                  |
| ENF-08 | Internationalisation | Interface en français ; architecture prête pour d'autres langues ; unités métriques (mm en interne, affichage m/cm)                                                                                                                                                            |
| ENF-09 | Maintenabilité       | TypeScript strict, ESLint + Prettier, couverture de tests ≥ 80 % sur `domain` et `export`, documentation d'architecture tenue à jour                                                                                                                                           |
| ENF-10 | Observabilité        | Journaux structurés, métriques (durée de génération, taux d'échec par étape), traces distribuées, alertes                                                                                                                                                                      |
| ENF-11 | Interopérabilité     | Fichiers conformes aux spécifications publiques des formats (DXF, IFC, glTF 2.0, PDF 1.7) et validés automatiquement                                                                                                                                                           |
| ENF-12 | Présentation         | Aucun livrable (interface, code, documentation, commits, e-mails) ne mentionne les technologies de génération ; le moteur est désigné « moteur Tracea »                                                                                                                        |

---

## 6. Contraintes

- **Design** : les maquettes font foi ; tout écart est documenté et signalé.
- **Langue** : français pour l'interface et la documentation, anglais pour le code et les commits (Conventional Commits).
- **Licences** : privilégier les bibliothèques sous licence permissive (MIT, BSD, Apache 2.0) ou LGPL utilisée dynamiquement ; toute dépendance GPL ou propriétaire est soumise à validation avant intégration.
- **Modèle interne** : le modèle sémantique du bâtiment est la source de vérité unique ; aucun export ni rendu ne se calcule à partir d'un autre export.
- **Organisation** : réalisation selon le workflow multi-rôles défini dans le dépôt (planificateur, designer, frontend, backend, QA, sécurité, DevOps, réviseur technique).

---

## 7. Livrables

| Livrable                   | Contenu                                                                                                           | Jalon           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------- |
| L1 — Dossier de conception | Ce cahier des charges, dossier d'architecture, spécifications du modèle, des exports et de l'API, plan de qualité | Début de projet |
| L2 — Maquettes validées    | Écrans des parcours CU-01 à CU-14, spécifications d'écran                                                         | Avant sprint 2  |
| L3 — MVP                   | Application déployée en préproduction, parcours critique fonctionnel, exports PDF/PNG/SVG/DXF/glTF                | Fin sprint 6    |
| L4 — V1                    | Fonctionnalités S livrées, export IFC validé, documentation utilisateur, mise en production                       | Fin sprint 14   |
| L5 — Documentation         | Guide utilisateur, guide d'exploitation, `README`, `.env.example`, changelog                                      | Continu         |

---

## 8. Critères d'acceptation globaux

1. Le parcours critique (§ 3.3) s'exécute de bout en bout en moins de 2 minutes utilisateur, sans intervention technique.
2. Les fichiers exportés par la suite de tests se rouvrent sans erreur : DXF dans un lecteur DXF de référence et dans AutoCAD/LibreCAD, IFC dans un visualiseur IFC de référence et validé par IfcOpenShell, PDF avec dimensions de page exactes et échelle vérifiée à la règle, glTF validé par le validateur officiel Khronos.
3. Les 50 descriptions du jeu de référence produisent un plan sans erreur bloquante dans ≥ 90 % des cas ; les 10 % restants retournent un message d'erreur compréhensible indiquant la contrainte en cause.
4. Audit de sécurité interne sans faille critique ou haute ouverte.
5. Audit d'accessibilité AA sur les écrans principaux sans non-conformité bloquante.
6. Relecture de conformité à l'ENF-12 sur l'ensemble des livrables.

---

## 9. Risques et points d'attention

| Risque                                                             | Impact | Probabilité | Mitigation                                                                                                                                           |
| ------------------------------------------------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualité des plans générés insuffisante pour un usage professionnel | Élevé  | Moyenne     | Jeu de descriptions de référence, revue par un architecte à chaque jalon, solveur de plan itératif avec contraintes métier explicites                |
| Export DWG natif sans licence Autodesk                             | Moyen  | Élevée      | Livrer DXF R2010+ (ouvert nativement par AutoCAD) ; étudier les bibliothèques open source disponibles (licences, stabilité) avant toute promesse DWG |
| Export SKP                                                         | Faible | Élevée      | Non prioritaire ; glTF/OBJ sont importables dans SketchUp                                                                                            |
| Complexité IFC (géométrie, relations, propriétés)                  | Élevé  | Moyenne     | Commencer par un sous-ensemble (murs extrudés, dalles, ouvertures par IfcOpeningElement, espaces) validé par IfcOpenShell ; enrichir ensuite         |
| Performance 3D sur machines modestes                               | Moyen  | Moyenne     | Géométrie instanciée, niveaux de détail, limitation des ombres, budget de triangles par projet                                                       |
| Interprétation erronée de la description                           | Élevé  | Moyenne     | Paramètres structurés prioritaires, récapitulatif de ce que le moteur a compris avant génération, demandes de clarification                          |
| Double pile technique (Node + Python)                              | Moyen  | Moyenne     | Contrats d'interface stricts (schéma JSON versionné), tests de contrat, option de repli tout-Python décrite dans le dossier d'architecture           |
| Fichiers importés malveillants (DXF, GeoJSON)                      | Élevé  | Faible      | Analyse dans un travailleur isolé, limites de taille, validation de schéma, pas d'exécution de contenu                                               |
| Dépendance à un service d'interprétation externe                   | Moyen  | Moyenne     | Fournisseur configurable, dégradation vers la saisie structurée seule si le service est indisponible                                                 |

---

## 10. Glossaire

Voir `00-contexte.md` (APS/APD, plan de masse, coupe, façade, emprise au sol, surface habitable, IFC, DXF/DWG, cartouche). Termes complémentaires :

- **Programme** : liste structurée des pièces et de leurs exigences (type, surface, adjacences, orientation) déduite de la description.
- **Solveur de plan** : composant du moteur qui place les pièces et les murs pour satisfaire le programme et le terrain.
- **Version** : état figé d'un projet après génération ou édition validée.
- **Planche** : page d'un export PDF portant une vue à l'échelle et un cartouche.
