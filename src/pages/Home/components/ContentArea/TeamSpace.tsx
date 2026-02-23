import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import type { CheckboxOptionType } from "antd/es/checkbox";
import dayjs from "dayjs";
import {
  activateGroupApi,
  addGrantApi,
  addGrantsApi,
  addGroupManagersApi,
  addGroupMembersApi,
  createGroupApi,
  deactivateGroupApi,
  deleteGroupApi,
  fetchGroupFoldersApi,
  fetchGroupManagersApi,
  fetchGroupOrdinaryMembersApi,
  pageMyGroupsAsForManagerApi,
  pageMyGroupsAsForMemberApi,
  renameGroupApi,
  removeGroupManagerApi,
  removeGroupMemberApi,
} from "@/apis/group";
import { useFolderHierarchy } from "@/hooks/useFolderHierarchy";
import type { IdNode } from "@/types/common/idtree";
import type { PagedList } from "@/types/common/page";
import type {
  GroupFolder,
  GroupResponse,
  Manager,
  OrdinaryMember,
} from "@/types/group/query";
import { InheritancePolicy } from "@/types/group/enums/inheritancePolicy";
import { Permission } from "@/types/group/enums/permission";
import { unwrapList } from "@/utils/idtree";
import { FolderHierarchy } from "../Hierarchy/FolderHierarchy";
import { SpaceBackground } from "./SpaceBackground";

type JoinRole = "manager" | "member";
type GrantMode = "single" | "expanded";
type GroupPermission = (typeof Permission)[keyof typeof Permission];

interface GroupChoice {
  group: GroupResponse;
  role: JoinRole;
}

interface GroupSelectOption {
  value: string;
  label: string;
}

const PERMISSION_OPTIONS: CheckboxOptionType[] = Object.values(Permission).map(
  (permission) => ({
    label: permission,
    value: permission,
  }),
);
const PERMISSION_VALUES = Object.values(Permission) as GroupPermission[];
const PAGE_SIZE = 100;
const USER_ID_REGEX = /^USR\d{17,19}$/;
const MAX_BATCH_USER_IDS = 1000;

const fetchAllGroups = async (
  fetchPage: (query: {
    pageIndex: number;
    pageSize: number;
  }) => Promise<PagedList<GroupResponse>>,
): Promise<GroupResponse[]> => {
  const result: GroupResponse[] = [];
  let pageIndex = 1;

  while (true) {
    const page = await fetchPage({
      pageIndex,
      pageSize: PAGE_SIZE,
    });

    const pageData = unwrapList<GroupResponse>(page.data);
    result.push(...pageData);

    const fetchedCount = page.pageIndex * page.pageSize;
    if (fetchedCount >= page.totalCnt || pageData.length === 0) {
      break;
    }

    pageIndex += 1;
  }

  return result;
};

const getPolicyHint = (policy: GroupResponse["inheritancePolicy"]): string => {
  switch (policy) {
    case InheritancePolicy.NONE:
      return "不继承";
    case InheritancePolicy.FULL:
      return "完全继承";
    case InheritancePolicy.SELECTIVE:
      return "选择性继承";
    case InheritancePolicy.OVERRIDABLE:
      return "可覆盖继承";
    default:
      return "使用系统默认继承规则。";
  }
};

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
  policy: GroupResponse["inheritancePolicy"],
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

