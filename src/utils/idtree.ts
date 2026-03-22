import type { IdNode } from "@/types/common/idtree";

/** 后端返回的 ["java.util.ArrayList", [...]] 拍平 */
export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[1])) {
    return raw[1] as T[];
  }
  return (raw ?? []) as T[];
}

interface RawNode {
  id: string;
  children?: unknown[];
}

/** 规范化 IdNode 结构 */
export function normalizeIdNodes(raw: unknown): IdNode[] {
  const list = unwrapList<RawNode>(raw);
  return list.map((n) => ({
    id: n.id,
    children: normalizeIdNodes(n.children),
  }));
}

/** Antd TreeNode */
export interface AntdTreeNode {
  key: string;
  title: string;
  children?: AntdTreeNode[];
}

/** IdTree + folderNameMap => Antd TreeData */
export function idTreeToAntdTree(
  nodes: IdNode[],
  nameMap: Record<string, string>,
): AntdTreeNode[] {
  return nodes.map((n) => ({
    key: n.id,
    title: nameMap[n.id] ?? "未命名文件夹",
    children: n.children?.length
      ? idTreeToAntdTree(n.children, nameMap)
      : undefined,
  }));
}

/** 构建 id -> node map（避免 DFS） */
export function buildNodeMap(nodes: IdNode[]) {
  const map = new Map<string, IdNode>();
  const walk = (ns: IdNode[]) => {
    ns.forEach((n) => {
      map.set(n.id, n);
      walk(n.children ?? []);
    });
  };
  walk(nodes);
  return map;
}
