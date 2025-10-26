import dotenv from "dotenv";
import { AgentConfig } from "../types";
import { LogLevel } from "../types";

export class Config {
  private static instance: Config;
  private config: AgentConfig;

  private constructor() {
    dotenv.config();
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AgentConfig {
    return {
      agentId: process.env.AGENT_ID || "",
      agentApiKey: process.env.AGENT_API_KEY || "",
      validatorId: process.env.VALIDATOR_ID || "",
      backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:3001",
      beaconNodeUrl: process.env.BEACON_NODE_URL || "http://localhost:5052",
      healthCheckInterval: parseInt(
        process.env.HEALTH_CHECK_INTERVAL || "30000"
      ),
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "10000"),
      healthCheckRetries: parseInt(process.env.HEALTH_CHECK_RETRIES || "3"),
      p2pEnabled: process.env.P2P_ENABLED === "true",
      p2pPort: parseInt(process.env.P2P_PORT || "3003"),
      p2pDiscoveryInterval: parseInt(
        process.env.P2P_DISCOVERY_INTERVAL || "60000"
      ),
      p2pMaxPeers: parseInt(process.env.P2P_MAX_PEERS || "10"),
      p2pBootstrapPeers: (process.env.P2P_BOOTSTRAP_PEERS || "")
        .split(",")
        .map((peer) => peer.trim())
        .filter((peer) => peer.length > 0),
      consensusThreshold: parseInt(process.env.CONSENSUS_THRESHOLD || "2"),
      consensusTimeout: parseInt(process.env.CONSENSUS_TIMEOUT || "120000"),
      logLevel: process.env.LOG_LEVEL || "info",
      logFile: process.env.LOG_FILE,
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "10000"),
      maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
    };
  }

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.agentId) {
      errors.push("AGENT_ID is required");
    }

    if (!this.config.agentApiKey) {
      errors.push("AGENT_API_KEY is required");
    }

    if (!this.config.validatorId) {
      errors.push("VALIDATOR_ID is required");
    }

    if (!this.config.backendApiUrl) {
      errors.push("BACKEND_API_URL is required");
    }

    if (!this.config.beaconNodeUrl) {
      errors.push("BEACON_NODE_URL is required");
    }

    // Validate URLs
    try {
      new URL(this.config.backendApiUrl);
    } catch {
      errors.push("BACKEND_API_URL must be a valid URL");
    }

    try {
      new URL(this.config.beaconNodeUrl);
    } catch {
      errors.push("BEACON_NODE_URL must be a valid URL");
    }

    // Validate intervals
    if (this.config.healthCheckInterval < 1000) {
      errors.push("HEALTH_CHECK_INTERVAL must be at least 1000ms");
    }

    if (this.config.healthCheckTimeout < 1000) {
      errors.push("HEALTH_CHECK_TIMEOUT must be at least 1000ms");
    }

    if (this.config.consensusThreshold < 1) {
      errors.push("CONSENSUS_THRESHOLD must be at least 1");
    }

    if (this.config.p2pEnabled) {
      if (this.config.p2pPort < 1024 || this.config.p2pPort > 65535) {
        errors.push("P2P_PORT must be between 1024 and 65535");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public getLogLevel(): LogLevel {
    switch (this.config.logLevel.toLowerCase()) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  public isP2PEnabled(): boolean {
    return this.config.p2pEnabled;
  }

  public getHealthCheckInterval(): number {
    return this.config.healthCheckInterval;
  }

  public getConsensusThreshold(): number {
    return this.config.consensusThreshold;
  }

  public getConsensusTimeout(): number {
    return this.config.consensusTimeout;
  }

  public getBackendApiUrl(): string {
    return this.config.backendApiUrl;
  }

  public getBeaconNodeUrl(): string {
    return this.config.beaconNodeUrl;
  }

  public getAgentApiKey(): string {
    return this.config.agentApiKey;
  }

  public getAgentId(): string {
    return this.config.agentId;
  }

  public getValidatorId(): string {
    return this.config.validatorId;
  }

  public getP2PBootstrapPeers(): string[] {
    return [...this.config.p2pBootstrapPeers];
  }
}
