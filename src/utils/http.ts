import { getToken } from "@/store/modules/authStore";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { antdNotification } from "./antdHolder";
import { API_CONFIG } from "@/constants";

const http = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true,
});

export const LARGE_FILE_TIMEOUT = API_CONFIG.LARGE_FILE_TIMEOUT;

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
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const userMessage = data?.error?.userMessage;

    if (status === 403) {
      antdNotification.warning("权限不足");
    } else if (userMessage) {
      antdNotification.error(userMessage);
    } else {
      antdNotification.error("请求失败，请稍后重试");
    }

    return Promise.reject(error);
  },
);

export { http };