import type { FC, PropsWithChildren } from "react";

interface SpaceBackgroundProps extends PropsWithChildren {
  className?: string;
  paddingClassName?: string;
}

export const SpaceBackground: FC<SpaceBackgroundProps> = ({
  className,
  paddingClassName = "p-6",
  children,
}) => {
  return (
    <div
      className={`${className ?? ""} h-full min-h-0 ${paddingClassName}`}
      style={{ 
        backgroundColor: "transparent",
      }}
    >
      {children}
    </div>
  );
};

export default SpaceBackground;