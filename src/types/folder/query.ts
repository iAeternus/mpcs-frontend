import type { IdTree } from "../common/idtree";
import type { FileStatus } from "../file/enums/fileStatus";
import type { FileCategory } from "../file/enums/fileCategory";

export interface FolderHierarchyResponse {
  idTree: IdTree;
  allFolders: HierarchyFolder[];
}

export interface HierarchyFolder {
  id: string;
  folderName: string;
  parentId: string;
  path: string;
  files: HierarchyFile[];
}

export interface HierarchyFile {
  id: string;
  filename: string;
  size: number;
  status: FileStatus;
  category: FileCategory;
  parentId?: string;
}
