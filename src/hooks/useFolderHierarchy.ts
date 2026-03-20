import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FolderHierarchyResponse,
  HierarchyFolder,
  HierarchyFile,
} from "@/types/folder/query";
import type { IdNode } from "@/types/common/idtree";
import { fetchFolderHierarchyApi } from "@/apis/folder";
import { normalizeIdNodes, unwrapList, buildNodeMap } from "@/utils/idtree";

/**
 * 规范化文件列表数据
 * @param rawFiles - 原始文件数据
 * @returns 规范化的文件列表
 */
function normalizeFiles(rawFiles: unknown): HierarchyFile[] {
  const files = unwrapList<HierarchyFile>(rawFiles);
  return files.filter(
    (file): file is HierarchyFile =>
      Boolean(file) &&
      typeof file.id === "string" &&
      typeof file.filename === "string" &&
      typeof file.size === "number" &&
      Number.isFinite(file.size),
  );
}

/**
 * 规范化文件夹列表数据
 * @param rawFolders - 原始文件夹数据
 * @returns 规范化的文件夹列表
 */
function normalizeFolders(rawFolders: unknown): HierarchyFolder[] {
  const folders = unwrapList<HierarchyFolder>(rawFolders);
  return folders
    .filter(
      (folder): folder is HierarchyFolder =>
        Boolean(folder) &&
        typeof folder.id === "string" &&
        typeof folder.folderName === "string",
    )
    .map((folder) => ({
      ...folder,
      files: normalizeFiles(folder.files),
    }));
}

/**
 * 文件夹层级数据管理 Hook
 * @param customId - 用户自定义ID，用于获取特定用户的文件夹层级结构
 * @returns 文件夹层级相关状态和方法
 * @example
 * ```tsx
 * const { loading, idTree, folderMap, reload } = useFolderHierarchy(userId);
 * ```
 */
export function useFolderHierarchy(customId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [idTree, setIdTree] = useState<IdNode[]>([]);
  const [folders, setFolders] = useState<HierarchyFolder[]>([]);

  const load = useCallback(async () => {
    const safeCustomId = customId?.trim();
    if (!safeCustomId) {
      setIdTree([]);
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data: FolderHierarchyResponse =
        await fetchFolderHierarchyApi(safeCustomId);

      setIdTree(normalizeIdNodes(data.idTree.nodes));
      setFolders(normalizeFolders(data.allFolders));
    } finally {
      setLoading(false);
    }
  }, [customId]);

  useEffect(() => {
    load();
  }, [load]);

  const folderMap = useMemo(
    () => Object.fromEntries(folders.map((f) => [f.id, f])),
    [folders],
  );

  const folderNameMap = useMemo(
    () => Object.fromEntries(folders.map((f) => [f.id, f.folderName])),
    [folders],
  );

  const nodeMap = useMemo(() => buildNodeMap(idTree), [idTree]);

  return {
    loading,
    idTree,
    folders,
    folderMap,
    folderNameMap,
    nodeMap,
    reload: load,
  };
}
