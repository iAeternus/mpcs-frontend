import type { UserInfoResponse, UserProfileResponse } from "@/types/user/query";
import { http } from "@/utils/http";

// 获取我的个人资料
export const fetchMyProfileApi = () => {
  http.request<UserProfileResponse>({
    url: "/user/me",
    method: "GET",
  });
};

// 获取我的用户信息
export const fetchMyUserInfoApi = () => {
  http.request<UserInfoResponse>({
    url: "/user/me/info",
    method: "GET",
  });
};
