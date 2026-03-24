/**
 * 协同编辑模块类型定义
 */

export interface SessionInfoResponse {
  type?: string;
  sessionId: string;
  documentId: string;
  documentTitle: string;
  version: number;
  documentLength: number;
  baseVersion: number;
  activeUserCount: number;
  activeUsers: CollabUser[];
  cursors: Record<string, CursorPosition>;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  parentFolderId?: string;
}

export interface CollabUser {
  oderId: string;
  username: string;
  avatarUrl?: string;
  joinedAt: string;
  lastActiveAt: string;
  online: boolean;
}

export interface CursorPosition {
  userId: string;
  username: string;
  position: number;
  selectionStart: number;
  selectionEnd: number;
  updatedAt: string;
}

export interface OperationHistoryResponse {
  sessionId: string;
  fromVersion: number;
  toVersion: number;
  operations: TextOperation[];
}

export interface TextOperation {
  id: string;
  type: TextOperationType;
  position: number;
  content?: string;
  length: number;
  userId: string;
  clientVersion: number;
  timestamp: string;
  serverVersion?: number;
}

export type TextOperationType = "INSERT" | "DELETE" | "RETAIN";

export interface CreateSessionCommand {
  documentId: string;
  documentTitle: string;
  ttlHours?: number;
}

export interface SubmitOperationCommand {
  sessionId: string;
  type: TextOperationType;
  position: number;
  content?: string;
  length?: number;
  clientVersion: number;
}

export interface UpdateCursorCommand {
  sessionId: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface OperationMessage {
  type: "operation";
  sessionId: string;
  serverVersion?: number;
  operation: SubmitOperationCommand | TextOperation;
}

export interface CursorMessage {
  type: "cursor";
  sessionId: string;
  cursor: UpdateCursorCommand;
}

export interface SessionStateMessage {
  type: "session_state";
  sessionId: string;
  version: number;
  activeUsers: CollabUser[];
  cursors: Record<string, CursorPosition>;
}

export interface OperationAckMessage {
  type: "operation_ack";
  sessionId: string;
  serverVersion: number;
  success: boolean;
  errorMessage?: string;
}
