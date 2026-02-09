import type { UserInfoResponse, UserProfileResponse } from "@/types/user/query";
import { http } from "@/utils/http";

// 获取我的个人资料
export const fetchMyProfileApi = async (): Promise<UserProfileResponse> => {
  const res = await http.request<UserProfileResponse>({
    url: "/user/me",
    method: "GET",
  });

  return res.data;
};

// 获取我的用户信息
export const fetchMyUserInfoApi = async (): Promise<UserInfoResponse> => {
  const res = await http.request<UserInfoResponse>({
    url: "/user/me/info",
    method: "GET",
  });

  return res.data;
};
