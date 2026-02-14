import type {
  InitUploadCommand,
  CompleteUploadCommand,
  FileUploadResponse,
  InitUploadResponse,
  UploadChunkResponse,
} from "@/types/upload/command";
import { http } from "@/utils/http";

/** 普通上传 */
export const uploadFileApi = async (
  parentId: string,
  file: File,
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await http.request<FileUploadResponse>({
    url: "/files/upload",
    method: "POST",
    params: { parentId },
    data: formData,
  });

  return res.data;
};

/** 初始化分片上传 */
export const initUploadApi = async (
  cmd: InitUploadCommand,
): Promise<InitUploadResponse> => {
  const res = await http.request<InitUploadResponse>({
    url: "/files/upload/init",
    method: "POST",
    data: cmd,
  });
  return res.data;
};

/** 上传分片 */
export const uploadChunkApi = async (
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
): Promise<UploadChunkResponse> => {
  const formData = new FormData();
  formData.append("chunk", chunk);

  const res = await http.request<UploadChunkResponse>({
    url: "/files/upload/chunk",
    method: "POST",
    params: { uploadId, chunkIndex },
    data: formData,
  });

  return res.data;
};

/** 完成分片上传 */
export const completeUploadApi = async (
  cmd: CompleteUploadCommand,
): Promise<FileUploadResponse> => {
  const res = await http.request<FileUploadResponse>({
    url: "/files/upload/complete",
    method: "POST",
    data: cmd,
  });
  return res.data;
};
