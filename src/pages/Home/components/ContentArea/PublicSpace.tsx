import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Drawer,
  Empty,
  Input,
  List,
  Popover,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CommentOutlined,
  HeartFilled,
  HeartOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { pageApi } from "@/apis/publicfile";
import { fetchLikedCountApi, likeApi, unlikeApi } from "@/apis/like";
import {
  createCommentApi,
  deleteCommentApi,
  pageCommentsApi,
  pageDirectRepliesApi,
} from "@/apis/comment";
import { fetchMyUserInfoApi, fetchUserInfoApi } from "@/apis/user";
import type { PublicFilePageQuery } from "@/types/publicfile/command";
import type { PublicFileResponse } from "@/types/publicfile/query";
import type { CommentResponse } from "@/types/comment/query";
import type { UserInfoResponse } from "@/types/user/query";
import { unwrapList } from "@/utils/idtree";
import { downloadApi } from "@/apis/file";
import { SpaceBackground } from "./SpaceBackground";
import { useAppSelector } from "@/store";
import { useFilePreview } from "@/hooks/useFilePreview";

const DEFAULT_PAGE_QUERY: PublicFilePageQuery = {
  pageIndex: 1,
  pageSize: 20,
  sortedBy: "createdAt",
  ascSort: false,
};

const POST_ID_REGEX = /^PUB\d{17,19}$/;
const COMMENT_ID_REGEX = /^CMT\d{17,19}$/;
const USER_ID_REGEX = /^USR\d{17,19}$/;

type SortValue = "latest" | "oldest" | "hot";

type PublicPost = Omit<PublicFileResponse, "postId"> & { postId?: string };

interface CommentNode extends CommentResponse {
  children: CommentNode[];
}

const normalizePost = (raw: PublicFileResponse): PublicPost | null => {
  const source = raw as PublicFileResponse & {
    id?: string;
    _id?: string;
  };
  const rawPostId = (source.postId ?? source.id ?? source._id ?? "").trim();
  const originalFileId = (source.originalFileId ?? "").trim();
  const title = (source.title ?? "").trim();

  if (!originalFileId || !title) return null;
  const postId = POST_ID_REGEX.test(rawPostId) ? rawPostId : undefined;

  return {
    ...source,
    postId,
    originalFileId,
    title,
    publisher: (source.publisher ?? "").trim(),
    description: source.description ?? "",
    likeCount: Number(source.likeCount ?? 0),
    commentCount: Number(source.commentCount ?? 0),
  };
};

const normalizeCommentId = (comment: CommentResponse): string | null => {
  const id = (comment.commentId ?? "").trim();
  if (!COMMENT_ID_REGEX.test(id)) return null;
  return id;
};

const buildCommentTree = (comments: CommentResponse[]): CommentNode[] => {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    const id = normalizeCommentId(comment);
    const node: CommentNode = {
      ...comment,
      commentId: id ?? undefined,
      parentId: (comment.parentId ?? "").trim() || null,
      children: [],
    };

    if (id) {
      nodeMap.set(id, node);
    } else {
      roots.push(node);
    }
  });

  nodeMap.forEach((node, id) => {
    const parentId = (node.parentId ?? "").trim();
    if (!parentId) {
      roots.push(node);
      return;
    }

    const parent = nodeMap.get(parentId);
    if (!parent || parentId === id) {
      roots.push(node);
      return;
    }

    parent.children.push(node);
  });

  const sortByCreatedAt = (items: CommentNode[]) => {
    items.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    );
    items.forEach((item) => sortByCreatedAt(item.children));
  };
  sortByCreatedAt(roots);

  return roots;
};

