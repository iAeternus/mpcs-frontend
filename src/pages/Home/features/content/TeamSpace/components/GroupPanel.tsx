import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Radio,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import type { CheckboxOptionType } from "antd/es/checkbox";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";
import type { IdNode } from "@/types/common/idtree";
import type { GroupFolder, Manager, OrdinaryMember } from "@/types/group/query";
import { InheritancePolicy } from "@/types/group/enums/inheritancePolicy";
import { Permission } from "@/types/group/enums/permission";
import type { GroupPermission } from "../types";
import { FolderTree } from "./FolderTree";
import { MemberList } from "./MemberList";
import { MemberModal, RemoveMemberModal } from "./MemberModals";
import { parseUserIds, validateUserIds, getPolicyHint } from "../utils/teamUtils";
import {
  addGrantApi,
  addGrantsApi,
  addGroupManagersApi,
  addGroupMembersApi,
  fetchGroupFoldersApi,
  fetchGroupManagersApi,
  fetchGroupOrdinaryMembersApi,
  removeGroupManagerApi,
  removeGroupMemberApi,
} from "@/apis/group";

const PERMISSION_OPTIONS: CheckboxOptionType[] = Object.values(Permission).map(
  (permission) => ({
    label: permission,
    value: permission,
  }),
);
const PERMISSION_VALUES = Object.values(Permission) as GroupPermission[];

const getDescendantFolderIds = (
  folderId: string,
  nodeMap: Map<string, IdNode>,
): string[] => {
  const root = nodeMap.get(folderId);
  if (!root) return [];

  const result: string[] = [];
  const walk = (node: IdNode) => {
    (node.children ?? []).forEach((child) => {
      result.push(child.id);
      walk(child);
    });
  };

  walk(root);
  return result;
};

const calcExpandedGrantTargets = (
  folderId: string,
  policy: string,
  explicitGrantIds: Set<string>,
  nodeMap: Map<string, IdNode>,
): string[] => {
  if (!folderId) return [];
  if (policy === InheritancePolicy.NONE) return [folderId];

  if (
    policy === InheritancePolicy.FULL ||
    policy === InheritancePolicy.SELECTIVE
  ) {
    return [folderId, ...getDescendantFolderIds(folderId, nodeMap)];
  }

  const root = nodeMap.get(folderId);
  if (!root) return [folderId];

  const targets: string[] = [folderId];
  const walk = (node: IdNode) => {
    (node.children ?? []).forEach((child) => {
      if (explicitGrantIds.has(child.id)) {
        return;
      }
      targets.push(child.id);
      walk(child);
    });
  };
  walk(root);
  return targets;
};

interface GroupPanelProps {
  group: {
    groupId: string;
    name: string;
    customId?: string;
    active: boolean;
    inheritancePolicy: string;
  };
  isManager: boolean;
}

type GrantMode = "single" | "expanded";

