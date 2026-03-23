import { useEffect, useState } from "react";
import { fetchMyUserInfoApi } from "@/apis/user";
import type { UserInfoResponse } from "@/types/user/query";
import { FolderHierarchy } from "../hierarchy/FolderHierarchy";

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

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 'var(--space-4)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border-default)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-xl)',
    fontWeight: 'var(--font-semibold)',
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-tertiary)',
    margin: 'var(--space-2) 0 0 0',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>个人空间</h2>
          <p style={descStyle}>
            右键文件夹即可新增文件、重命名、移动和删除
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <div 
            className="flex items-center justify-center"
            style={{ height: '100%', color: 'var(--color-text-tertiary)' }}
          >
            加载中...
          </div>
        ) : customId ? (
          <FolderHierarchy customId={customId} />
        ) : (
          <div 
            className="flex items-center justify-center"
            style={{ height: '100%', color: 'var(--color-error)' }}
          >
            获取用户文件夹失败
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalSpace;