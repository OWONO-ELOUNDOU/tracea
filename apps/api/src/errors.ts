/** Business error carried to the client as a Problem Details document (see problem.ts). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(detail ?? title);
    this.name = "ApiError";
  }
}

export const errors = {
  unauthenticated: () =>
    new ApiError(401, "UNAUTHENTICATED", "Connexion requise", "Connectez-vous pour continuer."),
  invalidCredentials: () =>
    new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Identifiants invalides",
      "Adresse e-mail ou mot de passe incorrect.",
    ),
  emailNotVerified: () =>
    new ApiError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Adresse non vérifiée",
      "Votre adresse n'est pas encore vérifiée. Consultez l'e-mail reçu lors de l'inscription.",
    ),
  csrf: () =>
    new ApiError(
      403,
      "CSRF_TOKEN_INVALID",
      "Requête refusée",
      "Le jeton de protection est absent ou invalide. Rechargez la page et réessayez.",
    ),
  tokenInvalid: () =>
    new ApiError(400, "TOKEN_INVALID", "Lien invalide", "Ce lien n'est plus valide."),
  passwordTooWeak: (reason: "too_short" | "too_common") =>
    new ApiError(
      422,
      "PASSWORD_TOO_WEAK",
      "Mot de passe trop faible",
      reason === "too_short"
        ? "Le mot de passe doit contenir au moins 12 caractères."
        : "Ce mot de passe est trop courant ; choisissez-en un autre.",
      { password: reason === "too_short" ? "trop court" : "trop courant" },
    ),
  projectNotFound: () =>
    new ApiError(
      404,
      "PROJECT_NOT_FOUND",
      "Projet introuvable",
      "Ce projet n'existe pas ou n'est plus disponible.",
    ),
  projectModified: () =>
    new ApiError(
      412,
      "PROJECT_MODIFIED",
      "Projet modifié ailleurs",
      "Ce projet a été modifié depuis une autre fenêtre. Rechargez-le pour retrouver la dernière version.",
    ),
  validation: (fields: Record<string, string>) =>
    new ApiError(
      422,
      "VALIDATION_ERROR",
      "Données invalides",
      "Certains champs sont invalides.",
      fields,
    ),
};
