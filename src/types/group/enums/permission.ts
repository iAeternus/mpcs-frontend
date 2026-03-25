export const Permission = {
  CREATE: "CREATE",
  READ: "READ",
  WRITE: "WRITE",
  DELETE: "DELETE",
  MOVE: "MOVE",
  PUBLIC: "PUBLIC",
  MANAGE: "MANAGE",
};

export type Permission = (typeof Permission)[keyof typeof Permission];

export const PERMISSION_LABELS: Record<Permission, string> = {
  CREATE: "创建",
  READ: "读取",
  WRITE: "写入",
  DELETE: "删除",
  MOVE: "移动",
  PUBLIC: "公开",
  MANAGE: "管理",
};

export const PERMISSION_COLORS: Record<Permission, string> = {
  CREATE: "blue",
  READ: "green",
  WRITE: "orange",
  DELETE: "red",
  MOVE: "purple",
  PUBLIC: "cyan",
  MANAGE: "gold",
};
