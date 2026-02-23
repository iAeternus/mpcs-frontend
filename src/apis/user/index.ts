import type { UserInfoResponse, UserProfileResponse } from "@/types/user/query";
import type {
  UploadAvatarResponse,
  UploadMyAvatarCommand,
} from "@/types/user/command";
import { http } from "@/utils/http";

/** 获取我的个人资料 */
export const fetchMyProfileApi = async (): Promise<UserProfileResponse> => {
  const res = await http.request<UserProfileResponse>({
    url: "/user/me",
    method: "GET",
  });
  return res.data;
};

/** 获取我的用户信息 */
export const fetchMyUserInfoApi = async (): Promise<UserInfoResponse> => {
  const res = await http.request<UserInfoResponse>({
    url: "/user/me/info",
    method: "GET",
  });
  return res.data;
};

/** 获取用户信息 */
export const fetchUserInfoApi = async (
  userId: string,
): Promise<UserInfoResponse> => {
  const res = await http.request<UserInfoResponse>({
    url: `/user/${userId}/info`,
    method: "GET",
  });
  return res.data;
};

/** 上传我的头像 */
export const uploadMyAvatarApi = async (
  cmd: UploadMyAvatarCommand,
): Promise<UploadAvatarResponse> => {
  const formData = new FormData();
  formData.append("avatar", cmd.avatar);

  const res = await http.request<UploadAvatarResponse>({
    url: "/user/me/avatar",
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};
