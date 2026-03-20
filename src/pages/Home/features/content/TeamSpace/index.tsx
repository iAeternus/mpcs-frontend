import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  message,
} from "antd";
import type { GroupResponse } from "@/types/group/query";
import {
  activateGroupApi,
  createGroupApi,
  deactivateGroupApi,
  deleteGroupApi,
  pageMyGroupsAsForManagerApi,
  pageMyGroupsAsForMemberApi,
  renameGroupApi,
} from "@/apis/group";
import { fetchAllGroups, normalizeGroup } from "./utils/teamUtils";
import type { GroupChoice } from "./types";
import { SpaceBackground } from "../SpaceBackground";
import { GroupSelector } from "./components/GroupSelector";
import { GroupPanel } from "./components/GroupPanel";

export const TeamSpace = () => {
  const [selectedGroup, setSelectedGroup] = useState<GroupChoice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([]);
  const [joinedGroupCount, setJoinedGroupCount] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const memberGroups = await fetchAllGroups(pageMyGroupsAsForMemberApi);
      const normalizedMemberGroups = memberGroups
        .map(normalizeGroup)
        .filter((group): group is GroupResponse => group !== null);
      setJoinedGroupCount(normalizedMemberGroups.length);

      let managerGroups: GroupResponse[] = [];
      try {
        managerGroups = await fetchAllGroups(pageMyGroupsAsForManagerApi);
      } catch {
        managerGroups = [];
      }
      const normalizedManagerGroups = managerGroups
        .map(normalizeGroup)
        .filter((group): group is GroupResponse => group !== null);

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
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups, refreshKey]);

  const managedGroups = useMemo(
    () => groupChoices.filter((choice) => choice.role === "manager"),
    [groupChoices],
  );

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

  const openRenameGroupModal = (group: { groupId: string; name: string }) => {
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

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <SpaceBackground paddingClassName="py-10">
      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 text-center">
          <h2 className="mpcs-text-strong text-3xl font-semibold">团队空间</h2>
          <p className="mpcs-text-muted mt-2 text-sm">
            团队目录与成员协同管理，支持按继承策略批量授权。
          </p>
        </div>

        <GroupSelector
          onSelect={setSelectedGroup}
          onRefresh={handleRefresh}
        />

        {loadingGroups ? (
          <div className="text-center">
            <Spin />
          </div>
        ) : selectedGroup ? (
          <div className="flex flex-col gap-6">
            <Card className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">
                    {selectedGroup.group.name}
                  </div>
                  <div className="mpcs-text-muted text-sm">
                    当前身份：{selectedGroup.role === "manager" ? "管理员" : "成员"} ·
                    状态：
                    {selectedGroup.group.active ? "启用中" : "已停用"}
                  </div>
                </div>
                <Button onClick={() => setSelectedGroup(null)}>
                  切换团队
                </Button>
              </div>
            </Card>

            <GroupPanel
              group={selectedGroup.group}
              isManager={selectedGroup.role === "manager"}
            />

            {selectedGroup.role === "manager" && (
              <Card
                title="团队管理"
                className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
              >
                <Space wrap>
                  <Button onClick={() => openRenameGroupModal(selectedGroup.group)}>
                    重命名团队
                  </Button>
                  {selectedGroup.group.active ? (
                    <Popconfirm
                      title="确认停用该团队？"
                      onConfirm={async () => {
                        await deactivateGroupApi(selectedGroup.group.groupId);
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
                        await activateGroupApi(selectedGroup.group.groupId);
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
                      await deleteGroupApi(selectedGroup.group.groupId);
                      message.success("团队已删除");
                      setSelectedGroup(null);
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
