/**
 * 协同编辑页面 - IDE风格布局
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Tag, Tooltip, Spin, message, Space, Modal, Avatar } from "antd";
import TextArea from "antd/es/input/TextArea";
import type { TextAreaRef } from "antd/es/input/TextArea";
import Markdown from "react-markdown";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import "@/pages/Collaboration/index.css";
import { useCollaborationEditor } from "@/hooks/useCollaborationEditor";
import { saveFileContentApi, updateBaseVersionApi, getSessionInfoApi } from "@/apis/collaboration";
import { testWebSocketConnection } from "@/utils/websocket-test";

const CollaborationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId") || "";
  const fileTitle = searchParams.get("title") || "未命名文档";
  const parentId = searchParams.get("parentId") || "";

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [markdownMode, setMarkdownMode] = useState<"edit" | "preview" | "editAndPreview">("editAndPreview");
  const textareaRef = useRef<TextAreaRef>(null);

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
  } = useCollaborationEditor({
    fileId,
    documentTitle: fileTitle,
  });

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleSave = async () => {
    if (!fileId || !parentId) {
      message.warning("文件信息不完整，无法保存");
      return;
    }

    setSaving(true);
    try {
      const blob = new Blob([content], { type: "text/markdown" });
      await saveFileContentApi(fileId, parentId, blob, fileTitle);
      
      // Update baseVersion to current version after saving
      // Use local currentVersion which is updated via WebSocket in real-time
      if (session?.sessionId) {
        try {
          // Wait a bit for WebSocket operations to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          await updateBaseVersionApi(session.sessionId, currentVersion);
        } catch (err) {
          console.error("Failed to update baseVersion:", err);
        }
      }
      
      markSaved();
      setLastSaved(new Date());
      message.success("文件保存成功");
    } catch {
      message.error("文件保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (session?.sessionId && !saved) {
      Modal.confirm({
        title: "确认离开",
        content: "文件尚未保存，离开将丢失未保存的内容",
        onOk: () => navigate(-1),
      });
    } else {
      navigate(-1);
    }
  };

  const handleTextareaSelect = () => {
    // 光标位置会在 useCollaborationEditor 中自动处理
  };

  if (loading) {
    return (
      <div className="collab-page-loading">
        <Spin size="large">
          <div style={{ padding: "20px" }}>正在初始化协同编辑会话...</div>
        </Spin>
      </div>
    );
  }

  const onlineUsers = users.filter((u) => u.online);
  const otherUsers = onlineUsers.filter((u) => u.oderId !== session?.activeUsers?.[0]?.oderId);

  // IDE风格布局样式
  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: 'var(--color-bg-base)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-surface-primary)',
    borderBottom: '1px solid var(--color-border-default)',
    minHeight: 48,
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  };

  const headerCenterStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  };

  const headerRightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--font-medium)',
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--color-surface-secondary)',
    borderBottom: '1px solid var(--color-border-default)',
  };

  const editorContainerStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };

  const editorPaneStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--color-surface-primary)',
  };

  const previewPaneStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-primary)',
    borderLeft: '1px solid var(--color-border-default)',
  };

  const textareaContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    overflow: 'auto',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: '100%',
    padding: 'var(--space-4)',
    border: 'none',
    borderRadius: 0,
    resize: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--leading-relaxed)',
    backgroundColor: 'var(--color-surface-primary)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div style={pageStyle}>
      {/* 顶部栏 */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            size="small"
          >
            返回
          </Button>
          <span style={titleStyle}>{fileTitle}</span>
          <Tag color={connected ? "green" : "red"} style={{ margin: 0 }}>
            {connected ? "已连接" : "未连接"}
          </Tag>
          {!connected && (
            <Tooltip title="WebSocket 连接失败">
              <Button
                type="text"
                size="small"
                icon={<ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />}
                onClick={() => {
                  message.info("正在测试 WebSocket 连接...");
                  if (session) {
                    testWebSocketConnection(
                      session.sessionId,
                      session.activeUsers[0]?.oderId || "unknown",
                      session.activeUsers[0]?.username || "User"
                    ).then((result) => {
                      if (result.success) {
                        message.success("WebSocket 连接成功！请刷新页面");
                      } else {
                        message.error(result.error || "WebSocket 连接失败");
                      }
                    });
                  }
                }}
              >
                诊断
              </Button>
            </Tooltip>
          )}
        </div>

        <div style={headerCenterStyle}>
          <Space>
            <Tooltip title="当前版本">
              <Tag icon={<CheckCircleOutlined />}>
                v{currentVersion}
              </Tag>
            </Tooltip>
            <Tag icon={saved ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={saved ? "green" : "orange"}>
              {saved ? "已保存" : "未保存"}
            </Tag>
            {lastSaved && saved && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </Space>
        </div>

        <div style={headerRightStyle}>
          <Space>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <TeamOutlined />
              <span style={{ fontSize: 'var(--text-sm)' }}>{onlineUsers.length}</span>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {onlineUsers.map((user) => (
                  <Tooltip key={user.oderId} title={`${user.username}${user.oderId === session?.activeUsers?.[0]?.oderId ? " (你)" : ""}`}>
                    <Avatar
                      size="small"
                      style={{
                        backgroundColor: getUserColor(user.oderId),
                        cursor: "default",
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </div>
              {otherUsers.length > 0 && (
                <Tag color="blue" style={{ margin: 0, fontSize: 'var(--text-xs)' }}>
                  {otherUsers.map((u) => u.username).join(", ")} 正在编辑
                </Tag>
              )}
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              size="small"
            >
              保存
            </Button>
          </Space>
        </div>
      </div>

      {/* 工具栏 */}
      <div style={toolbarStyle}>
        <Space>
          <Button
            type={markdownMode === "edit" ? "primary" : "default"}
            onClick={() => setMarkdownMode("edit")}
            size="small"
          >
            编辑
          </Button>
          <Button
            type={markdownMode === "preview" ? "primary" : "default"}
            onClick={() => setMarkdownMode("preview")}
            size="small"
          >
            预览
          </Button>
          <Button
            type={markdownMode === "editAndPreview" ? "primary" : "default"}
            onClick={() => setMarkdownMode("editAndPreview")}
            size="small"
          >
            编辑+预览
          </Button>
        </Space>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
          支持 Markdown 语法，实时协同编辑
        </span>
      </div>

      {/* 编辑器区域 */}
      <div style={editorContainerStyle}>
        {markdownMode === "preview" ? (
          <div style={{ ...previewPaneStyle, flex: 1 }}>
            <div className="markdown-body">
              <Markdown>{content || "*开始编辑你的文档...*"}</Markdown>
            </div>
          </div>
        ) : markdownMode === "edit" ? (
          <div style={editorPaneStyle}>
            <div style={textareaContainerStyle}>
              <TextArea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={handleTextareaSelect}
                placeholder="开始编辑你的 Markdown 文档..."
                autoSize={{ minRows: 20 }}
                style={textareaStyle}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ ...editorPaneStyle, flex: 1, borderRight: '1px solid var(--color-border-default)' }}>
              <div style={textareaContainerStyle}>
                <TextArea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onSelect={handleTextareaSelect}
                  placeholder="开始编辑..."
                  autoSize={{ minRows: 20 }}
                  style={textareaStyle}
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

      {/* 底部状态栏 */}
      <div style={{
        padding: 'var(--space-1) var(--space-4)',
        backgroundColor: 'var(--color-surface-secondary)',
        borderTop: '1px solid var(--color-border-default)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        <span>协同编辑 - {onlineUsers.length} 人在线</span>
      </div>
    </div>
  );
};

function getUserColor(userId: string): string {
  const colors = [
    "#1890ff",
    "#52c41a",
    "#faad14",
    "#f5222d",
    "#722ed1",
    "#13c2c2",
    "#eb2f96",
    "#fa8c16",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % colors.length;
  }
  return colors[Math.abs(hash) % colors.length];
}

export default CollaborationPage;