export interface CreateCommentCommand {
  postId: string;
  parentId?: string | null;
  content: string;
}

export interface CreateCommentResponse {
  commentId: string;
}

export interface DeleteCommentCommand {
  postId: string;
  commentId: string;
}
