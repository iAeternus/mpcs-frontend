/**
 * 团队相关常量
 */
export const TEAM_CONFIG = {
  /** 最大批量操作用户ID数量 */
  MAX_BATCH_USER_IDS: 1000,
  /** 批量授权目录数量上限 */
  MAX_BATCH_GRANT_FOLDERS: 1024,
  /** 团队名称最大长度 */
  MAX_GROUP_NAME_LENGTH: 50,
} as const;

/**
 * 公共空间排序选项
 */
export const SORT_OPTIONS = {
  LATEST: "latest",
  OLDEST: "oldest",
  HOT: "hot",
} as const;

export type SortValue = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];
