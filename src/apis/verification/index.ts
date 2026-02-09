import type { IdResponse } from "@/types/common/id";
import type {
  CreateChangeMobileVerificationCodeCommand,
  CreateFindBackPasswordVerificationCodeCommand,
  CreateLoginVerificationCodeCommand,
  CreateRegisterVerificationCodeCommand,
  IdentifyMobileVerificationCodeCommand,
} from "@/types/verification/command";
import { http } from "@/utils/http";

export const createVerificationCodeForRegisterApi = async (
  cmd: CreateRegisterVerificationCodeCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/verification-codes/for-register",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

export const createVerificationCodeForLoginApi = async (
  cmd: CreateLoginVerificationCodeCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/verification-codes//for-login",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

export const createVerificationCodeForFindBackPasswordApi = async (
  cmd: CreateFindBackPasswordVerificationCodeCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/verification-codes/for-find-back-password",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

export const createVerificationCodeForChangeMobileApi = async (
  cmd: CreateChangeMobileVerificationCodeCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/verification-codes/for-change-mobile",
    method: "POST",
    data: cmd,
  });

  return res.data;
};

export const createVerificationCodeForIdentifyMobileApi = async (
  cmd: IdentifyMobileVerificationCodeCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/verification-codes/for-identify-mobile",
    method: "POST",
    data: cmd,
  });

  return res.data;
};
