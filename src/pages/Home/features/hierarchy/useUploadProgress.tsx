import { useCallback, useState } from "react";
import UploadProgress from "./UploadProgressModal";
import type { UploadState, UploadStep } from "./uploadProgressTypes";

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
