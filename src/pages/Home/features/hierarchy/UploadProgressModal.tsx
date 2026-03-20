import { Progress, Typography, Button } from "antd";
import { useState, useCallback, useEffect, useRef } from "react";

const { Text } = Typography;

export type UploadStep =
  | "hashing"
  | "initializing"
  | "uploading"
  | "merging"
  | "completed"
  | "error";

interface UploadState {
  visible: boolean;
  step: UploadStep;
  progress: number;
  hashProgress: number;
  uploadProgress: number;
  fileName: string;
  fileSize?: number;
  totalChunks?: number;
  uploadedChunks?: number;
}

const stepLabels: Record<UploadStep, string> = {
  hashing: "正在计算文件指纹",
  initializing: "正在初始化上传",
  uploading: "正在上传分片",
  merging: "正在合并文件",
  completed: "上传完成",
  error: "上传失败",
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
};

interface UploadProgressProps {
  state: UploadState;
  onClose: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ state, onClose }) => {
  const { visible, step, fileName, fileSize, totalChunks, uploadedChunks, hashProgress, uploadProgress } = state;
  const startTimeRef = useRef<number>(0);
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    if (visible && step === "uploading") {
      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now();
      }
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed > 0 && fileSize && uploadProgress > 0) {
        const uploaded = (fileSize * uploadProgress) / 100;
        setSpeed(uploaded / elapsed);
      }
    }
  }, [visible, step, uploadProgress, fileSize]);

  if (!visible) return null;

  const isFinished = step === "completed" || step === "error";
  const overallProgress = isFinished
    ? step === "completed" ? 100 : 0
    : step === "hashing"
      ? Math.round(hashProgress)
      : step === "initializing"
        ? 15
        : step === "uploading"
          ? Math.round(uploadProgress)
          : step === "merging"
            ? 98
            : 0;

  const getEstimatedTime = (): string => {
    if (step !== "uploading" || speed === 0 || !fileSize || !uploadProgress || uploadProgress >= 100) {
      return "";
    }
    const remaining = (fileSize * (100 - uploadProgress)) / 100;
    const remainingSeconds = remaining / speed;
    if (remainingSeconds < 60) {
      return `预计剩余 ${Math.ceil(remainingSeconds)} 秒`;
    }
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.ceil(remainingSeconds % 60);
    return `预计剩余 ${minutes} 分 ${seconds} 秒`;
  };

  const phaseItems = [
    {
      key: "hash",
      label: "计算哈希",
      progress: step === "hashing" ? hashProgress : step === "initializing" || step === "uploading" || step === "merging" || step === "completed" ? 100 : 0,
      active: step === "hashing",
    },
    {
      key: "upload",
      label: "分片上传",
      progress: step === "uploading" ? uploadProgress : (step === "merging" || step === "completed" ? 100 : 0),
      active: step === "uploading",
      extra: totalChunks && uploadedChunks ? `${uploadedChunks}/${totalChunks}` : undefined,
    },
    {
      key: "merge",
      label: "合并文件",
      progress: step === "merging" ? 50 : step === "completed" ? 100 : 0,
      active: step === "merging",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 360,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
        border: "1px solid #f0f0f0",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text strong style={{ fontSize: 15 }}>上传进度</Text>
        {isFinished && (
          <Button type="text" size="small" onClick={onClose}>关闭</Button>
        )}
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 14, wordBreak: "break-all" }}>{fileName}</Text>
        </div>
        {fileSize && (
          <div style={{ color: "#999", fontSize: 13, marginBottom: 16 }}>
            {formatFileSize(fileSize)}
          </div>
        )}

        <Progress
          percent={overallProgress}
          strokeColor={{
            "0%": "#1890ff",
            "100%": step === "error" ? "#ff4d4f" : "#52c41a",
          }}
          trailColor="#f0f0f0"
          status={step === "error" ? "exception" : isFinished ? "success" : "active"}
          style={{ marginBottom: 4 }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: step === "error" ? "#ff4d4f" : "#333" }}>
            {stepLabels[step]}
          </Text>
          {speed > 0 && (
            <Text style={{ fontSize: 12, color: "#999" }}>
              {formatSpeed(speed)}
            </Text>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#666", marginBottom: 8, display: "block" }}>上传详情</Text>
          {phaseItems.map((item) => (
            <div key={item.key} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <Text style={{ fontSize: 12, color: item.active ? "#1890ff" : "#666" }}>
                  {item.label}
                  {item.extra && <span style={{ color: "#999", marginLeft: 4 }}>({item.extra})</span>}
                </Text>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  {Math.round(item.progress)}%
                </Text>
              </div>
              <Progress
                percent={item.progress}
                showInfo={false}
                size="small"
                strokeColor={item.active ? "#1890ff" : "#52c41a"}
                trailColor="#f5f5f5"
              />
            </div>
          ))}
        </div>

        {getEstimatedTime() && (
          <Text style={{ fontSize: 12, color: "#999" }}>
            {getEstimatedTime()}
          </Text>
        )}

        {step === "error" && (
          <div style={{ color: "#ff4d4f", fontSize: 13, marginTop: 8 }}>
            上传失败，请检查网络后重试
          </div>
        )}
      </div>
    </div>
  );
};

export const useUploadProgress = () => {
  const [state, setState] = useState<UploadState>({
    visible: false,
    step: "hashing",
    progress: 0,
    hashProgress: 0,
    uploadProgress: 0,
    fileName: "",
    fileSize: 0,
    totalChunks: 0,
    uploadedChunks: 0,
  });

  const startUpload = useCallback((fileName: string, fileSize?: number, totalChunks?: number) => {
    setState({
      visible: true,
      step: "hashing",
      progress: 0,
      hashProgress: 0,
      uploadProgress: 0,
      fileName,
      fileSize,
      totalChunks,
      uploadedChunks: 0,
    });
  }, []);

  const setStep = useCallback((step: UploadStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setHashProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, hashProgress: progress }));
  }, []);

  const setUploadProgress = useCallback((progress: number, uploadedChunks?: number) => {
    setState((prev) => ({
      ...prev,
      uploadProgress: progress,
      uploadedChunks: uploadedChunks ?? prev.uploadedChunks,
    }));
  }, []);

  const setTotalChunks = useCallback((total: number) => {
    setState((prev) => ({ ...prev, totalChunks: total }));
  }, []);

  const incrementUploadedChunks = useCallback((count: number = 1) => {
    setState((prev) => ({ ...prev, uploadedChunks: (prev.uploadedChunks ?? 0) + count }));
  }, []);

  const closeUpload = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    state,
    startUpload,
    setStep,
    setHashProgress,
    setUploadProgress,
    setTotalChunks,
    incrementUploadedChunks,
    closeUpload,
    UploadProgressComponent: UploadProgress,
  };
};
