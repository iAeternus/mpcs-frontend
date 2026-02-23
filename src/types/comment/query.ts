import type { PageQuery } from "../common/page";

export interface CommentPageQuery extends PageQuery {
  postId: string;
  sortedBy?: string;
  ascSort: boolean;
}

export interface DirectReplyPageQuery extends PageQuery {
  parentId: string;
  sortedBy?: string;
  ascSort: boolean;
}

export interface MyCommentPageQuery extends PageQuery {
  sortedBy?: string;
  ascSort: boolean;
}

export interface CommentResponse {
  username: string;
  postId: string;
  content: string;
  createdAt: string;
}

export interface MyCommentResponse {
  postId: string;
  content: string;
  createdAt: string;
}
