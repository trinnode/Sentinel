import {
  app,
  server,
  wss,
  prisma,
  webSocketService,
  agentP2PService,
  webhookService,
} from "./app";

const PORT = parseInt(process.env.PORT || "3001", 10);

server.listen(PORT, () => {
  console.log(`🚀 Sentinel Backend API running on port ${PORT}`);
  const configuredWsPort = process.env.WS_PORT || "3002";
  const wssAddress = wss.address();
  const wsPort =
    typeof wssAddress === "object" && wssAddress
      ? wssAddress.port
      : configuredWsPort;
  console.log(`📡 WebSocket server running on port ${wsPort}`);
});

const shutdown = async (signal: "SIGINT" | "SIGTERM") => {
  console.log(`${signal} received, shutting down gracefully`);
  try {
    await agentP2PService.shutdown();
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting Prisma during shutdown", error);
  }

  server.close(() => {
    wss.close(() => {
      console.log("Process terminated");
    });
  });
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export {
  app,
  server,
  wss,
  webSocketService,
  agentP2PService,
  webhookService,
  prisma,
};
