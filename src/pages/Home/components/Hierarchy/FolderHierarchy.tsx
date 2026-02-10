import { useMemo, useState } from "react";
import {
  Card,
  Spin,
  Tree,
  Breadcrumb,
  Dropdown,
  Modal,
  Input,
  List,
} from "antd";
import type { TreeProps } from "antd";
import type { HierarchyFolder, HierarchyFile } from "@/types/folder/query";
import { idTreeToAntdTree } from "@/utils/idtree";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";

interface FolderHierarchyProps {
  customId: string;
  onCreateFolder?: (parentId: string, name: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onFileClick?: (file: HierarchyFile) => void;
}

export const FolderHierarchy: React.FC<FolderHierarchyProps> = ({
  customId,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onFileClick,
}) => {
  const { loading, idTree, folderMap, folderNameMap } =
    useFolderHierarchy(customId);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  /** Tree 数据 */
  const treeData: TreeProps["treeData"] = useMemo(
    () => idTreeToAntdTree(idTree, folderNameMap),
    [idTree, folderNameMap],
  );

  /** 当前文件夹 */
  const currentFolder: HierarchyFolder | undefined = currentFolderId
    ? folderMap[currentFolderId]
    : undefined;

  /** 子文件夹 */
  const childFolders = useMemo(() => {
    if (!currentFolderId) return [];
    return Object.values(folderMap).filter(
      (f) => f.parentId === currentFolderId,
    );
  }, [currentFolderId, folderMap]);

  /** 当前文件夹文件 */
  const files: HierarchyFile[] = useMemo(() => {
    if (!currentFolder?.files) return [];
    return currentFolder.files.filter(
      (f) => typeof f.size === "number" && !Number.isNaN(f.size),
    );
  }, [currentFolder]);

  /** 面包屑 */
  const breadcrumbItems = useMemo(() => {
    if (!currentFolder) return [];
    const parts = currentFolder.path.split("/");
    return parts.map((id) => ({
      id,
      name: folderNameMap[id] ?? "未命名文件夹",
    }));
  }, [currentFolder, folderNameMap]);

  /** 右键菜单 */
  const buildFolderMenu = (folder: HierarchyFolder) => ({
    items: [
      {
        key: "new",
        label: "新建文件夹",
        onClick: () => {
          Modal.confirm({
            title: "新建文件夹",
            content: <Input autoFocus placeholder="文件夹名称" id="newName" />,
            onOk: () => {
              const name = (
                document.getElementById("newName") as HTMLInputElement
              )?.value;
              name && onCreateFolder?.(folder.id, name);
            },
          });
        },
      },
      {
        key: "rename",
        label: "重命名",
        onClick: () => {
          Modal.confirm({
            title: "重命名文件夹",
            content: <Input defaultValue={folder.folderName} id="renameName" />,
            onOk: () => {
              const name = (
                document.getElementById("renameName") as HTMLInputElement
              )?.value;
              name && onRenameFolder?.(folder.id, name);
            },
          });
        },
      },
      {
        key: "delete",
        danger: true,
        label: "删除",
        onClick: () => {
          Modal.confirm({
            title: "确认删除？",
            content: folder.folderName,
            onOk: () => onDeleteFolder?.(folder.id),
          });
        },
      },
    ],
  });

  return (
    <div className="flex gap-6 w-full">
      {/* 左侧树 */}
      <Card className="w-80" title="文件夹目录">
        {loading ? (
          <Spin />
        ) : (
          <Tree
            treeData={treeData}
            defaultExpandAll
            selectedKeys={currentFolderId ? [currentFolderId] : []}
            onSelect={(keys) => {
              const id = keys[0] as string;
              setCurrentFolderId(id);
            }}
          />
        )}
      </Card>

      {/* 右侧内容 */}
      <Card className="flex-1">
        {/* 面包屑 */}
        <Breadcrumb className="mb-3">
          {breadcrumbItems.map((b) => (
            <Breadcrumb.Item
              key={b.id}
              onClick={() => setCurrentFolderId(b.id)}
              className="cursor-pointer"
            >
              {b.name}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>

        {/* 子文件夹 */}
        <h4 className="mb-2">文件夹</h4>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {childFolders.map((folder) => (
            <Dropdown
              key={folder.id}
              trigger={["contextMenu"]}
              menu={buildFolderMenu(folder)}
            >
              <div
                className="border rounded px-3 py-2 cursor-pointer hover:bg-gray-100"
                onDoubleClick={() => setCurrentFolderId(folder.id)}
              >
                📁 {folder.folderName}
              </div>
            </Dropdown>
          ))}
        </div>

        {/* 文件列表 */}
        <h4 className="mb-2">文件</h4>
        <List
          bordered
          locale={{ emptyText: "该文件夹暂无文件" }}
          dataSource={files}
          renderItem={(file) => (
            <List.Item
              className="cursor-pointer"
              onClick={() => onFileClick?.(file)}
            >
              📄 {file.filename}（{(file.size / 1024).toFixed(1)} KB）
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};
