import { PrismaClient } from "@prisma/client";
import { WebSocketService } from "./services/WebSocketService";
import { AgentP2PService } from "./services/AgentP2PService";
import { WebhookService } from "./services/WebhookService";
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const app: import("express-serve-static-core").Express;
export declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export declare const wss: import("ws").Server<typeof import("ws"), typeof import("http").IncomingMessage>;
export declare const webSocketService: WebSocketService;
export declare const agentP2PService: AgentP2PService;
export declare const webhookService: WebhookService;
//# sourceMappingURL=app.d.ts.map