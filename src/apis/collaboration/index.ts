import type {
  AcquireEditingLockCommand,
  CreateRevisionCommand,
  CreateSessionCommand,
  EditingLockResponse,
  EditingLockStateResponse,
  OperationHistoryResponse,
  RevisionDetailResponse,
  RevisionDiffResponse,
  RevisionSummaryResponse,
  SessionInfoResponse,
  SubmitOperationCommand,
  UpdateCursorCommand,
} from "@/types/collaboration";
import { http } from "@/utils/http";

const COLLAB_BASE = "/collaboration";

export const createSessionApi = async (
  cmd: CreateSessionCommand,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions`,
    method: "POST",
    data: cmd,
  });
  return res.data;
};

export const getSessionInfoApi = async (
  sessionId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}`,
    method: "GET",
  });
  return res.data;
};

export const getSessionByDocumentApi = async (
  documentId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/document/${documentId}`,
    method: "GET",
  });
  return res.data;
};

export const joinSessionApi = async (
  sessionId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/join`,
    method: "POST",
  });
  return res.data;
};

export const leaveSessionApi = async (sessionId: string): Promise<void> => {
  await http.request({
    url: `${COLLAB_BASE}/sessions/${sessionId}/leave`,
    method: "POST",
  });
};

export const deleteSessionApi = async (sessionId: string): Promise<void> => {
  await http.request({
    url: `${COLLAB_BASE}/sessions/${sessionId}`,
    method: "DELETE",
  });
};

export const submitOperationApi = async (
  cmd: SubmitOperationCommand,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/operations`,
    method: "POST",
    data: cmd,
  });
  return res.data;
};

export const updateCursorApi = async (
  cmd: UpdateCursorCommand,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/cursors`,
    method: "POST",
    data: cmd,
  });
  return res.data;
};

export const getOperationHistoryApi = async (
  sessionId: string,
  fromVersion: number = 0,
): Promise<OperationHistoryResponse> => {
  const res = await http.request<OperationHistoryResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/history`,
    method: "GET",
    params: { fromVersion },
  });
  return res.data;
};

export const fetchFileContentForCollabApi = async (
  fileId: string,
): Promise<Blob> => {
  const res = await http.request<Blob>({
    url: `/files/${fileId}/collab-content`,
    method: "GET",
    responseType: "blob",
  });
  return res.data;
};

export const updateBaseVersionApi = async (
  sessionId: string,
  baseVersion: number,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/base-version`,
    method: "PUT",
    params: { baseVersion },
  });
  return res.data;
};

export const saveFileContentApi = async (
  fileId: string,
  parentId: string,
  content: Blob,
  filename: string,
): Promise<void> => {
  const formData = new FormData();
  formData.append("file", content, filename);
  formData.append("filename", filename);
  formData.append("parentId", parentId);

  await http.request({
    url: `/files/${fileId}/collab-save`,
    method: "PUT",
    data: formData,
  });
};

export const createRevisionApi = async (
  documentId: string,
  cmd: CreateRevisionCommand,
): Promise<RevisionDetailResponse> => {
  const res = await http.request<RevisionDetailResponse>({
    url: `${COLLAB_BASE}/documents/${documentId}/revisions`,
    method: "POST",
    data: cmd,
  });
  return res.data;
};

export const listRevisionsApi = async (
  documentId: string,
): Promise<RevisionSummaryResponse[]> => {
  const res = await http.request<RevisionSummaryResponse[]>({
    url: `${COLLAB_BASE}/documents/${documentId}/revisions`,
    method: "GET",
  });
  return res.data;
};

export const getRevisionApi = async (
  documentId: string,
  revisionId: string,
): Promise<RevisionDetailResponse> => {
  const res = await http.request<RevisionDetailResponse>({
    url: `${COLLAB_BASE}/documents/${documentId}/revisions/${revisionId}`,
    method: "GET",
  });
  return res.data;
};

export const getRevisionDiffApi = async (
  documentId: string,
  revisionId: string,
  compareToRevisionId?: string,
): Promise<RevisionDiffResponse> => {
  const res = await http.request<RevisionDiffResponse>({
    url: `${COLLAB_BASE}/documents/${documentId}/revisions/${revisionId}/diff`,
    method: "GET",
    params: compareToRevisionId ? { compareToRevisionId } : undefined,
  });
  return res.data;
};

export const listLocksApi = async (
  sessionId: string,
): Promise<EditingLockStateResponse> => {
  const res = await http.request<EditingLockStateResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/locks`,
    method: "GET",
  });
  return res.data;
};

export const acquireLockApi = async (
  sessionId: string,
  cmd: AcquireEditingLockCommand,
): Promise<EditingLockResponse> => {
  const res = await http.request<EditingLockResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/locks`,
    method: "POST",
    data: cmd,
  });
  return res.data;
};

export const renewLockApi = async (
  sessionId: string,
  lockId: string,
): Promise<EditingLockResponse> => {
  const res = await http.request<EditingLockResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/locks/${lockId}/renew`,
    method: "POST",
  });
  return res.data;
};

export const releaseLockApi = async (
  sessionId: string,
  lockId: string,
): Promise<void> => {
  await http.request({
    url: `${COLLAB_BASE}/sessions/${sessionId}/locks/${lockId}`,
    method: "DELETE",
  });
};
