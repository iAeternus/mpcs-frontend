import type { EsFile, Highlight } from "../common/es";
import type { PageQuery } from "../common/page";
import type { FileStatus } from "./enums/fileStatus";

export interface FilePathResponse {
  path: string;
}

export interface FileInfoResponse {
  filename: string;
  size: number;
  status: FileStatus;
}

export interface SearchPageQuery extends PageQuery {
  keyword?: string | null;
}

export interface SearchResponse {
  content: EsFile[];
  highlights: Highlight[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
