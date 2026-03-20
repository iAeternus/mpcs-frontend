import type { CheckboxOptionType } from "antd/es/checkbox";
import { Permission } from "@/types/group/enums/permission";

export const PERMISSION_OPTIONS: CheckboxOptionType[] = Object.values(Permission).map(
  (permission) => ({
    label: permission,
    value: permission,
  }),
);

export const PERMISSION_VALUES = Object.values(Permission) as (typeof Permission)[keyof typeof Permission][];

export type GroupPermission = (typeof Permission)[keyof typeof Permission];

export type JoinRole = "manager" | "member";
export type GrantMode = "single" | "expanded";

export interface GroupChoice {
  group: {
    groupId: string;
    name: string;
    customId?: string;
    active: boolean;
    inheritancePolicy: string;
  };
  role: JoinRole;
}

export interface GroupSelectOption {
  value: string;
  label: string;
}
