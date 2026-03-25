import type { MessageInstance } from "antd/es/message/interface";
import type { NotificationInstance } from "antd/es/notification/interface";

let messageApi: MessageInstance | null = null;
let notificationApi: NotificationInstance | null = null;

export const setAntdApis = (apis: {
  messageApi: MessageInstance;
  notificationApi: NotificationInstance;
}) => {
  messageApi = apis.messageApi;
  notificationApi = apis.notificationApi;
};

export const antdMessage = {
  success: (msg: string) => messageApi?.success(msg),
  error: (msg: string) => messageApi?.error(msg),
  warning: (msg: string) => messageApi?.warning(msg),
};

export const antdNotification = {
  error: (msg: string) =>
    notificationApi?.error({
      message: "错误",
      description: msg,
      placement: "top",
    }),
  warning: (msg: string) =>
    notificationApi?.warning({
      message: "警告",
      description: msg,
      placement: "top",
    }),
};