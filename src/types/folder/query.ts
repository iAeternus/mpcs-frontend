import type { IdTree } from "../common/idtree";

export interface FolderHierarchyResponse {
  idTree: IdTree;
  allFolders: HierarchyFolder[];
}

export interface HierarchyFolder {
  id: string;
  folderName: string;
  parentId: string;
  path: string;
}
