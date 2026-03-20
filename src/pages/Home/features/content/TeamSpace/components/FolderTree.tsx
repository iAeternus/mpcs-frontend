import { FolderHierarchy } from "../../../hierarchy/FolderHierarchy";

interface FolderTreeProps {
  customId: string;
}

export const FolderTree = ({ customId }: FolderTreeProps) => {
  if (!customId) return null;
  return <FolderHierarchy customId={customId} />;
};
