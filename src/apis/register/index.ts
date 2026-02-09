import type {
  RegisterCommand,
  RegisterResponse,
} from "@/types/register/command";
import { http } from "@/utils/http";

// 注册
export const registerApi = async (
  cmd: RegisterCommand,
): Promise<RegisterResponse> => {
  const res = await http.request<RegisterResponse>({
    url: "/user/registration",
    method: "POST",
    data: cmd,
  });

  return res.data;
};
