export interface PageQuery {
  pageIndex: number;
  pageSize: number;
}

export interface PagedList<T> {
  totalCnt: number;
  pageIndex: number;
  pageSize: number;
  data: T[];
}
