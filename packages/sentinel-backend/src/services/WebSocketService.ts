import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "../app";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket, request) => {
      console.log("New WebSocket connection established");

      // Generate client ID
      const clientId = Math.random().toString(36).substring(2, 15);
      this.clients.set(clientId, ws);

      ws.on("message", async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "authenticate") {
            // Verify user token and associate connection with user
            const { token } = data;
            // Here you would verify the JWT token and get user info
            // For now, we'll just acknowledge
            ws.send(
              JSON.stringify({
                type: "authenticated",
                success: true,
                clientId,
              })
            );
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
        this.clients.delete(clientId);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(clientId);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "welcome",
          data: { clientId },
          timestamp: new Date().toISOString(),
        })
      );
    });
  }

  // Send message to all connected clients
  broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        // Remove dead connections
        this.clients.delete(clientId);
      }
    });
  }

  // Send message to specific user (requires user authentication)
  sendToUser(userId: string, message: WebSocketMessage) {
    // For now, broadcast to all clients
    // In production, you'd track which clients belong to which users
    this.broadcast(message);
  }

  // Send validator status update
  sendValidatorUpdate(validatorId: string, status: string, data?: any) {
    const message: WebSocketMessage = {
      type: "validator_update",
      data: {
        validatorId,
        status,
        ...data,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(message);
  }

  // Send alert notification
  sendAlertNotification(alert: any) {
    const message: WebSocketMessage = {
      type: "alert",
      data: {
        alert,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(message);
  }

  // Send agent status update
  sendAgentUpdate(agentId: string, status: string, data?: any) {
    const message: WebSocketMessage = {
      type: "agent_update",
      data: {
        agentId,
        status,
        ...data,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(message);
  }

  // Get connection count
  getConnectionCount(): number {
    return this.clients.size;
  }

  // Clean up dead connections
  cleanup() {
    const deadClients: string[] = [];

    this.clients.forEach((ws, clientId) => {
      if (ws.readyState !== WebSocket.OPEN) {
        deadClients.push(clientId);
      }
    });

    deadClients.forEach((clientId) => {
      this.clients.delete(clientId);
    });

    return deadClients.length;
  }
}
