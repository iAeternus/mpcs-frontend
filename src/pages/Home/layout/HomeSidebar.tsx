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
      width={220}
      className="rounded-2xl overflow-hidden p-3 bg-white/45 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    >
      <Menu
        mode="inline"
        selectedKeys={[active]}
        onClick={(e) => onChange(e.key as HomeTabKey)}
        className="mpcs-menu bg-transparent border-none"
        items={menuItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        }))}
      />
    </Sider>
  );
};
