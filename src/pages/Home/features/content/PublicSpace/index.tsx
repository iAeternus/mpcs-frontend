import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Select,
  Spin,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { pageApi } from "@/apis/publicfile";
import {
  fetchLikedCountApi,
  fetchLikeStatusesBatchApi,
  likeApi,
  unlikeApi,
} from "@/apis/like";
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
import { SpaceBackground } from "../SpaceBackground";
import { useFilePreview } from "@/hooks/useFilePreview";
import {
  normalizePost,
  buildCommentTree,
  normalizeCommentId,
  type PublicPost,
  type SortValue,
} from "./utils/postUtils";
import { ID_PATTERNS, PAGINATION } from "@/constants";
import { PostCard } from "./components/PostCard";
import { CommentList } from "./components/CommentList";

const DEFAULT_PAGE_QUERY: PublicFilePageQuery = {
  pageIndex: 1,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  sortedBy: "createdAt",
  ascSort: false,
};

export const PublicSpace = () => {
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
  const [publisherInfoMap, setPublisherInfoMap] = useState<Record<string, UserInfoResponse>>({});

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
      void Promise.all([
        refreshLikedStatus(normalized),
        refreshPostsRealtimeCount(normalized),
      ]);
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
          .filter((userId) => ID_PATTERNS.USER_ID.test(userId))
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

  useEffect(() => {
    const validPostIds = new Set(
      posts
        .map((post) => post.postId)
        .filter((postId): postId is string => Boolean(postId)),
    );
    setLikedPostIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validPostIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [posts]);

  const updateSinglePost = (postId: string, updater: (post: PublicPost) => PublicPost) => {
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

  const refreshLikedStatus = async (postList: PublicPost[]) => {
    const postIds = postList
      .map((post) => post.postId)
      .filter((postId): postId is string => Boolean(postId));
    if (!postIds.length) {
      setLikedPostIds(new Set());
      return;
    }

    try {
      const resp = await fetchLikeStatusesBatchApi({ postIds });
      const likedIds = (resp.statuses ?? [])
        .filter((item) => item.liked)
        .map((item) => item.postId)
        .filter((postId) => ID_PATTERNS.POST_ID.test(postId));
      setLikedPostIds(new Set(likedIds));
    } catch {
      setLikedPostIds(new Set());
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
    if (!commentId || !ID_PATTERNS.COMMENT_ID.test(commentId)) {
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

        <Card className="mb-6 rounded-3xl border border-white/60 bg-white/65 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input.Search
              allowClear
              placeholder="搜索文件标题"
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
              const cardKey = post.postId ?? `${post.originalFileId}-${index}`;
              return (
                <PostCard
                  key={cardKey}
                  post={post}
                  liked={liked}
                  publisherInfoMap={publisherInfoMap}
                  getDisplayName={getPublisherDisplayName}
                  onLike={() => void onToggleLike(post)}
                  onComment={() => void openComments(post)}
                  onPreview={() => openPreview(post.originalFileId, post.title)}
                  onDownload={() => void downloadFile(post.originalFileId, post.title)}
                />
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
                <CommentList
                  postId={activePost.postId ?? ""}
                  comments={commentTree}
                  replyInputMap={replyInputMap}
                  onReplyInputChange={(id, value) =>
                    setReplyInputMap((prev) => ({ ...prev, [id]: value }))
                  }
                  onReply={onCreateComment}
                  onDelete={onDeleteComment}
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
