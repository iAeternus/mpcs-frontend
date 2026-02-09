export interface IdTree {
  nodes: IdNode[];
}

export interface IdNode {
  id: string;
  children: IdNode[];
}

export type IdHierarchyMap = Record<string, string>;
