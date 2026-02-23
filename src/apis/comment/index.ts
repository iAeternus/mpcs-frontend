import type { PagedList } from "@/types/common/page";
import type {
  CreateCommentCommand,
  CreateCommentResponse,
  DeleteCommentCommand,
} from "@/types/comment/command";
import type {
  CommentPageQuery,
  CommentResponse,
  DirectReplyPageQuery,
  MyCommentPageQuery,
  MyCommentResponse,
} from "@/types/comment/query";
import { http } from "@/utils/http";

/** 创建评论 */
export const createCommentApi = async (
  cmd: CreateCommentCommand,
): Promise<CreateCommentResponse> => {
  const res = await http.request<CreateCommentResponse>({
    url: "/comments",
    method: "POST",
    data: cmd,
  });
  return res.data;
};

/** 删除评论及其子评论 */
export const deleteCommentApi = async (
  cmd: DeleteCommentCommand,
): Promise<void> => {
  await http.request({
    url: "/comments",
    method: "DELETE",
    data: cmd,
  });
};

/** 获取评论详情 */
export const fetchCommentDetailApi = async (
  commentId: string,
): Promise<CommentResponse> => {
  const res = await http.request<CommentResponse>({
    url: `/comments/${commentId}`,
    method: "GET",
  });
  return res.data;
};

/** 分页获取一级评论 */
export const pageCommentsApi = async (
  query: CommentPageQuery,
): Promise<PagedList<CommentResponse>> => {
  const res = await http.request<PagedList<CommentResponse>>({
    url: "/comments/page",
    method: "POST",
    data: query,
  });
  return res.data;
};

/** 分页获取某条评论的直接回复（包含自身） */
export const pageDirectRepliesApi = async (
  query: DirectReplyPageQuery,
): Promise<PagedList<CommentResponse>> => {
  const res = await http.request<PagedList<CommentResponse>>({
    url: "/comments/page/direct",
    method: "POST",
    data: query,
  });
  return res.data;
};

/** 分页获取我的评论 */
export const pageMyCommentsApi = async (
  query: MyCommentPageQuery,
): Promise<PagedList<MyCommentResponse>> => {
  const res = await http.request<PagedList<MyCommentResponse>>({
    url: "/comments/page/my",
    method: "POST",
    data: query,
  });
  return res.data;
};
