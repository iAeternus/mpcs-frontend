export interface PublicFileResponse {
  originalFileId: string;
  publisher: string;
  title: string;
  description: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface CommentCountResponse {
  commentCount: number;
}

export interface LikeCountResponse {
  likeCount: number;
}
