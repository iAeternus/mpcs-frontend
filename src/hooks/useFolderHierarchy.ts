import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FolderHierarchyResponse,
  HierarchyFolder,
  HierarchyFile,
} from "@/types/folder/query";
import type { IdNode } from "@/types/common/idtree";
import { fetchFolderHierarchyApi } from "@/apis/folder";
import { normalizeIdNodes, unwrapList, buildNodeMap } from "@/utils/idtree";

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
