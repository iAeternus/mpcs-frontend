import { useState } from "react";
import { Layout } from "antd";
import { PersonalSpace } from "./features/content/PersonalSpace";
import { TeamSpace } from "./features/content/TeamSpace";
import { PublicSpace } from "./features/content/PublicSpace";
import { PostManage } from "./features/content/PostManage";
import { UsagePage } from "./features/content/UsagePage";
import { HomeHeader } from "./layout/HomeHeader";
import { HomeSidebar } from "./layout/HomeSidebar";
import { HomeFooter } from "./layout/HomeFooter";

const { Content } = Layout;
export type HomeTabKey =
  | "usage"
  | "personal"
  | "team"
  | "public"
  | "post-manage";

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
      case "post-manage":
        return <PostManage />;
      default:
        return <UsagePage />;
    }
  };

  return (
    <div className="mpcs-theme-scope relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-[#1c1c2b] dark:via-[#111827] dark:to-[#0f111a]" />
      <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-white/20 blur-3xl" />

      <Layout className="relative min-h-screen bg-transparent">
        <HomeHeader onGoUsage={() => setActive("usage")} />

        <Layout className="gap-6 px-6 py-6">
          <HomeSidebar active={active} onChange={setActive} />

          <Content className="flex justify-center">
            <div
              className="
                mpcs-home-content-card
                w-full max-w-7xl min-h-[75vh]
                rounded-3xl
                bg-white/80 dark:bg-white/5
                backdrop-blur-xl
                shadow-[0_20px_60px_rgba(0,0,0,0.25)]
              "
              style={{
                padding: 0,
                overflow: "hidden",
              }}
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
