/**
 * ID格式验证正则表达式
 */
export const ID_PATTERNS = {
  /** 用户ID格式: USR + 17-19位数字 */
  USER_ID: /^USR\d{17,19}$/,
  /** 帖子ID格式: PUB + 17-19位数字 */
  POST_ID: /^PUB\d{17,19}$/,
  /** 评论ID格式: CMT + 17-19位数字 */
  COMMENT_ID: /^CMT\d{17,19}$/,
} as const;

/**
 * 表单验证正则表达式
 */
export const VALIDATION_PATTERNS = {
  MOBILE: /^[1]([3-9])[0-9]{9}$/,
  EMAIL: /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/,
  PASSWORD: /^[A-Za-z\d!@#$%^&*()_+]{6,32}$/,
  USERNAME: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/,
  VERIFICATION_CODE: /^[0-9]{6}$/,
} as const;

/**
 * ID验证辅助函数
 */
export const isValidUserId = (id: string): boolean => ID_PATTERNS.USER_ID.test(id);
export const isValidPostId = (id: string): boolean => ID_PATTERNS.POST_ID.test(id);
export const isValidCommentId = (id: string): boolean => ID_PATTERNS.COMMENT_ID.test(id);
