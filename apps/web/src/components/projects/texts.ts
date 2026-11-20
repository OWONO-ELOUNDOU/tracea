// Exact wording of the screen specification (§ 8). French typography: a no-break space
// (U+00A0) precedes « ? » and « : » and pads the inside of French quotation marks.
const NBSP = " ";
const quoted = (name: string) => `«${NBSP}${name}${NBSP}»`;

export const texts = {
  deleteTitle: `Supprimer ce projet${NBSP}?`,
  deleteBody: (name: string) =>
    `Le projet ${quoted(name)} sera retiré de votre liste et placé dans la corbeille. Il y est conservé 30 jours, puis supprimé définitivement avec ses plans. La restauration depuis la corbeille n'est pas disponible dans l'application.`,
  emptyBody: `Un projet regroupe la description d'un bâtiment, ses plans et ses exports. Utilisez ${quoted("Nouveau projet")} pour créer le premier.`,
  renamed: (name: string) => `Projet renommé en ${quoted(name)}.`,
  duplicating: (name: string) => `Duplication de ${quoted(name)} en cours…`,
  duplicated: (name: string) => `Projet dupliqué sous le nom ${quoted(name)}.`,
  deleted: (name: string) => `Projet ${quoted(name)} supprimé.`,
  moreLoaded: (count: number) =>
    count === 0
      ? "Tous vos projets sont affichés."
      : count === 1
        ? "1 projet supplémentaire affiché."
        : `${count} projets supplémentaires affichés.`,
  notFound: `Ce projet est introuvable${NBSP}: il a peut-être déjà été supprimé. Il a été retiré de votre liste.`,
  actionsLabel: (name: string) => `Actions pour le projet ${name}`,
} as const;
