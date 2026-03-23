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
  saved: boolean;
  markSaved: () => void;
  error: string | null;
}

export const useCollaborationEditor = ({
  fileId,
  documentTitle,
  onContentChange,
}: UseCollaborationEditorOptions): UseCollaborationEditorReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfoResponse | null>(null);
  const [content, setContentState] = useState("");
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingOpsRef = useRef<TextOperation[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string>("current-user");
  const usernameRef = useRef<string>("User");
  const initialContentRef = useRef<string>("");
  const savedContentRef = useRef<string>("");
  const sessionRef = useRef<SessionInfoResponse | null>(null);
  const initializedRef = useRef(false);
  const setUsersRef = useRef(setUsers);
  const setCurrentVersionRef = useRef(setCurrentVersion);

  sessionRef.current = session;
  setUsersRef.current = setUsers;
  setCurrentVersionRef.current = setCurrentVersion;

  const getWebSocketUrl = useCallback((sessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = import.meta.env.VITE_WS_HOST || `${window.location.hostname}:8082/api/v1.0`;
    const encodedUsername = encodeURIComponent(usernameRef.current);
    return `${protocol}//${wsHost}/ws/collaboration/${sessionId}?userId=${userIdRef.current}&username=${encodedUsername}`;
  }, []);

  const computeOperations = (
    oldContent: string,
    newContent: string,
    oderId: string,
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
          userId: oderId,
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
          userId: oderId,
          clientVersion: version,
          timestamp: new Date().toISOString(),
        });
        i++;
      }
    }

    return ops;
  };

  const handleWebSocketMessage = useCallback((data: Record<string, unknown>) => {
    const msgType = data.type as string;
    
    if (msgType === "operation_ack") {
      const ack = data as unknown as OperationAckMessage;
      if (ack.success) {
        setCurrentVersionRef.current(ack.version);
        pendingOpsRef.current = [];
      }
    } else if (msgType === "session_state") {
      if (data.activeUsers) {
        setUsersRef.current(data.activeUsers as CollabUser[]);
      }
      if (data.version !== undefined) {
        setCurrentVersionRef.current(data.version as number);
      }
    }
  }, []);

  const connectWebSocket = useCallback(
    (sessionId: string) => {
      if (wsConnectedRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const url = getWebSocketUrl(sessionId);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectedRef.current = true;
        setConnected(true);
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
        wsConnectedRef.current = false;
        setConnected(false);
      };

      ws.onerror = () => {
        setError("WebSocket连接失败");
      };
    },
    [getWebSocketUrl, handleWebSocketMessage],
  );

  const sendOperation = useCallback(
    (operation: TextOperation, sid: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "operation",
            sessionId: sid,
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
      setSaved(newContent === savedContentRef.current);

      const currentSession = sessionRef.current;
      if (currentSession) {
        const oldContent = contentRef.current;
        const version = currentVersion;
        const ops = computeOperations(oldContent, newContent, userIdRef.current, version);
        ops.forEach((op) => {
          sendOperation(op, currentSession.sessionId);
        });
      }
    },
    [onContentChange, sendOperation, currentVersion],
  );

  const markSaved = useCallback(() => {
    setSaved(true);
    savedContentRef.current = contentRef.current;
  }, []);

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
          if (joinError.response?.status !== 409) {
            throw joinErr;
          }
        }

        const history = await getOperationHistoryApi(sess.sessionId, 0);
        
        // Step 1: Always fetch file content first
        let initialContent = "";
        try {
          const fileBlob = await fetchFileContentForCollabApi(fileId);
          initialContent = await fileBlob.text();
        } catch {
          initialContent = "";
        }
        
        // Step 2: Apply operations on top of file content
        if (history.operations && history.operations.length > 0) {
          const sortedOps = [...history.operations].sort((a, b) => a.clientVersion - b.clientVersion);
          for (const op of sortedOps) {
            if (op.type === "INSERT" && op.content !== undefined) {
              const pos = Math.min(op.position, initialContent.length);
              initialContent = initialContent.slice(0, pos) + op.content + initialContent.slice(pos);
            } else if (op.type === "DELETE" && op.length) {
              const pos = Math.min(op.position, initialContent.length);
              initialContent = initialContent.slice(0, pos) + initialContent.slice(pos + op.length);
            }
          }
        }

        initialContentRef.current = initialContent;
        savedContentRef.current = initialContent;
        setContentState(initialContent);
        
        setLoading(false);
        connectWebSocket(sess.sessionId);
      } catch (err) {
        setError("初始化协同会话失败");
        message.error("初始化协同会话失败");
        setLoading(false);
      }
    };

    void initSession();

    return () => {
      wsConnectedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sessionIdRef.current) {
        void leaveSessionApi(sessionIdRef.current);
      }
    };
  }, [fileId, documentTitle, connectWebSocket]);

  return {
    loading,
    session,
    content,
    setContent,
    users,
    currentVersion,
    connected,
    saved,
    markSaved,
    error,
  };
};
