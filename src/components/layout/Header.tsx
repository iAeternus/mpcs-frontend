import type { FC } from "react";
import { useEffect, useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, Layout, Switch } from "antd";
import { useNavigate } from "react-router-dom";
import { logoutApi } from "@/apis/login";
import { fetchMyProfileApi } from "@/apis/user";
import { useAppDispatch, useAppSelector } from "@/store";
import { logout } from "@/store/modules/authStore";
import { toggleTheme } from "@/store/modules/themeStore";

const { Header } = Layout;

interface HomeHeaderProps {
  onGoUsage: () => void;
}

export const HomeHeader: FC<HomeHeaderProps> = ({ onGoUsage }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchMyProfileApi();
        setAvatarUrl(profile.avatarUrl ?? "");
        setUsername(profile.username ?? "");
      } catch {
        setAvatarUrl("");
        setUsername("");
      }
    };
    void loadProfile();
  }, []);

  const handleMenuClick = async (key: string) => {
    if (key === "profile") {
      navigate("/home/user");
      return;
    }

    if (key === "logout") {
      try {
        await logoutApi();
      } finally {
        dispatch(logout());
        navigate("/login", { replace: true });
      }
    }
  };

  const items = [
    { key: "profile", label: "个人中心" },
    {
      key: "theme",
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>暗黑模式</span>
          <Switch
            size="small"
            checked={themeMode === "dark"}
            onChange={() => dispatch(toggleTheme())}
          />
        </div>
      ),
    },
    { key: "logout", label: "退出登录" },
  ];

  const headerBgColor = themeMode === "dark" 
    ? "var(--color-surface-primary)" 
    : "var(--color-surface-primary)";
  const headerBorderColor = themeMode === "dark"
    ? "var(--color-border-subtle)"
    : "var(--color-border-default)";
  const textColor = themeMode === "dark"
    ? "var(--color-text-primary)"
    : "var(--color-text-primary)";

  return (
    <Header
      className="layout-app-header flex items-center justify-between px-6"
      style={{
        backgroundColor: headerBgColor,
        borderBottom: `1px solid ${headerBorderColor}`,
        height: 56,
        lineHeight: '56px',
        padding: '0 24px',
      }}
    >
      <button
        type="button"
        onClick={onGoUsage}
        className="font-semibold text-lg transition-colors"
        style={{ color: "var(--color-brand)" }}
      >
        MPCS
      </button>

      <Dropdown
        menu={{
          items,
          onClick: ({ key }) => {
            void handleMenuClick(key as "profile" | "theme" | "logout");
          },
        }}
        placement="bottomRight"
      >
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--color-surface-secondary)]"
          style={{ color: textColor }}
        >
          <Avatar
            size="default"
            src={avatarUrl || undefined}
            icon={<UserOutlined />}
            style={{ backgroundColor: "var(--color-brand)" }}
          />
          <span className="max-w-[120px] truncate text-sm font-medium">
            {username || "用户"}
          </span>
        </button>
      </Dropdown>
    </Header>
  );
};

export default HomeHeader;