import { Modal, Progress, Typography } from "antd";
import { useState, useCallback, useMemo } from "react";

const { Text } = Typography;

export type UploadStep =
  | "hashing"
  | "initializing"
  | "uploading"
  | "merging"
  | "completed"
  | "error";

interface UploadState {
  open: boolean;
  step: UploadStep;
  progress: number;
  fileName: string;
  fileSize?: number;
}

const stepLabels: Record<UploadStep, string> = {
  hashing: "正在计算文件指纹",
  initializing: "正在初始化上传",
  uploading: "正在上传分片",
  merging: "正在合并文件",
  completed: "上传完成",
  error: "上传失败",
};

const stepDescriptions: Record<UploadStep, string> = {
  hashing: "请稍候...",
  initializing: "准备上传环境...",
  uploading: "",
  merging: "正在处理文件...",
  completed: "",
  error: "",
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const stepProgressMap: Record<UploadStep, number> = {
  hashing: 10,
  initializing: 20,
  uploading: -1,
  merging: 95,
  completed: 100,
  error: 0,
};

interface UploadProgressModalProps {
  state: UploadState;
  onClose: () => void;
}

const UploadProgressModalInner: React.FC<UploadProgressModalProps> = ({
  state,
  onClose,
}) => {
  const { open, step, progress, fileName, fileSize } = state;
  const isFinished = step === "completed" || step === "error";
  const currentProgress = stepProgressMap[step] === -1 ? progress : stepProgressMap[step];

  const buttonStyle: React.CSSProperties = {
    padding: "8px 20px",
    background: step === "completed" ? "#52c41a" : "#1890ff",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
  };

  return (
    <Modal
      title="正在上传"
      open={open}
      footer={
        isFinished ? (
          <button onClick={onClose} style={buttonStyle}>
            {step === "completed" ? "完成" : "关闭"}
          </button>
        ) : null
      }
      onCancel={isFinished ? onClose : undefined}
      closable={isFinished}
      maskClosable={false}
      width={420}
      centered
    >
      <div style={{ padding: "16px 4px" }}>
        <div style={{ marginBottom: 4 }}>
          <Text strong style={{ fontSize: 15, wordBreak: "break-all" }}>
            {fileName}
          </Text>
        </div>

        {fileSize && (
          <div style={{ marginBottom: 20, color: "#999", fontSize: 13 }}>
            {formatFileSize(fileSize)}
          </div>
        )}

        <Progress
          percent={currentProgress}
          strokeColor={{
            "0%": "#1890ff",
            "100%": "#52c41a",
          }}
          trailColor="#f0f0f0"
          showInfo={false}
          style={{ marginBottom: 0 }}
        />

        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: step === "error" ? "#ff4d4f" : "#333" }}>
            {stepLabels[step]}
          </Text>
        </div>

        {step === "uploading" && progress > 0 && progress < 100 && (
          <div style={{ color: "#999", fontSize: 13 }}>
            已上传 {progress}%
          </div>
        )}

        {step !== "uploading" && stepDescriptions[step] && (
          <div style={{ color: "#999", fontSize: 13 }}>
            {stepDescriptions[step]}
          </div>
        )}

        {step === "completed" && (
          <div style={{ color: "#52c41a", fontSize: 14, marginTop: 8 }}>
            文件上传成功
          </div>
        )}

        {step === "error" && (
          <div style={{ color: "#ff4d4f", fontSize: 13, marginTop: 8 }}>
            上传失败，请检查网络后重试
          </div>
        )}
      </div>
    </Modal>
  );
};

export const useUploadProgress = () => {
  const [state, setState] = useState<UploadState>({
    open: false,
    step: "hashing",
    progress: 0,
    fileName: "",
    fileSize: 0,
  });

  const startUpload = useCallback((fileName: string, fileSize?: number) => {
    setState({
      open: true,
      step: "hashing",
      progress: 0,
      fileName,
      fileSize,
    });
  }, []);

  const setStep = useCallback((step: UploadStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress }));
  }, []);

  const closeUpload = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const UploadProgressModal = useMemo(
    () => () => <UploadProgressModalInner state={state} onClose={closeUpload} />,
    [state, closeUpload]
  );

  return {
    state,
    startUpload,
    setStep,
    setProgress,
    closeUpload,
    UploadProgressModal,
  };
};