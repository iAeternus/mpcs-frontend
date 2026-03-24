import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Drawer,
  Empty,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import Markdown from "react-markdown";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  SaveOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { EditingLockResponse, RevisionDetailResponse, RevisionDiffResponse, RevisionSummaryResponse } from "@/types/collaboration";
import { createRevisionApi, getRevisionApi, getRevisionDiffApi, listRevisionsApi, saveFileContentApi, updateBaseVersionApi } from "@/apis/collaboration";
import CollaborativeCodeMirror from "@/components/collaboration/CollaborativeCodeMirror";
import { useCollaborationEditor } from "@/hooks/useCollaborationEditor";
import "@/pages/Collaboration/index.css";
import { testWebSocketConnection } from "@/utils/websocket-test";

const { Text, Paragraph } = Typography;

type MarkdownMode = "edit" | "preview" | "editAndPreview";

interface SelectionRange {
  start: number;
  end: number;
}

function getUserColor(userId: string): string {
  const colors = ["#1677ff", "#52c41a", "#fa8c16", "#f5222d", "#13c2c2", "#eb2f96", "#722ed1", "#a0d911"];
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) % colors.length;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { msg?: string; message?: string } }; message?: string };
  return candidate.response?.data?.msg || candidate.response?.data?.message || candidate.message || fallback;
}

const CollaborationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId") || "";
  const fileTitle = searchParams.get("title") || "未命名文档";
  const parentId = searchParams.get("parentId") || "";

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>("editAndPreview");
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisions, setRevisions] = useState<RevisionSummaryResponse[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<RevisionDetailResponse | null>(null);
  const [revisionDiff, setRevisionDiff] = useState<RevisionDiffResponse | null>(null);
  const [activeLock, setActiveLock] = useState<EditingLockResponse | null>(null);

  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedLockMessageRef = useRef<{ lockId: string; at: number } | null>(null);

  const {
    loading,
    session,
    content,
    setContent,
    users,
    currentVersion,
    connected,
    saved,
    markSaved,
    error,
    currentUserId,
    locks,
    acquireLock,
    renewLock,
    releaseLock,
  } = useCollaborationEditor({
    fileId,
    documentTitle: fileTitle,
  });

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const onlineUsers = useMemo(() => users.filter((user) => user.online), [users]);
  const otherUsers = useMemo(
    () => onlineUsers.filter((user) => user.oderId !== currentUserId),
    [currentUserId, onlineUsers],
  );
  const remoteLocks = useMemo(
    () => locks.filter((lock) => lock.userId !== currentUserId),
    [currentUserId, locks],
  );

  const loadRevisionDetail = useCallback(
    async (revisionId: string) => {
      setRevisionLoading(true);
      try {
        const [detail, diff] = await Promise.all([
          getRevisionApi(fileId, revisionId),
          getRevisionDiffApi(fileId, revisionId),
        ]);
        setSelectedRevisionId(revisionId);
        setSelectedRevision(detail);
        setRevisionDiff(diff);
      } catch (loadError) {
        message.error(getErrorMessage(loadError, "加载版本详情失败"));
      } finally {
        setRevisionLoading(false);
      }
    },
    [fileId],
  );

  const loadRevisions = useCallback(async () => {
    setRevisionLoading(true);
    try {
      const revisionList = await listRevisionsApi(fileId);
      setRevisions(revisionList);

      const defaultRevisionId = selectedRevisionId || revisionList[0]?.revisionId;
      if (defaultRevisionId) {
        await loadRevisionDetail(defaultRevisionId);
      } else {
        setSelectedRevisionId(null);
        setSelectedRevision(null);
        setRevisionDiff(null);
      }
    } catch (loadError) {
      message.error(getErrorMessage(loadError, "加载版本记录失败"));
    } finally {
      setRevisionLoading(false);
    }
  }, [fileId, loadRevisionDetail, selectedRevisionId]);

  const handleOpenRevisionDrawer = useCallback(() => {
    setRevisionDrawerOpen(true);
    void loadRevisions();
  }, [loadRevisions]);

  const handleSave = async () => {
    if (!fileId || !parentId) {
      message.warning("文件信息不完整，无法保存");
      return;
    }

    setSaving(true);
    try {
      const blob = new Blob([content], { type: "text/markdown" });
      await saveFileContentApi(fileId, parentId, blob, fileTitle);

      if (session?.sessionId) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await updateBaseVersionApi(session.sessionId, currentVersion);
        await createRevisionApi(fileId, {
          sessionId: session.sessionId,
          documentId: fileId,
          documentTitle: fileTitle,
          baseVersion: currentVersion,
          content,
          changeSummary: `手动保存版本 v${currentVersion}`,
          source: "MANUAL_SAVE",
        });
      }

      markSaved();
      setLastSaved(new Date());
      if (revisionDrawerOpen) {
        await loadRevisions();
      }
      message.success("文件保存成功");
    } catch (saveError) {
      message.error(getErrorMessage(saveError, "文件保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const releaseActiveLock = useCallback(async () => {
    if (!activeLock) {
      return;
    }

    const currentLockId = activeLock.lockId;
    setActiveLock(null);

    try {
      await releaseLock(currentLockId);
    } catch {
      // Ignore stale release failures during unmount or reconnect.
    }
  }, [activeLock, releaseLock]);

  const requestLock = useCallback(
    async (range: SelectionRange) => {
      if (!session) {
        return;
      }

      if (
        activeLock &&
        activeLock.start === range.start &&
        activeLock.end === range.end
      ) {
        return;
      }

      try {
        const lock = await acquireLock(range.start, range.end);
        setActiveLock(lock);
      } catch (lockError) {
        const errorMessage = getErrorMessage(lockError, "该位置正在被其他用户编辑");
        message.warning(errorMessage);
      }
    },
    [acquireLock, activeLock, session],
  );

  const handleSelectionChange = useCallback(
    (range: SelectionRange) => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }

      selectionTimerRef.current = setTimeout(() => {
        void requestLock({
          start: Math.min(range.start, range.end),
          end: Math.max(range.start, range.end),
        });
      }, 250);
    },
    [requestLock],
  );

  const handleBlockedEdit = useCallback((lock: EditingLockResponse) => {
    const lastMessage = blockedLockMessageRef.current;
    const now = Date.now();
    if (lastMessage && lastMessage.lockId === lock.lockId && now - lastMessage.at < 1200) {
      return;
    }

    blockedLockMessageRef.current = { lockId: lock.lockId, at: now };
    message.warning(`${lock.username} 正在编辑该位置`);
  }, []);

  useEffect(() => {
    if (!activeLock) {
      return undefined;
    }

    const timer = setInterval(() => {
      void renewLock(activeLock.lockId)
        .then((lock) => setActiveLock(lock))
        .catch(() => {
          setActiveLock(null);
        });
    }, 5000);

    return () => clearInterval(timer);
  }, [activeLock, renewLock]);

  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
      void releaseActiveLock();
    };
  }, [releaseActiveLock]);

  const handleBack = () => {
    const leave = () => {
      void releaseActiveLock();
      navigate(-1);
    };

    if (session?.sessionId && !saved) {
      Modal.confirm({
        title: "确认离开",
        content: "当前有未保存内容，离开后将丢失这些修改。",
        onOk: leave,
      });
      return;
    }

    leave();
  };

  if (loading) {
    return (
      <div className="collab-page-loading">
        <Spin size="large">
          <div style={{ padding: 20 }}>正在初始化协同编辑会话...</div>
        </Spin>
      </div>
    );
  }

  const pageStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "var(--color-bg-base)",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-2) var(--space-4)",
    backgroundColor: "var(--color-surface-primary)",
    borderBottom: "1px solid var(--color-border-default)",
    minHeight: 48,
  };

  const toolbarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-2) var(--space-4)",
    backgroundColor: "var(--color-surface-secondary)",
    borderBottom: "1px solid var(--color-border-default)",
  };

  const editorContainerStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  };

  const editorPaneStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "var(--color-surface-primary)",
  };

  const previewPaneStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    padding: "var(--space-4)",
    backgroundColor: "var(--color-surface-primary)",
    borderLeft: "1px solid var(--color-border-default)",
  };

  const editorShellStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} size="small">
            返回
          </Button>
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
            {fileTitle}
          </span>
          <Tag color={connected ? "green" : "red"}>{connected ? "已连接" : "未连接"}</Tag>
          {!connected && (
            <Tooltip title="WebSocket 连接诊断">
              <Button
                type="text"
                size="small"
                icon={<ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />}
                onClick={() => {
                  if (!session) {
                    return;
                  }
                  message.info("正在测试 WebSocket 连接...");
                  void testWebSocketConnection(
                    session.sessionId,
                    currentUserId,
                    users.find((user) => user.oderId === currentUserId)?.username || "User",
                  ).then((result) => {
                    if (result.success) {
                      message.success("WebSocket 连接成功，如有需要请刷新页面。");
                    } else {
                      message.error(result.error || "WebSocket 连接失败");
                    }
                  });
                }}
              >
                诊断
              </Button>
            </Tooltip>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Tag icon={<CheckCircleOutlined />}>v{currentVersion}</Tag>
          <Tag icon={saved ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={saved ? "green" : "orange"}>
            {saved ? "已保存" : "未保存"}
          </Tag>
          {lastSaved && saved && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
              {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Space>
            <Button icon={<HistoryOutlined />} size="small" onClick={handleOpenRevisionDrawer}>
              版本记录
            </Button>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <TeamOutlined />
              <span style={{ fontSize: "var(--text-sm)" }}>{onlineUsers.length}</span>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                {onlineUsers.map((user) => (
                  <Tooltip key={user.oderId} title={`${user.username}${user.oderId === currentUserId ? "（你）" : ""}`}>
                    <Avatar
                      size="small"
                      style={{
                        backgroundColor: getUserColor(user.oderId),
                        cursor: "default",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </div>
              {otherUsers.length > 0 && (
                <Tag color="blue" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
                  {otherUsers.map((user) => user.username).join("、")} 正在编辑
                </Tag>
              )}
            </div>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="small">
              保存
            </Button>
          </Space>
        </div>
      </div>

      <div style={toolbarStyle}>
        <Space>
          <Button type={markdownMode === "edit" ? "primary" : "default"} onClick={() => setMarkdownMode("edit")} size="small">
            编辑
          </Button>
          <Button type={markdownMode === "preview" ? "primary" : "default"} onClick={() => setMarkdownMode("preview")} size="small">
            预览
          </Button>
          <Button
            type={markdownMode === "editAndPreview" ? "primary" : "default"}
            onClick={() => setMarkdownMode("editAndPreview")}
            size="small"
          >
            分屏
          </Button>
        </Space>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-tertiary)" }}>
          支持 Markdown 协同编辑、版本记录和编辑位置锁定
        </span>
      </div>

      <div style={editorContainerStyle}>
        {markdownMode === "preview" ? (
          <div style={{ ...previewPaneStyle, flex: 1 }}>
            <div className="markdown-body">
              <Markdown>{content || "*开始编辑你的文档...*"}</Markdown>
            </div>
          </div>
        ) : markdownMode === "edit" ? (
          <div style={editorPaneStyle}>
            <div style={editorShellStyle}>
              <CollaborativeCodeMirror
                value={content}
                onChange={setContent}
                currentUserId={currentUserId}
                locks={remoteLocks}
                onSelectionChange={handleSelectionChange}
                onBlur={() => {
                  void releaseActiveLock();
                }}
                onBlockedEdit={handleBlockedEdit}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ ...editorPaneStyle, flex: 1, borderRight: "1px solid var(--color-border-default)" }}>
              <div style={editorShellStyle}>
                <CollaborativeCodeMirror
                  value={content}
                  onChange={setContent}
                  currentUserId={currentUserId}
                  locks={remoteLocks}
                  onSelectionChange={handleSelectionChange}
                  onBlur={() => {
                    void releaseActiveLock();
                  }}
                  onBlockedEdit={handleBlockedEdit}
                />
              </div>
            </div>
            <div style={previewPaneStyle}>
              <div className="markdown-body">
                <Markdown>{content || "*预览区域*"}</Markdown>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "var(--space-1) var(--space-4)",
          backgroundColor: "var(--color-surface-secondary)",
          borderTop: "1px solid var(--color-border-default)",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-tertiary)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>当前协同会话在线用户 {onlineUsers.length} 人</span>
        <span>其他用户锁定位置 {remoteLocks.length} 处</span>
      </div>

      <Drawer
        title="文档版本记录"
        placement="right"
        size="large"
        open={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
      >
        <div style={{ display: "flex", gap: 16, minHeight: 520 }}>
          <div style={{ width: 280, borderRight: "1px solid var(--color-border-default)", paddingRight: 16 }}>
            <List
              loading={revisionLoading}
              dataSource={revisions}
              locale={{ emptyText: <Empty description="暂无版本记录" /> }}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: "pointer",
                    paddingInline: 12,
                    borderRadius: 8,
                    background: item.revisionId === selectedRevisionId ? "rgba(22, 119, 255, 0.08)" : undefined,
                  }}
                  onClick={() => {
                    void loadRevisionDetail(item.revisionId);
                  }}
                >
                  <List.Item.Meta
                    title={<Text strong>版本 #{item.revisionNo}</Text>}
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary">{item.creator || item.createdBy}</Text>
                        <Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Text>
                        <Text>{item.changeSummary || item.source}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedRevision ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div>
                  <Text strong>{selectedRevision.documentTitle}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag>版本 #{selectedRevision.revisionNo}</Tag>
                    <Tag color="blue">v{selectedRevision.baseVersion}</Tag>
                    <Tag>{selectedRevision.source}</Tag>
                  </div>
                </div>

                <Paragraph type="secondary">
                  {selectedRevision.changeSummary || "暂无变更摘要"}
                </Paragraph>

                <div>
                  <Text strong>差异内容</Text>
                  <pre
                    style={{
                      marginTop: 8,
                      maxHeight: 220,
                      overflow: "auto",
                      padding: 12,
                      borderRadius: 8,
                      background: "#0f172a",
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                  >
                    {(revisionDiff?.unifiedDiffLines || ["暂无差异数据"]).join("\n")}
                  </pre>
                </div>

                <div>
                  <Text strong>版本快照</Text>
                  <pre
                    style={{
                      marginTop: 8,
                      maxHeight: 260,
                      overflow: "auto",
                      padding: 12,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      border: "1px solid var(--color-border-default)",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedRevision.contentSnapshot}
                  </pre>
                </div>
              </Space>
            ) : (
              <Empty description="请选择一个版本查看详情" />
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default CollaborationPage;
