export interface PageQuery {
  pageIndex: number;
  pageSize: number;
}

export interface SearchablePageQuery extends PageQuery {
  search: string;
  sortedBy: string;
  ascSort: boolean;
}

export interface PagedList<T> {
  totalCnt: number;
  pageIndex: number;
  pageSize: number;
  data: T[];
}
