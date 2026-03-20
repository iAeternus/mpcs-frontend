import { getToken } from "@/store/modules/authStore";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { antdNotification } from "./antdHolder";
import { API_CONFIG } from "@/constants";

/**
 * HTTP 客户端实例
 * 基于 Axios 创建，预配置了 baseURL、超时、跨域凭证等
 */
const http = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
});

/**
 * 大文件上传超时时间
 */
export const LARGE_FILE_TIMEOUT = API_CONFIG.LARGE_FILE_TIMEOUT;

/**
 * 请求拦截器
 * - 自动添加 Authorization Bearer Token
 * - 添加 X-Trace-Id 请求追踪头
 */
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    const traceId = uuidv4().replace(/-/g, "");
    config.headers["X-Trace-Id"] = traceId;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * 响应拦截器
 * - 统一处理错误提示
 * - 根据后端返回的 error.userMessage 显示通知
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;

    if (data?.error?.userMessage) {
      antdNotification.error(data.error.userMessage);
    } else {
      antdNotification.error("请求失败，请稍后重试");
    }

    return Promise.reject(error);
  },
);

export { http };
