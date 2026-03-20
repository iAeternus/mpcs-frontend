import type { HierarchyFolder } from "@/types/folder/query";
import {
  completeUploadApi,
  initUploadApi,
  uploadChunkApi,
  uploadFileApi,
} from "@/apis/upload";
import { useUploadProgress } from "../UploadProgressModal";
import { UPLOAD_CONFIG } from "@/constants";
import SparkMD5 from "spark-md5";

export interface UploadHandler {
  uploadFile: (folder: HierarchyFolder) => void;
}

/**
 * 文件上传处理 Hook
 * @param onSuccess - 上传成功回调
 * @returns 上传处理器
 */
export const useUploadHandler = (
  onSuccess: () => void,
): UploadHandler => {
  const { 
    startUpload, 
    setStep, 
    setHashProgress, 
    setUploadProgress, 
    setTotalChunks, 
    incrementUploadedChunks, 
    closeUpload 
  } = useUploadProgress();

  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      let offset = 0;
      const totalChunks = Math.ceil(file.size / UPLOAD_CONFIG.HASH_CHUNK_SIZE);
      let processedChunks = 0;
      const reader = new FileReader();
      const loadNext = () => {
        const slice = file.slice(offset, offset + UPLOAD_CONFIG.HASH_CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };
      reader.onload = (e) => {
        spark.append(e.target?.result as ArrayBuffer);
        offset += UPLOAD_CONFIG.HASH_CHUNK_SIZE;
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
  ): Promise<void> => {
    for (let i = 0; i < UPLOAD_CONFIG.RETRY_COUNT; i++) {
      try {
        await uploadChunkApi(uploadId, chunkIndex, chunk);
        return;
      } catch (err) {
        if (i === UPLOAD_CONFIG.RETRY_COUNT - 1) throw err;
        await new Promise((r) => setTimeout(r, UPLOAD_CONFIG.RETRY_DELAY_BASE * (i + 1)));
      }
    }
  };

  const uploadLargeFileByChunks = async (parentId: string, file: File) => {
    const totalSize = file.size;
    const chunkSize = UPLOAD_CONFIG.CHUNK_SIZE;
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

      if (initResp.uploaded) {
        setStep("completed");
        closeUpload();
        onSuccess();
        return;
      }

      const uploadId = initResp.uploadId;
      if (!uploadId) {
        throw new Error("init upload missing uploadId");
      }

      const uploadedSet = new Set(initResp.uploadedChunks ?? []);
      const pendingChunks: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!uploadedSet.has(i)) pendingChunks.push(i);
      }

      if (pendingChunks.length === 0) {
        setStep("merging");
        await completeUploadApi({
          uploadId,
          parentId,
          fileHash,
          totalSize,
        });
        setStep("completed");
        closeUpload();
        onSuccess();
        return;
      }

      setStep("uploading");
      const uploadChunk = async (chunkIndex: number): Promise<void> => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);
        await uploadChunkWithRetry(uploadId, chunkIndex, chunk);
        incrementUploadedChunks(1);
      };

      let completedChunks = uploadedSet.size;
      for (let i = 0; i < pendingChunks.length; i += UPLOAD_CONFIG.CONCURRENCY) {
        const batch = pendingChunks.slice(i, i + UPLOAD_CONFIG.CONCURRENCY);
        await Promise.all(batch.map((idx) => uploadChunk(idx)));
        completedChunks += batch.length;
        setUploadProgress(Math.round((completedChunks / totalChunks) * 100), completedChunks);
      }

      setStep("merging");
      await completeUploadApi({
        uploadId,
        parentId,
        fileHash,
        totalSize,
      });

      setStep("completed");
      closeUpload();
      onSuccess();
    } catch (err) {
      setStep("error");
      throw err;
    }
  };

  const uploadFile = (folder: HierarchyFolder) => {
    const uploadByFileSize = async (parentId: string, file: File) => {
      if (file.size >= UPLOAD_CONFIG.LARGE_FILE_THRESHOLD) {
        await uploadLargeFileByChunks(parentId, file);
        return;
      }

      await uploadFileApi(parentId, file);
    };

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        await uploadByFileSize(folder.id, file);
        onSuccess();
      } catch {
        // error handled in uploadByFileSize
      }
    };

    input.click();
  };

  return { uploadFile };
};
