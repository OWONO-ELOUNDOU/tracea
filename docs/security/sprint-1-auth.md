# Revue de sécurité — sprint 1 (authentification)

| Champ                     | Valeur                                                      |
| ------------------------- | ----------------------------------------------------------- |
| Rôle                      | Sécurité                                                    |
| Date                      | 16 novembre 2026                                            |
| Surface d'attaque touchée | Comptes, sessions, e-mails transactionnels, base de données |

## Contrôles effectués

| Domaine                | Contrôle                                                                                                                                                                                                                                                                               | Résultat   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Mots de passe          | Argon2id m = 64 Mio, t = 3, p = 1 ; longueur 12–128 ; liste de mots de passe courants ; hachage factice vérifié quand l'adresse est inconnue (temps de réponse homogène)                                                                                                               | Conforme   |
| Énumération de comptes | Inscription, renvoi de vérification et demande de réinitialisation répondent de façon identique que l'adresse existe ou non ; message de connexion unique                                                                                                                              | Conforme   |
| Sessions               | Identifiant aléatoire (UUID) côté serveur, cookie `HttpOnly` `SameSite=Lax` signé (`Secure` en production), expiration 72 h, suppression à la déconnexion, révocation globale, suppression à la réinitialisation du mot de passe                                                       | Conforme   |
| CSRF                   | Double soumission (cookie + en-tête `X-CSRF-Token`) exigée sur `POST`/`PATCH`/`DELETE`, y compris routes non authentifiées ; CORS restreint à `APP_URL` avec `credentials`                                                                                                             | Conforme   |
| Jetons e-mail          | 256 bits aléatoires, uniquement hachés (SHA-256) en base, usage unique, expiration 24 h (vérification) / 1 h (réinitialisation)                                                                                                                                                        | Conforme   |
| Limitation de débit    | Globale 60/min ; connexion 10 / 15 min ; routes d'envoi d'e-mail 5 / 15 min ; réponse 429 au format Problem Details                                                                                                                                                                    | Conforme   |
| Entrées                | Validation Zod sur chaque route (e-mail, mot de passe borné, jetons bornés, nom affiché ≤ 100) ; erreurs 422 avec champs                                                                                                                                                               | Conforme   |
| E-mails                | Contenu échappé (HTML), pas d'image distante, pas de données sensibles dans le corps                                                                                                                                                                                                   | Conforme   |
| Journalisation         | Journal d'audit : inscription, connexion, échec de connexion, vérification, réinitialisation, révocation globale ; aucun mot de passe, hachage ou jeton journalisé                                                                                                                     | Conforme   |
| Données                | Index unique insensible à la casse sur l'e-mail ; suppression logique prévue (`deleted_at`) ; cascade sur sessions et jetons                                                                                                                                                           | Conforme   |
| Secrets                | `SESSION_SECRET` ≥ 32 caractères exigé au démarrage ; procédure de génération documentée dans `.env.example`                                                                                                                                                                           | Conforme   |
| Dépendances            | `@node-rs/argon2` (MIT, binaire prébuilt), `drizzle-orm` (Apache-2.0), `pg` (MIT), `nodemailer` (MIT-0), `@fastify/cookie` (MIT) ; `pnpm audit` : 0 haute/critique, 2 modérées sur l'outillage (`esbuild` via `drizzle-kit`, `minimatch` via `eslint-plugin-import`) ; `pip-audit` : 0 | Acceptable |

## Constats

| Niveau  | Constat                                                                                                                                    | Suite                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Moyenne | Le contrôle de compromission des mots de passe est minimal (liste locale).                                                                 | Sprint 3 : vérification par préfixe de hachage auprès d'un service de mots de passe compromis, derrière un port pour rester désactivable. |
| Moyenne | En développement, `Secure` est désactivé sur les cookies (HTTP local). Confirmer en staging que `NODE_ENV=production` est bien positionné. | Point de contrôle ajouté à la note d'exploitation.                                                                                        |
| Basse   | Les sessions expirées ne sont pas purgées ; la table croît.                                                                                | Tâche planifiée de purge (sprint 2, avec la corbeille des projets).                                                                       |
| Basse   | Pas de verrouillage de compte après N échecs ; seule la limitation de débit par IP s'applique.                                             | Suivi ; à réévaluer avec les métriques de staging.                                                                                        |

## Décision

**Approuvé.** Aucun constat critique ou haut.
