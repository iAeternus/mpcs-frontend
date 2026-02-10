import type { Permission } from "./enums/permission";

// 创建权限组
export interface CreateGroupCommand {
  name: string;
}

// 重命名权限组
export interface RenameGroupCommand {
  newName: string;
}

// 批量添加组成员
export interface AddGroupMembersCommand {
  memberIds: string[];
}

// 批量添加组管理员
export interface AddGroupManagersCommand {
  managerIds: string[];
}

// 添加文件夹并指定权限集合
export interface AddGrantCommand {
  groupId: string;
  folderId: string;
  permissions: Permission[];
}

// 批量添加文件夹并指定权限集合
export interface AddGrantsCommand {
  groupId: string;
  folderIds: string[];
  permissions: Permission[];
}
