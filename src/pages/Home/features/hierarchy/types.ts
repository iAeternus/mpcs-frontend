import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";

export interface FolderTreeNode {
  key: string;
  title: string;
  children?: FolderTreeNode[];
  isLeaf?: boolean;
  nodeType: "folder" | "file";
  folder?: HierarchyFolder;
  file?: HierarchyFile;
  parentFolderId?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}
