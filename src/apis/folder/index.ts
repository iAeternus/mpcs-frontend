import type {
  CreateFolderCommand,
  RenameFolderCommand,
  DeleteFolderForceCommand,
  MoveFolderCommand,
  MoveFolderResponse,
} from "@/types/folder/command";
import type { FolderHierarchyResponse } from "@/types/folder/query";
import type { IdResponse } from "@/types/common/id";
import { http } from "@/utils/http";

/** 创建文件夹 */
export const createFolderApi = async (
  cmd: CreateFolderCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/folders",
    method: "POST",
    data: cmd,
  });
  return res.data;
};

/** 文件夹重命名 */
export const renameFolderApi = async (
  folderId: string,
  cmd: RenameFolderCommand,
): Promise<void> => {
  await http.request({
    url: `/folders/${folderId}/name`,
    method: "POST",
    data: cmd,
  });
};

/** 删除文件夹 */
export const deleteFolderApi = async (folderId: string): Promise<void> => {
  await http.request({
    url: `/folders/${folderId}`,
    method: "DELETE",
  });
};

/** 强制删除文件夹 */
export const deleteFolderForceApi = async (
  folderId: string,
  cmd: DeleteFolderForceCommand,
): Promise<void> => {
  await http.request({
    url: `/folders/${folderId}/delete-force`,
    method: "DELETE",
    data: cmd,
  });
};

/** 移动文件夹 */
export const moveFolderApi = async (
  cmd: MoveFolderCommand,
): Promise<MoveFolderResponse> => {
  const res = await http.request<MoveFolderResponse>({
    url: "/folders/move",
    method: "PUT",
    data: cmd,
  });
  return res.data;
};

/** 获取文件夹层级 */
export const getFolderHierarchyApi =
  async (): Promise<FolderHierarchyResponse> => {
    const res = await http.request<FolderHierarchyResponse>({
      url: "/folders/hierarchy",
      method: "GET",
    });
    return res.data;
  };
