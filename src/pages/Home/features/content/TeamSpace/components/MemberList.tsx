import { Card, List, Spin } from "antd";
import { Empty } from "antd";
import dayjs from "dayjs";
import type { Manager, OrdinaryMember } from "@/types/group/query";

interface MemberListProps {
  title: string;
  members: Manager[] | OrdinaryMember[];
  loading: boolean;
  isManager: boolean;
  groupActive: boolean;
  onAdd: () => void;
  onRemove: () => void;
  addButtonText: string;
  removeButtonText: string;
}

export const MemberList = ({
  title,
  members,
  loading,
  isManager,
  groupActive,
  onAdd,
  onRemove,
  addButtonText,
  removeButtonText,
}: MemberListProps) => (
  <Card
    title={title}
    className="rounded-3xl border border-white/55 bg-white/65 shadow-lg backdrop-blur"
  >
    <Spin spinning={loading}>
      <List
        locale={{
          emptyText: (
            <Empty
              description={`暂无${title}`}
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
    </Spin>
    {isManager && (
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={!groupActive}
          className="rounded px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addButtonText}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={!groupActive}
          className="rounded px-3 py-1 text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {removeButtonText}
        </button>
      </div>
    )}
  </Card>
);
