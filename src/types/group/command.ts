import type { InheritancePolicy } from "./enums/inheritancePolicy";
import type { Permission } from "./enums/permission";
export interface CreateGroupCommand {
  name: string;
}
export interface RenameGroupCommand {
  newName: string;
}
export interface AddGroupMembersCommand {
  memberIds: string[];
}
export interface AddGroupManagersCommand {
  managerIds: string[];
}
export interface AddGrantCommand {
  groupId: string;
  memberId: string;
  folderId: string;
  permissions: Permission[];
  inheritancePolicy: InheritancePolicy;
}
export interface AddGrantsCommand {
  groupId: string;
  memberId: string;
  folderIds: string[];
  permissions: Permission[];
  inheritancePolicy: InheritancePolicy;
}