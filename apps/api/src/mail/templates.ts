import type { Mail } from "./mailer.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title: string, lines: string[], link: string, action: string): Mail["html"] {
  const paragraphs = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");
  const href = escapeHtml(link);
  return `<!doctype html>
<html lang="fr"><body style="font-family:Inter,Arial,sans-serif;color:#1B1F24;line-height:1.5">
<h1 style="font-size:20px">${escapeHtml(title)}</h1>
${paragraphs}
<p><a href="${href}" style="display:inline-block;padding:10px 16px;background:#1E4A6E;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(action)}</a></p>
<p style="font-size:12px;color:#555">Si le bouton ne fonctionne pas, copiez ce lien : ${href}</p>
<p style="font-size:12px;color:#555">Tracea</p>
</body></html>`;
}

export function verificationMail(to: string, link: string): Mail {
  const lines = [
    "Bonjour,",
    "Merci de votre inscription à Tracea. Confirmez votre adresse e-mail pour activer votre compte.",
    "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  ];
  return {
    to,
    subject: "Vérifiez votre adresse e-mail",
    text: `${lines.join("\n\n")}\n\n${link}\n\nTracea`,
    html: layout("Vérifiez votre adresse e-mail", lines, link, "Confirmer mon adresse"),
  };
}

export function passwordResetMail(to: string, link: string): Mail {
  const lines = [
    "Bonjour,",
    "Une réinitialisation de votre mot de passe Tracea a été demandée.",
    "Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail ; votre mot de passe reste inchangé.",
  ];
  return {
    to,
    subject: "Réinitialisation de votre mot de passe",
    text: `${lines.join("\n\n")}\n\n${link}\n\nTracea`,
    html: layout(
      "Réinitialisation de votre mot de passe",
      lines,
      link,
      "Choisir un nouveau mot de passe",
    ),
  };
}
