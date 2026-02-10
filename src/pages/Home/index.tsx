import { useState } from "react";
import { Layout } from "antd";
import { PersonalSpace } from "./components/ContentArea/PersonalSpace";
import { TeamSpace } from "./components/ContentArea/TeamSpace";
import { PublicSpace } from "./components/ContentArea/PublicSpace";
import { UsagePage } from "./components/ContentArea/UsagePage";
import { HomeHeader } from "./components/Header/HomeHeader";
import { HomeSidebar } from "./components/SideBar/HomeSidebar";
import { HomeFooter } from "./components/Footer/HomeFooter";

const { Content } = Layout;
export type HomeTabKey = "usage" | "personal" | "team" | "public";

export const Home = () => {
  const [active, setActive] = useState<HomeTabKey>("usage");

  const renderContent = () => {
    switch (active) {
      case "personal":
        return <PersonalSpace />;
      case "team":
        return <TeamSpace />;
      case "public":
        return <PublicSpace />;
      default:
        return <UsagePage />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景渐变 + 光斑 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-[#1c1c2b] dark:via-[#111827] dark:to-[#0f111a]" />
      <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />

      <Layout className="relative bg-transparent min-h-screen">
        <HomeHeader />

        <Layout className="px-6 py-6 gap-6">
          {/* Sidebar */}
          <HomeSidebar active={active} onChange={setActive} />

          {/* 中心内容 */}
          <Content className="flex justify-center">
            <div
              className="
                mpcs-home-content-card
                w-full max-w-7xl min-h-[75vh]
                rounded-3xl
                bg-white/80 dark:bg-white/5
                backdrop-blur-xl
                shadow-[0_20px_60px_rgba(0,0,0,0.25)]
                p-8
              "
            >
              {renderContent()}
            </div>
          </Content>
        </Layout>

        <HomeFooter />
      </Layout>
    </div>
  );
};
