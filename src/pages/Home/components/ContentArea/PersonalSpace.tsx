import { useEffect, useState } from "react";
import { fetchMyUserInfoApi } from "@/apis/user";
import type { UserInfoResponse } from "@/types/user/query";
import { FolderHierarchy } from "../Hierarchy/FolderHierarchy";
import { SpaceBackground } from "./SpaceBackground";

export const PersonalSpace = () => {
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const data: UserInfoResponse = await fetchMyUserInfoApi();
        setCustomId(data.customId);
      } finally {
        setLoading(false);
      }
    };
    void fetchUser();
  }, []);

  return (
    <SpaceBackground className="mpcs-personal-space" paddingClassName="py-10">
      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 text-center">
          <h2 className="mpcs-text-strong text-3xl font-semibold">个人空间</h2>
          <p className="mpcs-text-muted mt-2 text-sm">
            右键文件夹即可新增文件、重命名、移动和删除
          </p>
        </div>

        {loading ? (
          <div className="mpcs-text-subtle text-center">加载中...</div>
        ) : customId ? (
          <FolderHierarchy customId={customId} />
        ) : (
          <div className="mpcs-text-danger text-center">获取用户文件夹失败</div>
        )}
      </div>
    </SpaceBackground>
  );
};
