import { getToken } from "@/store/modules/authStore";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { antdNotification } from "./antdHolder";

const http = axios.create({
  baseURL: "http://localhost:8082/api/v1.0",
  timeout: 5000,
  withCredentials: true,
});

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
