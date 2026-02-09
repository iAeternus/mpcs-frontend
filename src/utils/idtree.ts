import type { IdHierarchyMap, IdNode } from "@/types/common/idtree";

/**
 * 将 IdTree 转换为： id -> path 的映射
 */
export function buildHierarchy(
  nodes: IdNode[],
  separator = "/",
): IdHierarchyMap {
  const result: IdHierarchyMap = {};

  const dfs = (node: IdNode, parentPath: string) => {
    const currentPath = parentPath
      ? `${parentPath}${separator}${node.id}`
      : node.id;

    result[node.id] = currentPath;

    node.children?.forEach((child) => dfs(child, currentPath));
  };

  nodes.forEach((n) => dfs(n, ""));

  return result;
}

/** Antd Tree */
export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
}

export function idTreeToAntdTree(nodes: IdNode[]): TreeNode[] {
  return nodes.map((n) => ({
    key: n.id,
    title: n.id,
    children: idTreeToAntdTree(n.children),
  }));
}
