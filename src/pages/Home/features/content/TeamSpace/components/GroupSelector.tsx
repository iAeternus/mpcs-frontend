import { Button, Card, Input, Modal, Select, Space, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GroupResponse } from "@/types/group/query";
import {
  createGroupApi,
  pageMyGroupsAsForManagerApi,
  pageMyGroupsAsForMemberApi,
} from "@/apis/group";
import { fetchAllGroups, normalizeGroup } from "../utils/teamUtils";
import type { GroupChoice, GroupSelectOption } from "../types";

interface GroupSelectorProps {
  onSelect: (choice: GroupChoice) => void;
  onRefresh: () => void;
}

export const GroupSelector = ({ onSelect, onRefresh }: GroupSelectorProps) => {
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([]);
  const [createdGroupIds, setCreatedGroupIds] = useState<string[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
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
      setJoinedGroupIds(normalizedMemberGroups.map((group) => group.groupId));

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
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    onRefresh();
  }, [loadGroups, onRefresh]);

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

  return (
    <div>
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
            loading={loadingGroups}
            options={groupedTeamOptions}
            onChange={(value) => {
              const choice = groupChoices.find((c) => c.group.groupId === value);
              if (choice) onSelect(choice);
            }}
            className="w-full"
          />
        </Space>
      </Card>

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
    </div>
  );
};
