import type { SearchablePageQuery } from "../common/page";
import type { InheritancePolicy } from "./enums/inheritancePolicy";
import type { Permission } from "./enums/permission";
export type MyGroupsAsForManagerPageQuery = SearchablePageQuery;
export type MyGroupsAsForMemberPageQuery = SearchablePageQuery;
export interface FolderPermissionResponse {
  folderId: string;
  customId: string;
  permissions: Permission[];
  roleType: string;
  inherited: boolean;
  memberId?: string;
}
export interface GroupFoldersResponse {
  groupFolders: GroupFolder[];
}
export interface GroupFolder {
  folderId: string;
  folderName: string;
}
export interface GroupOrdinaryMembersResponse {
  groupOrdinaryMembers: OrdinaryMember[];
}
export interface OrdinaryMember {
  userId: string;
  username: string;
  mobileOrEmail: string;
  joinedAt: string;
}
export interface GroupManagersResponse {
  groupManagers: Manager[];
}
export interface Manager {
  userId: string;
  username: string;
  mobileOrEmail: string;
  joinedAt: string;
}
export interface GroupResponse {
  groupId: string;
  customId: string;
  name: string;
  active: boolean;
  inheritancePolicy: InheritancePolicy;
  createdAt: string;
  updatedAt: string;
}