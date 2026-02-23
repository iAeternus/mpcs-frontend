import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { EditOutlined, ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  editDescriptionApi,
  pageMyApi,
  updateTitleApi,
  withdrawApi,
} from "@/apis/publicfile";
import type { PublicFilePageQuery } from "@/types/publicfile/command";
import type { PublicFileResponse } from "@/types/publicfile/query";
import { unwrapList } from "@/utils/idtree";
import { downloadApi, previewApi } from "@/apis/file";
import { SpaceBackground } from "./SpaceBackground";

const DEFAULT_PAGE_QUERY: PublicFilePageQuery = {
  pageIndex: 1,
  pageSize: 20,
  sortedBy: "createdAt",
  ascSort: false,
};

const POST_ID_REGEX = /^PUB\d{17,19}$/;
type SortValue = "latest" | "oldest" | "hot";
type ManagedPost = Omit<PublicFileResponse, "postId"> & { postId?: string };

const normalizeManagedPost = (raw: PublicFileResponse): ManagedPost | null => {
  const source = raw as PublicFileResponse & {
    id?: string;
    _id?: string;
  };
  const rawPostId = (source.postId ?? source.id ?? source._id ?? "").trim();
  const originalFileId = (source.originalFileId ?? "").trim();
  const title = (source.title ?? "").trim();

  if (!originalFileId || !title) return null;

  return {
    ...source,
    postId: POST_ID_REGEX.test(rawPostId) ? rawPostId : undefined,
    originalFileId,
    title,
    publisher: (source.publisher ?? "").trim(),
    description: source.description ?? "",
    likeCount: Number(source.likeCount ?? 0),
    commentCount: Number(source.commentCount ?? 0),
  };
};

export const PostManage = () => {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("latest");

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

  const loadMyPosts = async () => {
    setLoading(true);
    try {
      const data = await pageMyApi(currentQuery);
      const normalized = unwrapList<PublicFileResponse>(data.data)
        .map(normalizeManagedPost)
        .filter((item): item is ManagedPost => item !== null);
      setPosts(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMyPosts();
  }, [currentQuery]);

  const onWithdraw = (post: ManagedPost) => {
    const postId = post.postId;
    if (!postId) {
      message.warning("当前帖子缺少 postId，无法撤回");
      return;
    }

    Modal.confirm({
      title: "确认撤回该发布？",
      content: post.title,
      onOk: async () => {
        await withdrawApi(postId);
        message.success("撤回成功");
        await loadMyPosts();
      },
    });
  };

  const onEditTitle = (post: ManagedPost) => {
    const postId = post.postId;
    if (!postId) {
      message.warning("当前帖子缺少 postId，无法编辑标题");
      return;
    }

    let nextTitle = post.title;
    Modal.confirm({
      title: "编辑标题",
      content: (
        <Input
          defaultValue={post.title}
          placeholder="请输入新标题"
          onChange={(event) => {
            nextTitle = event.target.value;
          }}
        />
      ),
      onOk: async () => {
        const value = nextTitle.trim();
        if (!value) {
          message.warning("标题不能为空");
          return Promise.reject();
        }
        await updateTitleApi({
          postId,
          newTitle: value,
        });
        message.success("标题更新成功");
        await loadMyPosts();
      },
    });
  };

  const onEditDescription = (post: ManagedPost) => {
    const postId = post.postId;
    if (!postId) {
      message.warning("当前帖子缺少 postId，无法编辑简介");
      return;
    }

    let nextDescription = post.description ?? "";
    Modal.confirm({
      title: "编辑简介",
      width: 640,
      content: (
        <Input.TextArea
          rows={5}
          defaultValue={post.description ?? ""}
          placeholder="请输入简介（可留空）"
          onChange={(event) => {
            nextDescription = event.target.value;
          }}
        />
      ),
      onOk: async () => {
        await editDescriptionApi({
          postId,
          newDescription: nextDescription.trim() || null,
        });
        message.success("简介更新成功");
        await loadMyPosts();
      },
    });
  };

  const previewFileInBrowser = (fileId: string) => {
    const previewUrl = previewApi(fileId);
    const openedWindow = window.open(
      previewUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (!openedWindow) {
      message.warning("浏览器拦截了预览窗口，请允许弹窗后重试");
    }
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
          <h2 className="mpcs-text-strong text-3xl font-semibold">发布管理</h2>
          <p className="mpcs-text-muted mt-2 text-sm">
            管理你发布到社区的文件，可撤回并编辑标题与简介。
          </p>
        </div>

        <Card className="mb-6 rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input.Search
              allowClear
              placeholder="搜索标题 / 文件ID / 帖子ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={() => void loadMyPosts()}
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
            <Button icon={<ReloadOutlined />} onClick={() => void loadMyPosts()}>
              刷新
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <Spin spinning={loading}>
            {posts.length ? (
              <List
                itemLayout="vertical"
                dataSource={posts}
                renderItem={(post, index) => (
                  <Dropdown
                    key={post.postId ?? `${post.originalFileId}-${post.createdAt}-${index}`}
                    trigger={["contextMenu"]}
                    menu={{
                      items: [
                        {
                          key: "preview",
                          label: "预览",
                          onClick: () => previewFileInBrowser(post.originalFileId),
                        },
                        {
                          key: "download",
                          label: "下载",
                          onClick: () =>
                            void downloadFile(post.originalFileId, post.title),
                        },
                      ],
                    }}
                  >
                    <List.Item>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <Typography.Title level={5} className="mb-1">
                            {post.title}
                          </Typography.Title>
                          <Space size={[8, 8]} wrap>
                            <Tag color="blue">帖子ID: {post.postId ?? "未返回"}</Tag>
                            <Tag color="geekblue">文件ID: {post.originalFileId}</Tag>
                            <Tag color="gold">点赞: {post.likeCount}</Tag>
                            <Tag color="purple">评论: {post.commentCount}</Tag>
                            <Tag>
                              发布时间:{" "}
                              {dayjs(post.createdAt).format("YYYY-MM-DD HH:mm")}
                            </Tag>
                          </Space>
                        </div>

                        <Space>
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => onEditTitle(post)}
                          >
                            编辑标题
                          </Button>
                          <Button
                            icon={<EditOutlined />}
                            onClick={() => onEditDescription(post)}
                          >
                            编辑简介
                          </Button>
                          <Button
                            danger
                            icon={<RollbackOutlined />}
                            onClick={() => onWithdraw(post)}
                          >
                            撤回
                          </Button>
                        </Space>
                      </div>

                      <Typography.Paragraph className="mb-0 whitespace-pre-wrap">
                        {post.description || "暂无简介"}
                      </Typography.Paragraph>
                    </List.Item>
                  </Dropdown>
                )}
              />
            ) : (
              <Empty description="你还没有发布过文件" />
            )}
          </Spin>
        </Card>
      </div>
    </SpaceBackground>
  );
};
