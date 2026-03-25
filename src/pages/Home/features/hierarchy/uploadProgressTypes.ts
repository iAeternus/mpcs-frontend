export type UploadStep =
  | "hashing"
  | "initializing"
  | "uploading"
  | "merging"
  | "completed"
  | "error";

export interface UploadState {
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
