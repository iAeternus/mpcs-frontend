import type { FC } from "react";
import {
  GlobalOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import type { HomeTabKey } from "../index";

const { Sider } = Layout;

interface Props {
  active: HomeTabKey;
  onChange: (key: HomeTabKey) => void;
}

export const HomeSidebar: FC<Props> = ({ active, onChange }) => {
  const menuItems = [
    { key: "usage", icon: <BarChartOutlined />, label: "用量统计" },
    { key: "personal", icon: <UserOutlined />, label: "个人空间" },
    { key: "team", icon: <TeamOutlined />, label: "团队空间" },
    { key: "public", icon: <GlobalOutlined />, label: "公共空间" },
    { key: "post-manage", icon: <EditOutlined />, label: "发布管理" },
  ];

  return (
    <Sider
      width={72}
      className="rounded-2xl overflow-hidden p-2 bg-white/30 dark:bg-white/5 backdrop-blur-xl shadow-lg"
    >
      <Menu
        mode="inline"
        selectedKeys={[active]}
        onClick={(e) => onChange(e.key as HomeTabKey)}
        className="mpcs-menu bg-transparent border-none"
        items={menuItems.map((item) => ({
          key: item.key,
          icon: <div className="text-lg">{item.icon}</div>,
          label: <div className="text-xs mt-1">{item.label}</div>,
        }))}
        inlineCollapsed
      />
    </Sider>
  );
};
