import { useState } from "react";
import { PersonalSpace } from "./features/content/PersonalSpace";
import { TeamSpace } from "./features/content/TeamSpace/index";
import { PublicSpace } from "./features/content/PublicSpace/index";
import { PostManage } from "./features/content/PostManage";
import { UsagePage } from "./features/content/UsagePage";
import { AppLayout } from "@/components/layout";

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
    <div 
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <AppLayout activeTab={active} onTabChange={setActive}>
        <div 
          className="h-full rounded-lg p-4"
          style={{ 
            backgroundColor: "var(--color-surface-primary)",
            border: "1px solid var(--color-border-default)"
          }}
        >
          {renderContent()}
        </div>
      </AppLayout>
    </div>
  );
};

export default Home;