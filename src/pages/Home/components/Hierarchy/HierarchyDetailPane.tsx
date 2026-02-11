import { Breadcrumb, Card, Dropdown, List } from "antd";
import type { MenuProps } from "antd";
import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";
import type { BreadcrumbItem } from "./types";

interface HierarchyDetailPaneProps {
  breadcrumbItems: BreadcrumbItem[];
  setCurrentFolderId: (folderId: string) => void;
  childFolders: HierarchyFolder[];
  buildFolderMenu: (folder: HierarchyFolder) => MenuProps;
  folderCardTextColor: string;
  files: HierarchyFile[];
  currentFolderId: string | null;
  buildFileMenu: (file: HierarchyFile, parentFolderId: string) => MenuProps;
  previewFileInBrowser: (file: HierarchyFile) => Promise<void>;
  formatFileSize: (size: number) => string;
}

export const HierarchyDetailPane: React.FC<HierarchyDetailPaneProps> = ({
  breadcrumbItems,
  setCurrentFolderId,
  childFolders,
  buildFolderMenu,
  folderCardTextColor,
  files,
  currentFolderId,
  buildFileMenu,
  previewFileInBrowser,
  formatFileSize,
}) => {
  return (
    <Card className="flex-1 rounded-2xl border border-white/50 bg-white/50 shadow-sm backdrop-blur">
      <Breadcrumb className="mb-3">
        {breadcrumbItems.map((item) => (
          <Breadcrumb.Item
            key={item.id}
            onClick={() => setCurrentFolderId(item.id)}
            className="cursor-pointer"
          >
            {item.name}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>

      <h4 className="mpcs-text-muted mb-2 text-sm font-semibold tracking-wide">
        文件夹
      </h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {childFolders.map((folder) => (
          <Dropdown
            key={folder.id}
            trigger={["contextMenu"]}
            menu={buildFolderMenu(folder)}
          >
            <div
              className="
                border border-gray-200/60
                rounded-xl px-3 py-2 cursor-pointer select-none
                transition-all
                hover:shadow-sm
                hover:-translate-y-0.5
              "
              style={{ color: folderCardTextColor }}
              onDoubleClick={() => setCurrentFolderId(folder.id)}
            >
              📁 {folder.folderName}
            </div>
          </Dropdown>
        ))}
      </div>

      <h4 className="mpcs-text-muted mb-2 mt-6 text-sm font-semibold tracking-wide">
        文件
      </h4>
      <List
        bordered
        locale={{ emptyText: "该文件夹暂无文件" }}
        dataSource={files}
        renderItem={(file) => (
          <Dropdown
            key={file.id}
            trigger={["contextMenu"]}
            menu={
              currentFolderId
                ? buildFileMenu(file, currentFolderId)
                : { items: [] }
            }
          >
            <List.Item
              className="cursor-pointer select-none"
              onDoubleClick={async () => {
                await previewFileInBrowser(file);
              }}
            >
              📄 {file.filename} ({formatFileSize(file.size)})
            </List.Item>
          </Dropdown>
        )}
      />
    </Card>
  );
};
