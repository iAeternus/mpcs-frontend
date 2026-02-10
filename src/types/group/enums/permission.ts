export const Permission = {
  CREATE: "CREATE",
  READ: "READ",
  WRITE: "WRITE",
  DELETE: "DELETE",
  MOVE: "MOVE",
  SHARE: "SHARE",
  MANAGE: "MANAGE",
};

export type Permission = (typeof Permission)[keyof typeof Permission];
