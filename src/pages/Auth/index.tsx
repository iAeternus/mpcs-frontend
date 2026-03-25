import { ConfigProvider, theme } from "antd";
import { Outlet } from "react-router-dom";
import { useAppSelector } from "@/store";

export const AuthPage = () => {
  const themeMode = useAppSelector((state) => state.theme.mode);

  return (
    <ConfigProvider
      theme={{
        inherit: false,
        algorithm: themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: themeMode === "dark" ? "#8b5cf6" : "#6366f1",
        },
      }}
    >
      <div className="auth-theme-fixed">
        <Outlet />
      </div>
    </ConfigProvider>
  );
};
