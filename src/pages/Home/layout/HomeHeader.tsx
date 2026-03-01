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

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onGoUsage }) => {
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

  return (
    <Header
      className="mpcs-home-header sticky top-0 z-50 flex items-center justify-between px-8 backdrop-blur-xl"
      style={{
        backgroundColor:
          themeMode === "dark"
            ? "rgba(15, 23, 42, 0.68)"
            : "rgba(255, 255, 255, 0.88)",
        borderBottom:
          themeMode === "dark"
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(148,163,184,0.35)",
        boxShadow:
          themeMode === "dark"
            ? "0 8px 24px rgba(0,0,0,0.35)"
            : "0 8px 20px rgba(15,23,42,0.08)",
      }}
    >
      <button
        type="button"
        onClick={onGoUsage}
        className="mpcs-logo bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-xl font-semibold text-transparent"
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
          className={`flex items-center gap-2 rounded-full px-1 py-1 transition-colors ${
            themeMode === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100/75"
          }`}
        >
          <Avatar
            size="large"
            src={avatarUrl || undefined}
            icon={<UserOutlined />}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md"
          />
          <span
            className={`max-w-[160px] truncate text-sm font-medium ${
              themeMode === "dark" ? "text-slate-100" : "text-slate-700"
            }`}
          >
            {username || "用户"}
          </span>
        </button>
      </Dropdown>
    </Header>
  );
};
