export const Role = {
  SYS_ADMIN: "SYS_ADMIN",
  NORMAL_USER: "NORMAL_USER",
};

export type Role = (typeof Role)[keyof typeof Role];
