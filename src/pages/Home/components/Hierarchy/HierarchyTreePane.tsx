import { Card, Dropdown, Spin, Tree } from "antd";
import type { MenuProps, TreeProps } from "antd";
import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";
import type { FolderTreeNode } from "./types";

interface HierarchyTreePaneProps {
  loading: boolean;
  treeData: TreeProps["treeData"];
  currentFolderId: string | null;
  setCurrentFolderId: (folderId: string) => void;
  buildFolderMenu: (folder: HierarchyFolder) => MenuProps;
  buildFileMenu: (file: HierarchyFile, parentFolderId: string) => MenuProps;
  previewFileInBrowser: (file: HierarchyFile) => Promise<void>;
}

export const HierarchyTreePane: React.FC<HierarchyTreePaneProps> = ({
  loading,
  treeData,
  currentFolderId,
  setCurrentFolderId,
  buildFolderMenu,
  buildFileMenu,
  previewFileInBrowser,
}) => {
  return (
    <Card className="w-full rounded-2xl border border-white/50 bg-white/50 shadow-sm backdrop-blur lg:w-80">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spin />
        </div>
      ) : (
        <Tree
          className="[&_.ant-tree-node-content-wrapper]:select-none"
          treeData={treeData}
          defaultExpandAll
          selectedKeys={currentFolderId ? [`folder:${currentFolderId}`] : []}
          onSelect={(_, info) => {
            const node = info.node as unknown as FolderTreeNode;
            if (node.nodeType === "folder" && node.folder) {
              setCurrentFolderId(node.folder.id);
            }
          }}
          onDoubleClick={async (_, node) => {
            const currentNode = node as unknown as FolderTreeNode;
            if (currentNode.nodeType !== "file" || !currentNode.file) return;

            await previewFileInBrowser(currentNode.file);
          }}
          titleRender={(node) => {
            const currentNode = node as unknown as FolderTreeNode;
            if (currentNode.nodeType === "folder" && currentNode.folder) {
              return (
                <Dropdown
                  trigger={["contextMenu"]}
                  menu={buildFolderMenu(currentNode.folder)}
                >
                  <span className="block select-none pr-2">
                    📁 {currentNode.title}
                  </span>
                </Dropdown>
              );
            }

            if (
              currentNode.nodeType === "file" &&
              currentNode.file &&
              currentNode.parentFolderId
            ) {
              return (
                <Dropdown
                  trigger={["contextMenu"]}
                  menu={buildFileMenu(
                    currentNode.file,
                    currentNode.parentFolderId,
                  )}
                >
                  <span className="block select-none pr-2">
                    📄 {currentNode.title}
                  </span>
                </Dropdown>
              );
            }

            return (
              <span className="block select-none pr-2">
                {String(node.title)}
              </span>
            );
          }}
        />
      )}
    </Card>
  );
};
