import { DESCRIPTION_MAX_LENGTH } from "@tracea/domain";
import { formatCount } from "./number-input";

// Exact wording of docs/specs/screens/project-description.md (§ 10). French typography: a no-break
// space (U+00A0) precedes « : » and « ? » and pads the inside of French quotation marks.
const NBSP = " ";
const quoted = (text: string) => `«${NBSP}${text}${NBSP}»`;

export const texts = {
  pageTitle: "Décrire le bâtiment",
  intro:
    "Le moteur Tracea combine votre description et les paramètres. En cas d'écart, les paramètres priment.",
  documentTitle: "Décrire le bâtiment — Tracea",
  projectDocumentTitle: (name: string) => `${name} — Décrire le bâtiment — Tracea`,
  notFoundDocumentTitle: "Projet introuvable — Tracea",

  steps: "Étapes du projet",
  unavailableStep: " (pas encore disponible)",

  descriptionHeading: "Description du projet",
  nameLabel: "Nom du projet",
  descriptionLabel: "Description libre",
  counter: (count: string, max: string) => `${count} / ${max} caractères`,
  examplesLink: "Voir des exemples de descriptions",
  limitExceeded: `Limite de ${formatCount(DESCRIPTION_MAX_LENGTH)} caractères dépassée.`,

  parametersHeading: "Paramètres du bâtiment",
  parametersHelp: `Facultatifs. Un paramètre laissé sur ${quoted("Selon la description")} ou vide est déduit de la description par le moteur Tracea${NBSP}; un paramètre renseigné prime sur la description.`,
  fromDescription: "Selon la description",
  buildingType: "Type de bâtiment",
  levels: "Niveaux",
  targetArea: "Surface habitable cible (m²)",
  roof: "Toiture",
  garage: "Garage",
  noGarage: "Pas de garage",
  livingOrientation: "Orientation du séjour",
  covering: "Couverture",
  coveringUnspecified: "Non précisée",
  garageArea: "Surface mini du garage (m²)",

  rooms: "Pièces",
  roomType: "Type",
  roomCount: "Nombre",
  roomMinArea: "Surface mini (m²)",
  deleteColumn: "Supprimer",
  chooseType: "Choisir un type",
  cellLabel: (column: string, row: number) => `${column}, ligne ${row}`,
  deleteRow: (row: number, type: string | undefined) =>
    type === undefined ? `Supprimer la ligne ${row}` : `Supprimer la ligne ${row}${NBSP}: ${type}`,
  addRoom: "Ajouter une pièce",
  noRooms: `Aucune pièce indiquée${NBSP}: le moteur Tracea s'appuiera sur la description.`,
  rowDeleted: (row: number) => `Ligne ${row} supprimée.`,

  siteHeading: "Terrain",
  width: "Largeur (m)",
  depth: "Profondeur (m)",
  access: "Voie d'accès",
  accessHelp: "Côté de la parcelle qui donne sur la voie.",
  side: (index: number) => `Côté ${index}`,
  north: "Orientation du nord (°)",
  northHelp: `0${NBSP}: le nord est en haut de l'aperçu. L'angle se compte dans le sens des aiguilles d'une montre.`,
  front: "Recul avant (m)",
  sideSetback: "Recul latéral (m)",
  rear: "Recul arrière (m)",
  setbacksHelp: `Distances minimales à respecter${NBSP}: l'avant depuis la voie d'accès, l'arrière depuis la limite opposée, le latéral depuis chacune des deux autres limites.`,
  emptyZone: `Avec ces reculs, il ne reste aucune zone constructible sur le terrain. Réduisez les reculs ou agrandissez le terrain${NBSP}: la génération des plans sera impossible tant que la zone est vide.`,
  slope: "Pente (%)",
  slopeDirection: "Direction de la pente (°)",
  slopeDirectionHelp: "Sens de la descente, compté comme l'orientation du nord.",
  polygonSite: (sides: number) =>
    `Ce terrain a été défini par un contour de ${sides} côtés. Sa forme ne se modifie pas sur cet écran.`,

  previewTitle: "Aperçu du terrain",
  previewCaption: `Aperçu du terrain${NBSP}: schéma de votre saisie, sans valeur de plan.`,
  previewBlank: "Indiquez la largeur et la profondeur du terrain pour afficher l'aperçu.",
  previewInvalid: `Aperçu indisponible${NBSP}: corrigez les valeurs du terrain signalées ci-dessous.`,
  previewZone: "zone constructible",
  previewNoZone: "aucune zone constructible",
  previewAccess: "voie d'accès",

  examplesTitle: "Exemples de descriptions",
  examplesIntro: `Ces exemples montrent le niveau de détail utile au moteur Tracea${NBSP}: usage, surface, pièces et leurs liens, orientation, toiture, terrain. Utilisez-en un comme point de départ, puis adaptez-le.`,
  useExample: "Utiliser cet exemple",
  useExampleLabel: (title: string) => `Utiliser cet exemple${NBSP}: ${title}`,
  close: "Fermer",
  replaceTitle: `Remplacer la description${NBSP}?`,
  replaceBody: (title: string) =>
    `Le texte actuel de la description sera remplacé par l'exemple ${quoted(title)}. Il ne pourra pas être récupéré.`,
  replaceAction: "Remplacer la description",
  cancel: "Annuler",
  exampleInserted: "Exemple inséré dans la description.",

  loading: "Chargement du projet…",
  loadError: "Impossible d'afficher le projet",
  retry: "Réessayer",
  backToProjects: "Retour à Mes projets",
  notFoundTitle: "Projet introuvable",
  notFoundBody: `Ce projet n'existe pas ou n'est plus disponible${NBSP}: il a peut-être été supprimé, ou l'adresse est incorrecte.`,

  conflictBar: `Enregistrement suspendu${NBSP}: ce projet a été modifié ailleurs.`,
  failedBar: (message: string) => `Enregistrement impossible${NBSP}: ${message}`,
  offlineBar: `Hors ligne${NBSP}: vos modifications seront enregistrées au retour de la connexion.`,
  waitingBar: (cause: string) =>
    `Enregistrement en attente${NBSP}: ${cause}. Nouvel essai automatique dans quelques secondes.`,
  waitingCause: {
    network: "le service est injoignable",
    rate: "trop de requêtes en peu de temps",
    unavailable: "le service est momentanément indisponible",
  },
  toFixBar: `Certaines modifications ne sont pas enregistrées${NBSP}: corrigez les champs signalés.`,
  goToField: "Aller au champ à corriger",
  savingBar: "Enregistrement…",
  modifiedBar: "Modifications non enregistrées",
  savedBar: (date: string) => `Enregistré automatiquement · ${date}`,
  savedAnnouncement: "Modifications enregistrées.",

  conflictTitle: "Projet modifié ailleurs",
  conflictDetail:
    "Ce projet a été modifié depuis une autre fenêtre. Rechargez-le pour retrouver la dernière version.",
  reload: "Recharger le projet",
  reloadTitle: `Recharger le projet${NBSP}?`,
  reloadBody:
    "Les modifications faites sur cette page depuis le dernier enregistrement seront perdues. Copiez d'abord le texte que vous souhaitez garder.",
  reloadPending: "Chargement…",
  reloaded: "Dernière version du projet chargée.",

  leaveTitle: `Quitter cette page${NBSP}?`,
  leaveBody:
    "Certaines modifications ne sont pas enregistrées et seront perdues si vous quittez cette page.",
  stay: "Rester sur la page",
  leave: "Quitter sans enregistrer",
  created: (name: string) =>
    `Projet ${quoted(name)} créé. Il figure dans ${quoted("Mes projets")}.`,
} as const;
