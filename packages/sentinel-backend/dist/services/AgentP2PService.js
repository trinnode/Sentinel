"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentP2PService = void 0;
const app_1 = require("../app");
// Define enums locally since Prisma client doesn't export them properly
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["HEALTHY"] = "HEALTHY";
    ReportStatus["UNHEALTHY"] = "UNHEALTHY";
    ReportStatus["CONSENSUS_REACHED"] = "CONSENSUS_REACHED";
    ReportStatus["CONSENSUS_FAILED"] = "CONSENSUS_FAILED";
})(ReportStatus || (ReportStatus = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["PENDING"] = "PENDING";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["RESOLVED"] = "RESOLVED";
})(AlertStatus || (AlertStatus = {}));
class AgentP2PService {
    constructor() {
        this.activeConsensus = new Map();
        this.reportHistory = new Map();
        this.consensusThreshold = parseInt(process.env.AGENT_CONSENSUS_THRESHOLD || "2");
        this.startConsensusProcessor();
    }
    // Process incoming agent report
    async processReport(report, wsService, webhookService) {
        try {
            console.log(`Processing report from agent ${report.agentId}: ${report.status}`);
            // Update agent last seen
            await app_1.prisma.agent.update({
                where: { id: report.agentId },
                data: { lastSeen: new Date() },
            });
            // If this is a failure report, initiate consensus
            if (report.status === ReportStatus.UNHEALTHY) {
                await this.initiateConsensus(report, wsService, webhookService);
            }
            else if (report.status === ReportStatus.HEALTHY) {
                // Cancel any ongoing consensus for this validator
                await this.cancelConsensus(report.validatorId, wsService);
            }
            // Store report for historical analysis
            this.addToReportHistory(report.agentId);
        }
        catch (error) {
            console.error("Error processing agent report:", error);
        }
    }
    // Initiate consensus process for unhealthy validator
    async initiateConsensus(initialReport, wsService, webhookService) {
        if (!initialReport.validatorId)
            return;
        const consensusKey = `validator_${initialReport.validatorId}`;
        // Check if consensus already in progress
        if (this.activeConsensus.has(consensusKey)) {
            const existing = this.activeConsensus.get(consensusKey);
            await this.addReportToConsensus(existing, initialReport, wsService, webhookService);
        }
        else {
            // Start new consensus
            const consensusData = {
                validatorId: initialReport.validatorId,
                status: ReportStatus.UNHEALTHY,
                reports: [initialReport],
                consensusReached: false,
                threshold: this.consensusThreshold,
            };
            this.activeConsensus.set(consensusKey, consensusData);
            await this.addReportToConsensus(consensusData, initialReport, wsService, webhookService);
        }
    }
    // Add report to existing consensus
    async addReportToConsensus(consensusData, report, wsService, webhookService) {
        // Check if this agent already reported for this consensus
        const existingReport = consensusData.reports.find((r) => r.agentId === report.agentId);
        if (existingReport) {
            // Update existing report
            existingReport.status = report.status;
            existingReport.message = report.message;
            existingReport.createdAt = report.createdAt;
        }
        else {
            // Add new report
            consensusData.reports.push(report);
        }
        // Check if consensus reached
        const unhealthyReports = consensusData.reports.filter((r) => r.status === ReportStatus.UNHEALTHY);
        if (unhealthyReports.length >= consensusData.threshold &&
            !consensusData.consensusReached) {
            await this.reachConsensus(consensusData, wsService, webhookService);
        }
        else if (unhealthyReports.length < consensusData.threshold) {
            // Not enough reports to reach consensus, reset timer
            this.resetConsensusTimer(consensusData);
        }
        // Update WebSocket clients
        wsService.sendValidatorUpdate(consensusData.validatorId, "consensus_update", {
            consensusData: {
                totalReports: consensusData.reports.length,
                unhealthyReports: unhealthyReports.length,
                threshold: consensusData.threshold,
                consensusReached: consensusData.consensusReached,
            },
        });
    }
    // Reach consensus and trigger alert
    async reachConsensus(consensusData, wsService, webhookService) {
        consensusData.consensusReached = true;
        try {
            // Get validator and user info
            const validator = await app_1.prisma.validator.findUnique({
                where: { id: consensusData.validatorId },
                include: { user: true },
            });
            if (!validator) {
                console.error("Validator not found for consensus:", consensusData.validatorId);
                return;
            }
            // Create alert
            const alertMessage = `Validator ${validator.name} is unhealthy. Consensus reached with ${consensusData.reports.length} agent reports.`;
            const alert = await app_1.prisma.alert.create({
                data: {
                    validatorId: consensusData.validatorId,
                    userId: validator.userId,
                    message: alertMessage,
                    status: AlertStatus.PENDING,
                },
            });
            // Update all reports to mark consensus reached
            await app_1.prisma.agentReport.updateMany({
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
            await this.triggerWebhooks(validator.userId, "validator.unhealthy", {
                validator,
                alert,
                consensusData,
            }, webhookService);
            console.log(`Consensus reached for validator ${validator.name}. Alert created: ${alert.id}`);
        }
        catch (error) {
            console.error("Error reaching consensus:", error);
        }
    }
    // Cancel consensus (when validator becomes healthy)
    async cancelConsensus(validatorId, wsService) {
        const consensusKey = `validator_${validatorId}`;
        if (this.activeConsensus.has(consensusKey)) {
            const consensusData = this.activeConsensus.get(consensusKey);
            // Update reports to consensus failed
            await app_1.prisma.agentReport.updateMany({
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
    async triggerWebhooks(userId, event, data, webhookService) {
        try {
            const webhooks = await app_1.prisma.webhookConfig.findMany({
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
                        ? webhook.events
                        : [];
                    if (events.includes(event)) {
                        await webhookService.sendWebhook({
                            ...webhook,
                            events,
                        }, {
                            event,
                            timestamp: new Date().toISOString(),
                            data,
                        });
                    }
                }
                catch (error) {
                    console.error(`Error triggering webhook ${webhook.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error("Error fetching webhooks:", error);
        }
    }
    // Reset consensus timer (extend time window for more reports)
    resetConsensusTimer(consensusData) {
        const consensusKey = `validator_${consensusData.validatorId}`;
        // Clear existing timer
        if (this.activeConsensus.has(consensusKey)) {
            // In a real implementation, you'd have a timer that expires consensus
            // For now, we'll just keep it active
        }
    }
    // Start background consensus processor
    startConsensusProcessor() {
        // Clean up old consensus every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldConsensus();
        }, 5 * 60 * 1000);
    }
    async shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    // Clean up old consensus that never reached threshold
    cleanupOldConsensus() {
        const now = new Date();
        const maxAge = 10 * 60 * 1000; // 10 minutes
        for (const [key, consensus] of this.activeConsensus.entries()) {
            const age = now.getTime() - consensus.reports[0].createdAt.getTime();
            if (age > maxAge) {
                // Mark as consensus failed
                app_1.prisma.agentReport
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
    addToReportHistory(agentId) {
        if (!this.reportHistory.has(agentId)) {
            this.reportHistory.set(agentId, []);
        }
        const reports = this.reportHistory.get(agentId);
        reports.push(new Date());
        // Keep only last 100 reports per agent
        if (reports.length > 100) {
            reports.shift();
        }
    }
    // Get active consensus count
    getActiveConsensusCount() {
        return this.activeConsensus.size;
    }
    // Get consensus data for validator
    getConsensusData(validatorId) {
        return this.activeConsensus.get(`validator_${validatorId}`);
    }
}
exports.AgentP2PService = AgentP2PService;
//# sourceMappingURL=AgentP2PService.js.map