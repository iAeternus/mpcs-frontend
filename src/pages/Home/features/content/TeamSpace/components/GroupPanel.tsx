import { useCallback, useEffect, useMemo, useState } from "react";
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
import type {
  FolderPermissionResponse,
  GroupFolder,
  Manager,
  OrdinaryMember,
} from "@/types/group/query";
import { InheritancePolicy } from "@/types/group/enums/inheritancePolicy";
import {
  PERMISSION_COLORS,
  PERMISSION_LABELS,
  Permission,
} from "@/types/group/enums/permission";
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
const isHttpStatus = (error: unknown, status: number): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  typeof (error as { response?: { status?: number } }).response?.status === "number" &&
  (error as { response?: { status?: number } }).response?.status === status;
const INHERITANCE_OPTIONS = [
  { label: "仅当前目录", value: InheritancePolicy.NONE },
  { label: "向下完全继承", value: InheritancePolicy.FULL },
  { label: "选择性继承", value: InheritancePolicy.SELECTIVE },
  { label: "子级可覆盖", value: InheritancePolicy.OVERRIDABLE },
];

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
  inherited,
}: {
  title: string;
  permissions: Permission[];
  inherited: boolean;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm">{title}</span>
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

export const GroupPanel = ({ group, isManager }: GroupPanelProps) => {
  const safeGroupId = group.groupId?.trim() ?? "";
  const safeCustomId = group.customId?.trim() ?? "";
  const { folderMap, nodeMap } = useFolderHierarchy(safeCustomId);

  const [detailLoading, setDetailLoading] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [members, setMembers] = useState<OrdinaryMember[]>([]);
  const [groupFolders, setGroupFolders] = useState<GroupFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedPermissions, setSelectedPermissions] = useState<GroupPermission[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [selectedPolicy, setSelectedPolicy] = useState<InheritancePolicy>(
    InheritancePolicy.NONE,
  );
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
  const [adminPerm, setAdminPerm] =
    useState<FolderPermissionResponse | null>(null);
  const [memberPerm, setMemberPerm] =
    useState<FolderPermissionResponse | null>(null);

  const permissionTargetMemberId = isManager ? selectedMemberId : undefined;
  const selectedMember = useMemo(
    () => members.find((member) => member.userId === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const loadGroupDetail = useCallback(async () => {
    if (!safeGroupId) {
      setManagers([]);
      setMembers([]);
      return;
    }

    setDetailLoading(true);
    try {
      const [managerResp, memberResp] = await Promise.all([
        fetchGroupManagersApi(safeGroupId),
        fetchGroupOrdinaryMembersApi(safeGroupId),
      ]);
      setManagers(managerResp.groupManagers);
      setMembers(memberResp.groupOrdinaryMembers);
    } finally {
      setDetailLoading(false);
    }
  }, [safeGroupId]);

  useEffect(() => {
    void loadGroupDetail();
  }, [loadGroupDetail]);

  useEffect(() => {
    if (!isManager) {
      setSelectedMemberId(undefined);
      return;
    }
    if (!members.length) {
      setSelectedMemberId(undefined);
      return;
    }
    if (
      selectedMemberId &&
      members.some((member) => member.userId === selectedMemberId)
    ) {
      return;
    }
    setSelectedMemberId(members[0]?.userId);
  }, [isManager, members, selectedMemberId]);

  useEffect(() => {
    if (selectedFolderId && !folderMap[selectedFolderId]) {
      setSelectedFolderId(undefined);
      setAdminPerm(null);
      setMemberPerm(null);
    }
  }, [folderMap, selectedFolderId]);
  useEffect(() => {
    if (!safeGroupId) {
      setGroupFolders([]);
      return;
    }
    if (isManager && !permissionTargetMemberId) {
      setGroupFolders([]);
      return;
    }

    const loadFolders = async () => {
      setFoldersLoading(true);
      try {
        const folderResp = await fetchGroupFoldersApi(
          safeGroupId,
          permissionTargetMemberId,
        );
        setGroupFolders(folderResp.groupFolders);
      } finally {
        setFoldersLoading(false);
      }
    };

    void loadFolders();
  }, [isManager, permissionTargetMemberId, safeGroupId]);

  useEffect(() => {
    if (!safeCustomId || !selectedFolderId) {
      setAdminPerm(null);
      setMemberPerm(null);
      return;
    }
    if (isManager && !permissionTargetMemberId) {
      setAdminPerm(null);
      setMemberPerm(null);
      return;
    }

    const fetchPermissions = async () => {
      setPermLoading(true);
      try {
        const memberPromise = fetchMemberPermissionApi(
          safeCustomId,
          selectedFolderId,
          permissionTargetMemberId,
        );

        if (isManager) {
          const [admin, member] = await Promise.all([
            fetchAdminPermissionApi(safeCustomId, selectedFolderId),
            memberPromise,
          ]);
          setAdminPerm(admin);
          setMemberPerm(member);
          return;
        }

        const member = await memberPromise;
        setAdminPerm(null);
        setMemberPerm(member);
      } catch (error) {
        setAdminPerm(null);
        setMemberPerm(null);
        if (isHttpStatus(error, 404)) {
          setSelectedFolderId((current) =>
            current === selectedFolderId ? undefined : current,
          );
        }
      } finally {
        setPermLoading(false);
      }
    };

    void fetchPermissions();
  }, [isManager, permissionTargetMemberId, safeCustomId, selectedFolderId]);

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

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        label: `${member.username} (${member.mobileOrEmail})`,
        value: member.userId,
      })),
    [members],
  );

  const expandedTargets = useMemo(() => {
    if (!selectedFolderId) return [];
    return calcExpandedGrantTargets(
      selectedFolderId,
      selectedPolicy,
      explicitGrantIds,
      nodeMap,
    );
  }, [explicitGrantIds, nodeMap, selectedFolderId, selectedPolicy]);

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

  const onRemoveMembers = async (
    input: string,
    role: "manager" | "member",
  ) => {
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
    if (!selectedMemberId) {
      message.warning("请选择授权成员");
      return;
    }
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
          memberId: selectedMemberId,
          folderId: selectedFolderId,
          permissions: selectedPermissions,
          inheritancePolicy: selectedPolicy,
        });
      } else {
        if (expandedTargets.length > 1024) {
          message.warning("批量授权目录过多，请缩小范围后重试");
          return;
        }
        await addGrantsApi({
          groupId: safeGroupId,
          memberId: selectedMemberId,
          folderIds: expandedTargets,
          permissions: selectedPermissions,
          inheritancePolicy: selectedPolicy,
        });
      }

      message.success("权限更新成功");
      const folderResp = await fetchGroupFoldersApi(safeGroupId, selectedMemberId);
      setGroupFolders(folderResp.groupFolders);
      if (selectedFolderId) {
        const member = await fetchMemberPermissionApi(
          safeCustomId,
          selectedFolderId,
          selectedMemberId,
        );
        setMemberPerm(member);
      }
    } catch (error) {
      if (isHttpStatus(error, 404)) {
        setSelectedFolderId(undefined);
        setAdminPerm(null);
        setMemberPerm(null);
      }
    } finally {
      setGranting(false);
    }
  };

  const panelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  };

  return (
    <div style={panelStyle}>
      {!group.active && (
        <Alert type="warning" showIcon message="该团队已停用，部分操作已受限" />
      )}

      <FolderTree customId={safeCustomId} />

      {isManager ? (
        <Card
          title="文件夹权限管理"
          className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Space direction="vertical" size={16} className="w-full">
              <Alert
                type="info"
                showIcon
                message="管理员默认拥有全部权限。普通成员权限按成员单独授权，且继承策略互不影响。"
              />

              <Select
                placeholder="选择授权成员"
                value={selectedMemberId}
                options={memberOptions}
                onChange={(value) => setSelectedMemberId(value)}
                disabled={!group.active || !members.length}
                className="w-full"
              />

              <Select
                showSearch
                allowClear
                placeholder="选择目标文件夹"
                value={selectedFolderId}
                options={folderOptions}
                onChange={(value) => setSelectedFolderId(value)}
                disabled={!group.active || !selectedMemberId}
                className="w-full"
              />

              <div>
                <div className="mb-2 text-sm font-medium">继承策略</div>
                <Select
                  value={selectedPolicy}
                  options={INHERITANCE_OPTIONS}
                  onChange={(value) => setSelectedPolicy(value)}
                  disabled={!group.active || !selectedMemberId}
                  className="w-full"
                />
              </div>

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
                  disabled={!group.active || !selectedMemberId}
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
                disabled={!group.active || !selectedMemberId}
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

              {!members.length && (
                <Alert type="warning" showIcon message="请先添加普通成员，再为其配置目录权限。" />
              )}

              <Button
                type="primary"
                loading={granting}
                disabled={!group.active || !selectedMemberId}
                onClick={() => void onGrantPermissions()}
              >
                提交权限
              </Button>

              <div>
                <div className="mb-2 text-sm font-medium">已授权目录</div>
                {foldersLoading ? (
                  <Spin size="small" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groupFolders.length ? (
                      groupFolders.map((folder) => (
                        <Tag key={folder.folderId}>{folder.folderName}</Tag>
                      ))
                    ) : (
                      <span className="mpcs-text-muted text-sm">暂无</span>
                    )}
                  </div>
                )}
              </div>
            </Space>

            <div className="flex flex-col gap-4">
              <div className="text-sm font-medium">当前权限</div>
              {permLoading ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : selectedFolderId && selectedMemberId ? (
                <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4">
                  <PermissionDisplay
                    title="管理员默认权限"
                    permissions={(adminPerm?.permissions || []) as Permission[]}
                    inherited={adminPerm?.inherited || false}
                  />
                  <PermissionDisplay
                    title={selectedMember ? `${selectedMember.username} 的权限` : "成员权限"}
                    permissions={(memberPerm?.permissions || []) as Permission[]}
                    inherited={memberPerm?.inherited || false}
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 py-8 text-center text-muted">
                  选择成员和文件夹后查看权限
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title="我的权限"
          className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Space direction="vertical" size={16} className="w-full">
              <Alert
                type="info"
                showIcon
                message="你只能查看自己的权限视图。需要新增或调整目录权限时，请联系团队管理员。"
              />
              <Select
                showSearch
                allowClear
                placeholder="选择文件夹查看我的权限"
                value={selectedFolderId}
                options={folderOptions}
                onChange={(value) => setSelectedFolderId(value)}
                className="w-full"
              />
              <div>
                <div className="mb-2 text-sm font-medium">我的授权目录</div>
                {foldersLoading ? (
                  <Spin size="small" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groupFolders.length ? (
                      groupFolders.map((folder) => (
                        <Tag key={folder.folderId}>{folder.folderName}</Tag>
                      ))
                    ) : (
                      <span className="mpcs-text-muted text-sm">暂无</span>
                    )}
                  </div>
                )}
              </div>
            </Space>

            <div className="flex flex-col gap-4">
              <div className="text-sm font-medium">当前目录权限</div>
              {permLoading ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : selectedFolderId ? (
                <div className="rounded-lg bg-gray-50 p-4">
                  <PermissionDisplay
                    title="我的权限"
                    permissions={(memberPerm?.permissions || []) as Permission[]}
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
      )}

      {isManager && (
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
      )}

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
