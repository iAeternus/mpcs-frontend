import type { SearchablePageQuery } from "../common/page";

export interface PostCommand {
  fileId: string;
}

export interface ModifyTitleCommand {
  postId: string;
  newTitle: string;
}

export interface EditDescriptionCommand {
  postId: string;
  newDescription: string | null;
}

export interface PublicFilePageQuery extends SearchablePageQuery {
  // Empty
}

export interface PostResponse {
  postId: string;
}
