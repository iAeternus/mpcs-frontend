import type { SearchablePageQuery } from "../common/page";
import type { InheritancePolicy } from "./enums/inheritancePolicy";

// 分页查询我管理的组
export interface MyGroupsAsForManagerPageQuery extends SearchablePageQuery {}

// 分页查询我加入的组
export interface MyGroupsAsForMemberPageQuery extends SearchablePageQuery {}

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
  username: string;
  mobileOrEmail: string;
}

export interface GroupManagersResponse {
  groupManagers: Manager[];
}

export interface Manager {
  username: string;
  mobileOrEmail: string;
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
