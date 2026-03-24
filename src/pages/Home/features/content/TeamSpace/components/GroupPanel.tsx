import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";
import type { IdNode } from "@/types/common/idtree";
import type { FolderPermissionResponse, GroupFolder, Manager, OrdinaryMember } from "@/types/group/query";
import { InheritancePolicy } from "@/types/group/enums/inheritancePolicy";
import { PERMISSION_COLORS, PERMISSION_LABELS, Permission } from "@/types/group/enums/permission";
import type { GroupPermission } from "../types";
import { FolderTree } from "./FolderTree";
import { MemberList } from "./MemberList";
import { MemberModal, RemoveMemberModal } from "./MemberModals";
import { parseUserIds, validateUserIds } from "../utils/teamUtils";
import {
  addGrantApi,
  addGrantsApi,
  addGroupManagersApi,
  addGroupMembersApi,
  fetchGroupFoldersApi,
  fetchGroupManagersApi,
  fetchGroupOrdinaryMembersApi,
  fetchAdminPermissionApi,
  fetchMemberPermissionApi,
  removeGroupManagerApi,
  removeGroupMemberApi,
} from "@/apis/group";

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

const PermissionDisplay = ({
  title,
  permissions,
  roleType,
  inherited,
}: {
  title: string;
  permissions: Permission[];
  roleType: string;
  inherited: boolean;
}) => {
  const roleColor = roleType === "ADMIN" ? "red" : "blue";
  const roleLabel = roleType === "ADMIN" ? "管理员" : "成员";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{title}</span>
        <Tag color={roleColor} className="text-xs">
          {roleLabel}
        </Tag>
        {inherited && (
          <Tag color="default" className="text-xs">
            继承
          </Tag>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {permissions.length > 0 ? (
          permissions.map((perm) => (
            <Tag key={perm} color={PERMISSION_COLORS[perm]}>
              {PERMISSION_LABELS[perm]}
            </Tag>
          ))
        ) : (
          <span className="text-muted text-xs">无权限</span>
        )}
      </div>
    </div>
  );
};

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
  const [permLoading, setPermLoading] = useState(false);
  const [adminPerm, setAdminPerm] = useState<FolderPermissionResponse | null>(null);
  const [memberPerm, setMemberPerm] = useState<FolderPermissionResponse | null>(null);

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

  useEffect(() => {
    if (!safeCustomId || !selectedFolderId) {
      setAdminPerm(null);
      setMemberPerm(null);
      return;
    }

    const fetchPermissions = async () => {
      setPermLoading(true);
      try {
        const [admin, member] = await Promise.all([
          fetchAdminPermissionApi(safeCustomId, selectedFolderId),
          fetchMemberPermissionApi(safeCustomId, selectedFolderId),
        ]);
        setAdminPerm(admin);
        setMemberPerm(member);
      } finally {
        setPermLoading(false);
      }
    };

    void fetchPermissions();
  }, [safeCustomId, selectedFolderId]);

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

  const panelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  };

  return (
    <div style={panelStyle}>
      {!group.active && (
        <Alert type="warning" showIcon message="该团队已停用，部分操作已受限" />
      )}
      {!isManager && !group.active && (
        <Alert type="info" showIcon message="当前为普通成员，仅可查看成员列表与团队目录。" />
      )}

      <FolderTree customId={safeCustomId} />

      <Card
        title="文件夹权限管理"
        className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
      >
        <div className="grid gap-6 lg:grid-cols-2">
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

            <div>
              <div className="mb-2 text-sm font-medium">权限配置</div>
              <Checkbox.Group
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
              >
                <div className="flex flex-wrap gap-2">
                  {PERMISSION_VALUES.map((perm) => (
                    <Checkbox key={perm} value={perm}>
                      <Tag color={PERMISSION_COLORS[perm]} className="cursor-pointer">
                        {PERMISSION_LABELS[perm]}
                      </Tag>
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
            </div>

            <Radio.Group
              value={grantMode}
              onChange={(event) => setGrantMode(event.target.value as GrantMode)}
              disabled={!isManager || !group.active}
            >
              <Radio.Button value="single">仅当前目录</Radio.Button>
              <Radio.Button value="expanded">按继承展开</Radio.Button>
            </Radio.Group>

            {grantMode === "expanded" && selectedFolderId && (
              <Alert
                type="info"
                showIcon
                message={`将覆盖 ${expandedTargets.length} 个目录`}
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
              <div className="mb-2 text-sm font-medium">已授权目录</div>
              <div className="flex flex-wrap gap-2">
                {groupFolders.length ? (
                  groupFolders.map((folder) => (
                    <Tag key={folder.folderId}>{folder.folderName}</Tag>
                  ))
                ) : (
                  <span className="mpcs-text-muted text-sm">暂无</span>
                )}
              </div>
            </div>
          </Space>

          <div className="flex flex-col gap-4">
            <div className="text-sm font-medium">当前权限</div>
            {permLoading ? (
              <div className="flex justify-center py-8">
                <Spin />
              </div>
            ) : selectedFolderId ? (
              <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4">
                <PermissionDisplay
                  title="管理员"
                  permissions={(adminPerm?.permissions || []) as Permission[]}
                  roleType={adminPerm?.roleType || "ADMIN"}
                  inherited={adminPerm?.inherited || false}
                />
                <PermissionDisplay
                  title="成员"
                  permissions={(memberPerm?.permissions || []) as Permission[]}
                  roleType={memberPerm?.roleType || "MEMBER"}
                  inherited={memberPerm?.inherited || false}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 py-8 text-center text-muted">
                请选择文件夹查看权限
              </div>
            )}
          </div>
        </div>
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
