import type { PagedList } from "@/types/common/page";
import type {
  EditDescriptionCommand,
  ModifyTitleCommand,
  PostCommand,
  PostResponse,
  PublicFilePageQuery,
} from "@/types/publicfile/command";
import type {
  CommentCountResponse,
  LikeCountResponse,
  PublicFileResponse,
} from "@/types/publicfile/query";
import { http } from "@/utils/http";

/** 发布到社区 */
export const postApi = async (cmd: PostCommand): Promise<PostResponse> => {
  const res = await http.request<PostResponse>({
    url: "/public-files",
    method: "POST",
    data: cmd,
  });
  return res.data;
};

/** 撤回文件 */
export const withdrawApi = async (postId: string): Promise<void> => {
  await http.request({
    url: `/public-files/${postId}/withdraw`,
    method: "DELETE",
  });
};

/** 修改标题 */
export const updateTitleApi = async (
  cmd: ModifyTitleCommand,
): Promise<void> => {
  await http.request({
    url: "/public-files/title",
    method: "PUT",
    data: cmd,
  });
};

/** 编辑介绍文字 */
export const editDescriptionApi = async (
  cmd: EditDescriptionCommand,
): Promise<void> => {
  await http.request({
    url: "/public-files/description",
    method: "PUT",
    data: cmd,
  });
};

/** 分页查询社区文件 */
export const pageApi = async (
  query: PublicFilePageQuery,
): Promise<PagedList<PublicFileResponse>> => {
  const res = await http.request<PagedList<PublicFileResponse>>({
    url: `/public-files/page`,
    method: "POST",
    data: query,
  });
  return res.data;
};

/** 获取发布物评论数 */
export const fetchCommentCountApi = async (
  postId: string,
): Promise<CommentCountResponse> => {
  const res = await http.request({
    url: `/public-files/${postId}/comment`,
    method: "GET",
  });
  return res.data;
};

/** 获取发布物点赞数 */
export const fetchLikeCountApi = async (
  postId: string,
): Promise<LikeCountResponse> => {
  const res = await http.request({
    url: `/public-files/${postId}/like`,
    method: "GET",
  });
  return res.data;
};

/** 分页获取我发布的文件 */
export const pageMyApi = async (
  query: PublicFilePageQuery,
): Promise<PagedList<PublicFileResponse>> => {
  const res = await http.request<PagedList<PublicFileResponse>>({
    url: `/public-files/page/my`,
    method: "POST",
    data: query,
  });
  return res.data;
};