import React, { useEffect } from "react";
import { ConfigProvider, theme, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useAppSelector } from "@/store";
import { setAntdApis } from "@/utils/antdHolder";
import "./pages/index.css";

interface AppProps {
  children: React.ReactNode;
}

export const App: React.FC<AppProps> = ({ children }) => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const primaryColor = themeMode === "dark" ? "#8b5cf6" : "#6366f1";

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (themeMode === "dark") {
      root.classList.add("dark");
      body.style.backgroundColor = "#020617";
      body.style.color = "rgba(255,255,255,0.88)";
    } else {
      root.classList.remove("dark");
      body.style.backgroundColor = "#f5f7fb";
      body.style.color = "rgba(0,0,0,0.88)";
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
