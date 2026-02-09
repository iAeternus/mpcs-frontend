export interface CreateFolderCommand {
  customId: string;
  parentId: string;
  folderName: string;
}

export interface RenameFolderCommand {
  customId: string;
  newName: string;
}

export interface DeleteFolderForceCommand {
  customId: string;
}

export interface MoveFolderCommand {
  customId: string;
  folderId: string;
  newParentId?: string | null;
}

export interface MoveFolderResponse {
  movedFolderCount: number;
  movedFileCount: number;
}
