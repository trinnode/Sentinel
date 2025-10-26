"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.agentP2PService = exports.webSocketService = exports.wss = exports.server = exports.app = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const ws_1 = require("ws");
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const validators_1 = __importDefault(require("./routes/validators"));
const agents_1 = __importDefault(require("./routes/agents"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const WebSocketService_1 = require("./services/WebSocketService");
const AgentP2PService_1 = require("./services/AgentP2PService");
const WebhookService_1 = require("./services/WebhookService");
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
exports.app = (0, express_1.default)();
exports.server = (0, http_1.createServer)(exports.app);
const wsPort = parseInt(process.env.WS_PORT || "3002", 10);
const isTestEnvironment = process.env.NODE_ENV === "test";
exports.wss = new ws_1.WebSocketServer({
    port: isTestEnvironment ? 0 : wsPort,
});
exports.webSocketService = new WebSocketService_1.WebSocketService(exports.wss);
exports.agentP2PService = new AgentP2PService_1.AgentP2PService();
exports.webhookService = new WebhookService_1.WebhookService();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
exports.app.use(express_1.default.json({ limit: "10mb" }));
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    });
});
exports.app.use("/api/auth", auth_1.default);
exports.app.use("/api/validators", auth_2.authMiddleware, validators_1.default);
exports.app.use("/api/agents", auth_2.authMiddleware, agents_1.default);
exports.app.use("/api/webhooks", auth_2.authMiddleware, webhooks_1.default);
exports.app.post("/api/report", async (req, res) => {
    try {
        const { agentId, agentApiKey, validatorId, status, message, signature } = req.body;
        if (!agentId || !agentApiKey || !validatorId || !status) {
            return res.status(400).json({
                error: "agentId, agentApiKey, validatorId, and status are required",
            });
        }
        const allowedStatuses = [
            "HEALTHY",
            "UNHEALTHY",
            "CONSENSUS_REACHED",
            "CONSENSUS_FAILED",
        ];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }
        const agent = await exports.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                validator: {
                    select: {
                        id: true,
                        userId: true,
                        isActive: true,
                    },
                },
            },
        });
        if (!agent || !agent.isActive) {
            return res.status(401).json({ error: "Invalid or inactive agent" });
        }
        if (agent.apiKey !== agentApiKey) {
            return res.status(401).json({ error: "Agent API key mismatch" });
        }
        if (!agent.validator || agent.validator.id !== validatorId) {
            return res.status(403).json({
                error: "Agent is not registered for the provided validator",
            });
        }
        if (!agent.validator.isActive) {
            return res.status(403).json({
                error: "Validator is inactive",
            });
        }
        const report = await exports.prisma.agentReport.create({
            data: {
                agentId,
                validatorId,
                status,
                message,
                signature,
            },
        });
        await exports.prisma.agent.update({
            where: { id: agentId },
            data: { lastSeen: new Date() },
        });
        const reportForProcessing = {
            id: report.id,
            agentId: report.agentId,
            validatorId: report.validatorId ?? undefined,
            status: report.status,
            message: report.message ?? undefined,
            signature: report.signature ?? undefined,
            consensus: report.consensus,
            createdAt: report.createdAt,
        };
        await exports.agentP2PService.processReport(reportForProcessing, exports.webSocketService, exports.webhookService);
        res.json({ success: true, reportId: report.id });
    }
    catch (error) {
        console.error("Error processing agent report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.app.use(errorHandler_1.errorHandler);
exports.app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});
//# sourceMappingURL=app.js.map