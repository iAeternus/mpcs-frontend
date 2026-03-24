import type { IdResponse } from "@/types/common/id";
import type { PagedList } from "@/types/common/page";
import type {
  AddGrantCommand,
  AddGrantsCommand,
  AddGroupManagersCommand,
  AddGroupMembersCommand,
  CreateGroupCommand,
  RenameGroupCommand,
} from "@/types/group/command";
import type {
  FolderPermissionResponse,
  GroupFoldersResponse,
  GroupManagersResponse,
  GroupOrdinaryMembersResponse,
  GroupResponse,
  MyGroupsAsForManagerPageQuery,
  MyGroupsAsForMemberPageQuery,
} from "@/types/group/query";
import { http } from "@/utils/http";

/** 创建权限组 */
export const createGroupApi = async (
  cmd: CreateGroupCommand,
): Promise<IdResponse> => {
  const res = await http.request<IdResponse>({
    url: "/groups",
    method: "POST",
    data: cmd,
  });
  return res.data;
};

/** 重命名权限组 */
export const renameGroupApi = async (
  groupId: string,
  cmd: RenameGroupCommand,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/name`,
    method: "PUT",
    data: cmd,
  });
};

/** 批量添加组成员 */
export const addGroupMembersApi = async (
  groupId: string,
  cmd: AddGroupMembersCommand,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/members`,
    method: "PUT",
    data: cmd,
  });
};

/** 批量添加组管理员 */
export const addGroupManagersApi = async (
  groupId: string,
  cmd: AddGroupManagersCommand,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/managers`,
    method: "PUT",
    data: cmd,
  });
};

/** 删除组成员 */
export const removeGroupMemberApi = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/members/${memberId}`,
    method: "DELETE",
  });
};

/** 删除组管理员 */
export const removeGroupManagerApi = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/managers/${memberId}`,
    method: "DELETE",
  });
};

/** 删除权限组 */
export const deleteGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}`,
    method: "DELETE",
  });
};

/** 启用权限组 */
export const activateGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/activation`,
    method: "PUT",
  });
};

/** 禁用权限组 */
export const deactivateGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/deactivation`,
    method: "PUT",
  });
};

/** 添加文件夹并指定权限集合 */
export const addGrantApi = async (cmd: AddGrantCommand): Promise<void> => {
  await http.request({
    url: `/groups/grant`,
    method: "PUT",
    data: cmd,
  });
};

/** 批量添加文件夹并指定权限集合 */
export const addGrantsApi = async (cmd: AddGrantsCommand): Promise<void> => {
  await http.request({
    url: `/groups/grants`,
    method: "PUT",
    data: cmd,
  });
};

/** 获取权限组管理的文件夹 */
export const fetchGroupFoldersApi = async (
  groupId: string,
): Promise<GroupFoldersResponse> => {
  const res = await http.request<GroupFoldersResponse>({
    url: `/groups/${groupId}/folders`,
    method: "GET",
  });
  return res.data;
};

/** 获取权限组普通成员列表 */
export const fetchGroupOrdinaryMembersApi = async (
  groupId: string,
): Promise<GroupOrdinaryMembersResponse> => {
  const res = await http.request<GroupOrdinaryMembersResponse>({
    url: `/groups/${groupId}/ordinary-member`,
    method: "GET",
  });
  return res.data;
};

/** 获取权限组管理员列表 */
export const fetchGroupManagersApi = async (
  groupId: string,
): Promise<GroupManagersResponse> => {
  const res = await http.request<GroupManagersResponse>({
    url: `/groups/${groupId}/managers`,
    method: "GET",
  });
  return res.data;
};

/** 分页获取我管理的权限组 */
export const pageMyGroupsAsForManagerApi = async (
  query: MyGroupsAsForManagerPageQuery,
): Promise<PagedList<GroupResponse>> => {
  const res = await http.request<PagedList<GroupResponse>>({
    url: `/groups/page/my-groups`,
    method: "POST",
    data: query,
  });
  return res.data;
};

/** 分页获取我加入的权限组（包括管理员） */
export const pageMyGroupsAsForMemberApi = async (
  query: MyGroupsAsForMemberPageQuery,
): Promise<PagedList<GroupResponse>> => {
  const res = await http.request<PagedList<GroupResponse>>({
    url: `/groups/page/my-joined`,
    method: "POST",
    data: query,
  });
  return res.data;
};

/** 获取管理员对当前文件夹的权限 */
export const fetchAdminPermissionApi = async (
  customId: string,
  folderId: string,
): Promise<FolderPermissionResponse> => {
  const res = await http.request<FolderPermissionResponse>({
    url: `/groups/permission/admin`,
    method: "GET",
    params: { customId, folderId },
  });
  return res.data;
};

/** 获取普通成员对当前文件夹的权限 */
export const fetchMemberPermissionApi = async (
  customId: string,
  folderId: string,
): Promise<FolderPermissionResponse> => {
  const res = await http.request<FolderPermissionResponse>({
    url: `/groups/permission/member`,
    method: "GET",
    params: { customId, folderId },
  });
  return res.data;
};