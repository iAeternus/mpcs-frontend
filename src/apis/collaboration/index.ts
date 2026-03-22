/**
 * 协同编辑模块 API
 */
import type {
  CreateSessionCommand,
  OperationHistoryResponse,
  SessionInfoResponse,
  SubmitOperationCommand,
  UpdateCursorCommand,
} from "@/types/collaboration";
import { http } from "@/utils/http";

const COLLAB_BASE = "/collaboration";

/** 创建协同会话 */
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

/** 获取会话信息 */
export const getSessionInfoApi = async (
  sessionId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}`,
    method: "GET",
  });
  return res.data;
};

/** 通过文档ID获取会话 */
export const getSessionByDocumentApi = async (
  documentId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/document/${documentId}`,
    method: "GET",
  });
  return res.data;
};

/** 加入协同会话 */
export const joinSessionApi = async (
  sessionId: string,
): Promise<SessionInfoResponse> => {
  const res = await http.request<SessionInfoResponse>({
    url: `${COLLAB_BASE}/sessions/${sessionId}/join`,
    method: "POST",
  });
  return res.data;
};

/** 离开协同会话 */
export const leaveSessionApi = async (sessionId: string): Promise<void> => {
  await http.request({
    url: `${COLLAB_BASE}/sessions/${sessionId}/leave`,
    method: "POST",
  });
};

/** 删除协同会话 */
export const deleteSessionApi = async (sessionId: string): Promise<void> => {
  await http.request({
    url: `${COLLAB_BASE}/sessions/${sessionId}`,
    method: "DELETE",
  });
};

/** 提交操作 */
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

/** 更新光标位置 */
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

/** 获取操作历史 */
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

/** 获取文件内容用于协同编辑 */
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

/** 保存协同编辑后的文件内容 */
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
