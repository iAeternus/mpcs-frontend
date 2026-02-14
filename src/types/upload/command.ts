export interface InitUploadCommand {
  parentId: string;
  fileName: string;
  fileHash: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
}

export interface CompleteUploadCommand {
  parentId: string;
  uploadId?: string | null;
  fileName?: string | null;
  storageId?: string | null;
  fileHash: string;
  totalSize: number;
}

export interface FileUploadResponse {
  fileId: string;
}

export interface InitUploadResponse {
  uploaded: boolean;
  fileId: string | null;
  storageId: string | null;
  uploadId: string | null;
  uploadedChunks: number[] | null;
}

export interface UploadChunkResponse {
  chunkIndex: number;
}
