import { useEffect, useMemo, useState } from "react";
import { Input, Modal, TreeSelect, message } from "antd";
import type { MenuProps, TreeSelectProps } from "antd";
import type { IdNode } from "@/types/common/idtree";
import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";
import { postApi } from "@/apis/publicfile";
import {
  createFolderApi,
  deleteFolderForceApi,
  moveFolderApi,
  renameFolderApi,
} from "@/apis/folder";
import {
  deleteFileForceApi,
  downloadApi,
  moveFileApi,
  renameFileApi,
} from "@/apis/file";
import { useFilePreview } from "@/hooks/useFilePreview";
import { useNavigate } from "react-router-dom";
import { buildTreeData, ROOT_OPTION } from "./utils";
import { HierarchyTreePane } from "./HierarchyTreePane";
import { useUploadHandler } from "./components/useUploadHandler";
import { useUploadProgress } from "./useUploadProgress";
import { isCollaborationSupported } from "@/types/file/enums/fileCategory";
import { fetchFileContentForCollabApi } from "@/apis/collaboration";

interface FolderHierarchyProps {
  customId: string;
}

/**
 * 文件夹层级管理组件
 * 提供文件夹树形浏览、文件上传下载、文件夹和文件的增删改查功能
 */
export const FolderHierarchy: React.FC<FolderHierarchyProps> = ({
  customId,
}) => {
  const navigate = useNavigate();
  const { openPreview, previewModal } = useFilePreview();
  const { loading, idTree, folderMap, nodeMap, reload } =
    useFolderHierarchy(customId);
  const { state, closeUpload, startUpload, setStep, setHashProgress, setUploadProgress, setTotalChunks, incrementUploadedChunks, UploadProgressComponent } = useUploadProgress();
  const { uploadFile } = useUploadHandler(reload, {
    startUpload,
    setStep,
    setHashProgress,
    setUploadProgress,
    setTotalChunks,
    incrementUploadedChunks,
    closeUpload,
  });

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (currentFolderId && folderMap[currentFolderId]) return;
    const firstId = idTree[0]?.id ?? null;
    setCurrentFolderId(firstId);
  }, [currentFolderId, folderMap, idTree]);

  const rootFolderId = useMemo(() => idTree[0]?.id ?? null, [idTree]);

  const moveFolderTreeData = useMemo(() => {
    const mapToTree = (
      nodes: IdNode[],
      excluded: Set<string>,
    ): NonNullable<TreeSelectProps["treeData"]> =>
      nodes
        .filter((node) => !excluded.has(node.id))
        .map((node) => ({
          title: folderMap[node.id]?.folderName ?? "未命名文件夹",
          value: node.id,
          key: `target:${node.id}`,
          children: mapToTree(node.children ?? [], excluded),
        }));

    return (
      excluded: Set<string>,
    ): NonNullable<TreeSelectProps["treeData"]> => {
      const topLevel = mapToTree(idTree, excluded);
      const singleRootNode = topLevel.length === 1;

      return [
        {
          title: "根目录",
          value: ROOT_OPTION,
          key: `target:${ROOT_OPTION}`,
          children: singleRootNode ? topLevel[0].children : topLevel,
        },
      ];
    };
  }, [folderMap, idTree]);

  const getDescendantIds = (folderId: string) => {
    const root = nodeMap.get(folderId);
    if (!root) return new Set<string>();

    const ids = new Set<string>();
    const walk = (node: IdNode) => {
      node.children?.forEach((child) => {
        ids.add(child.id);
        walk(child);
      });
    };
    walk(root);
    return ids;
  };

  /**
   * 打开输入名称的模态框
   * @param config - 模态框配置
   */
  const openNameModal = ({
    title,
    placeholder,
    initialValue,
    onConfirm,
  }: {
    title: string;
    placeholder: string;
    initialValue?: string;
    onConfirm: (name: string) => Promise<void>;
  }) => {
    const inputId = `name-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    Modal.confirm({
      title,
      content: (
        <Input
          id={inputId}
          autoFocus
          placeholder={placeholder}
          defaultValue={initialValue}
        />
      ),
      onOk: async () => {
        const name = (
          document.getElementById(inputId) as HTMLInputElement | null
        )?.value?.trim();

        if (!name) {
          message.warning("请输入名称");
          return Promise.reject();
        }

        await onConfirm(name);
      },
    });
  };

  const previewFileInBrowser = async (file: HierarchyFile) => {
    openPreview(file.id, file.filename);
  };

  const downloadFile = async (file: HierarchyFile) => {
    const blob = await downloadApi(file.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const buildFolderMenu = (folder: HierarchyFolder): MenuProps => ({
    items: [
      {
        key: "new-file",
        label: "新增文件",
        onClick: () => uploadFile(folder),
      },
      {
        key: "new-folder",
        label: "新建文件夹",
        onClick: () => {
          openNameModal({
            title: "新建文件夹",
            placeholder: "文件夹名称",
            onConfirm: async (name) => {
              await createFolderApi({
                customId,
                parentId: folder.id,
                folderName: name,
              });
              message.success("创建成功");
              await reload();
            },
          });
        },
      },
      ...(folder.id === rootFolderId
        ? []
        : [
            {
              key: "rename",
              label: "重命名文件夹",
              onClick: () => {
                openNameModal({
                  title: "重命名文件夹",
                  placeholder: "请输入新名称",
                  initialValue: folder.folderName,
                  onConfirm: async (name) => {
                    await renameFolderApi(folder.id, {
                      customId,
                      newName: name,
                    });
                    message.success("重命名成功");
                    await reload();
                  },
                });
              },
            },
            {
              key: "move",
              label: "移动文件夹",
              onClick: () => {
                let targetId: string | null | undefined;
                const excluded = getDescendantIds(folder.id);
                excluded.add(folder.id);
                const treeData = moveFolderTreeData(excluded);

                Modal.confirm({
                  title: "移动文件夹",
                  content: (
                    <TreeSelect
                      style={{ width: "100%" }}
                      placeholder="选择目标文件夹"
                      treeData={treeData}
                      treeDefaultExpandAll
                      onChange={(value: string) => {
                        targetId = value === ROOT_OPTION ? null : value;
                      }}
                    />
                  ),
                  onOk: async () => {
                    if (targetId === undefined) {
                      message.warning("请选择目标文件夹");
                      return Promise.reject();
                    }

                    await moveFolderApi({
                      customId,
                      folderId: folder.id,
                      newParentId: targetId,
                    });
                    message.success("移动成功");
                    await reload();
                  },
                });
              },
            },
            {
              key: "delete",
              danger: true,
              label: "强制删除文件夹",
              onClick: () => {
                Modal.confirm({
                  title: "确认强制删除文件夹？",
                  content: folder.folderName,
                  onOk: async () => {
                    await deleteFolderForceApi(folder.id, { customId });
                    message.success("删除成功");
                    await reload();
                  },
                });
              },
            },
          ]),
    ],
  });

  const buildFileMenu = (file: HierarchyFile): MenuProps => ({
    items: [
      {
        key: "rename",
        label: "重命名文件",
        onClick: () => {
          openNameModal({
            title: "重命名文件",
            placeholder: "请输入新文件名",
            initialValue: file.filename,
            onConfirm: async (name) => {
              await renameFileApi(file.id, { newName: name });
              message.success("重命名成功");
              await reload();
            },
          });
        },
      },
      {
        key: "move",
        label: "移动文件",
        onClick: () => {
          let targetId: string | null | undefined;
          const treeData = moveFolderTreeData(new Set<string>());

          Modal.confirm({
            title: "移动文件",
            content: (
              <TreeSelect
                style={{ width: "100%" }}
                placeholder="选择目标文件夹"
                treeData={treeData}
                treeDefaultExpandAll
                onChange={(value: string) => {
                  targetId = value === ROOT_OPTION ? rootFolderId : value;
                }}
              />
            ),
            onOk: async () => {
              if (targetId === undefined) {
                message.warning("请选择目标文件夹");
                return Promise.reject();
              }
              if (!targetId) {
                message.warning("无法获取根目录 ID，请刷新后重试");
                return Promise.reject();
              }

              await moveFileApi({
                fileId: file.id,
                newParentId: targetId,
              });
              message.success("移动成功");
              await reload();
            },
          });
        },
      },
      {
        key: "download",
        label: "下载文件",
        onClick: async () => {
          await downloadFile(file);
          message.success("下载成功");
        },
      },
      ...(isCollaborationSupported(file.category)
        ? [
            {
              key: "collab-edit",
              label: "协同编辑",
              onClick: async () => {
                try {
                  await fetchFileContentForCollabApi(file.id);
                } catch {
                  return;
                }

                const parentFolderId = file.parentId || rootFolderId;
                navigate(
                  `/home/collaboration?fileId=${encodeURIComponent(file.id)}&title=${encodeURIComponent(file.filename)}&parentId=${encodeURIComponent(parentFolderId || "")}`
                );
              },
            },
          ]
        : []),
      {
        key: "post",
        label: "发布到社区",
        onClick: async () => {
          await postApi({ fileId: file.id });
          message.success("发布成功");
        },
      },
      {
        key: "delete",
        danger: true,
        label: "强制删除文件",
        onClick: () => {
          Modal.confirm({
            title: "确认强制删除文件？",
            content: file.filename,
            onOk: async () => {
              await deleteFileForceApi(file.id);
              message.success("删除成功");
              await reload();
            },
          });
        },
      },
    ],
  });

  const treeData = useMemo(
    () => buildTreeData(idTree, folderMap),
    [idTree, folderMap],
  );

  const containerStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: 'var(--color-surface-primary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border-default)',
    overflow: 'hidden',
  };

  return (
    <>
      <div style={containerStyle}>
        <HierarchyTreePane
          loading={loading}
          treeData={treeData}
          currentFolderId={currentFolderId}
          setCurrentFolderId={setCurrentFolderId}
          buildFolderMenu={buildFolderMenu}
          buildFileMenu={buildFileMenu}
          previewFileInBrowser={previewFileInBrowser}
        />
      </div>
      {previewModal}
      <UploadProgressComponent state={state} onClose={closeUpload} />
    </>
  );
};
