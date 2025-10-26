declare enum ReportStatus {
    HEALTHY = "HEALTHY",
    UNHEALTHY = "UNHEALTHY",
    CONSENSUS_REACHED = "CONSENSUS_REACHED",
    CONSENSUS_FAILED = "CONSENSUS_FAILED"
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
export declare class AgentP2PService {
    private consensusThreshold;
    private activeConsensus;
    private reportHistory;
    private cleanupInterval?;
    constructor();
    processReport(report: AgentReport, wsService: any, webhookService: any): Promise<void>;
    private initiateConsensus;
    private addReportToConsensus;
    private reachConsensus;
    private cancelConsensus;
    private triggerWebhooks;
    private resetConsensusTimer;
    private startConsensusProcessor;
    shutdown(): Promise<void>;
    private cleanupOldConsensus;
    private addToReportHistory;
    getActiveConsensusCount(): number;
    getConsensusData(validatorId: string): ConsensusData | undefined;
}
export {};
//# sourceMappingURL=AgentP2PService.d.ts.map