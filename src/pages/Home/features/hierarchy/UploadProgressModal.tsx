import { Progress, Typography, Button, Badge } from "antd";
import { useState, useCallback, useEffect, useRef } from "react";
import { useAppSelector } from "@/store";
import {
  CloseOutlined,
  MinusOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

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
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024)
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
};

interface UploadProgressProps {
  state: UploadState;
  onClose: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ state, onClose }) => {
  const {
    visible,
    step,
    fileName,
    fileSize,
    totalChunks,
    uploadedChunks,
    hashProgress,
    uploadProgress,
  } = state;
  const themeMode = useAppSelector((state) => state.theme.mode);
  const isDark = themeMode === "dark";

  const startTimeRef = useRef<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 24 - 360 : 1024 - 24 - 360,
    y: typeof window !== "undefined" ? window.innerHeight - 24 - 300 : 768 - 24 - 300,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!visible) {
      setIsMinimized(false);
      startTimeRef.current = 0;
      setSpeed(0);
    }
  }, [visible]);

  if (!visible) return null;

  const isFinished = step === "completed" || step === "error";
  const overallProgress = isFinished
    ? step === "completed"
      ? 100
      : 0
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
    if (
      step !== "uploading" ||
      speed === 0 ||
      !fileSize ||
      !uploadProgress ||
      uploadProgress >= 100
    ) {
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
      progress:
        step === "hashing"
          ? hashProgress
          : step === "initializing" ||
              step === "uploading" ||
              step === "merging" ||
              step === "completed"
            ? 100
            : 0,
      active: step === "hashing",
    },
    {
      key: "upload",
      label: "分片上传",
      progress:
        step === "uploading"
          ? uploadProgress
          : step === "merging" || step === "completed"
            ? 100
            : 0,
      active: step === "uploading",
      extra:
        totalChunks && uploadedChunks
          ? `${uploadedChunks}/${totalChunks}`
          : undefined,
    },
    {
      key: "merge",
      label: "合并文件",
      progress: step === "merging" ? 50 : step === "completed" ? 100 : 0,
      active: step === "merging",
    },
  ];

  const colors = {
    bg: isDark ? "#1f1f1f" : "#fff",
    border: isDark ? "#303030" : "#f0f0f0",
    text: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.88)",
    textSecondary: isDark ? "rgba(255,255,255,0.45)" : "#999",
    textTertiary: isDark ? "rgba(255,255,255,0.35)" : "#666",
    accent: isDark ? "#8b5cf6" : "#6366f1",
    success: "#52c41a",
    error: "#ff4d4f",
    trail: isDark ? "#303030" : "#f0f0f0",
    trailSmall: isDark ? "#262626" : "#f5f5f5",
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const getStepIcon = () => {
    if (step === "completed") {
      return (
        <CheckCircleOutlined style={{ color: colors.success, fontSize: 20 }} />
      );
    }
    if (step === "error") {
      return (
        <ExclamationCircleOutlined
          style={{ color: colors.error, fontSize: 20 }}
        />
      );
    }
    return <UploadOutlined style={{ color: colors.accent, fontSize: 20 }} />;
  };

  if (isMinimized) {
    const handleBallMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    };

    return (
      <div
        style={{
          position: "fixed",
          top: position.y,
          left: position.x,
          zIndex: 1000,
        }}
      >
        <Badge
          count={isFinished ? 0 : overallProgress}
          overflowCount={100}
          size="small"
        >
          <div
            onMouseDown={handleBallMouseDown}
            onClick={() => {
              if (!isDragging) {
                setIsMinimized(false);
              }
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: isDark ? "#1f1f1f" : "#fff",
              border: `1px solid ${isDark ? "#303030" : "#e8e8e8"}`,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isDragging ? "grabbing" : "grab",
              transition: isDragging ? "none" : "transform 0.2s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {getStepIcon()}
          </div>
        </Badge>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: 360,
        background: colors.bg,
        borderRadius: 12,
        boxShadow: isDark
          ? "0 4px 24px rgba(0, 0, 0, 0.4)"
          : "0 4px 24px rgba(0, 0, 0, 0.12)",
        border: `1px solid ${colors.border}`,
        zIndex: 1000,
        overflow: "hidden",
        transition: isDragging ? "none" : "box-shadow 0.2s",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "move",
          userSelect: "none",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {getStepIcon()}
          <Text strong style={{ fontSize: 15, color: colors.text }}>
            上传进度
          </Text>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {!isFinished && (
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(true);
              }}
              style={{ color: colors.textSecondary }}
            />
          )}
          {isFinished && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{ color: colors.textSecondary }}
            />
          )}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ marginBottom: 4 }}>
          <Text
            style={{ fontSize: 14, wordBreak: "break-all", color: colors.text }}
          >
            {fileName}
          </Text>
        </div>
        {fileSize && (
          <div
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {formatFileSize(fileSize)}
          </div>
        )}

        <Progress
          percent={overallProgress}
          strokeColor={{
            "0%": colors.accent,
            "100%": step === "error" ? colors.error : colors.success,
          }}
          trailColor={colors.trail}
          status={
            step === "error" ? "exception" : isFinished ? "success" : "active"
          }
          style={{ marginBottom: 4 }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: step === "error" ? colors.error : colors.text,
            }}
          >
            {stepLabels[step]}
          </Text>
          {speed > 0 && (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {formatSpeed(speed)}
            </Text>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              marginBottom: 8,
              display: "block",
            }}
          >
            上传详情
          </Text>
          {phaseItems.map((item) => (
            <div key={item.key} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: item.active ? colors.accent : colors.textTertiary,
                  }}
                >
                  {item.label}
                  {item.extra && (
                    <span
                      style={{ color: colors.textSecondary, marginLeft: 4 }}
                    >
                      ({item.extra})
                    </span>
                  )}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {Math.round(item.progress)}%
                </Text>
              </div>
              <Progress
                percent={item.progress}
                showInfo={false}
                size="small"
                strokeColor={item.active ? colors.accent : colors.success}
                trailColor={colors.trailSmall}
              />
            </div>
          ))}
        </div>

        {getEstimatedTime() && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {getEstimatedTime()}
          </Text>
        )}

        {step === "error" && (
          <div style={{ color: colors.error, fontSize: 13, marginTop: 8 }}>
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

  const startUpload = useCallback(
    (fileName: string, fileSize?: number, totalChunks?: number) => {
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
    },
    [],
  );

  const setStep = useCallback((step: UploadStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setHashProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, hashProgress: progress }));
  }, []);

  const setUploadProgress = useCallback(
    (progress: number, uploadedChunks?: number) => {
      setState((prev) => ({
        ...prev,
        uploadProgress: progress,
        uploadedChunks: uploadedChunks ?? prev.uploadedChunks,
      }));
    },
    [],
  );

  const setTotalChunks = useCallback((total: number) => {
    setState((prev) => ({ ...prev, totalChunks: total }));
  }, []);

  const incrementUploadedChunks = useCallback((count: number = 1) => {
    setState((prev) => ({
      ...prev,
      uploadedChunks: (prev.uploadedChunks ?? 0) + count,
    }));
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
