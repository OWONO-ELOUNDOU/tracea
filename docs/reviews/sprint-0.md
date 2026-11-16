# Revue technique — sprint 0

| Champ           | Valeur                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Rôle            | Réviseur technique                                                         |
| Date            | 16 novembre 2026                                                           |
| Rapports joints | `docs/qa/sprint-0.md`, `docs/security/sprint-0.md`, `docs/ops/sprint-0.md` |

## 1. Périmètre

Conforme à `docs/sprint-0-plan.md`. Un écart signalé par le rôle Backend : la règle « pièce accessible » a été renforcée en cours de route (une porte sur un mur partagé n'est comptée que pour la pièce dont elle longe le contour) après qu'un test l'a mise en défaut. L'écart reste dans le périmètre de S0-3.

## 2. Architecture

- `packages/domain` n'importe aucun autre paquet (règle ESLint `no-restricted-imports` sur `@tracea/*`).
- `apps/api` et `apps/web` dépendent de `@tracea/domain` ; aucune logique métier dans `apps/web` (la page lit une constante du domaine).
- Les invariants et la géométrie sont écrits deux fois (TypeScript et Python) à dessein : les deux implémentations sont alignées algorithme par algorithme et vérifiées sur les mêmes fixtures par le job `contract`. Tout changement de l'une doit être reporté dans l'autre ; ce point est rappelé dans `.claude/agents/backend.md`.

## 3. Qualité

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint `strictTypeChecked`, aucun `any`, aucun `eslint-disable`.
- Python : mypy strict, ruff ; une exception documentée (`N815`) pour que les champs Pydantic reprennent le nommage camelCase du schéma JSON sans alias.
- Commentaires limités aux points non évidents (choix de `as T` avec index vérifié, règle de la porte, document OpenAPI de substitution).

## 4. Tests

27 tests TypeScript, 20 tests Python, contrat Zod ⇄ JSON Schema ⇄ Pydantic vert. Les mutations de fixture couvrent chaque code d'invariant des deux côtés.

## 5. Documentation

`README.md`, `CLAUDE.md`, `CHANGELOG.md`, `.env.example`, `infra/README.md`, notes de design, rapports QA / sécurité / exploitation présents.

## 6. Règle de présentation

Relecture de l'ensemble des fichiers livrés (code, commentaires, interface, documentation, configuration) : aucune mention d'assistant, de modèle ou d'outil de génération de texte, aucune signature automatique. L'interface désigne « le moteur Tracea ». Les fichiers `CLAUDE.md` et `.claude/agents/` sont l'outillage du workflow demandé par le projet ; voir le point d'information du rapport de sécurité sur leur exposition si le dépôt devenait public.

## Demandes de changement

Aucune bloquante. Points à reprendre au sprint 1 :

1. Verser les quatre documents de référence (cahier des charges, architecture, modèle et exports, API et qualité) dans `docs/` pour que le dépôt soit autoporteur.
2. Déposer les exports Stitch dans `docs/design/stitch/` avant la première spécification d'écran.
3. Trancher Fastify / FastAPI (architecture § 10.1) avant d'écrire les routes d'authentification.

## Décision

**Approuvé.** Le sprint 0 est livrable ; le dépôt peut être initialisé (`git init`, branche `main`, puis `develop`) avec un premier commit `chore: bootstrap monorepo, domain model and engine skeleton`.
