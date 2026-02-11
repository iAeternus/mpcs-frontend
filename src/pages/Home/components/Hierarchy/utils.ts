import type { IdNode } from "@/types/common/idtree";
import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";
import type { FolderTreeNode } from "./types";

export const ROOT_OPTION = "__root__";

export const formatFileSize = (size: number) => `${(size / 1024).toFixed(1)} KB`;

export const isValidHierarchyFile = (
  file: Partial<HierarchyFile>,
): file is HierarchyFile =>
  typeof file.id === "string" &&
  typeof file.filename === "string" &&
  typeof file.size === "number" &&
  Number.isFinite(file.size);

export const buildTreeData = (
  nodes: IdNode[],
  folderMap: Record<string, HierarchyFolder>,
): FolderTreeNode[] => {
  return nodes.map((node) => {
    const folder = folderMap[node.id];
    const folderChildren = buildTreeData(node.children ?? [], folderMap);
    const fileChildren: FolderTreeNode[] = (folder?.files ?? [])
      .filter((file) => isValidHierarchyFile(file))
      .map((file) => ({
        key: `file:${file.id}`,
        title: file.filename,
        isLeaf: true,
        nodeType: "file",
        file,
        parentFolderId: node.id,
      }));

    return {
      key: `folder:${node.id}`,
      title: folder?.folderName ?? "未命名文件夹",
      nodeType: "folder",
      folder,
      children: [...folderChildren, ...fileChildren],
    };
  });
};
