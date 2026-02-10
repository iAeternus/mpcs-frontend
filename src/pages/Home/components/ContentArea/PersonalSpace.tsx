import { useState, useEffect } from "react";
import { FolderHierarchy } from "../Hierarchy/FolderHierarchy";
import type { UserInfoResponse } from "@/types/user/query";
import { fetchMyUserInfoApi } from "@/apis/user";

export const PersonalSpace = () => {
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSelectFolder = (folder: any) => {
    console.log("选中了文件夹：", folder);
  };

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
    fetchUser();
  }, []);

  return (
    <div className="mpcs-personal-space p-4">
      <h2 className="text-2xl font-semibold mb-4">个人空间</h2>

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : customId ? (
        <FolderHierarchy customId={customId} onSelect={handleSelectFolder} />
      ) : (
        <div className="text-center text-red-500">获取用户文件夹失败</div>
      )}
    </div>
  );
};
