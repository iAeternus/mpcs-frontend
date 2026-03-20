import { useRef, useState } from "react";
import { Button, Modal, message } from "antd";
import { previewApi } from "@/apis/file";
import { flushSync } from "react-dom";

interface PreviewState {
  open: boolean;
  fileId: string;
  title: string;
}

const INITIAL_STATE: PreviewState = {
  open: false,
  fileId: "",
  title: "",
};

/**
 * 文件预览 Hook
 * 提供模态框内嵌预览和全屏预览两种模式
 * @returns 文件预览相关状态和方法
 * @example
 * ```tsx
 * const { openPreview, previewModal } = useFilePreview();
 * // 在组件中使用 previewModal
 * // 调用 openPreview(fileId, title) 打开预览
 * ```
 */
export const useFilePreview = () => {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * 打开文件预览模态框
   * @param fileId - 文件ID
   * @param title - 预览窗口标题（可选）
   */
  const openPreview = (fileId: string, title?: string) => {
    setState({
      open: true,
      fileId,
      title: title || "文件预览",
    });
  };

  /**
   * 关闭预览模态框
   * 关闭前会先停止 iframe 的媒体播放，防止音频/视频继续在后台播放
   */
  const closePreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    setState(INITIAL_STATE);
  };

  /**
   * 打开全屏预览
   * 在新窗口中打开预览，解决模态框预览时媒体播放的限制
   */
  const openFullscreenPreview = () => {
    if (!state.fileId) return;
    const previewUrl = previewApi(state.fileId);
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    flushSync(() => {
      closePreview();
    });
    setTimeout(() => {
      const openedWindow = window.open(
        previewUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (!openedWindow) {
        message.warning("浏览器拦截了新窗口，请允许弹窗后重试");
      }
    }, 0);
  };

  const previewModal = (
    <Modal
      title={state.title}
      open={state.open}
      onCancel={closePreview}
      footer={[
        <Button key="fullscreen" onClick={openFullscreenPreview}>
          全屏预览
        </Button>,
        <Button key="close" onClick={closePreview}>
          关闭
        </Button>,
      ]}
      width="80vw"
      style={{ top: 24 }}
      styles={{ body: { padding: 0, height: "75vh" } }}
      destroyOnClose
    >
      {state.fileId ? (
        <iframe
          ref={iframeRef}
          title={state.title}
          src={previewApi(state.fileId)}
          className="h-full w-full border-0"
        />
      ) : null}
    </Modal>
  );

  return {
    openPreview,
    previewModal,
  };
};
