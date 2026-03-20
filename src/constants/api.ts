/**
 * API相关配置常量
 */
export const API_CONFIG = {
  /** API基础URL */
  BASE_URL: "http://localhost:8082/api/v1.0",
  /** 请求超时时间(ms) */
  TIMEOUT: 30000,
  /** 大文件上传超时时间(ms) */
  LARGE_FILE_TIMEOUT: 600000,
} as const;

/**
 * 分页相关常量
 */
export const PAGINATION = {
  /** 默认每页数量 */
  DEFAULT_PAGE_SIZE: 20,
  /** 团队分页大小 */
  GROUP_PAGE_SIZE: 100,
  /** 评论分页大小 */
  COMMENT_PAGE_SIZE: 100,
} as const;

/**
 * 文件上传相关常量
 */
export const UPLOAD_CONFIG = {
  /** 大文件阈值: 50MB */
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024,
  /** 分块大小: 50MB */
  CHUNK_SIZE: 50 * 1024 * 1024,
  /** 上传并发数 */
  CONCURRENCY: 10,
  /** 哈希计算分块大小: 10MB */
  HASH_CHUNK_SIZE: 10 * 1024 * 1024,
  /** 分块上传重试次数 */
  RETRY_COUNT: 3,
  /** 重试延迟基数(ms) */
  RETRY_DELAY_BASE: 1000,
} as const;
