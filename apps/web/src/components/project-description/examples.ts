/** Static description examples (EF-200, D30), exact texts of the spec § 6.6. */
export const DESCRIPTION_EXAMPLES = [
  {
    title: "Maison de plain-pied familiale",
    text: "Maison de plain-pied d'environ 110 m² habitables pour un couple avec deux enfants. Entrée avec placard, séjour-cuisine ouvert d'environ 40 m² orienté sud-ouest et prolongé par une terrasse. Trois chambres de 11 à 13 m², regroupées dans une partie nuit, dont une avec dressing. Une salle de bain avec baignoire, un WC séparé et une buanderie accessible depuis le garage. Garage simple accolé. Toiture à deux pans en tuiles. Terrain plat d'environ 600 m², accès par le nord.",
  },
  {
    title: "Maison à étage sur terrain étroit",
    text: "Maison R+1 d'environ 140 m² habitables sur un terrain de 12 m de large en ville. Au rez-de-chaussée : séjour traversant ouvert sur le jardin à l'arrière, cuisine fermée côté rue, WC, cellier et un bureau pouvant servir de chambre d'amis. À l'étage : quatre chambres, une salle de bain et une salle d'eau, un WC séparé. Garage simple intégré côté rue. Toiture à quatre pans en ardoises. Les pièces de vie doivent recevoir la lumière du sud.",
  },
  {
    title: "Petite maison à toit plat",
    text: "Petite maison contemporaine de plain-pied d'environ 75 m² habitables pour une personne qui travaille à domicile. Grand séjour avec cuisine ouverte orienté sud, une chambre, un bureau lumineux, une salle d'eau avec douche de plain-pied et un WC séparé. Pas de garage : deux places de stationnement extérieures suffisent. Toit plat végétalisé. Terrain en légère pente vers le sud, recul de 5 m par rapport à la voie.",
  },
] as const;

export type DescriptionExample = (typeof DESCRIPTION_EXAMPLES)[number];
