export interface EsFile {
  id: string;
  name: string;
  category: string;
  summary: string;
  keywords: string[];
  sizeInBytes: number;
  lastModified: string;
}

export interface FieldHighlight {
  fieldName: string;
  highlightedText: string;
}

export interface Highlight {
  id: string;
  highlights: FieldHighlight[];
}