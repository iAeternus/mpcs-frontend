import { useEffect, useMemo, useState } from "react";
import type {
  FolderHierarchyResponse,
  HierarchyFolder,
} from "@/types/folder/query";
import type { IdNode } from "@/types/common/idtree";
import { fetchFolderHierarchyApi } from "@/apis/folder";
import { normalizeIdNodes, unwrapList, buildNodeMap } from "@/utils/idtree";

export function useFolderHierarchy(customId: string) {
  const [loading, setLoading] = useState(false);
  const [idTree, setIdTree] = useState<IdNode[]>([]);
  const [folders, setFolders] = useState<HierarchyFolder[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data: FolderHierarchyResponse =
          await fetchFolderHierarchyApi(customId);

        setIdTree(normalizeIdNodes(data.idTree.nodes));
        setFolders(unwrapList<HierarchyFolder>(data.allFolders));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customId]);

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
  };
}
