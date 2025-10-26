import { AgentConfig } from "../types";
import { LogLevel } from "../types";
export declare class Config {
    private static instance;
    private config;
    private constructor();
    static getInstance(): Config;
    private loadConfig;
    getConfig(): AgentConfig;
    updateConfig(updates: Partial<AgentConfig>): void;
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
    getLogLevel(): LogLevel;
    isP2PEnabled(): boolean;
    getHealthCheckInterval(): number;
    getConsensusThreshold(): number;
    getConsensusTimeout(): number;
    getBackendApiUrl(): string;
    getBeaconNodeUrl(): string;
    getAgentApiKey(): string;
    getAgentId(): string;
    getValidatorId(): string;
    getP2PBootstrapPeers(): string[];
}
//# sourceMappingURL=Config.d.ts.map