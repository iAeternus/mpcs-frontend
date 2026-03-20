import { Button, Input, List, Space, Typography } from "antd";
import { useAppSelector } from "@/store";
import { normalizeCommentId } from "../utils/postUtils";
import type { CommentNode } from "../utils/postUtils";
import dayjs from "dayjs";

interface CommentNodeProps {
  postId: string;
  node: CommentNode;
  replyInputMap: Record<string, string>;
  onReplyInputChange: (id: string, value: string) => void;
  onReply: (postId: string, parentId: string) => void;
  onDelete: (postId: string, commentId?: string) => void;
  level?: number;
}

export const CommentNodeItem = ({
  postId,
  node,
  replyInputMap,
  onReplyInputChange,
  onReply,
  onDelete,
  level = 0,
}: CommentNodeProps) => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const id = normalizeCommentId(node);

  return (
    <div
      className={`rounded-2xl border p-3 ${
        themeMode === "dark"
          ? "border-white/10 bg-slate-900/55"
          : "border-white/55 bg-white/65"
      } ${level > 0 ? "ml-6 mt-3" : "mt-3"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <Space size={8}>
          <span className="font-medium">{node.username}</span>
          <Typography.Text type="secondary" className="text-xs">
            {dayjs(node.createdAt).format("YYYY-MM-DD HH:mm")}
          </Typography.Text>
        </Space>
        <Space size={4}>
          {id && (
            <Button
              size="small"
              type="link"
              onClick={() =>
                onReplyInputChange(id, replyInputMap[id] ?? "")
              }
            >
              回复
            </Button>
          )}
          <Button
            size="small"
            type="link"
            danger
            onClick={() => void onDelete(postId, id ?? undefined)}
          >
            删除
          </Button>
        </Space>
      </div>

      <Typography.Paragraph className="mb-0 whitespace-pre-wrap">
        {node.content}
      </Typography.Paragraph>

      {id !== null && Object.prototype.hasOwnProperty.call(replyInputMap, id) && (
        <div className="mt-3">
          <Input.TextArea
            rows={2}
            value={replyInputMap[id] ?? ""}
            onChange={(event) => onReplyInputChange(id, event.target.value)}
            placeholder="输入回复内容"
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="primary"
              size="small"
              onClick={() => void onReply(postId, id)}
            >
              发送回复
            </Button>
          </div>
        </div>
      )}

      {node.children.map((child) => (
        <CommentNodeItem
          key={id ? `${id}-${child.createdAt}` : child.createdAt}
          postId={postId}
          node={child}
          replyInputMap={replyInputMap}
          onReplyInputChange={onReplyInputChange}
          onReply={onReply}
          onDelete={onDelete}
          level={level + 1}
        />
      ))}
    </div>
  );
};

interface CommentListProps {
  postId: string;
  comments: CommentNode[];
  replyInputMap: Record<string, string>;
  onReplyInputChange: (id: string, value: string) => void;
  onReply: (postId: string, parentId: string) => void;
  onDelete: (postId: string, commentId?: string) => void;
}

export const CommentList = ({
  postId,
  comments,
  replyInputMap,
  onReplyInputChange,
  onReply,
  onDelete,
}: CommentListProps) => (
  <List
    dataSource={comments}
    renderItem={(item) => (
      <List.Item className="block border-none px-0 py-0">
        <CommentNodeItem
          postId={postId}
          node={item}
          replyInputMap={replyInputMap}
          onReplyInputChange={onReplyInputChange}
          onReply={onReply}
          onDelete={onDelete}
        />
      </List.Item>
    )}
  />
);
