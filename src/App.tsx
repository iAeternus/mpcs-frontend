import React, { useEffect } from "react";
import { ConfigProvider, theme, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useAppSelector, useAppDispatch } from "@/store";
import { setAntdApis } from "@/utils/antdHolder"; // ✅ 新增

interface AppProps {
  children: React.ReactNode;
}

export const App: React.FC<AppProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const primaryColor = useAppSelector((state) => state.theme.primaryColor);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (themeMode === "dark") {
      root.classList.add("dark");
      body.style.backgroundColor = "#141414";
      body.style.color = "rgba(255, 255, 255, 0.85)";
    } else {
      root.classList.remove("dark");
      body.style.backgroundColor = "#f0f2f5";
      body.style.color = "rgba(0, 0, 0, 0.88)";
    }
  }, [themeMode]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm:
          themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: primaryColor,
        },
      }}
    >
      <AntdApp>
        <AntdContextRegister>{children}</AntdContextRegister>
      </AntdApp>
    </ConfigProvider>
  );
};

const AntdContextRegister: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { message, notification } = AntdApp.useApp();

  useEffect(() => {
    setAntdApis({
      messageApi: message,
      notificationApi: notification,
    });
  }, [message, notification]);

  return <>{children}</>;
};
