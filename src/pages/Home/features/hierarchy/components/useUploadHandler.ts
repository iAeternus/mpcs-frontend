import type { HierarchyFolder } from "@/types/folder/query";
import {
  completeUploadApi,
  initUploadApi,
  uploadChunkApi,
  uploadFileApi,
} from "@/apis/upload";
import SparkMD5 from "spark-md5";

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;
const CHUNK_SIZE = 50 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 10;
const HASH_CHUNK_SIZE = 10 * 1024 * 1024;

export interface UploadHandler {
  uploadFile: (folder: HierarchyFolder) => void;
}

export type UploadProgressSetters = {
  startUpload: (fileName: string, fileSize?: number, totalChunks?: number) => void;
  setStep: (step: "hashing" | "initializing" | "uploading" | "merging" | "completed" | "error") => void;
  setHashProgress: (progress: number) => void;
  setUploadProgress: (progress: number, uploadedChunks?: number) => void;
  setTotalChunks: (total: number) => void;
  incrementUploadedChunks: (count?: number) => void;
  closeUpload: () => void;
};

/**
 * 文件上传处理 Hook
 * @param onSuccess - 上传成功回调
 * @param setters - 上传进度状态更新函数（从 useUploadProgress 获取）
 * @returns 上传处理器
 */
export const useUploadHandler = (
  onSuccess: () => void | Promise<void>,
  setters: UploadProgressSetters,
): UploadHandler => {
  const { 
    startUpload, 
    setStep, 
    setHashProgress, 
    setUploadProgress, 
    setTotalChunks, 
    incrementUploadedChunks, 
    closeUpload 
  } = setters;

  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      let offset = 0;
      const totalChunks = Math.ceil(file.size / HASH_CHUNK_SIZE);
      let processedChunks = 0;
      const reader = new FileReader();
      const loadNext = () => {
        const slice = file.slice(offset, offset + HASH_CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };
      reader.onload = (e) => {
        spark.append(e.target?.result as ArrayBuffer);
        offset += HASH_CHUNK_SIZE;
        processedChunks++;
        setHashProgress(Math.round((processedChunks / totalChunks) * 100));
        if (offset < file.size) {
          loadNext();
        } else {
          resolve(spark.end());
        }
      };
      reader.onerror = () => reject(reader.error);
      loadNext();
    });
  };

  const uploadChunkWithRetry = async (
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    retries = 3,
  ): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      try {
        await uploadChunkApi(uploadId, chunkIndex, chunk);
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };

  const uploadLargeFileByChunks = async (parentId: string, file: File) => {
    const totalSize = file.size;
    const chunkSize = CHUNK_SIZE;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    startUpload(file.name, file.size, totalChunks);
    setTotalChunks(totalChunks);

    try {
      const fileHash = await calculateFileHash(file);

      setStep("initializing");
      const initResp = await initUploadApi({
        parentId,
        fileName: file.name,
        fileHash,
        totalSize,
        chunkSize,
        totalChunks,
      });

      console.log("[Upload] initResp:", {
        uploaded: initResp.uploaded,
        uploadId: initResp.uploadId,
        uploadedChunks: initResp.uploadedChunks,
        totalChunks,
      });

      if (initResp.uploaded) {
        console.log("[Upload] 秒传成功，跳过上传");
        setStep("completed");
        closeUpload();
        await onSuccess();
        return;
      }

      const uploadId = initResp.uploadId;
      if (!uploadId) {
        console.log("[Upload] 错误: uploadId 为空");
        throw new Error("init upload missing uploadId");
      }

      const uploadedSet = new Set(initResp.uploadedChunks ?? []);
      console.log("[Upload] uploadedSet:", Array.from(uploadedSet));

      const pendingChunks: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!uploadedSet.has(i)) pendingChunks.push(i);
      }

      console.log("[Upload] pendingChunks:", pendingChunks, "totalChunks:", totalChunks);

      if (pendingChunks.length === 0) {
        console.log("[Upload] 所有分片已上传，直接完成");
        setStep("merging");
        await completeUploadApi({
          uploadId,
          parentId,
          fileHash,
          totalSize,
        });
        setStep("completed");
        closeUpload();
        await onSuccess();
        return;
      }

      setStep("uploading");
      console.log("[Upload] 开始分片上传，共", pendingChunks.length, "个分片");
      const uploadChunk = async (chunkIndex: number): Promise<void> => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);
        console.log("[Upload] 上传分片", chunkIndex, "大小:", end - start);
        await uploadChunkWithRetry(uploadId, chunkIndex, chunk);
        incrementUploadedChunks(1);
      };

      let completedChunks = uploadedSet.size;
      for (let i = 0; i < pendingChunks.length; i += UPLOAD_CONCURRENCY) {
        const batch = pendingChunks.slice(i, i + UPLOAD_CONCURRENCY);
        console.log("[Upload] 上传批次", batch);
        await Promise.all(batch.map((idx) => uploadChunk(idx)));
        completedChunks += batch.length;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100), completedChunks);
      }

      console.log("[Upload] 分片上传完成，准备合并");
      setStep("merging");
      await completeUploadApi({
        uploadId,
        parentId,
        fileHash,
        totalSize,
      });

      setStep("completed");
      closeUpload();
      await onSuccess();
    } catch (err) {
      setStep("error");
      throw err;
    }
  };

  const uploadFile = (folder: HierarchyFolder) => {
    const uploadByFileSize = async (parentId: string, file: File) => {
      if (file.size >= LARGE_FILE_THRESHOLD) {
        await uploadLargeFileByChunks(parentId, file);
        return;
      }

      await uploadFileApi(parentId, file);
      await onSuccess();
    };

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        await uploadByFileSize(folder.id, file);
      } catch {
        // error handled in uploadByFileSize
      }
    };

    input.click();
  };

  return { uploadFile };
};
