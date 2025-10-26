import { WebSocket } from "ws";
import { prisma, webSocketService, webhookService } from "../app";

// Define enums locally since Prisma client doesn't export them properly
enum ReportStatus {
  HEALTHY = "HEALTHY",
  UNHEALTHY = "UNHEALTHY",
  CONSENSUS_REACHED = "CONSENSUS_REACHED",
  CONSENSUS_FAILED = "CONSENSUS_FAILED",
}

enum AlertStatus {
  PENDING = "PENDING",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

export interface AgentReport {
  id: string;
  agentId: string;
  validatorId?: string | null;
  status: ReportStatus;
  message?: string | null;
  signature?: string | null;
  consensus: boolean;
  createdAt: Date;
}

export interface ConsensusData {
  validatorId: string;
  status: ReportStatus;
  reports: AgentReport[];
  consensusReached: boolean;
  threshold: number;
}

export class AgentP2PService {
  private consensusThreshold: number;
  private activeConsensus: Map<string, ConsensusData> = new Map();
  private reportHistory: Map<string, Date[]> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.consensusThreshold = parseInt(
      process.env.AGENT_CONSENSUS_THRESHOLD || "2"
    );
    this.startConsensusProcessor();
  }

  // Process incoming agent report
  async processReport(
    report: AgentReport,
    wsService: any,
    webhookService: any
  ): Promise<void> {
    try {
      console.log(
        `Processing report from agent ${report.agentId}: ${report.status}`
      );

      // Update agent last seen
      await prisma.agent.update({
        where: { id: report.agentId },
        data: { lastSeen: new Date() },
      });

      // If this is a failure report, initiate consensus
      if (report.status === ReportStatus.UNHEALTHY) {
        await this.initiateConsensus(report, wsService, webhookService);
      } else if (report.status === ReportStatus.HEALTHY) {
        // Cancel any ongoing consensus for this validator
        await this.cancelConsensus(report.validatorId!, wsService);
      }

      // Store report for historical analysis
      this.addToReportHistory(report.agentId);
    } catch (error) {
      console.error("Error processing agent report:", error);
    }
  }

  // Initiate consensus process for unhealthy validator
  private async initiateConsensus(
    initialReport: AgentReport,
    wsService: any,
    webhookService: any
  ): Promise<void> {
    if (!initialReport.validatorId) return;

    const consensusKey = `validator_${initialReport.validatorId}`;

    // Check if consensus already in progress
    if (this.activeConsensus.has(consensusKey)) {
      const existing = this.activeConsensus.get(consensusKey)!;
      await this.addReportToConsensus(
        existing,
        initialReport,
        wsService,
        webhookService
      );
    } else {
      // Start new consensus
      const consensusData: ConsensusData = {
        validatorId: initialReport.validatorId,
        status: ReportStatus.UNHEALTHY,
        reports: [initialReport],
        consensusReached: false,
        threshold: this.consensusThreshold,
      };

      this.activeConsensus.set(consensusKey, consensusData);
      await this.addReportToConsensus(
        consensusData,
        initialReport,
        wsService,
        webhookService
      );
    }
  }

  // Add report to existing consensus
  private async addReportToConsensus(
    consensusData: ConsensusData,
    report: AgentReport,
    wsService: any,
    webhookService: any
  ): Promise<void> {
    // Check if this agent already reported for this consensus
    const existingReport = consensusData.reports.find(
      (r) => r.agentId === report.agentId
    );

    if (existingReport) {
      // Update existing report
      existingReport.status = report.status;
      existingReport.message = report.message;
      existingReport.createdAt = report.createdAt;
    } else {
      // Add new report
      consensusData.reports.push(report);
    }

    // Check if consensus reached
    const unhealthyReports = consensusData.reports.filter(
      (r) => r.status === ReportStatus.UNHEALTHY
    );

    if (
      unhealthyReports.length >= consensusData.threshold &&
      !consensusData.consensusReached
    ) {
      await this.reachConsensus(consensusData, wsService, webhookService);
    } else if (unhealthyReports.length < consensusData.threshold) {
      // Not enough reports to reach consensus, reset timer
      this.resetConsensusTimer(consensusData);
    }

    // Update WebSocket clients
    wsService.sendValidatorUpdate(
      consensusData.validatorId,
      "consensus_update",
      {
        consensusData: {
          totalReports: consensusData.reports.length,
          unhealthyReports: unhealthyReports.length,
          threshold: consensusData.threshold,
          consensusReached: consensusData.consensusReached,
        },
      }
    );
  }

