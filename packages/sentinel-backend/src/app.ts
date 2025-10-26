import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import validatorRoutes from "./routes/validators";
import agentRoutes from "./routes/agents";
import webhookRoutes from "./routes/webhooks";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { WebSocketService } from "./services/WebSocketService";
import { AgentP2PService } from "./services/AgentP2PService";
import { WebhookService } from "./services/WebhookService";

dotenv.config();

export const prisma = new PrismaClient();

export const app = express();
export const server = createServer(app);

const wsPort = parseInt(process.env.WS_PORT || "3002", 10);
const isTestEnvironment = process.env.NODE_ENV === "test";

export const wss = new WebSocketServer({
  port: isTestEnvironment ? 0 : wsPort,
});

export const webSocketService = new WebSocketService(wss);
export const agentP2PService = new AgentP2PService();
export const webhookService = new WebhookService();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/validators", authMiddleware, validatorRoutes);
app.use("/api/agents", authMiddleware, agentRoutes);
app.use("/api/webhooks", authMiddleware, webhookRoutes);

app.post("/api/report", async (req, res) => {
  try {
    const { agentId, agentApiKey, validatorId, status, message, signature } =
      req.body;

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

    const agent = await prisma.agent.findUnique({
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

    const report = await prisma.agentReport.create({
      data: {
        agentId,
        validatorId,
        status,
        message,
        signature,
      },
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: { lastSeen: new Date() },
    });

    const reportForProcessing = {
      id: report.id,
      agentId: report.agentId,
      validatorId: report.validatorId ?? undefined,
      status: report.status as any,
      message: report.message ?? undefined,
      signature: report.signature ?? undefined,
      consensus: report.consensus,
      createdAt: report.createdAt,
    };

    await agentP2PService.processReport(
      reportForProcessing,
      webSocketService,
      webhookService
    );

    res.json({ success: true, reportId: report.id });
  } catch (error) {
    console.error("Error processing agent report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use(errorHandler);

app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});
