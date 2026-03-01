export interface LikedCountResponse {
  postId: string;
  count: number;
}

export interface LikeStatusBatchQuery {
  postIds: string[];
}

export interface LikeStatusItem {
  postId: string;
  liked: boolean;
}

export interface LikeStatusesResponse {
  statuses: LikeStatusItem[];
}
