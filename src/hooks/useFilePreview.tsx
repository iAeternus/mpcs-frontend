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

export const useFilePreview = () => {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);
  // 需要主动控制 iframe，防止切换预览方式时媒体残留播放
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const openPreview = (fileId: string, title?: string) => {
    setState({
      open: true,
      fileId,
      title: title || "文件预览",
    });
  };

  const closePreview = () => {
    // 关闭前先断流，避免弹窗关闭后音视频继续播放
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    setState(INITIAL_STATE);
  };

  const openFullscreenPreview = () => {
    if (!state.fileId) return;
    const previewUrl = previewApi(state.fileId);
    // 全屏前先停止嵌入预览，避免嵌入页与全屏页混音
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
    // 先同步关闭弹窗，避免用户看到新页已开但旧弹窗还在
    flushSync(() => {
      closePreview();
    });
    // 延后一拍再打开新窗口，降低状态更新与跳转的时序冲突
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
