export const FileStatus = {
  NORMAL: "NORMAL",
  TRASHED: "TRASHED",
  DELETED: "DELETED",
} as const;

export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

export const FileStatusLabelMap: Record<FileStatus, string> = {
  NORMAL: "正常",
  TRASHED: "回收站",
  DELETED: "已删除",
};
