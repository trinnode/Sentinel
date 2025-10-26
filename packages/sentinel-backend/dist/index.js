"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.webhookService = exports.agentP2PService = exports.webSocketService = exports.wss = exports.server = exports.app = void 0;
const app_1 = require("./app");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return app_1.app; } });
Object.defineProperty(exports, "server", { enumerable: true, get: function () { return app_1.server; } });
Object.defineProperty(exports, "wss", { enumerable: true, get: function () { return app_1.wss; } });
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return app_1.prisma; } });
Object.defineProperty(exports, "webSocketService", { enumerable: true, get: function () { return app_1.webSocketService; } });
Object.defineProperty(exports, "agentP2PService", { enumerable: true, get: function () { return app_1.agentP2PService; } });
Object.defineProperty(exports, "webhookService", { enumerable: true, get: function () { return app_1.webhookService; } });
const PORT = parseInt(process.env.PORT || "3001", 10);
app_1.server.listen(PORT, () => {
    console.log(`🚀 Sentinel Backend API running on port ${PORT}`);
    const configuredWsPort = process.env.WS_PORT || "3002";
    const wssAddress = app_1.wss.address();
    const wsPort = typeof wssAddress === "object" && wssAddress
        ? wssAddress.port
        : configuredWsPort;
    console.log(`📡 WebSocket server running on port ${wsPort}`);
});
const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    try {
        await app_1.agentP2PService.shutdown();
        await app_1.prisma.$disconnect();
    }
    catch (error) {
        console.error("Error disconnecting Prisma during shutdown", error);
    }
    app_1.server.close(() => {
        app_1.wss.close(() => {
            console.log("Process terminated");
        });
    });
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
//# sourceMappingURL=index.js.map