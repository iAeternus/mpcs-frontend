import type { PagedList } from "@/types/common/page";
import type { GroupResponse } from "@/types/group/query";
import { unwrapList } from "@/utils/idtree";
import { InheritancePolicy } from "@/types/group/enums/inheritancePolicy";
import { PAGINATION, TEAM_CONFIG, ID_PATTERNS } from "@/constants";

/**
 * 递归获取所有分页数据
 * @param fetchPage - 分页查询函数
 * @returns 所有数据的扁平数组
 */
export async function fetchAllGroups<T extends GroupResponse>(
  fetchPage: (query: {
    pageIndex: number;
    pageSize: number;
  }) => Promise<PagedList<T>>,
): Promise<T[]> {
  const result: T[] = [];
  let pageIndex = 1;

  while (true) {
    const page = await fetchPage({
      pageIndex,
      pageSize: PAGINATION.GROUP_PAGE_SIZE,
    });

    const pageData = unwrapList<T>(page.data);
    result.push(...pageData);

    const fetchedCount = page.pageIndex * page.pageSize;
    if (fetchedCount >= page.totalCnt || pageData.length === 0) {
      break;
    }

    pageIndex += 1;
  }

  return result;
}

/**
 * 获取继承策略的友好提示文本
 * @param policy - 继承策略枚举值
 * @returns 策略说明文本
 */
export function getPolicyHint(
  policy: GroupResponse["inheritancePolicy"],
): string {
  switch (policy) {
    case InheritancePolicy.NONE:
      return "不继承";
    case InheritancePolicy.FULL:
      return "完全继承";
    case InheritancePolicy.SELECTIVE:
      return "选择性继承";
    case InheritancePolicy.OVERRIDABLE:
      return "可覆盖继承";
    default:
      return "使用系统默认继承规则。";
  }
}

/**
 * 解析并去重用户ID列表
 * @param rawInput - 原始输入（支持逗号、空格、换行等分隔）
 * @returns 去重后的用户ID数组
 */
export function parseUserIds(rawInput: string): string[] {
  return Array.from(
    new Set(
      rawInput
        .split(/[\s,，;；\n\r\t]+/u)
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

/**
 * 验证用户ID列表
 * @param ids - 用户ID数组
 * @returns 验证结果，包含valid标志和错误信息
 */
export function validateUserIds(ids: string[]): {
  valid: true;
} | {
  valid: false;
  message: string;
} {
  const invalidIds = ids.filter((id) => !ID_PATTERNS.USER_ID.test(id));
  if (invalidIds.length > 0) {
    return {
      valid: false,
      message: `以下用户ID格式不正确：${invalidIds.slice(0, 3).join("、")}${invalidIds.length > 3 ? " 等" : ""}`,
    };
  }
  if (ids.length > TEAM_CONFIG.MAX_BATCH_USER_IDS) {
    return {
      valid: false,
      message: `单次最多提交 ${TEAM_CONFIG.MAX_BATCH_USER_IDS} 个用户ID`,
    };
  }
  return { valid: true };
}

/**
 * 规范化团队数据
 * @param raw - 原始团队数据
 * @returns 规范化后的团队数据，null表示无效数据
 */
export function normalizeGroup(raw: GroupResponse): GroupResponse | null {
  const groupId = (raw.groupId ?? "").trim();
  const name = (raw.name ?? "").trim();
  const customId = (raw.customId ?? "").trim();

  if (!groupId || !name) return null;

  return {
    ...raw,
    groupId,
    name,
    customId,
    active: Boolean(raw.active),
  };
}
