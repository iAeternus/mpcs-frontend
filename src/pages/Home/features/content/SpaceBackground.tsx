import type { PropsWithChildren } from "react";
import { useAppSelector } from "@/store";

interface SpaceBackgroundProps extends PropsWithChildren {
  className?: string;
  paddingClassName?: string;
}

export const SpaceBackground = ({
  className,
  paddingClassName = "py-8",
  children,
}: SpaceBackgroundProps) => {
  const themeMode = useAppSelector((state) => state.theme.mode);

  return (
    <div
      className={`${className ?? ""} relative h-full min-h-[75vh] overflow-hidden ${paddingClassName} ${
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
      {children}
    </div>
  );
};
