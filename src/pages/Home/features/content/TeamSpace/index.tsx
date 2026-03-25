import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Spin,
  message,
} from "antd";
import type { GroupResponse } from "@/types/group/query";
import {
  activateGroupApi,
  deactivateGroupApi,
  deleteGroupApi,
  pageMyGroupsAsForManagerApi,
  pageMyGroupsAsForMemberApi,
  renameGroupApi,
} from "@/apis/group";
import { fetchAllGroups, normalizeGroup } from "./utils/teamUtils";
import type { GroupChoice } from "./types";
import { GroupSelector } from "./components/GroupSelector";
import { GroupPanel } from "./components/GroupPanel";

export const TeamSpace = () => {
  const [selectedGroup, setSelectedGroup] = useState<GroupChoice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([]);
  const [joinedGroupCount, setJoinedGroupCount] = useState(0);

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

  useEffect(() => {
    if (selectedGroup && groupChoices.length > 0) {
      const updated = groupChoices.find(
        (choice) => choice.group.groupId === selectedGroup.group.groupId,
      );
      if (updated) {
        setSelectedGroup(updated);
      }
    }
  }, [groupChoices, selectedGroup]);

  const managedGroups = useMemo(
    () => groupChoices.filter((choice) => choice.role === "manager"),
    [groupChoices],
  );

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
    setRefreshKey((value) => value + 1);
  }, []);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "var(--space-4)",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "var(--space-4)",
    borderBottom: "1px solid var(--color-border-default)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "var(--text-xl)",
    fontWeight: "var(--font-semibold)",
    color: "var(--color-text-primary)",
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--color-text-tertiary)",
    margin: "var(--space-2) 0 0 0",
  };

  const infoCardStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    padding: "var(--space-4)",
    backgroundColor: "var(--color-surface-secondary)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border-default)",
  };

  const managerSectionStyle: React.CSSProperties = {
    display: "flex",
    gap: "var(--space-2)",
    flexWrap: "wrap",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>团队空间</h2>
          <p style={descStyle}>管理团队目录、成员关系和按成员授权的文件夹权限。</p>
        </div>
      </div>

      <GroupSelector onSelect={setSelectedGroup} onRefresh={handleRefresh} />

      {loadingGroups ? (
        <div className="flex items-center justify-center" style={{ padding: "var(--space-8)" }}>
          <Spin />
        </div>
      ) : selectedGroup ? (
        <div className="flex flex-col gap-4">
          <div style={infoCardStyle}>
            <div>
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-medium)",
                  color: "var(--color-text-primary)",
                }}
              >
                {selectedGroup.group.name}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-tertiary)",
                  marginTop: "var(--space-1)",
                }}
              >
                当前身份：{selectedGroup.role === "manager" ? "管理员" : "成员"} · 状态：
                {selectedGroup.group.active ? "启用中" : "已停用"}
              </div>
            </div>
            <Button onClick={() => setSelectedGroup(null)}>切换团队</Button>
          </div>

          <GroupPanel
            group={selectedGroup.group}
            isManager={selectedGroup.role === "manager"}
          />

          {selectedGroup.role === "manager" && (
            <div style={infoCardStyle}>
              <div
                style={{
                  fontWeight: "var(--font-medium)",
                  color: "var(--color-text-primary)",
                }}
              >
                团队管理
              </div>
              <div style={managerSectionStyle}>
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
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--color-text-tertiary)",
            backgroundColor: "var(--color-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          <Empty
            description={
              joinedGroupCount > 0
                ? "请选择一个团队进入团队空间"
                : "你还没有加入任何团队，可以先创建一个团队开始协作"
            }
          />
          {!joinedGroupCount && managedGroups.length > 0 && (
            <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>
              你已创建团队，可从上方选择团队进入管理页面
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamSpace;