import { UserOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, Layout, Switch } from "antd";
import { useNavigate } from "react-router-dom";
import { logoutApi } from "@/apis/login";
import { useAppDispatch, useAppSelector } from "@/store";
import { logout } from "@/store/modules/authStore";
import { toggleTheme } from "@/store/modules/themeStore";
import type { HomeTabKey } from "@/pages/Home";

const { Header } = Layout;

interface HomeHeaderProps {
  onGoUsage: () => void;
  onGoPersonalCenter: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  onGoUsage,
  onGoPersonalCenter,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);

  const handleMenuClick = async (key: string) => {
    if (key === "profile") {
      onGoPersonalCenter();
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
      className="
        mpcs-home-header
        sticky top-0 z-50
        flex items-center justify-between px-8
        bg-white/45 dark:bg-gray-900/50
        backdrop-blur-xl
        shadow-sm
      "
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
            void handleMenuClick(key as HomeTabKey | "theme" | "logout");
          },
        }}
        placement="bottomRight"
      >
        <Avatar
          size="large"
          icon={<UserOutlined />}
          className="cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md"
        />
      </Dropdown>
    </Header>
  );
};
