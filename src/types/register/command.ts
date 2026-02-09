export interface RegisterCommand {
  mobileOrEmail: string;
  verification: string;
  password: string;
  username: string;
  agreement: string; // 是否同意用户协议
}

export interface RegisterResponse {
  userId: string;
}