export const PublicSpace = () => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const { openPreview, previewModal } = useFilePreview();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("latest");
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [activePost, setActivePost] = useState<PublicPost | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [myUserInfo, setMyUserInfo] = useState<UserInfoResponse | null>(null);
  const [publisherInfoMap, setPublisherInfoMap] = useState<
    Record<string, UserInfoResponse>
  >({});

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const currentQuery = useMemo<PublicFilePageQuery>(() => {
    if (sortValue === "hot") {
      return {
        ...DEFAULT_PAGE_QUERY,
        search: search.trim() || undefined,
        sortedBy: "likeCount",
        ascSort: false,
      };
    }
    if (sortValue === "oldest") {
      return {
        ...DEFAULT_PAGE_QUERY,
        search: search.trim() || undefined,
        sortedBy: "createdAt",
        ascSort: true,
      };
    }
    return {
      ...DEFAULT_PAGE_QUERY,
      search: search.trim() || undefined,
      sortedBy: "createdAt",
      ascSort: false,
    };
  }, [search, sortValue]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await pageApi(currentQuery);
      const normalized = unwrapList<PublicFileResponse>(data.data)
        .map(normalizePost)
        .filter((item): item is PublicPost => item !== null);
      setPosts(normalized);
      if (normalized.length) {
        void refreshPostsRealtimeCount(normalized);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, [currentQuery]);

  useEffect(() => {
    const loadMyInfo = async () => {
      try {
        const info = await fetchMyUserInfoApi();
        setMyUserInfo(info);
      } catch {
        setMyUserInfo(null);
      }
    };
    void loadMyInfo();
  }, []);

  useEffect(() => {
    const missingUserIds = Array.from(
      new Set(
        posts
          .map((post) => post.publisher)
          .filter((userId) => USER_ID_REGEX.test(userId))
          .filter((userId) => !publisherInfoMap[userId]),
      ),
    );

    if (!missingUserIds.length) return;

    const loadPublisherInfos = async () => {
      const entries = await Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const info = await fetchUserInfoApi(userId);
            return [userId, info] as const;
          } catch {
            return null;
          }
        }),
      );

      setPublisherInfoMap((prev) => {
        const next = { ...prev };
        entries.forEach((entry) => {
          if (!entry) return;
          const [userId, info] = entry;
          next[userId] = info;
        });
        return next;
      });
    };

    void loadPublisherInfos();
  }, [posts, publisherInfoMap]);

  const updateSinglePost = (
    postId: string,
    updater: (post: PublicPost) => PublicPost,
  ) => {
    setPosts((prev) =>
      prev.map((post) => (post.postId === postId ? updater(post) : post)),
    );
    setActivePost((prev) => {
      if (!prev || prev.postId !== postId) return prev;
      return updater(prev);
    });
  };

  const getPublisherDisplayName = (publisher: string): string => {
    const info = publisherInfoMap[publisher];
    if (info?.username) return info.username;
    if (myUserInfo && publisher === myUserInfo.userId) {
      return myUserInfo.username;
    }
    if (publisher.startsWith("USR") && publisher.length > 7) {
      return `用户${publisher.slice(-4)}`;
    }
    return publisher;
  };

  const renderPublisherTag = (publisher: string) => {
    const info = publisherInfoMap[publisher];
    const displayName = getPublisherDisplayName(publisher);

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

  const refreshLikeCount = async (postId: string) => {
    const likeResp = await fetchLikedCountApi(postId);
    updateSinglePost(postId, (post) => ({
      ...post,
      likeCount: likeResp.count,
    }));
  };

  const fetchAllComments = async (postId: string): Promise<CommentResponse[]> => {
    const rootResp = await pageCommentsApi({
      pageIndex: 1,
      pageSize: 100,
      postId,
      sortedBy: "createdAt",
      ascSort: true,
    });

    const allComments: CommentResponse[] = [...(rootResp.data ?? [])];
    const queue: string[] = (rootResp.data ?? [])
      .map((comment) => normalizeCommentId(comment))
      .filter((id): id is string => id !== null);
    const visited = new Set<string>();

    while (queue.length > 0) {
      const parentId = queue.shift();
      if (!parentId || visited.has(parentId)) continue;
      visited.add(parentId);

      const replyResp = await pageDirectRepliesApi({
        pageIndex: 1,
        pageSize: 100,
        parentId,
        sortedBy: "createdAt",
        ascSort: true,
      });

      const replies = (replyResp.data ?? []).filter(
        (item) => normalizeCommentId(item) !== parentId,
      );
      allComments.push(...replies);

      replies.forEach((item) => {
        const id = normalizeCommentId(item);
        if (id && !visited.has(id)) queue.push(id);
      });
    }

    const unique = new Map<string, CommentResponse>();
    allComments.forEach((item, index) => {
      const id = normalizeCommentId(item) ?? `fallback:${index}:${item.createdAt}`;
      if (!unique.has(id)) unique.set(id, item);
    });

    return Array.from(unique.values());
  };

  const loadComments = async (postId: string): Promise<CommentResponse[]> => {
    setCommentLoading(true);
    try {
      const allComments = await fetchAllComments(postId);
      setComments(allComments);
      return allComments;
    } finally {
      setCommentLoading(false);
    }
  };

  const refreshPostsRealtimeCount = async (postList: PublicPost[]) => {
    await Promise.allSettled(
      postList
        .filter((post): post is PublicPost & { postId: string } => !!post.postId)
        .map(async (post) => {
          const [likeResult, commentResult] = await Promise.allSettled([
            fetchLikedCountApi(post.postId),
            fetchAllComments(post.postId),
          ]);

          updateSinglePost(post.postId, (current) => ({
            ...current,
            likeCount:
              likeResult.status === "fulfilled"
                ? likeResult.value.count
                : current.likeCount,
            commentCount:
              commentResult.status === "fulfilled"
                ? commentResult.value.length
                : current.commentCount,
          }));
        }),
    );
  };

  const openComments = async (post: PublicPost) => {
    if (!post.postId) {
      message.warning("当前帖子缺少 postId，暂无法评论");
      return;
    }

    setActivePost(post);
    setCommentDrawerOpen(true);
    setCommentInput("");
    setReplyInputMap({});
    await loadComments(post.postId);
  };

  const onToggleLike = async (post: PublicPost) => {
    const postId = post.postId;
    if (!postId) {
      message.warning("当前帖子缺少 postId，暂无法点赞");
      return;
    }

    const liked = likedPostIds.has(postId);
    if (liked) {
      await unlikeApi(postId);
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      await likeApi(postId);
      setLikedPostIds((prev) => new Set(prev).add(postId));
    }
    await refreshLikeCount(postId);
  };

  const onCreateComment = async (postId: string, parentId?: string) => {
    const content = parentId
      ? (replyInputMap[parentId] ?? "").trim()
      : commentInput.trim();

    if (!content) {
      message.warning("请输入评论内容");
      return;
    }

    await createCommentApi({
      postId,
      parentId: parentId ?? null,
      content,
    });

    if (parentId) {
      setReplyInputMap((prev) => ({ ...prev, [parentId]: "" }));
    } else {
      setCommentInput("");
    }

    const allComments = await loadComments(postId);
    updateSinglePost(postId, (post) => ({
      ...post,
      commentCount: allComments.length,
    }));
  };

  const onDeleteComment = async (postId: string, commentId?: string) => {
    if (!commentId || !COMMENT_ID_REGEX.test(commentId)) {
      message.warning("当前评论ID无效，无法删除");
      return;
    }

    await deleteCommentApi({ postId, commentId });
    const allComments = await loadComments(postId);
    updateSinglePost(postId, (post) => ({
      ...post,
      commentCount: allComments.length,
    }));
  };

  const renderCommentNode = (postId: string, node: CommentNode, level = 0) => {
    const id = normalizeCommentId(node);

    return (
      <div
        key={id ?? `${node.username}-${node.createdAt}-${level}`}
        className={`rounded-2xl border p-3 ${
          themeMode === "dark"
            ? "border-white/10 bg-slate-900/55"
            : "border-white/55 bg-white/65"
        } ${
          level > 0 ? "ml-6 mt-3" : "mt-3"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <Space size={8}>
            <Tag color="blue">{node.username}</Tag>
            <Typography.Text type="secondary">
              {dayjs(node.createdAt).format("YYYY-MM-DD HH:mm")}
            </Typography.Text>
          </Space>
          <Space size={4}>
            {id && (
              <Button
                size="small"
                type="link"
                onClick={() =>
                  setReplyInputMap((prev) => ({
                    ...prev,
                    [id]: prev[id] ?? "",
                  }))
                }
              >
                回复
              </Button>
            )}
            <Button
              size="small"
              type="link"
              danger
              onClick={() => void onDeleteComment(postId, id ?? undefined)}
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
              onChange={(event) =>
                setReplyInputMap((prev) => ({ ...prev, [id]: event.target.value }))
              }
              placeholder="输入回复内容"
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="primary"
                size="small"
                onClick={() => void onCreateComment(postId, id)}
              >
                发送回复
              </Button>
            </div>
          </div>
        )}

        {node.children.map((child) => renderCommentNode(postId, child, level + 1))}
      </div>
    );
  };

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const blob = await downloadApi(fileId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      message.success("下载成功");
    } catch {
      message.error("下载失败");
    }
  };

  return (
    <SpaceBackground paddingClassName="py-8">
      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mb-6 text-center">
          <h2 className="mpcs-text-strong text-3xl font-semibold">公共空间</h2>
          <p className="mpcs-text-muted mt-2 text-sm">
            浏览全站公开文件，参与点赞与分层评论讨论。
          </p>
        </div>

        <Card className="mb-6 rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input.Search
              allowClear
              placeholder="搜索文件ID、发布者或标题"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={() => void loadPosts()}
              className="flex-1"
            />
            <Select<SortValue>
              value={sortValue}
              onChange={setSortValue}
              className="w-40"
              options={[
                { label: "最新发布", value: "latest" },
                { label: "最早发布", value: "oldest" },
                { label: "最多点赞", value: "hot" },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadPosts()}>
              刷新
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="text-center">
            <Spin />
          </div>
        ) : posts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post, index) => {
              const liked = post.postId ? likedPostIds.has(post.postId) : false;
              const cardKey =
                post.postId ?? `${post.originalFileId}-${post.createdAt}-${index}`;
              const fileMenuItems = [
                {
                  key: "preview",
                  label: "预览",
                  onClick: () => openPreview(post.originalFileId, post.title),
                },
                {
                  key: "download",
                  label: "下载",
                  onClick: () =>
                    void downloadFile(post.originalFileId, post.title),
                },
              ];
              return (
                <Dropdown
                  key={cardKey}
                  trigger={["contextMenu"]}
                  menu={{ items: fileMenuItems }}
                >
                  <Card className="rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Typography.Title level={4} className="mb-0">
                        {post.title}
                      </Typography.Title>
                      {renderPublisherTag(post.publisher)}
                    </div>

                    <Typography.Paragraph className="mpcs-text-muted min-h-[44px] whitespace-pre-wrap">
                      {post.description || "暂无简介"}
                    </Typography.Paragraph>

                    <div className="mpcs-text-muted mb-3 text-xs">
                      发布于 {dayjs(post.createdAt).format("YYYY-MM-DD HH:mm")}
                    </div>

                    <div className="flex items-center justify-between">
                      <Space>
                        <Button
                          icon={liked ? <HeartFilled /> : <HeartOutlined />}
                          type={liked ? "primary" : "default"}
                          onClick={() => void onToggleLike(post)}
                        >
                          点赞 {post.likeCount}
                        </Button>
                        <Button
                          icon={<CommentOutlined />}
                          onClick={() => void openComments(post)}
                        >
                          评论 {post.commentCount}
                        </Button>
                      </Space>
                      <Typography.Text type="secondary">
                        帖子ID: {post.postId ?? "未返回"}
                      </Typography.Text>
                    </div>
                  </Card>
                </Dropdown>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
            <Empty description="暂无公共文件" />
          </Card>
        )}
      </div>

      <Drawer
        width={560}
        title={activePost ? `评论 · ${activePost.title}` : "评论"}
        open={commentDrawerOpen}
        onClose={() => setCommentDrawerOpen(false)}
      >
        {activePost ? (
          <div className="flex h-full flex-col">
            <div className="mb-3">
              <Input.TextArea
                rows={3}
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="写下你的评论"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="primary"
                  onClick={() =>
                    activePost.postId
                      ? void onCreateComment(activePost.postId)
                      : message.warning("当前帖子缺少 postId，暂无法评论")
                  }
                >
                  发表评论
                </Button>
              </div>
            </div>

            <Spin spinning={commentLoading}>
              {commentTree.length ? (
                <List
                  dataSource={commentTree}
                  renderItem={(item) => (
                    <List.Item className="block border-none px-0 py-0">
                      {activePost.postId
                        ? renderCommentNode(activePost.postId, item)
                        : null}
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="还没有评论，来抢沙发吧" />
              )}
            </Spin>
          </div>
        ) : null}
      </Drawer>
      {previewModal}
    </SpaceBackground>
  );
};
