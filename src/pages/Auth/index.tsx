import { ConfigProvider, theme } from "antd";
import { Outlet } from "react-router-dom";

export const AuthPage = () => {
  return (
    <ConfigProvider
      theme={{
        inherit: false,
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#6366f1",
        },
      }}
    >
      <div className="auth-theme-fixed">
        <Outlet />
      </div>
    </ConfigProvider>
  );
};
