# Spécification d'écran — Authentification (CU-01)

| Champ      | Valeur                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle       | Designer                                                                                                                                                                                                                                                            |
| Date       | 16 novembre 2026                                                                                                                                                                                                                                                    |
| Maquette   | **Absente des maquettes v0.1** (limite déclarée dans le document des maquettes). Structure provisoire construite sur les fondations v0.1 (palette, typographie, composants Bouton, Champ de saisie). À aligner dès que l'écran existe dans le fichier de maquettes. |
| Routes web | `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation?token=…`, `/verification?token=…`                                                                                                                                                          |

## 1. Fondations appliquées

- Palette « papier et encre technique » : fond `paper` `#F4F1EA`, surface des cartes `surface` (blanc), texte `ink`, action principale `primary` `#1E4A6E`, erreur `danger`, succès `ok`.
- Typographie : Titre 1 (28/36) pour le titre d'écran, Corps pour les textes, Libellé pour les étiquettes de champ, Bouton pour les actions.
- Contrôles : hauteur 40, rayon 8 ; cartes rayon 12 ; largeur de colonne de formulaire 400 px, centrée.

## 2. Structure commune

```
┌────────────────────────────────────────────┐
│  Tracea                                    │  en-tête : marque, lien « Retour à l'accueil »
│                                            │
│         ┌──────────────────────┐           │
│         │ Titre 1              │           │  carte centrée (400 px)
│         │ Phrase d'intro       │           │
│         │ [Champ]              │           │
│         │ [Champ]              │           │
│         │ [Bouton principal]   │           │
│         │ Lien secondaire      │           │
│         └──────────────────────┘           │
│                                            │
│  Pied : « Document d'esquisse… » absent ici│  pied : mentions légales (lien), version
└────────────────────────────────────────────┘
```

Composant `AuthCard` partagé : titre, intro, zone de message (`role="alert"` pour les erreurs, `role="status"` pour les confirmations), formulaire, liens.

## 3. Écrans

### 3.1 Connexion — `/connexion`

- Titre : « Connexion » ; intro : « Accédez à vos projets et à vos plans. »
- Champs : « Adresse e-mail » (`type=email`, `autocomplete=email`), « Mot de passe » (`type=password`, `autocomplete=current-password`, bouton « Afficher » accessible).
- Action : « Se connecter ». Liens : « Mot de passe oublié ? », « Créer un compte ».
- États :
  - Chargement : bouton désactivé, libellé « Connexion… ».
  - Identifiants invalides (401) : « Adresse e-mail ou mot de passe incorrect. » (message unique, sans préciser lequel).
  - Compte non vérifié (403 `EMAIL_NOT_VERIFIED`) : « Votre adresse n'est pas encore vérifiée. Consultez l'e-mail reçu lors de l'inscription. » + bouton « Renvoyer l'e-mail de vérification ».
  - Trop de tentatives (429) : « Trop de tentatives. Réessayez dans quelques minutes. »
- Succès : redirection vers `/projets` (ou vers `?suivant=` si présent et interne).

### 3.2 Inscription — `/inscription`

- Titre : « Créer un compte » ; intro : « Décrivez votre projet, obtenez vos plans. »
- Champs : « Adresse e-mail », « Mot de passe » (`autocomplete=new-password`, aide : « 12 caractères minimum »), indicateur de robustesse textuel (« Trop court », « Acceptable », « Solide »), case « J'accepte les conditions d'utilisation » (lien).
- Action : « Créer mon compte ». Lien : « J'ai déjà un compte ».
- États :
  - Mot de passe trop court / trop courant (422 `PASSWORD_TOO_WEAK`) : message sous le champ, champ marqué `aria-invalid`.
  - Adresse déjà utilisée : **la réponse de l'API est la même** (201) ; l'écran affiche toujours l'état « e-mail envoyé ».
- Succès : la carte remplace le formulaire par « Vérifiez votre boîte de réception » + « Nous avons envoyé un lien de vérification à {email}. Il expire dans 24 heures. » + lien « Renvoyer ».

### 3.3 Vérification d'adresse — `/verification?token=…`

- À l'ouverture, appel `POST /auth/verify-email`.
- Succès : « Adresse vérifiée » + bouton « Se connecter ».
- Jeton invalide ou expiré (400 `TOKEN_INVALID`) : « Ce lien n'est plus valide. » + champ e-mail « Recevoir un nouveau lien ».

### 3.4 Mot de passe oublié — `/mot-de-passe-oublie`

- Titre : « Mot de passe oublié » ; champ « Adresse e-mail » ; action « Envoyer le lien ».
- Succès (toujours, 202) : « Si un compte existe pour cette adresse, un e-mail vient d'être envoyé. »

### 3.5 Réinitialisation — `/reinitialisation?token=…`

- Titre : « Nouveau mot de passe » ; champs « Nouveau mot de passe », « Confirmer le mot de passe » ; action « Enregistrer ».
- Erreurs : confirmation différente (côté client), mot de passe faible (422), jeton invalide (400) → « Ce lien n'est plus valide. » + lien vers « Mot de passe oublié ».
- Succès : « Mot de passe modifié. Toutes vos sessions ont été fermées. » + bouton « Se connecter ».

## 4. Accessibilité

- Chaque champ a un `<label>` visible ; l'aide et l'erreur sont reliées par `aria-describedby`.
- La zone de message est annoncée (`role="alert"` / `role="status"`) et reçoit le focus après soumission en erreur.
- Ordre de tabulation : champs → action principale → liens. Le bouton « Afficher le mot de passe » est un vrai `<button type="button">` avec `aria-pressed`.
- Contraste : `primary` sur blanc 8,6:1 ; texte d'aide `ink` à 70 % sur `paper` ≥ 4,5:1.
- Aucune information portée par la couleur seule : les erreurs ont une icône et un texte.

## 5. Textes des e-mails (expéditeur « Tracea <no-reply@tracea.app> »)

- Vérification — objet : « Vérifiez votre adresse e-mail » ; corps : bonjour, lien, « Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. »
- Réinitialisation — objet : « Réinitialisation de votre mot de passe » ; corps : lien, « Ce lien expire dans 1 heure. »
- Texte brut + HTML minimal ; pas d'image distante.

## 6. Écarts et points à valider

- Écran absent des maquettes : à produire dans le fichier de maquettes avant le sprint 2 (page « 01 · Écrans », cadre « 05 · Connexion / Inscription »).
- La case « conditions d'utilisation » suppose une page `/conditions` ; placeholder jusqu'à la rédaction juridique.
