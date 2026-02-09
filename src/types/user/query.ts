import type { Role } from "./enum/role";

export interface UserProfileResponse {
  userId: string;
  username: string;
  role: Role;
  avatarUrl: string;
  mobileIdentified: boolean;
}

export interface UserInfoResponse {
  userId: string;
  username: string;
  email: string;
  mobile: string;
  role: Role;
}
