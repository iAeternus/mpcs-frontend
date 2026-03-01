import type {
  LikeStatusBatchQuery,
  LikeStatusesResponse,
  LikedCountResponse,
} from "@/types/like/query";
import { http } from "@/utils/http";

/** 点赞 */
export const likeApi = async (postId: string): Promise<void> => {
  await http.request({
    url: `/like/${postId}/like`,
    method: "POST",
  });
};

/** 取消点赞 */
export const unlikeApi = async (postId: string): Promise<void> => {
  await http.request({
    url: `/like/${postId}/unlike`,
    method: "POST",
  });
};

/** 获取点赞数量 */
export const fetchLikedCountApi = async (
  postId: string,
): Promise<LikedCountResponse> => {
  const res = await http.request<LikedCountResponse>({
    url: `/like/${postId}/count`,
    method: "POST",
  });
  return res.data;
};

/** 批量获取当前用户的点赞状态 */
export const fetchLikeStatusesBatchApi = async (
  query: LikeStatusBatchQuery,
): Promise<LikeStatusesResponse> => {
  const res = await http.request<LikeStatusesResponse>({
    url: "/like/status/batch",
    method: "POST",
    data: query,
  });
  return res.data;
};
