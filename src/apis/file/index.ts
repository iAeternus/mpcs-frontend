import type { RenameFileCommand, MoveFileCommand } from "@/types/file/command";
import type {
  FilePathResponse,
  SearchPageQuery,
  SearchResponse,
} from "@/types/file/query";
import { http } from "@/utils/http";

/** 文件重命名 */
export const renameFileApi = async (
  fileId: string,
  cmd: RenameFileCommand,
): Promise<void> => {
  await http.request({
    url: `/files/${fileId}/name`,
    method: "PUT",
    data: cmd,
  });
};

// /** 删除文件 */
// export const deleteFileApi = async (fileId: string): Promise<void> => {
//   await http.request({
//     url: `/files/${fileId}`,
//     method: "DELETE",
//   });
// };

/** 强制删除文件 */
export const deleteFileForceApi = async (fileId: string): Promise<void> => {
  await http.request({
    url: `/files/${fileId}/delete-force`,
    method: "DELETE",
  });
};

/** 移动文件 */
export const moveFileApi = async (cmd: MoveFileCommand): Promise<void> => {
  await http.request({
    url: "/files/move",
    method: "PUT",
    data: cmd,
  });
};

/** 下载文件 */
export const downloadApi = async (fileId: string): Promise<Blob> => {
  const res = await http.request<Blob>({
    url: `/files/${fileId}/download`,
    method: "GET",
    responseType: "blob",
  });
  return res.data;
};

/** 预览文件 */
export const previewApi = (fileId: string): string => {
  const baseUrl = (http.defaults.baseURL ?? "").replace(/\/$/, "");
  return `${baseUrl}/files/${fileId}/preview`;
};

/** 获取文件路径 */
export const fetchFilePathApi = async (
  customId: string,
  fileId: string,
): Promise<FilePathResponse> => {
  const res = await http.request<FilePathResponse>({
    url: `/files/${customId}/${fileId}/path`,
    method: "GET",
  });
  return res.data;
};

/** 获取文件信息 */
export const fetchFileInfoApi = async (
  fileId: string,
): Promise<FilePathResponse> => {
  const res = await http.request<FilePathResponse>({
    url: `/files/${fileId}/info`,
    method: "GET",
  });
  return res.data;
};

/** 随处搜索 */
export const searchFileApi = async (
  query: SearchPageQuery,
): Promise<SearchResponse> => {
  const res = await http.request<SearchResponse>({
    url: "/files/search",
    method: "POST",
    data: query,
  });
  return res.data;
};
