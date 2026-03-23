import { Card, Button, Space, Tag, message } from "antd";
import { useState } from "react";
import { testWebSocketConnection, checkBackendHealth } from "@/utils/websocket-test";

interface WebSocketDiagnosticProps {
  sessionId: string;
  userId: string;
  username: string;
}

export const WebSocketDiagnosticPanel = ({ sessionId, userId, username }: WebSocketDiagnosticProps) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    backendHealth?: { success: boolean; status?: number; error?: string };
    wsConnection?: { success: boolean; error?: string; state?: number };
  }>({});

  const runDiagnostics = async () => {
    setTesting(true);
    setResults({});
    
    try {
      const backendResult = await checkBackendHealth();
      setResults((prev) => ({ ...prev, backendHealth: backendResult }));
      
      if (backendResult.success) {
        const wsResult = await testWebSocketConnection(sessionId, userId, username);
        setResults((prev) => ({ ...prev, wsConnection: wsResult }));
      } else {
        message.error("后端服务未启动或无法访问");
      }
    } catch (error) {
      message.error("诊断失败: " + String(error));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card size="small" title="WebSocket 连接诊断">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button onClick={runDiagnostics} loading={testing} type="primary">
          运行诊断
        </Button>
        
        {results.backendHealth && (
          <div>
            <Tag color={results.backendHealth.success ? "green" : "red"}>
              后端服务: {results.backendHealth.success ? "正常" : "异常"}
            </Tag>
            {results.backendHealth.status && (
              <span> HTTP状态: {results.backendHealth.status}</span>
            )}
            {results.backendHealth.error && (
              <div style={{ color: "red", fontSize: "12px" }}>
                {results.backendHealth.error}
              </div>
            )}
          </div>
        )}
        
        {results.wsConnection && (
          <div>
            <Tag color={results.wsConnection.success ? "green" : "red"}>
              WebSocket: {results.wsConnection.success ? "成功" : "失败"}
            </Tag>
            {results.wsConnection.state !== undefined && (
              <span> State: {results.wsConnection.state}</span>
            )}
            {results.wsConnection.error && (
              <div style={{ color: "red", fontSize: "12px" }}>
                {results.wsConnection.error}
              </div>
            )}
          </div>
        )}
        
        <div style={{ fontSize: "12px", color: "#999" }}>
          <p>提示：</p>
          <ul style={{ paddingLeft: "20px" }}>
            <li>确保后端服务正在运行 (端口 8082)</li>
            <li>检查浏览器控制台获取详细日志</li>
            <li>尝试清除浏览器缓存或使用隐私模式</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};
