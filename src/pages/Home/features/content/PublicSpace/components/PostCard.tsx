import { Button, Card, Descriptions, Popover, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { UserInfoResponse } from "@/types/user/query";

interface PublisherTagProps {
  publisher: string;
  publisherInfoMap: Record<string, UserInfoResponse>;
  getDisplayName: (publisher: string) => string;
}

export const PublisherTag = ({
  publisher,
  publisherInfoMap,
  getDisplayName,
}: PublisherTagProps) => {
  const info = publisherInfoMap[publisher];
  const displayName = getDisplayName(publisher);

  return (
    <Popover
      title={displayName}
      trigger="hover"
      content={
        info ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="用户名">{info.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{info.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="手机号">{info.mobile || "-"}</Descriptions.Item>
          </Descriptions>
        ) : (
          <span className="text-sm">用户信息加载中</span>
        )
      }
    >
      <Tag color="processing">{displayName}</Tag>
    </Popover>
  );
};

interface PostCardProps {
  post: {
    postId?: string;
    title: string;
    publisher: string;
    description?: string;
    createdAt: string;
    originalFileId: string;
    likeCount: number;
    commentCount: number;
  };
  liked: boolean;
  publisherInfoMap: Record<string, UserInfoResponse>;
  getDisplayName: (publisher: string) => string;
  onLike: () => void;
  onComment: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

export const PostCard = ({
  post,
  liked,
  publisherInfoMap,
  getDisplayName,
  onLike,
  onComment,
  onPreview,
  onDownload,
}: PostCardProps) => {
  return (
    <Card className="rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur hover:shadow-xl transition-shadow">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Typography.Title level={4} className="mb-0 flex-1">
          {post.title}
        </Typography.Title>
        <PublisherTag
          publisher={post.publisher}
          publisherInfoMap={publisherInfoMap}
          getDisplayName={getDisplayName}
        />
      </div>

      <Typography.Paragraph className="mpcs-text-muted min-h-[44px] whitespace-pre-wrap mb-3">
        {post.description || "暂无简介"}
      </Typography.Paragraph>

      <div className="mpcs-text-muted mb-3 text-xs">
        发布于 {dayjs(post.createdAt).format("YYYY-MM-DD HH:mm")}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type={liked ? "primary" : "default"}
            onClick={onLike}
            className={liked ? "!bg-red-500 !border-red-500 hover:!bg-red-600" : ""}
          >
            {liked ? "❤️" : "🤍"} {post.likeCount}
          </Button>
          <Button onClick={onComment}>
            💬 {post.commentCount}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="small" onClick={onPreview}>预览</Button>
          <Button size="small" onClick={onDownload}>下载</Button>
        </div>
      </div>
    </Card>
  );
};
