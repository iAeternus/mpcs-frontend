import { useState, useEffect } from "react";
import { FolderHierarchy } from "../Hierarchy/FolderHierarchy";
import type { UserInfoResponse } from "@/types/user/query";
import type { HierarchyFile } from "@/types/folder/query";
import { fetchMyUserInfoApi } from "@/apis/user";

export const PersonalSpace = () => {
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** 点击文件 */
  const handleFileClick = (file: HierarchyFile) => {
    console.log("点击了文件：", file);
    // TODO: 预览
  };

  /** 新建文件夹 */
  const handleCreateFolder = (parentId: string, name: string) => {
    console.log("新建文件夹：", parentId, name);
    // TODO: 调用后端 API
  };

  /** 重命名文件夹 */
  const handleRenameFolder = (id: string, name: string) => {
    console.log("重命名文件夹：", id, name);
    // TODO: 调用后端 API
  };

  /** 删除文件夹 */
  const handleDeleteFolder = (id: string) => {
    console.log("删除文件夹：", id);
    // TODO: 调用后端 API
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
        <FolderHierarchy
          customId={customId}
          onFileClick={handleFileClick}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      ) : (
        <div className="text-center text-red-500">获取用户文件夹失败</div>
      )}
    </div>
  );
};
