/**
 * WebSocket 测试工具
 * 用于测试协同编辑 WebSocket 连接
 */
export const testWebSocketConnection = async (sessionId: string, userId: string, username: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost = import.meta.env.VITE_WS_HOST || `${window.location.hostname}:8082`;
  const url = `${protocol}//${wsHost}/ws/collaboration/${sessionId}?userId=${userId}&username=${encodeURIComponent(username)}`;
  
  console.log("Testing WebSocket connection to:", url);
  console.log("Current location:", window.location.href);
  console.log("Protocol:", window.location.protocol);
  
  return new Promise<{ success: boolean; error?: string; state?: number; details?: string }>((resolve) => {
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      console.log("WebSocket connection timed out after 5 seconds");
      ws.close();
      resolve({ 
        success: false, 
        error: "Connection timeout after 5 seconds", 
        state: -1,
        details: "The server did not respond to the WebSocket handshake within 5 seconds"
      });
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      console.log("WebSocket connection successful! State:", ws.readyState);
      ws.close();
      resolve({ success: true, state: WebSocket.OPEN });
    };
    
    ws.onerror = (event) => {
      clearTimeout(timeout);
      console.error("WebSocket connection error:", event);
      console.error("Event type:", event.type);
      console.error("Target:", event.target);
      console.error("Current readyState:", ws.readyState);
      resolve({ 
        success: false, 
        error: "Connection error - check console for details", 
        state: ws.readyState,
        details: `ReadyState: ${ws.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`
      });
    };
    
    ws.onclose = (event) => {
      clearTimeout(timeout);
      console.log("WebSocket closed event:");
      console.log("  Code:", event.code);
      console.log("  Reason:", event.reason);
      console.log("  Was clean:", event.wasClean);
      console.log("  ReadyState:", ws.readyState);
      
      if (!event.wasClean) {
        let errorMessage = `Connection closed unexpectedly: code ${event.code}`;
        if (event.code === 1006) {
          errorMessage += " ( Abnormal closure - possible server rejection or network issue)";
        } else if (event.code === 1001) {
          errorMessage += " ( Server going away)";
        } else if (event.code === 1002) {
          errorMessage += " ( Protocol error)";
        } else if (event.code === 1003) {
          errorMessage += " ( Unsupported data)";
        } else if (event.code === 1005) {
          errorMessage += " ( No status received)";
        } else if (event.code === 1008) {
          errorMessage += " ( Policy violation)";
        } else if (event.code === 1009) {
          errorMessage += " ( Message too large)";
        } else if (event.code === 1010) {
          errorMessage += " ( Mandatory extension missing)";
        } else if (event.code === 1011) {
          errorMessage += " ( Internal server error)";
        }
        if (event.reason) {
          errorMessage += ` - ${event.reason}`;
        }
        resolve({ success: false, error: errorMessage, state: event.code });
      }
    };
  });
};

export const checkBackendHealth = async () => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${baseUrl}/about`);
    return { success: response.ok, status: response.status };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const testCORS = async () => {
  const results: { url: string; success: boolean; status?: number; error?: string }[] = [];
  
  const testUrls = [
    "http://localhost:8082/api/v1.0/about",
    "ws://localhost:8082/ws/collaboration/test",
  ];
  
  for (const url of testUrls) {
    try {
      if (url.startsWith("ws")) {
        const ws = new WebSocket(url);
        await new Promise<void>((resolve) => {
          ws.onopen = () => {
            ws.close();
            resolve();
          };
          ws.onerror = () => resolve();
          setTimeout(resolve, 2000);
        });
        results.push({ url, success: ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING });
      } else {
        const response = await fetch(url, { method: "OPTIONS" });
        results.push({ url, success: response.ok, status: response.status });
      }
    } catch (error) {
      results.push({ url, success: false, error: String(error) });
    }
  }
  
  return results;
};
