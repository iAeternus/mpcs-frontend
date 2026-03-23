/**
 * 协同编辑页面
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Tag, Tooltip, Spin, message, Space, Modal, Avatar } from "antd";
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
import { saveFileContentApi } from "@/apis/collaboration";
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
  const [editorHeight] = useState("calc(100vh - 200px)");
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
      <div className="mpcs-collab-page">
        <div className="mpcs-collab-loading">
          <Spin size="large">
            <div style={{ padding: "20px" }}>正在初始化协同编辑会话...</div>
          </Spin>
        </div>
      </div>
    );
  }

  const onlineUsers = users.filter((u) => u.online);
  const otherUsers = onlineUsers.filter((u) => u.oderId !== session?.activeUsers?.[0]?.oderId);

  return (
    <div className="mpcs-collab-page">
      <div className="mpcs-collab-header">
        <div className="mpcs-collab-header-left">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="mpcs-collab-back-btn"
          />
          <span className="mpcs-collab-title">{fileTitle}</span>
          <Tag color={connected ? "green" : "red"} className="mpcs-collab-status-tag">
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

        <div className="mpcs-collab-header-center">
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
              <span className="mpcs-collab-saved-time">
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </Space>
        </div>

        <div className="mpcs-collab-header-right">
          <Space>
            <div className="mpcs-collab-users">
              <TeamOutlined />
              <span className="mpcs-collab-user-count">{onlineUsers.length}</span>
              <div className="mpcs-collab-user-avatars">
                {onlineUsers.map((user) => (
                  <Tooltip key={user.oderId} title={`${user.username}${user.oderId === session?.activeUsers?.[0]?.oderId ? " (你)" : ""}`}>
                    <Avatar
                      size="small"
                      className="mpcs-collab-user-avatar"
                      style={{
                        backgroundColor: getUserColor(user.oderId),
                        cursor: "default",
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </div>
              {otherUsers.length > 0 && (
                <Tag color="blue" className="mpcs-collab-editing-tag">
                  {otherUsers.map((u) => u.username).join(", ")} 正在编辑
                </Tag>
              )}
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              className="mpcs-collab-save-btn"
            >
              保存
            </Button>
          </Space>
        </div>
      </div>

      <div className="mpcs-collab-toolbar">
        <Space>
          <Button
            type={markdownMode === "edit" ? "primary" : "default"}
            onClick={() => setMarkdownMode("edit")}
          >
            编辑
          </Button>
          <Button
            type={markdownMode === "preview" ? "primary" : "default"}
            onClick={() => setMarkdownMode("preview")}
          >
            预览
          </Button>
          <Button
            type={markdownMode === "editAndPreview" ? "primary" : "default"}
            onClick={() => setMarkdownMode("editAndPreview")}
          >
            编辑+预览
          </Button>
        </Space>
        <span className="mpcs-collab-hint">
          支持 Markdown 语法，实时协同编辑
        </span>
      </div>

      <div className="mpcs-collab-container">
        <Card className="mpcs-collab-editor-card">
          {markdownMode === "preview" ? (
            <div className="mpcs-collab-preview markdown-body" style={{ minHeight: editorHeight }}>
              <Markdown>{content || "*开始编辑你的文档...*"}</Markdown>
            </div>
          ) : (
            <div className="mpcs-collab-editor-wrapper">
              {markdownMode === "edit" && (
                <div className="mpcs-collab-textarea-container">
                  <TextArea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onSelect={handleTextareaSelect}
                    className="mpcs-collab-textarea"
                    placeholder="开始编辑你的 Markdown 文档..."
                    autoSize={{ minRows: 20 }}
                    style={{ minHeight: editorHeight }}
                  />
                  <div className="mpcs-collab-cursor-labels">
                    {otherUsers.map((user) => {
                      const cursorPos = session?.cursors?.[user.oderId]?.position || 0;
                      return (
                        <Tooltip key={user.oderId} title={`${user.username} 的光标位置`}>
                          <div
                            className="mpcs-collab-cursor-label"
                            style={{
                              backgroundColor: getUserColor(user.oderId),
                              top: `${Math.floor(cursorPos / 80) * 20}px`,
                            }}
                          >
                            {user.username}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}
              {markdownMode === "editAndPreview" && (
                <div className="mpcs-collab-split-view">
                  <div className="mpcs-collab-edit-pane">
                    <div className="mpcs-collab-textarea-container">
                      <TextArea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onSelect={handleTextareaSelect}
                        className="mpcs-collab-textarea"
                        placeholder="开始编辑..."
                        autoSize={{ minRows: 20 }}
                        style={{ height: editorHeight }}
                      />
                      <div className="mpcs-collab-cursor-labels">
                        {otherUsers.map((user) => {
                          const cursorPos = session?.cursors?.[user.oderId]?.position || 0;
                          return (
                            <Tooltip key={user.oderId} title={`${user.username} 的光标位置`}>
                              <div
                                className="mpcs-collab-cursor-label"
                                style={{
                                  backgroundColor: getUserColor(user.oderId),
                                  top: `${Math.floor(cursorPos / 80) * 20}px`,
                                }}
                              >
                                {user.username}
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mpcs-collab-preview-pane">
                    <div className="mpcs-collab-preview markdown-body">
                      <Markdown>{content || "*预览区域*"}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="mpcs-collab-footer">
        <span className="mpcs-collab-footer-text">
          协同编辑 - {onlineUsers.length} 人在线
        </span>
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
