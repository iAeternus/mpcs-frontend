import type {
  JwtTokenResponse,
  MobileOrEmailLoginCommand,
  VerificationCodeLoginCommand,
} from "@/types/login/command";
import { http } from "@/utils/http";

// 使用手机号或邮箱登录
export const loginWithMobileOrEmailApi = async (
  cmd: MobileOrEmailLoginCommand,
): Promise<JwtTokenResponse> => {
  const res = await http.request<JwtTokenResponse>({
    url: "/login",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

// 使用验证码登录
export const loginWithVerificationCodeApi = async (
  cmd: VerificationCodeLoginCommand,
): Promise<JwtTokenResponse> => {
  const res = await http.request<JwtTokenResponse>({
    url: "/verification-code-login",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

// 登出
export const logoutApi = async () => {
  await http.request({
    url: "/logout",
    method: "DELETE",
  });
};

// 刷新Token
export const refreshTokenApi = async (): Promise<JwtTokenResponse> => {
  const res = await http.request<JwtTokenResponse>({
    url: "/refresh-token",
    method: "PUT",
  });

  return res.data;
};