const parseUserIds = (rawInput: string): string[] =>
  Array.from(
    new Set(
      rawInput
        .split(/[\s,，;；\n\r\t]+/u)
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

const validateUserIds = (ids: string[]) => {
  const invalidIds = ids.filter((id) => !USER_ID_REGEX.test(id));
  if (invalidIds.length > 0) {
    return {
      valid: false as const,
      message: `以下用户ID格式不正确：${invalidIds.slice(0, 3).join("、")}${invalidIds.length > 3 ? " 等" : ""}`,
    };
  }
  if (ids.length > MAX_BATCH_USER_IDS) {
    return {
      valid: false as const,
      message: `单次最多提交 ${MAX_BATCH_USER_IDS} 个用户ID`,
    };
  }
  return { valid: true as const };
};

const normalizeGroup = (raw: GroupResponse): GroupResponse | null => {
  const groupId = (raw.groupId ?? "").trim();
  const name = (raw.name ?? "").trim();
  const customId = (raw.customId ?? "").trim();

  if (!groupId || !name) return null;

  return {
    ...raw,
    groupId,
    name,
    customId,
    active: Boolean(raw.active),
  };
};

interface GroupPanelProps {
  groupChoice: GroupChoice;
}

const GroupPanel: React.FC<GroupPanelProps> = ({ groupChoice }) => {
  const { group, role } = groupChoice;
  const safeGroupId = group.groupId?.trim() ?? "";
  const isManager = role === "manager";
  const safeCustomId = group.customId?.trim();
  const { folderMap, nodeMap } = useFolderHierarchy(safeCustomId);

  const [detailLoading, setDetailLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [members, setMembers] = useState<OrdinaryMember[]>([]);
  const [groupFolders, setGroupFolders] = useState<GroupFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>();
  const [selectedPermissions, setSelectedPermissions] = useState<
    GroupPermission[]
  >([]);
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

  const onAddMembers = async (targetRole: JoinRole) => {
    if (!safeGroupId) {
      message.warning("团队信息加载失败，请刷新后重试");
      return;
    }
    const raw = targetRole === "manager" ? managerInput : memberInput;
    const ids = parseUserIds(raw);
    if (!ids.length) {
      message.warning("请至少输入一个用户ID");
      return;
    }
    const validation = validateUserIds(ids);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }

    if (targetRole === "manager") {
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

  const onRemoveMembers = async (targetRole: JoinRole) => {
    if (!safeGroupId) {
      message.warning("团队信息加载失败，请刷新后重试");
      return;
    }
    const raw =
      targetRole === "manager" ? removeManagerInput : removeMemberInput;
    const ids = parseUserIds(raw);
    if (!ids.length) {
      message.warning("请至少输入一个用户ID");
      return;
    }
    const validation = validateUserIds(ids);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }

    if (targetRole === "manager") {
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
    if (!safeGroupId) {
      message.warning("团队信息加载失败，请刷新后重试");
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag color={isManager ? "gold" : "blue"}>
              {isManager ? "管理员视角" : "成员视角"}
            </Tag>
            <Tag>{group.inheritancePolicy}</Tag>
            <span className="mpcs-text-muted text-sm">
              {getPolicyHint(group.inheritancePolicy)}
            </span>
          </div>
          {!group.active && (
            <Alert
              type="warning"
              showIcon
              message="该团队已停用，部分操作已受限"
            />
          )}
          {!isManager && (
            <Alert
              type="info"
              showIcon
              message="当前为普通成员，仅可查看成员列表与团队目录。"
            />
          )}
        </div>
      </Card>

      {safeCustomId ? <FolderHierarchy customId={safeCustomId} /> : null}

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
                <span className="mpcs-text-muted text-sm">
                  暂无显式授权目录
                </span>
              )}
            </div>
          </div>
        </Space>
      </Card>

      <Spin spinning={detailLoading}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="管理员"
            extra={
              isManager && (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setManagerModalOpen(true)}
                    disabled={!group.active}
                  >
                    添加管理员
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => setRemoveManagerModalOpen(true)}
                    disabled={!group.active}
                  >
                    移除管理员
                  </Button>
                </Space>
              )
            }
            className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
          >
            <List
              locale={{
                emptyText: (
                  <Empty
                    description="暂无管理员"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              dataSource={managers}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.username}
                    description={`${item.mobileOrEmail} · 加入于 ${dayjs(item.joinedAt).format("YYYY-MM-DD HH:mm")}`}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card
            title="普通成员"
            extra={
              isManager && (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setMemberModalOpen(true)}
                    disabled={!group.active}
                  >
                    添加成员
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => setRemoveMemberModalOpen(true)}
                    disabled={!group.active}
                  >
                    移除成员
                  </Button>
                </Space>
              )
            }
            className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
          >
            <List
              locale={{
                emptyText: (
                  <Empty
                    description="暂无成员"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              dataSource={members}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.username}
                    description={`${item.mobileOrEmail} · 加入于 ${dayjs(item.joinedAt).format("YYYY-MM-DD HH:mm")}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      </Spin>

      <Modal
        open={memberModalOpen}
        title="添加普通成员"
        okText="确认添加"
        cancelText="取消"
        onCancel={() => setMemberModalOpen(false)}
        onOk={() => void onAddMembers("member")}
      >
        <Input.TextArea
          rows={5}
          value={memberInput}
          onChange={(event) => setMemberInput(event.target.value)}
          placeholder="请输入用户ID（如 USR20260000000000001），多个可用逗号、空格或换行分隔"
        />
      </Modal>

      <Modal
        open={managerModalOpen}
        title="添加管理员"
        okText="确认添加"
        cancelText="取消"
        onCancel={() => setManagerModalOpen(false)}
        onOk={() => void onAddMembers("manager")}
      >
        <Input.TextArea
          rows={5}
          value={managerInput}
          onChange={(event) => setManagerInput(event.target.value)}
          placeholder="请输入用户ID（如 USR20260000000000001），多个可用逗号、空格或换行分隔"
        />
      </Modal>

      <Modal
        open={removeMemberModalOpen}
        title="移除普通成员"
        okText="确认移除"
        cancelText="取消"
        onCancel={() => setRemoveMemberModalOpen(false)}
        onOk={() => void onRemoveMembers("member")}
      >
        <Input.TextArea
          rows={5}
          value={removeMemberInput}
          onChange={(event) => setRemoveMemberInput(event.target.value)}
          placeholder="请输入要移除的用户ID，多个可用逗号、空格或换行分隔"
        />
      </Modal>

      <Modal
        open={removeManagerModalOpen}
        title="移除管理员"
        okText="确认移除"
        cancelText="取消"
        onCancel={() => setRemoveManagerModalOpen(false)}
        onOk={() => void onRemoveMembers("manager")}
      >
        <Input.TextArea
          rows={5}
          value={removeManagerInput}
          onChange={(event) => setRemoveManagerInput(event.target.value)}
          placeholder="请输入要移除的用户ID，多个可用逗号、空格或换行分隔"
        />
      </Modal>
    </div>
  );
};

export const TeamSpace = () => {
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([]);
  const [joinedGroupCount, setJoinedGroupCount] = useState(0);
  const [createdGroupIds, setCreatedGroupIds] = useState<string[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      // 先查询我加入的团队，保证“已加入团队”优先可见
      const memberGroups = await fetchAllGroups(pageMyGroupsAsForMemberApi);
      const normalizedMemberGroups = memberGroups
        .map(normalizeGroup)
        .filter((group): group is GroupResponse => group !== null);
      setJoinedGroupCount(normalizedMemberGroups.length);
      setJoinedGroupIds(normalizedMemberGroups.map((group) => group.groupId));

      // 管理团队查询失败时，不影响已加入团队的展示
      let managerGroups: GroupResponse[] = [];
      try {
        managerGroups = await fetchAllGroups(pageMyGroupsAsForManagerApi);
      } catch {
        managerGroups = [];
      }
      const normalizedManagerGroups = managerGroups
        .map(normalizeGroup)
        .filter((group): group is GroupResponse => group !== null);
      setCreatedGroupIds(normalizedManagerGroups.map((group) => group.groupId));

      const managerMap = new Map<string, GroupResponse>();
      normalizedManagerGroups.forEach((group) => {
        managerMap.set(group.groupId, group);
      });

      const all = new Map<string, GroupChoice>();
      normalizedManagerGroups.forEach((group) => {
        all.set(group.groupId, { group, role: "manager" });
      });
      normalizedMemberGroups.forEach((group) => {
        const fromManager = managerMap.get(group.groupId);
        all.set(group.groupId, {
          group: fromManager ?? group,
          role: fromManager ? "manager" : "member",
        });
      });

      const sorted = Array.from(all.values()).sort((a, b) =>
        a.group.name.localeCompare(b.group.name, "zh-CN"),
      );
      setGroupChoices(sorted);
      setSelectedGroupId((prev) => {
        if (prev && sorted.some((choice) => choice.group.groupId === prev)) {
          return prev;
        }
        return undefined;
      });
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const selected = useMemo(
    () => groupChoices.find((item) => item.group.groupId === selectedGroupId),
    [groupChoices, selectedGroupId],
  );

  const managedGroups = useMemo(
    () => groupChoices.filter((choice) => choice.role === "manager"),
    [groupChoices],
  );
  const groupedTeamOptions = useMemo(() => {
    const byId = new Map(
      groupChoices.map((choice) => [choice.group.groupId, choice]),
    );

    const createdOptions: GroupSelectOption[] = createdGroupIds
      .map((id) => byId.get(id))
      .filter((choice): choice is GroupChoice => Boolean(choice))
      .map((choice) => ({
        value: choice.group.groupId,
        label: choice.group.name,
      }));

    const joinedOptions: GroupSelectOption[] = joinedGroupIds
      .filter((id) => !createdGroupIds.includes(id))
      .map((id) => byId.get(id))
      .filter((choice): choice is GroupChoice => Boolean(choice))
      .map((choice) => ({
        value: choice.group.groupId,
        label: choice.group.name,
      }));

    const groups: Array<{ label: string; options: GroupSelectOption[] }> = [];
    if (createdOptions.length) {
      groups.push({
        label: `我创建的团队 (${createdOptions.length})`,
        options: createdOptions,
      });
    }
    if (joinedOptions.length) {
      groups.push({
        label: `我加入的团队 (${joinedOptions.length})`,
        options: joinedOptions,
      });
    }
    return groups;
  }, [createdGroupIds, joinedGroupIds, groupChoices]);

  const onCreateGroup = async () => {
    const name = createName.trim();
    if (!name) {
      message.warning("请输入团队名称");
      return;
    }

    setCreating(true);
    try {
      await createGroupApi({ name });
      message.success("团队创建成功");
      setCreateModalOpen(false);
      setCreateName("");
      await loadGroups();
    } finally {
      setCreating(false);
    }
  };

  const openRenameGroupModal = (group: GroupResponse) => {
    const safeGroupId = group.groupId?.trim() ?? "";
    if (!safeGroupId) return;
    const inputId = `rename-group-${group.groupId}`;
    Modal.confirm({
      title: "重命名团队",
      content: (
        <Input
          id={inputId}
          defaultValue={group.name}
          placeholder="请输入团队名称"
          autoFocus
        />
      ),
      onOk: async () => {
        const newName = (
          document.getElementById(inputId) as HTMLInputElement | null
        )?.value?.trim();

        if (!newName) {
          message.warning("请输入团队名称");
          return Promise.reject();
        }

        await renameGroupApi(safeGroupId, { newName });
        message.success("团队名称已更新");
        await loadGroups();
      },
    });
  };

  const selectedRole: JoinRole | null = selected
    ? (groupChoices.find(
        (choice) => choice.group.groupId === selected.group.groupId,
      )?.role ?? null)
    : null;

  return (
    <SpaceBackground paddingClassName="py-10">
      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 text-center">
          <h2 className="mpcs-text-strong text-3xl font-semibold">团队空间</h2>
          <p className="mpcs-text-muted mt-2 text-sm">
            团队目录与成员协同管理，支持按继承策略批量授权。
          </p>
        </div>

        <Card className="mb-6 rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur">
          <Space direction="vertical" className="w-full" size={12}>
            <div className="flex items-center justify-between gap-3">
              <span className="mpcs-text-muted text-sm">选择团队</span>
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                创建团队
              </Button>
            </div>
            <Select
              showSearch
              placeholder="请选择团队"
              optionFilterProp="label"
              value={selectedGroupId}
              loading={loadingGroups}
              options={groupedTeamOptions}
              onChange={(value) => setSelectedGroupId(value)}
              className="w-full"
            />
          </Space>
        </Card>

        {loadingGroups ? (
          <div className="text-center">
            <Spin />
          </div>
        ) : selected ? (
          <div className="flex flex-col gap-6">
            <Card className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">
                    {selected.group.name}
                  </div>
                  <div className="mpcs-text-muted text-sm">
                    当前身份：{selectedRole === "manager" ? "管理员" : "成员"} ·
                    状态：
                    {selected.group.active ? "启用中" : "已停用"}
                  </div>
                </div>
                <Button onClick={() => setSelectedGroupId(undefined)}>
                  切换团队
                </Button>
              </div>
            </Card>

            <GroupPanel groupChoice={selected} />

            {selectedRole === "manager" && (
              <Card
                title="团队管理"
                className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
              >
                <Space wrap>
                  <Button onClick={() => openRenameGroupModal(selected.group)}>
                    重命名团队
                  </Button>
                  {selected.group.active ? (
                    <Popconfirm
                      title="确认停用该团队？"
                      onConfirm={async () => {
                        await deactivateGroupApi(selected.group.groupId);
                        message.success("团队已停用");
                        await loadGroups();
                      }}
                    >
                      <Button>停用团队</Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm
                      title="确认启用该团队？"
                      onConfirm={async () => {
                        await activateGroupApi(selected.group.groupId);
                        message.success("团队已启用");
                        await loadGroups();
                      }}
                    >
                      <Button type="primary">启用团队</Button>
                    </Popconfirm>
                  )}
                  <Popconfirm
                    title="确认删除该团队？"
                    onConfirm={async () => {
                      await deleteGroupApi(selected.group.groupId);
                      message.success("团队已删除");
                      setSelectedGroupId(undefined);
                      await loadGroups();
                    }}
                  >
                    <Button danger>删除团队</Button>
                  </Popconfirm>
                </Space>
              </Card>
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur">
            <Empty
              description={
                joinedGroupCount > 0
                  ? "请选择一个团队进入团队空间"
                  : "你还未加入任何团队，先创建一个团队开始协作吧"
              }
            />
            {!joinedGroupCount && managedGroups.length > 0 && (
              <div className="mt-4 text-center text-sm">
                你已创建团队，可先从上方选择团队进入管理页面
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal
        open={createModalOpen}
        title="创建团队"
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => void onCreateGroup()}
      >
        <Input
          value={createName}
          onChange={(event) => setCreateName(event.target.value)}
          placeholder="请输入团队名称"
          maxLength={50}
        />
      </Modal>
    </SpaceBackground>
  );
};