  // Reach consensus and trigger alert
  private async reachConsensus(
    consensusData: ConsensusData,
    wsService: any,
    webhookService: any
  ): Promise<void> {
    consensusData.consensusReached = true;

    try {
      // Get validator and user info
      const validator = await prisma.validator.findUnique({
        where: { id: consensusData.validatorId },
        include: { user: true },
      });

      if (!validator) {
        console.error(
          "Validator not found for consensus:",
          consensusData.validatorId
        );
        return;
      }

      // Create alert
      const alertMessage = `Validator ${validator.name} is unhealthy. Consensus reached with ${consensusData.reports.length} agent reports.`;
      const alert = await prisma.alert.create({
        data: {
          validatorId: consensusData.validatorId,
          userId: validator.userId,
          message: alertMessage,
          status: AlertStatus.PENDING,
        },
      });

      // Update all reports to mark consensus reached
      await prisma.agentReport.updateMany({
        where: {
          id: { in: consensusData.reports.map((r) => r.id) },
        },
        data: {
          consensus: true,
          status: ReportStatus.CONSENSUS_REACHED,
        },
      });

      // Send real-time update
      wsService.sendValidatorUpdate(validator.id, "unhealthy", {
        alertId: alert.id,
        consensusReached: true,
        reportCount: consensusData.reports.length,
      });

      // Send alert notification
      wsService.sendAlertNotification(alert);

      // Trigger webhooks
      await this.triggerWebhooks(
        validator.userId,
        "validator.unhealthy",
        {
          validator,
          alert,
          consensusData,
        },
        webhookService
      );

      console.log(
        `Consensus reached for validator ${validator.name}. Alert created: ${alert.id}`
      );
    } catch (error) {
      console.error("Error reaching consensus:", error);
    }
  }

  // Cancel consensus (when validator becomes healthy)
  private async cancelConsensus(
    validatorId: string,
    wsService: any
  ): Promise<void> {
    const consensusKey = `validator_${validatorId}`;

    if (this.activeConsensus.has(consensusKey)) {
      const consensusData = this.activeConsensus.get(consensusKey)!;

      // Update reports to consensus failed
      await prisma.agentReport.updateMany({
        where: {
          id: { in: consensusData.reports.map((r) => r.id) },
        },
        data: {
          status: ReportStatus.CONSENSUS_FAILED,
        },
      });

      // Send real-time update
      wsService.sendValidatorUpdate(validatorId, "healthy", {
        consensusCancelled: true,
      });

      // Remove from active consensus
      this.activeConsensus.delete(consensusKey);

      console.log(`Consensus cancelled for validator ${validatorId}`);
    }
  }

  // Trigger webhooks for event
  private async triggerWebhooks(
    userId: string,
    event: string,
    data: any,
    webhookService: any
  ): Promise<void> {
    try {
      const webhooks = await prisma.webhookConfig.findMany({
        where: {
          userId,
          isActive: true,
          events: {
            path: ["$"],
            array_contains: [event],
          },
        },
      });

      for (const webhook of webhooks) {
        try {
          const events = Array.isArray(webhook.events)
            ? (webhook.events as unknown as string[])
            : [];
          if (events.includes(event)) {
            await webhookService.sendWebhook(
              {
                ...webhook,
                events,
              },
              {
                event,
                timestamp: new Date().toISOString(),
                data,
              }
            );
          }
        } catch (error) {
          console.error(`Error triggering webhook ${webhook.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    }
  }

  // Reset consensus timer (extend time window for more reports)
  private resetConsensusTimer(consensusData: ConsensusData): void {
    const consensusKey = `validator_${consensusData.validatorId}`;

    // Clear existing timer
    if (this.activeConsensus.has(consensusKey)) {
      // In a real implementation, you'd have a timer that expires consensus
      // For now, we'll just keep it active
    }
  }

  // Start background consensus processor
  private startConsensusProcessor(): void {
    // Clean up old consensus every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldConsensus();
    }, 5 * 60 * 1000);
  }

  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  // Clean up old consensus that never reached threshold
  private cleanupOldConsensus(): void {
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, consensus] of this.activeConsensus.entries()) {
      const age = now.getTime() - consensus.reports[0].createdAt.getTime();

      if (age > maxAge) {
        // Mark as consensus failed
        prisma.agentReport
          .updateMany({
            where: {
              id: { in: consensus.reports.map((r) => r.id) },
            },
            data: {
              status: ReportStatus.CONSENSUS_FAILED,
            },
          })
          .catch(console.error);

        this.activeConsensus.delete(key);
        console.log(`Cleaned up old consensus for ${key}`);
      }
    }
  }

  // Add report to history for rate limiting
  private addToReportHistory(agentId: string): void {
    if (!this.reportHistory.has(agentId)) {
      this.reportHistory.set(agentId, []);
    }

    const reports = this.reportHistory.get(agentId)!;
    reports.push(new Date());

    // Keep only last 100 reports per agent
    if (reports.length > 100) {
      reports.shift();
    }
  }

  // Get active consensus count
  getActiveConsensusCount(): number {
    return this.activeConsensus.size;
  }

  // Get consensus data for validator
  getConsensusData(validatorId: string): ConsensusData | undefined {
    return this.activeConsensus.get(`validator_${validatorId}`);
  }
}
