import { WebSocketServer } from "ws";
export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: string;
}
export declare class WebSocketService {
    private wss;
    private clients;
    constructor(wss: WebSocketServer);
    private setupWebSocketServer;
    broadcast(message: WebSocketMessage): void;
    sendToUser(userId: string, message: WebSocketMessage): void;
    sendValidatorUpdate(validatorId: string, status: string, data?: any): void;
    sendAlertNotification(alert: any): void;
    sendAgentUpdate(agentId: string, status: string, data?: any): void;
    getConnectionCount(): number;
    cleanup(): number;
}
//# sourceMappingURL=WebSocketService.d.ts.map