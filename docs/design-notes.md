# Notes de design — fondations v0.1

| Champ | Valeur           |
| ----- | ---------------- |
| Rôle  | Designer         |
| Date  | 17 novembre 2026 |

Mise à jour du sprint 2 (S2-1) : les jetons décrits ci-dessous sont ceux de `apps/web/src/app/globals.css`, qui fait foi. Les valeurs provisoires du sprint 0 (`--color-paper` `#FAFAF7`, `--color-accent` `#1F6F8B` pour les actions principales) ne sont plus en usage.

## Maquettes

Les maquettes de référence sont le fichier Figma « Tracea — Maquettes v0.1 » ([lien](https://www.figma.com/design/WjdAD77A3iU3u4LL5eP0TB)), page « 01 · Écrans » ; elles font foi pour l'interface (décision D1 de `docs/plans/sprint-2-projects.md`, tranchée par le porteur du projet). Aucune capture n'est versionnée dans le dépôt.

État d'alignement des écrans livrés :

- « Mes projets » (`/projets`) : aligné sur le cadre `5:2` « 01 · Mes projets », voir `docs/specs/screens/projects.md`. Seule la structure du cadre a été relevée (calques, textes, positions, tailles) ; les couleurs et polices de la maquette restent à comparer avec les jetons ci-dessous.
- Authentification : absente des maquettes v0.1, structure provisoire (`docs/specs/screens/auth.md`).
- Page d'accueil : structure provisoire, sans cadre identifié dans les maquettes.

## Jetons de couleur

| Jeton             | Valeur    | Usage                           |
| ----------------- | --------- | ------------------------------- |
| `--color-ink`     | `#1b1f24` | texte principal, traits de plan |
| `--color-paper`   | `#f4f1ea` | fond de page                    |
| `--color-surface` | `#ffffff` | cartes, dialogues, champs       |
| `--color-line`    | `#d9d4c7` | bordures, séparateurs           |
| `--color-primary` | `#1e4a6e` | action principale, liens        |
| `--color-accent`  | `#c97a2b` | mise en valeur graphique        |
| `--color-ok`      | `#2e7d4f` | succès                          |
| `--color-warn`    | `#b8860b` | avertissement                   |
| `--color-danger`  | `#b3261e` | erreur, action destructive      |
| `--color-dim`     | `#c00000` | cotes (calque `A-DIMS`)         |
| `--color-door`    | `#008000` | portes                          |
| `--color-window`  | `#00a0a0` | fenêtres                        |

Avec Tailwind, chaque jeton donne les classes `text-*`, `bg-*`, `border-*` correspondantes (`bg-primary`, `border-line`, `text-ink/70` pour une opacité de 70 %).

Les couleurs des calques (`dim`, `door`, `window`) reprennent la spécification du modèle (§ 3.1) afin que l'affichage à l'écran et les exports soient identiques.

## Typographie et dimensions

- Police d'interface : `--font-sans`, soit `"Inter", ui-sans-serif, system-ui, sans-serif`. Inter n'est chargée par aucune feuille de style ni aucun composant de `apps/web` : l'affichage se fait aujourd'hui avec la police système de repli. Valeurs cotées : police à chasse fixe du système.
- Titre d'écran : 28/36 semi-gras. Corps : 16/24. Libellé de champ : 14/20 médium. Aide et erreur de champ : 12/16.
- Contrôles : hauteur 40, rayon 8. Cartes et dialogues : rayon 12, bordure `line`. Colonne de formulaire : 400 px.
- Écrans de l'application (relevé du cadre `5:2`) : barre supérieure de 64 px, marges latérales du contenu 48 px, largeur utile 1 344 px à 1 440 px.

## Vocabulaire de l'interface

Plan de masse, plan de niveau, coupe, façade, allège, linteau, emprise au sol, surface habitable, cartouche, échelle, indice de révision. Le moteur est désigné « moteur Tracea » ; l'action principale s'intitule « Générer les plans ».

## Accessibilité

Rapports de contraste calculés selon WCAG 2.1 à partir des valeurs ci-dessus ; seuils AA : 4,5:1 pour le texte courant, 3:1 pour le texte de grande taille et les éléments graphiques.

- `ink` : 14,7:1 sur `paper`, 16,6:1 sur `surface`. À 70 % d'opacité : 5,8:1 sur `paper`, 6,1:1 sur `surface`. À 60 % sur `paper` : 4,2:1, insuffisant ; le texte secondaire ne descend pas sous 70 %.
- `primary` : 8,2:1 sur `paper`, 9,3:1 sur `surface` ; texte blanc sur `primary` 9,3:1.
- `danger` : 5,8:1 sur `paper`, 6,5:1 sur `surface` ; texte blanc sur `danger` 6,5:1.
- `ok` : 5,0:1 sur `surface`, 4,47:1 sur `paper`, insuffisant pour du texte courant. Le texte en `ok` est réservé aux surfaces blanches.
- `accent` (3,3:1 sur `surface`, 2,95:1 sur `paper`) et `warn` (3,3:1 sur `surface`, 2,9:1 sur `paper`) ne portent pas de texte courant.
- `line` : 1,5:1 sur `surface`, 1,3:1 sur `paper`. Convient à une séparation décorative ; insuffisant comme seule limite visible d'un champ de saisie (critère 1.4.11, 3:1). Point ouvert, voir `docs/specs/screens/projects.md` § 12.4.
- Calques : `dim` 6,5:1, `door` 5,1:1, `window` 3,2:1 sur `surface`. Leur lisibilité sur le fond des plans sera vérifiée avec la spécification des vues 2D.

Tous les contrôles du plan auront un libellé explicite (`aria-label`) et un ordre de tabulation défini dans la spécification d'écran de l'éditeur.
