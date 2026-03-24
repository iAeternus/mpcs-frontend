import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import type {
  CollabUser,
  OperationAckMessage,
  OperationHistoryResponse,
  OperationMessage,
  SessionInfoResponse,
  SessionStateMessage,
  TextOperation,
} from "@/types/collaboration";
import {
  createSessionApi,
  fetchFileContentForCollabApi,
  getOperationHistoryApi,
  getSessionByDocumentApi,
  joinSessionApi,
  leaveSessionApi,
} from "@/apis/collaboration";
import { fetchMyProfileApi } from "@/apis/user";
import { applyOperation, computeTextOperations, rebaseRemoteOperation } from "@/utils/collaboration-ot";

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

function isOperationMessage(data: unknown): data is OperationMessage {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as { type?: unknown; operation?: unknown };
  return candidate.type === "operation" && typeof candidate.operation === "object" && candidate.operation !== null;
}

export const useCollaborationEditor = ({
  fileId,
  documentTitle,
  onContentChange,
}: UseCollaborationEditorOptions): UseCollaborationEditorReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef(false);
  const sessionRef = useRef<SessionInfoResponse | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef("current-user");
  const usernameRef = useRef("User");
  const initializedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef("");
  const currentVersionRef = useRef(0);
  const savedContentRef = useRef("");
  const pendingOpsRef = useRef<TextOperation[]>([]);
  const inFlightOpsRef = useRef<TextOperation[]>([]);
  const awaitingAckRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfoResponse | null>(null);
  const [content, setContentState] = useState("");
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  contentRef.current = content;
  sessionRef.current = session;
  currentVersionRef.current = currentVersion;

  const updateContent = useCallback(
    (nextContent: string) => {
      contentRef.current = nextContent;
      setContentState(nextContent);
      onContentChange?.(nextContent);
      setSaved(nextContent === savedContentRef.current);
    },
    [onContentChange],
  );

  const getWebSocketUrl = useCallback((currentSessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = import.meta.env.VITE_WS_HOST || `${window.location.hostname}:8082`;
    const encodedUsername = encodeURIComponent(usernameRef.current);
    return `${protocol}//${wsHost}/api/v1.0/ws/collaboration/${currentSessionId}?userId=${userIdRef.current}&username=${encodedUsername}`;
  }, []);

  const flushPendingOperations = useCallback(() => {
    if (
      !sessionRef.current ||
      pendingOpsRef.current.length === 0 ||
      awaitingAckRef.current ||
      wsRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const batchOps = [...pendingOpsRef.current];
    pendingOpsRef.current = [];
    inFlightOpsRef.current = batchOps;
    awaitingAckRef.current = true;

    wsRef.current.send(
      JSON.stringify({
        type: "operation_batch",
        sessionId: sessionRef.current.sessionId,
        operations: batchOps,
      }),
    );
  }, []);

  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingOperations();
    }, 150);
  }, [flushPendingOperations]);

  const handleOperationAck = useCallback(
    (ack: OperationAckMessage) => {
      if (!ack.success) {
        awaitingAckRef.current = false;
        inFlightOpsRef.current = [];
        setError(ack.errorMessage || "Operation sync failed");
        return;
      }

      awaitingAckRef.current = false;
      inFlightOpsRef.current = [];
      setCurrentVersion(ack.serverVersion);
      currentVersionRef.current = ack.serverVersion;
      flushPendingOperations();
    },
    [flushPendingOperations],
  );

  const handleRemoteOperation = useCallback(
    (messageData: unknown) => {
      if (!isOperationMessage(messageData)) {
        return;
      }

      const incomingOperation = messageData.operation as TextOperation;
      if (incomingOperation.userId === userIdRef.current) {
        return;
      }

      const localOutstanding = [...inFlightOpsRef.current, ...pendingOpsRef.current];
      const { remoteOperation, localOperations } = rebaseRemoteOperation(incomingOperation, localOutstanding);

      const inFlightCount = inFlightOpsRef.current.length;
      inFlightOpsRef.current = localOperations.slice(0, inFlightCount);
      pendingOpsRef.current = localOperations.slice(inFlightCount);

      updateContent(applyOperation(contentRef.current, remoteOperation));

      if (typeof messageData.serverVersion === "number") {
        setCurrentVersion(messageData.serverVersion);
        currentVersionRef.current = messageData.serverVersion;
      }
    },
    [updateContent],
  );

  const handleWebSocketMessage = useCallback(
    (data: Record<string, unknown>) => {
      const msgType = data.type as string;

      if (msgType === "operation_ack") {
        handleOperationAck(data as unknown as OperationAckMessage);
        return;
      }

      if (msgType === "session_state") {
        const state = data as unknown as SessionStateMessage;
        setUsers(state.activeUsers || []);
        if (typeof state.version === "number") {
          setCurrentVersion(state.version);
          currentVersionRef.current = state.version;
        }
        return;
      }

      if (msgType === "operation") {
        handleRemoteOperation(data);
      }
    },
    [handleOperationAck, handleRemoteOperation],
  );

  const connectWebSocket = useCallback(
    (currentSessionId: string) => {
      if (wsConnectedRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const ws = new WebSocket(getWebSocketUrl(currentSessionId));
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectedRef.current = true;
        setConnected(true);
        sessionIdRef.current = currentSessionId;
        flushPendingOperations();
      };

      ws.onmessage = (event) => {
        try {
          handleWebSocketMessage(JSON.parse(event.data) as Record<string, unknown>);
        } catch {
          // Ignore malformed frames from diagnostics or proxies.
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
    [flushPendingOperations, getWebSocketUrl, handleWebSocketMessage],
  );

  const setContent = useCallback(
    (newContent: string) => {
      const previousContent = contentRef.current;
      updateContent(newContent);

      if (!sessionRef.current) {
        return;
      }

      const operations = computeTextOperations(
        previousContent,
        newContent,
        userIdRef.current,
        currentVersionRef.current,
      );

      if (operations.length === 0) {
        return;
      }

      pendingOpsRef.current.push(...operations);
      scheduleFlush();
    },
    [scheduleFlush, updateContent],
  );

  const markSaved = useCallback(() => {
    savedContentRef.current = contentRef.current;
    setSaved(true);
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initSession = async () => {
      setLoading(true);

      try {
        try {
          const userProfile = await fetchMyProfileApi();
          userIdRef.current = userProfile.userId;
          usernameRef.current = userProfile.username || "User";
        } catch {
          userIdRef.current = "current-user";
          usernameRef.current = "User";
        }

        let currentSession: SessionInfoResponse | null = null;
        const maxRetries = 3;

        for (let attempt = 0; attempt < maxRetries && !currentSession; attempt++) {
          try {
            currentSession = await getSessionByDocumentApi(fileId);
          } catch (err) {
            const axiosError = err as { response?: { status?: number } };
            const status = axiosError.response?.status;

            if (status === 404) {
              try {
                currentSession = await createSessionApi({
                  documentId: fileId,
                  documentTitle,
                  ttlHours: 24,
                });
              } catch (createErr) {
                const createError = createErr as { response?: { status?: number } };
                const createStatus = createError.response?.status;
                if (createStatus === 409 || createStatus === 500) {
                  currentSession = await getSessionByDocumentApi(fileId);
                } else if (attempt < maxRetries - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  continue;
                } else {
                  throw createErr;
                }
              }
            } else if ((status === 409 || status === 500) && attempt < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            } else if (attempt < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
              throw err;
            }
          }
        }

        if (!currentSession) {
          throw new Error("Failed to get or create session");
        }

        setSession(currentSession);
        setUsers(currentSession.activeUsers || []);
        setCurrentVersion(currentSession.version || 0);
        currentVersionRef.current = currentSession.version || 0;
        sessionIdRef.current = currentSession.sessionId;

        try {
          await joinSessionApi(currentSession.sessionId);
        } catch (joinErr) {
          const joinError = joinErr as { response?: { status?: number } };
          if (joinError.response?.status !== 409) {
            throw joinErr;
          }
        }

        let initialContent = "";
        try {
          const fileBlob = await fetchFileContentForCollabApi(fileId);
          initialContent = await fileBlob.text();
        } catch {
          initialContent = "";
        }

        const baseVersion = currentSession.baseVersion || 0;
        const history: OperationHistoryResponse = await getOperationHistoryApi(currentSession.sessionId, baseVersion);

        for (const operation of history.operations || []) {
          initialContent = applyOperation(initialContent, operation);
        }

        savedContentRef.current = initialContent;
        updateContent(initialContent);
        setLoading(false);
        connectWebSocket(currentSession.sessionId);
      } catch {
        setError("初始化协同会话失败");
        message.error("初始化协同会话失败");
        setLoading(false);
      }
    };

    void initSession();

    return () => {
      wsConnectedRef.current = false;
      awaitingAckRef.current = false;
      pendingOpsRef.current = [];
      inFlightOpsRef.current = [];

      if (wsRef.current) {
        wsRef.current.close();
      }

      if (sessionIdRef.current) {
        void leaveSessionApi(sessionIdRef.current);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [connectWebSocket, documentTitle, fileId, updateContent]);

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
