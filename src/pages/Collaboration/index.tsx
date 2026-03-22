/**
 * 协同编辑页面
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Tag, Tooltip, Spin, message, Space, Modal } from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import "@/pages/Collaboration/index.css";
import { useCollaborationEditor } from "@/hooks/useCollaborationEditor";
import { saveFileContentApi } from "@/apis/collaboration";

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

  const {
    loading,
    session,
    content,
    setContent,
    users,
    currentVersion,
    connected,
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
      setLastSaved(new Date());
      message.success("文件保存成功");
    } catch {
      message.error("文件保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (session?.sessionId) {
      Modal.confirm({
        title: "确认离开",
        content: "离开页面将断开协同连接，但不会丢失未保存的内容",
        onOk: () => navigate(-1),
      });
    } else {
      navigate(-1);
    }
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
        </div>

        <div className="mpcs-collab-header-center">
          <Space>
            <Tooltip title="当前版本">
              <Tag icon={<CheckCircleOutlined />}>
                v{currentVersion}
              </Tag>
            </Tooltip>
            {lastSaved && (
              <span className="mpcs-collab-saved-time">
                已保存 {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </Space>
        </div>

        <div className="mpcs-collab-header-right">
          <Space>
            <div className="mpcs-collab-users">
              <TeamOutlined />
              <span className="mpcs-collab-user-count">{users.length}</span>
              {users.slice(0, 3).map((user) => (
                <Tooltip key={user.oderId} title={user.username}>
                  <Tag
                    className="mpcs-collab-user-tag"
                    color={user.online ? "blue" : "default"}
                    icon={<UserOutlined />}
                  >
                    {user.username.slice(0, 4)}
                  </Tag>
                </Tooltip>
              ))}
              {users.length > 3 && (
                <Tag>+{users.length - 3}</Tag>
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
            <div
              className="mpcs-collab-preview markdown-body"
              style={{ minHeight: editorHeight }}
              dangerouslySetInnerHTML={{
                __html: content || "<p class='mpcs-collab-empty'>开始编辑你的文档...</p>",
              }}
            />
          ) : (
            <div className="mpcs-collab-editor-wrapper">
              {markdownMode === "edit" && (
                <TextArea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mpcs-collab-textarea"
                  placeholder="开始编辑你的 Markdown 文档..."
                  autoSize={{ minRows: 20 }}
                  style={{ minHeight: editorHeight }}
                />
              )}
              {markdownMode === "editAndPreview" && (
                <div className="mpcs-collab-split-view">
                  <div className="mpcs-collab-edit-pane">
                    <TextArea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="mpcs-collab-textarea"
                      placeholder="开始编辑..."
                      autoSize={{ minRows: 20 }}
                      style={{ height: editorHeight }}
                    />
                  </div>
                  <div className="mpcs-collab-preview-pane">
                    <div
                      className="mpcs-collab-preview markdown-body"
                      dangerouslySetInnerHTML={{
                        __html:
                          content || "<p class='mpcs-collab-empty'>预览区域</p>",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="mpcs-collab-footer">
        <span className="mpcs-collab-footer-text">
          协同编辑 · {session?.sessionId ? `会话: ${session.sessionId.slice(0, 8)}...` : "无会话"}
        </span>
      </div>
    </div>
  );
};

export default CollaborationPage;
