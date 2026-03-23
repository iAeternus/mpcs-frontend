import type { FC, ReactNode } from "react";
import { Layout } from "antd";
import { HomeHeader } from "./Header";
import { HomeSidebar } from "./Sidebar";
import { HomeFooter } from "./Footer";
import type { HomeTabKey } from "@/pages/Home";

const { Content } = Layout;

interface AppLayoutProps {
  activeTab: HomeTabKey;
  onTabChange: (key: HomeTabKey) => void;
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="layout-app">
      <HomeHeader onGoUsage={() => onTabChange("usage")} />
      
      <div className="layout-app-body">
        <HomeSidebar active={activeTab} onChange={onTabChange} />
        
        <div className="layout-app-main">
          <Content className="layout-app-content">
            {children}
          </Content>
          
          <HomeFooter />
        </div>
      </div>
    </div>
  );
};

interface SimpleLayoutProps {
  children: ReactNode;
}

export const SimpleLayout: FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <div className="layout-app">
      <div className="layout-app-body" style={{ flexDirection: 'column' }}>
        <Content className="layout-app-content" style={{ flex: 1 }}>
          {children}
        </Content>
      </div>
    </div>
  );
};

export default AppLayout;