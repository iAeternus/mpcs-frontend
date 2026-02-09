export interface InitUploadCommand {
  fileName: string;
  fileHash: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
}

export interface CompleteUploadCommand {
  parentId: string;
  uploadId: string;
}

export interface FileUploadResponse {
  fileId: string;
}

export interface InitUploadResponse {
  uploaded: boolean;
  storageId: StorageId | null;
  uploadId: string | null;
  uploadedChunks: number[] | null;
}

export interface UploadChunkResponse {
  chunkIndex: number;
}

// TODO: 这里要改后端，应该返回一个字符串而不是后端接口
export interface StorageId {
  value?: string;
}




