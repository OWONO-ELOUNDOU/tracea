# Notes de design — sprint 0

| Champ | Valeur           |
| ----- | ---------------- |
| Rôle  | Designer         |
| Date  | 16 novembre 2026 |

## Maquettes

Les maquettes Stitch ne sont pas encore versionnées dans le dépôt. Les écrans du sprint 0 (page d'accueil) utilisent une structure provisoire, à remplacer dès que les exports Stitch sont déposés dans `docs/design/stitch/` (un dossier par écran, PNG + lien de la maquette).

## Jetons de base (provisoires)

| Jeton            | Valeur                                                | Usage                           |
| ---------------- | ----------------------------------------------------- | ------------------------------- |
| `--color-ink`    | `#1B1F24`                                             | texte principal, traits de plan |
| `--color-paper`  | `#FAFAF7`                                             | fond des plans                  |
| `--color-accent` | `#1F6F8B`                                             | actions principales             |
| `--color-dim`    | `#C00000`                                             | cotes (calque `A-DIMS`)         |
| `--color-door`   | `#008000`                                             | portes                          |
| `--color-window` | `#00A0A0`                                             | fenêtres                        |
| Police           | Inter (interface), monospace système (valeurs cotées) |                                 |

Les couleurs des calques reprennent la spécification du modèle (§ 3.1) afin que l'affichage à l'écran et les exports soient identiques.

## Vocabulaire de l'interface

Plan de masse, plan de niveau, coupe, façade, allège, linteau, emprise au sol, surface habitable, cartouche, échelle, indice de révision. Le moteur est désigné « moteur Tracea » ; l'action principale s'intitule « Générer les plans ».

## Accessibilité

Contraste AA sur tous les jetons ci-dessus (vérifié : ink sur paper 15,6:1 ; accent sur paper 5,1:1). Tous les contrôles du plan auront un libellé explicite (`aria-label`) et un ordre de tabulation défini dans la spécification d'écran de l'éditeur (sprint 2).