export const GroupPanel = ({ group, isManager }: GroupPanelProps) => {
  const safeGroupId = group.groupId?.trim() ?? "";
  const safeCustomId = group.customId?.trim() ?? "";
  const { folderMap, nodeMap } = useFolderHierarchy(safeCustomId);

  const [detailLoading, setDetailLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [members, setMembers] = useState<OrdinaryMember[]>([]);
  const [groupFolders, setGroupFolders] = useState<GroupFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedPermissions, setSelectedPermissions] = useState<GroupPermission[]>([]);
  const [grantMode, setGrantMode] = useState<GrantMode>("single");
  const [memberInput, setMemberInput] = useState("");
  const [managerInput, setManagerInput] = useState("");
  const [removeMemberInput, setRemoveMemberInput] = useState("");
  const [removeManagerInput, setRemoveManagerInput] = useState("");
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [removeMemberModalOpen, setRemoveMemberModalOpen] = useState(false);
  const [removeManagerModalOpen, setRemoveManagerModalOpen] = useState(false);
  const [granting, setGranting] = useState(false);

  const loadGroupDetail = async () => {
    if (!safeGroupId) {
      setManagers([]);
      setMembers([]);
      setGroupFolders([]);
      return;
    }

    setDetailLoading(true);
    try {
      const [managerResp, memberResp, folderResp] = await Promise.all([
        fetchGroupManagersApi(safeGroupId),
        fetchGroupOrdinaryMembersApi(safeGroupId),
        fetchGroupFoldersApi(safeGroupId),
      ]);
      setManagers(managerResp.groupManagers);
      setMembers(memberResp.groupOrdinaryMembers);
      setGroupFolders(folderResp.groupFolders);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadGroupDetail();
  }, [safeGroupId]);

  const explicitGrantIds = useMemo(
    () => new Set(groupFolders.map((folder) => folder.folderId)),
    [groupFolders],
  );

  const folderOptions = useMemo(
    () =>
      Object.values(folderMap).map((folder) => ({
        label: folder.folderName,
        value: folder.id,
      })),
    [folderMap],
  );

  const expandedTargets = useMemo(() => {
    if (!selectedFolderId) return [];
    return calcExpandedGrantTargets(
      selectedFolderId,
      group.inheritancePolicy,
      explicitGrantIds,
      nodeMap,
    );
  }, [explicitGrantIds, group.inheritancePolicy, nodeMap, selectedFolderId]);

  const onAddMembers = async (input: string, role: "manager" | "member") => {
    const ids = parseUserIds(input);
    const validation = validateUserIds(ids);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }

    if (role === "manager") {
      await addGroupManagersApi(safeGroupId, { managerIds: ids });
      setManagerModalOpen(false);
      setManagerInput("");
      message.success(`已添加 ${ids.length} 位管理员`);
    } else {
      await addGroupMembersApi(safeGroupId, { memberIds: ids });
      setMemberModalOpen(false);
      setMemberInput("");
      message.success(`已添加 ${ids.length} 位成员`);
    }
    await loadGroupDetail();
  };

  const onRemoveMembers = async (input: string, role: "manager" | "member") => {
    const ids = parseUserIds(input);
    const validation = validateUserIds(ids);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }

    if (role === "manager") {
      await Promise.all(
        ids.map((userId) => removeGroupManagerApi(safeGroupId, userId)),
      );
      setRemoveManagerModalOpen(false);
      setRemoveManagerInput("");
      message.success(`已移除 ${ids.length} 位管理员`);
    } else {
      await Promise.all(
        ids.map((userId) => removeGroupMemberApi(safeGroupId, userId)),
      );
      setRemoveMemberModalOpen(false);
      setRemoveMemberInput("");
      message.success(`已移除 ${ids.length} 位成员`);
    }
    await loadGroupDetail();
  };

  const onGrantPermissions = async () => {
    if (!selectedFolderId) {
      message.warning("请选择目标文件夹");
      return;
    }
    if (!selectedPermissions.length) {
      message.warning("请至少选择一项权限");
      return;
    }

    setGranting(true);
    try {
      if (grantMode === "single") {
        await addGrantApi({
          groupId: safeGroupId,
          folderId: selectedFolderId,
          permissions: selectedPermissions,
        });
      } else {
        if (expandedTargets.length > 1024) {
          message.warning("批量授权目录过多，请缩小范围后重试");
          return;
        }
        await addGrantsApi({
          groupId: safeGroupId,
          folderIds: expandedTargets,
          permissions: selectedPermissions,
        });
      }

      message.success("权限更新成功");
      await loadGroupDetail();
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color={isManager ? "gold" : "blue"}>
            {isManager ? "管理员视角" : "成员视角"}
          </Tag>
          <Tag>{group.inheritancePolicy}</Tag>
          <span className="mpcs-text-muted text-sm">
            {getPolicyHint(group.inheritancePolicy as any)}
          </span>
        </div>
        {(!group.active || !isManager) && (
          <div className="mt-3">
            {!group.active && (
              <Alert type="warning" showIcon message="该团队已停用，部分操作已受限" />
            )}
            {!isManager && (
              <Alert type="info" showIcon message="当前为普通成员，仅可查看成员列表与团队目录。" className="mt-2" />
            )}
          </div>
        )}
      </Card>

      <FolderTree customId={safeCustomId} />

      <Card
        title="文件夹权限管理"
        className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
      >
        <Space direction="vertical" size={16} className="w-full">
          <Select
            showSearch
            allowClear
            placeholder="选择目标文件夹"
            value={selectedFolderId}
            options={folderOptions}
            onChange={(value) => setSelectedFolderId(value)}
            disabled={!isManager || !group.active}
            className="w-full"
          />

          <Checkbox.Group
            options={PERMISSION_OPTIONS}
            value={selectedPermissions}
            onChange={(values) =>
              setSelectedPermissions(
                values.filter(
                  (value): value is GroupPermission =>
                    typeof value === "string" &&
                    PERMISSION_VALUES.includes(value as GroupPermission),
                ),
              )
            }
            disabled={!isManager || !group.active}
          />

          <Radio.Group
            value={grantMode}
            onChange={(event) => setGrantMode(event.target.value as GrantMode)}
            disabled={!isManager || !group.active}
          >
            <Radio.Button value="single">仅授权当前目录</Radio.Button>
            <Radio.Button value="expanded">按继承策略展开授权</Radio.Button>
          </Radio.Group>

          {grantMode === "expanded" && selectedFolderId && (
            <Alert
              type="info"
              showIcon
              message={`预计覆盖 ${expandedTargets.length} 个目录（依据 ${group.inheritancePolicy} 继承规则）`}
            />
          )}

          <Button
            type="primary"
            loading={granting}
            disabled={!isManager || !group.active}
            onClick={() => void onGrantPermissions()}
          >
            提交权限
          </Button>

          <div>
            <div className="mb-2 text-sm font-medium">已显式授权目录</div>
            <div className="flex flex-wrap gap-2">
              {groupFolders.length ? (
                groupFolders.map((folder) => (
                  <Tag key={folder.folderId}>{folder.folderName}</Tag>
                ))
              ) : (
                <span className="mpcs-text-muted text-sm">暂无显式授权目录</span>
              )}
            </div>
          </div>
        </Space>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <MemberList
          title="管理员"
          members={managers}
          loading={detailLoading}
          isManager={isManager}
          groupActive={group.active}
          onAdd={() => setManagerModalOpen(true)}
          onRemove={() => setRemoveManagerModalOpen(true)}
          addButtonText="添加管理员"
          removeButtonText="移除管理员"
        />
        <MemberList
          title="普通成员"
          members={members}
          loading={detailLoading}
          isManager={isManager}
          groupActive={group.active}
          onAdd={() => setMemberModalOpen(true)}
          onRemove={() => setRemoveMemberModalOpen(true)}
          addButtonText="添加成员"
          removeButtonText="移除成员"
        />
      </div>

      <MemberModal
        open={memberModalOpen}
        title="添加普通成员"
        inputValue={memberInput}
        onInputChange={setMemberInput}
        onConfirm={() => onAddMembers(memberInput, "member")}
        onCancel={() => setMemberModalOpen(false)}
      />
      <MemberModal
        open={managerModalOpen}
        title="添加管理员"
        inputValue={managerInput}
        onInputChange={setManagerInput}
        onConfirm={() => onAddMembers(managerInput, "manager")}
        onCancel={() => setManagerModalOpen(false)}
      />
      <RemoveMemberModal
        open={removeMemberModalOpen}
        title="移除普通成员"
        inputValue={removeMemberInput}
        onInputChange={setRemoveMemberInput}
        onConfirm={() => onRemoveMembers(removeMemberInput, "member")}
        onCancel={() => setRemoveMemberModalOpen(false)}
      />
      <RemoveMemberModal
        open={removeManagerModalOpen}
        title="移除管理员"
        inputValue={removeManagerInput}
        onInputChange={setRemoveManagerInput}
        onConfirm={() => onRemoveMembers(removeManagerInput, "manager")}
        onCancel={() => setRemoveManagerModalOpen(false)}
      />
    </div>
  );
};
