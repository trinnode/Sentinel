import { HealthCheckResult } from "../types";
export declare class BeaconNodeMonitor {
    private config;
    private logger;
    private isRunning;
    private healthCheckInterval?;
    constructor();
    start(): void;
    stop(): void;
    performHealthCheck(): Promise<HealthCheckResult>;
    private checkBeaconNodeHealth;
    private delay;
    getBeaconNodeInfo(): Promise<any>;
    isMonitoring(): boolean;
    manualHealthCheck(): Promise<HealthCheckResult>;
}
//# sourceMappingURL=BeaconNodeMonitor.d.ts.map