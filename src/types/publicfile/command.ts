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

export type PublicFilePageQuery = SearchablePageQuery;

export interface PostResponse {
  postId: string;
}
