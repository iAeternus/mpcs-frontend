let messageApi: any;
let notificationApi: any;

export const setAntdApis = (apis: {
  messageApi: any;
  notificationApi: any;
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
};
