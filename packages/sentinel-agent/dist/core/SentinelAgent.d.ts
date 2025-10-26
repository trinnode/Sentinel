import { HealthCheckResult } from "../types";
export declare class SentinelAgent {
    private readonly config;
    private readonly logger;
    private readonly beaconMonitor;
    private readonly apiClient;
    private peerNetwork?;
    private isRunning;
    private monitoringInProgress;
    private lastHealthCheck?;
    private lastReportedStatus?;
    private monitoringInterval?;
    private readonly handleIncomingConsensusRequest;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private initializePeerNetwork;
    private teardownPeerNetwork;
    private startMonitoringLoop;
    private performMonitoringCycle;
    private handleHealthResult;
    private confirmUnhealthyWithPeers;
    private hasStatusChanged;
    private sendHealthReport;
    private updateAgentStatus;
    performManualHealthCheck(): Promise<HealthCheckResult>;
    getStatus(): {
        isRunning: boolean;
        lastHealthCheck?: HealthCheckResult;
        config: any;
    };
    isAgentRunning(): boolean;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=SentinelAgent.d.ts.map