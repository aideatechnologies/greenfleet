export const DocumentType = {
  ASSICURAZIONE: "ASSICURAZIONE",
  REVISIONE: "REVISIONE",
  BOLLO: "BOLLO",
  CARTA_CIRCOLAZIONE: "CARTA_CIRCOLAZIONE",
  ALTRO: "ALTRO",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DOCUMENT_TYPE_VALUES = Object.values(DocumentType);

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ASSICURAZIONE: "Assicurazione",
  REVISIONE: "Revisione",
  BOLLO: "Bollo",
  CARTA_CIRCOLAZIONE: "Carta di circolazione",
  ALTRO: "Altro",
};
