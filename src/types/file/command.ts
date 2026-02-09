export interface RenameFileCommand {
  newName: string;
}

export interface MoveFileCommand {
  fileId: string;
  newParentId?: string | null;
}
