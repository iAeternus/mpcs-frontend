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

export const removeGroupMemberApi = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/members/${memberId}`,
    method: "DELETE",
  });
};

export const removeGroupManagerApi = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/managers/${memberId}`,
    method: "DELETE",
  });
};

export const deleteGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}`,
    method: "DELETE",
  });
};

export const activateGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/activation`,
    method: "PUT",
  });
};

export const deactivateGroupApi = async (groupId: string): Promise<void> => {
  await http.request({
    url: `/groups/${groupId}/deactivation`,
    method: "PUT",
  });
};

export const addGrantApi = async (cmd: AddGrantCommand): Promise<void> => {
  await http.request({
    url: "/groups/grant",
    method: "PUT",
    data: cmd,
  });
};

export const addGrantsApi = async (cmd: AddGrantsCommand): Promise<void> => {
  await http.request({
    url: "/groups/grants",
    method: "PUT",
    data: cmd,
  });
};

export const fetchGroupFoldersApi = async (
  groupId: string,
  memberId?: string,
): Promise<GroupFoldersResponse> => {
  const res = await http.request<GroupFoldersResponse>({
    url: `/groups/${groupId}/folders`,
    method: "GET",
    params: memberId ? { memberId } : undefined,
  });
  return res.data;
};

export const fetchGroupOrdinaryMembersApi = async (
  groupId: string,
): Promise<GroupOrdinaryMembersResponse> => {
  const res = await http.request<GroupOrdinaryMembersResponse>({
    url: `/groups/${groupId}/ordinary-member`,
    method: "GET",
  });
  return res.data;
};

export const fetchGroupManagersApi = async (
  groupId: string,
): Promise<GroupManagersResponse> => {
  const res = await http.request<GroupManagersResponse>({
    url: `/groups/${groupId}/managers`,
    method: "GET",
  });
  return res.data;
};

export const pageMyGroupsAsForManagerApi = async (
  query: MyGroupsAsForManagerPageQuery,
): Promise<PagedList<GroupResponse>> => {
  const res = await http.request<PagedList<GroupResponse>>({
    url: "/groups/page/my-groups",
    method: "POST",
    data: query,
  });
  return res.data;
};

export const pageMyGroupsAsForMemberApi = async (
  query: MyGroupsAsForMemberPageQuery,
): Promise<PagedList<GroupResponse>> => {
  const res = await http.request<PagedList<GroupResponse>>({
    url: "/groups/page/my-joined",
    method: "POST",
    data: query,
  });
  return res.data;
};

export const fetchAdminPermissionApi = async (
  customId: string,
  folderId: string,
): Promise<FolderPermissionResponse> => {
  const res = await http.request<FolderPermissionResponse>({
    url: "/groups/permission/admin",
    method: "GET",
    params: { customId, folderId },
  });
  return res.data;
};

export const fetchMemberPermissionApi = async (
  customId: string,
  folderId: string,
  memberId?: string,
): Promise<FolderPermissionResponse> => {
  const res = await http.request<FolderPermissionResponse>({
    url: "/groups/permission/member",
    method: "GET",
    params: memberId ? { customId, folderId, memberId } : { customId, folderId },
  });
  return res.data;
};