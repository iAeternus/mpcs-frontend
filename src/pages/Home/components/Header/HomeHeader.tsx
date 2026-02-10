import { Layout, Avatar, Dropdown, Switch } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleTheme } from "@/store/modules/themeStore";

const { Header } = Layout;

export const HomeHeader = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);

  const items = [
    { key: "profile", label: "个人中心", onClick: () => navigate("/profile") },
    {
      key: "theme",
      label: (
        <div className="flex justify-between items-center gap-3">
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
        sticky top-0 z-50
        flex justify-between items-center px-8
        bg-white/45 dark:bg-white/5
        backdrop-blur-xl
        shadow-sm
      "
    >
      {/* MPCS 渐变标题 */}
      <div
        className="text-xl font-semibold 
        bg-gradient-to-r from-indigo-500 to-purple-600 
        bg-clip-text text-transparent"
      >
        MPCS
      </div>

      <Dropdown menu={{ items }} placement="bottomRight">
        <Avatar
          size="large"
          icon={<UserOutlined />}
          className="
            cursor-pointer
            bg-gradient-to-r from-indigo-500 to-purple-600
            shadow-md
          "
        />
      </Dropdown>
    </Header>
  );
};
