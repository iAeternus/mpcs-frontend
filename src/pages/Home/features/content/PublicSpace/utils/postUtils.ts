import type { PublicFileResponse } from "@/types/publicfile/query";
import type { CommentResponse } from "@/types/comment/query";
import { ID_PATTERNS } from "@/constants";
import dayjs from "dayjs";

export type SortValue = "latest" | "oldest" | "hot";

export type PublicPost = Omit<PublicFileResponse, "postId"> & { postId?: string };

export interface CommentNode extends CommentResponse {
  children: CommentNode[];
}

/**
 * 规范化帖子数据
 * @param raw - 原始帖子数据
 * @returns 规范化后的帖子数据
 */
export const normalizePost = (raw: PublicFileResponse): PublicPost | null => {
  const source = raw as PublicFileResponse & {
    id?: string;
    _id?: string;
  };
  const rawPostId = (source.postId ?? source.id ?? source._id ?? "").trim();
  const originalFileId = (source.originalFileId ?? "").trim();
  const title = (source.title ?? "").trim();

  if (!originalFileId || !title) return null;
  const postId = ID_PATTERNS.POST_ID.test(rawPostId) ? rawPostId : undefined;

  return {
    ...source,
    postId,
    originalFileId,
    title,
    publisher: (source.publisher ?? "").trim(),
    description: source.description ?? "",
    likeCount: Number(source.likeCount ?? 0),
    commentCount: Number(source.commentCount ?? 0),
  };
};

/**
 * 规范化评论ID
 * @param comment - 评论数据
 * @returns 规范化后的评论ID或null
 */
export const normalizeCommentId = (comment: CommentResponse): string | null => {
  const id = (comment.commentId ?? "").trim();
  if (!ID_PATTERNS.COMMENT_ID.test(id)) return null;
  return id;
};

/**
 * 构建评论树结构
 * @param comments - 评论列表
 * @returns 树形结构的评论
 */
export const buildCommentTree = (comments: CommentResponse[]): CommentNode[] => {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    const id = normalizeCommentId(comment);
    const node: CommentNode = {
      ...comment,
      commentId: id ?? undefined,
      parentId: (comment.parentId ?? "").trim() || null,
      children: [],
    };

    if (id) {
      nodeMap.set(id, node);
    } else {
      roots.push(node);
    }
  });

  nodeMap.forEach((node, id) => {
    const parentId = (node.parentId ?? "").trim();
    if (!parentId) {
      roots.push(node);
      return;
    }

    const parent = nodeMap.get(parentId);
    if (!parent || parentId === id) {
      roots.push(node);
      return;
    }

    parent.children.push(node);
  });

  const sortByCreatedAt = (items: CommentNode[]) => {
    items.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    );
    items.forEach((item) => sortByCreatedAt(item.children));
  };
  sortByCreatedAt(roots);

  return roots;
};
