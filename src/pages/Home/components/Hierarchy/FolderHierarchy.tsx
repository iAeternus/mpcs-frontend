import { useEffect, useMemo, useState } from "react";
import { Card, Input, Modal, TreeSelect, message, theme } from "antd";
import type { MenuProps, TreeSelectProps } from "antd";
import type { IdNode } from "@/types/common/idtree";
import type { HierarchyFile, HierarchyFolder } from "@/types/folder/query";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";
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
  previewApi,
  renameFileApi,
} from "@/apis/file";
import {
  completeUploadApi,
  initUploadApi,
  uploadChunkApi,
  uploadFileApi,
} from "@/apis/upload";
import { HierarchyDetailPane } from "./HierarchyDetailPane";
import { HierarchyTreePane } from "./HierarchyTreePane";
import { ROOT_OPTION, buildTreeData, formatFileSize } from "./utils";

interface FolderHierarchyProps {
  customId: string;
}

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024;

export const FolderHierarchy: React.FC<FolderHierarchyProps> = ({
  customId,
}) => {
  const { loading, idTree, folderMap, folderNameMap, nodeMap, reload } =
    useFolderHierarchy(customId);

  const { token } = theme.useToken();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (currentFolderId && folderMap[currentFolderId]) return;
    const firstId = idTree[0]?.id ?? null;
    setCurrentFolderId(firstId);
  }, [currentFolderId, folderMap, idTree]);

  const currentFolder: HierarchyFolder | undefined = currentFolderId
    ? folderMap[currentFolderId]
    : undefined;

  const childFolders = useMemo(() => {
    if (!currentFolderId) return [];
    return Object.values(folderMap).filter(
      (folder) => folder.parentId === currentFolderId,
    );
  }, [currentFolderId, folderMap]);

  const rootFolderId = useMemo(() => idTree[0]?.id ?? null, [idTree]);

  const files: HierarchyFile[] = useMemo(() => {
    if (!currentFolder?.files) return [];
    return currentFolder.files.filter(
      (file) => typeof file.size === "number" && !Number.isNaN(file.size),
    );
  }, [currentFolder]);

  const breadcrumbItems = useMemo(() => {
    if (!currentFolder) return [];
    const parts = currentFolder.path.split("/");
    return parts.map((id) => ({
      id,
      name: folderNameMap[id] ?? "未命名文件夹",
    }));
  }, [currentFolder, folderNameMap]);

  const folderOptions = useMemo(
    () => [
      { label: "根目录", value: ROOT_OPTION },
      ...Object.values(folderMap).map((folder) => ({
        label: folder.folderName,
        value: folder.id,
      })),
    ],
    [folderMap],
  );

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

  const uploadFile = (folder: HierarchyFolder) => {
    const calculateFileHash = async (file: File): Promise<string> => {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    const uploadLargeFileByChunks = async (parentId: string, file: File) => {
      const totalSize = file.size;
      const chunkSize = CHUNK_SIZE;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      const fileHash = await calculateFileHash(file);

      const initResp = await initUploadApi({
        fileName: file.name,
        fileHash,
        totalSize,
        chunkSize,
        totalChunks,
      });

      if (!initResp.uploaded) {
        const uploadId = initResp.uploadId;
        if (!uploadId) {
          throw new Error("init upload missing uploadId");
        }

        const uploaded = new Set(initResp.uploadedChunks ?? []);
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          if (uploaded.has(chunkIndex)) continue;
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = file.slice(start, end);
          await uploadChunkApi(uploadId, chunkIndex, chunk);
        }

        await completeUploadApi({
          uploadId,
          parentId,
          fileHash,
          totalSize,
        });
      }
    };

    const uploadByFileSize = async (parentId: string, file: File) => {
      if (file.size >= LARGE_FILE_THRESHOLD) {
        await uploadLargeFileByChunks(parentId, file);
        return;
      }

      await uploadFileApi(parentId, file);
    };

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async () => {
      const selected = Array.from(input.files ?? []);
      if (!selected.length) return;

      try {
        await Promise.all(
          selected.map((file) => uploadByFileSize(folder.id, file)),
        );
        message.success(`上传成功，共 ${selected.length} 个文件`);
        await reload();
      } catch {
        message.error("上传失败");
      }
    };

    input.click();
  };

  const previewFileInBrowser = async (file: HierarchyFile) => {
    const previewUrl = previewApi(file.id);
    const openedWindow = window.open(
      previewUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (!openedWindow) {
      message.warning("浏览器拦截了预览窗口，请允许弹窗后重试");
    }
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
    ],
  });

  const buildFileMenu = (
    file: HierarchyFile,
    parentFolderId: string,
  ): MenuProps => ({
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

  return (
    <Card className="w-full rounded-3xl border border-white/60 bg-white/60 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row">
        <HierarchyTreePane
          loading={loading}
          treeData={treeData}
          currentFolderId={currentFolderId}
          setCurrentFolderId={setCurrentFolderId}
          buildFolderMenu={buildFolderMenu}
          buildFileMenu={buildFileMenu}
          previewFileInBrowser={previewFileInBrowser}
        />

        <HierarchyDetailPane
          breadcrumbItems={breadcrumbItems}
          setCurrentFolderId={setCurrentFolderId}
          childFolders={childFolders}
          buildFolderMenu={buildFolderMenu}
          folderCardTextColor={token.colorText}
          files={files}
          currentFolderId={currentFolderId}
          buildFileMenu={buildFileMenu}
          previewFileInBrowser={previewFileInBrowser}
          formatFileSize={formatFileSize}
        />
      </div>
    </Card>
  );
};
