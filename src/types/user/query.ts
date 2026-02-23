import type { Role } from "./enum/role";

export interface UserProfileResponse {
  userId: string;
  username: string;
  mobileOrEmail: string,
  role: Role;
  avatarUrl: string;
  mobileIdentified: boolean;
}

// TODO: 考虑删除一些字段
export interface UserInfoResponse {
  userId: string;
  username: string;
  email: string;
  mobile: string;
  role: Role;
  customId: string;
}
