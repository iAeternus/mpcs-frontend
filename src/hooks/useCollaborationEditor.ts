/**
 * 协同编辑页面 Hook
 * 封装协同编辑状态管理和WebSocket通信
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CollabUser,
  OperationAckMessage,
  OperationMessage,
  SessionInfoResponse,
  TextOperation,
} from "@/types/collaboration";
import {
  createSessionApi,
  getOperationHistoryApi,
  getSessionByDocumentApi,
  joinSessionApi,
  leaveSessionApi,
} from "@/apis/collaboration";
import { message } from "antd";
import { fetchMyProfileApi } from "@/apis/user";
import { fetchFileContentForCollabApi } from "@/apis/collaboration";

interface UseCollaborationEditorOptions {
  fileId: string;
  documentTitle: string;
  onContentChange?: (content: string) => void;
}

interface UseCollaborationEditorReturn {
  loading: boolean;
  session: SessionInfoResponse | null;
  content: string;
  setContent: (content: string) => void;
  users: CollabUser[];
  currentVersion: number;
  connected: boolean;
  save: () => Promise<void>;
  error: string | null;
}

export const useCollaborationEditor = ({
  fileId,
  documentTitle,
  onContentChange,
}: UseCollaborationEditorOptions): UseCollaborationEditorReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfoResponse | null>(null);
  const [content, setContentState] = useState("");
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOpsRef = useRef<TextOperation[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string>("current-user");
  const usernameRef = useRef<string>("User");
  const initializedRef = useRef(false);

  const getWebSocketUrl = (sessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const encodedUsername = encodeURIComponent(usernameRef.current);
    return `${protocol}//${host}/ws/collaboration/${sessionId}?userId=${userIdRef.current}&username=${encodedUsername}`;
  };

  const computeOperations = (
    oldContent: string,
    newContent: string,
    userId: string,
    version: number,
  ): TextOperation[] => {
    const ops: TextOperation[] = [];
    let i = 0;
    let j = 0;

    while (i < oldContent.length || j < newContent.length) {
      if (i < oldContent.length && j < newContent.length && oldContent[i] === newContent[j]) {
        i++;
        j++;
      } else if (j < newContent.length) {
        ops.push({
          id: crypto.randomUUID(),
          type: "INSERT",
          position: j,
          content: newContent[j],
          length: 1,
          userId,
          clientVersion: version,
          timestamp: new Date().toISOString(),
        });
        j++;
      } else {
        ops.push({
          id: crypto.randomUUID(),
          type: "DELETE",
          position: i,
          content: "",
          length: 1,
          userId,
          clientVersion: version,
          timestamp: new Date().toISOString(),
        });
        i++;
      }
    }

    return ops;
  };

  const handleWebSocketMessage = useCallback((data: OperationAckMessage | SessionInfoResponse) => {
    if (data.type === "ack") {
      const ack = data as OperationAckMessage;
      if (ack.success) {
        setCurrentVersion(ack.version);
        pendingOpsRef.current = [];
      }
    } else if (data.type === "state" || "activeUsers" in data) {
      const state = data as SessionInfoResponse;
      if (state.activeUsers) {
        setUsers(state.activeUsers);
      }
      if (state.version !== undefined) {
        setCurrentVersion(state.version);
      }
    }
  }, []);

  const connectWebSocket = useCallback(
    async (sessionId: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const ws = new WebSocket(getWebSocketUrl(sessionId));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: "join",
            sessionId,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = () => {
        setError("WebSocket连接失败");
      };
    },
    [handleWebSocketMessage],
  );

  const sendOperation = useCallback(
    (operation: TextOperation, sessionId?: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "operation",
            sessionId,
            operation,
          } as OperationMessage),
        );
      }
    },
    [],
  );

  const contentRef = useRef(content);
  contentRef.current = content;

  const setContent = useCallback(
    (newContent: string) => {
      setContentState(newContent);
      onContentChange?.(newContent);

      if (session) {
        const oldContent = contentRef.current;
        const ops = computeOperations(oldContent, newContent, "user", currentVersion);
        ops.forEach((op) => {
          sendOperation(op, session.sessionId);
        });
      }
    },
    [session, onContentChange, sendOperation, currentVersion],
  );

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initSession = async () => {
      setLoading(true);
      try {
        let userProfile;
        try {
          userProfile = await fetchMyProfileApi();
          userIdRef.current = userProfile.userId;
          usernameRef.current = userProfile.username || "User";
        } catch {
          userIdRef.current = "current-user";
          usernameRef.current = "User";
        }

        let sess: SessionInfoResponse | null = null;
        const maxRetries = 3;

        for (let attempt = 0; attempt < maxRetries && !sess; attempt++) {
          try {
            sess = await getSessionByDocumentApi(fileId);
          } catch (err) {
            const axiosError = err as { response?: { status?: number } };
            const status = axiosError.response?.status;

            if (status === 404) {
              try {
                sess = await createSessionApi({
                  documentId: fileId,
                  documentTitle,
                  ttlHours: 24,
                });
              } catch (createErr) {
                const createError = createErr as { response?: { status?: number } };
                const createStatus = createError.response?.status;
                if (createStatus === 409 || createStatus === 500) {
                  sess = await getSessionByDocumentApi(fileId);
                } else if (attempt < maxRetries - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  continue;
                } else {
                  throw createErr;
                }
              }
            } else if (status === 409 || status === 500) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              continue;
            } else if (attempt < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              continue;
            } else {
              throw err;
            }
          }
        }

        if (!sess) {
          throw new Error("Failed to get or create session");
        }

        setSession(sess);
        setUsers(sess.activeUsers || []);
        setCurrentVersion(sess.version || 0);
        sessionIdRef.current = sess.sessionId;

        try {
          await joinSessionApi(sess.sessionId);
        } catch (joinErr) {
          const joinError = joinErr as { response?: { status?: number } };
          if (joinError.response?.status === 409) {
            // User already in session, continue
          } else {
            throw joinErr;
          }
        }

        const history = await getOperationHistoryApi(sess.sessionId, 0);
        let initialContent = "";
        if (history.operations && history.operations.length > 0) {
          initialContent = history.operations
            .sort((a, b) => a.clientVersion - b.clientVersion)
            .reduce((acc, op) => {
              if (op.type === "INSERT" && op.content) {
                return acc + op.content;
              } else if (op.type === "DELETE" && op.length) {
                return acc.slice(0, -op.length);
              }
              return acc;
            }, "");
        } else {
          try {
            const fileBlob = await fetchFileContentForCollabApi(fileId);
            initialContent = await fileBlob.text();
          } catch {
            initialContent = "";
          }
        }
        setContentState(initialContent);

        connectWebSocket(sess.sessionId);
      } catch {
        setError("初始化协同会话失败");
        message.error("初始化协同会话失败");
      } finally {
        setLoading(false);
      }
    };

    void initSession();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sessionIdRef.current) {
        void leaveSessionApi(sessionIdRef.current);
      }
    };
  }, [fileId, documentTitle, connectWebSocket]);

  const save = useCallback(async () => {
    message.info("保存功能已集成到编辑器");
  }, []);

  return {
    loading,
    session,
    content,
    setContent,
    users,
    currentVersion,
    connected,
    save,
    error,
  };
};
