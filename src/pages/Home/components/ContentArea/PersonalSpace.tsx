import { useEffect, useState } from "react";
import { fetchMyUserInfoApi } from "@/apis/user";
import { useAppSelector } from "@/store";
import type { UserInfoResponse } from "@/types/user/query";
import { FolderHierarchy } from "../Hierarchy/FolderHierarchy";

export const PersonalSpace = () => {
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const themeMode = useAppSelector((state) => state.theme.mode);

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
    <div
      className={`mpcs-personal-space relative overflow-hidden py-10 ${
        themeMode === "dark"
          ? "bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1020]"
          : "bg-gradient-to-br from-slate-50 via-white to-sky-50"
      }`}
    >
      <div
        className={`pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full blur-3xl ${
          themeMode === "dark" ? "bg-indigo-500/25" : "bg-cyan-300/35"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full blur-3xl ${
          themeMode === "dark" ? "bg-sky-500/15" : "bg-emerald-200/35"
        }`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full blur-3xl ${
          themeMode === "dark" ? "bg-fuchsia-500/20" : "bg-sky-300/30"
        }`}
      />

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
    </div>
  );
};
