export interface AgentConfig {
  agentId: string;
  agentApiKey: string;
  validatorId: string;
  backendApiUrl: string;
  beaconNodeUrl: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  p2pEnabled: boolean;
  p2pPort: number;
  p2pDiscoveryInterval: number;
  p2pMaxPeers: number;
  p2pBootstrapPeers: string[];
  consensusThreshold: number;
  consensusTimeout: number;
  logLevel: string;
  logFile?: string;
  requestTimeout: number;
  maxRetries: number;
}

export interface BeaconNodeStatus {
  isHealthy: boolean;
  responseTime: number;
  blockHeight?: number;
  timestamp: Date;
  error?: string;
}

export interface HealthCheckResult {
  validatorId: string;
  status: "HEALTHY" | "UNHEALTHY";
  responseTime: number;
  timestamp: Date;
  error?: string;
  beaconStatus?: BeaconNodeStatus;
}

export interface P2PMessage {
  type:
    | "peer_hello"
    | "health_report"
    | "consensus_request"
    | "consensus_response"
    | "peer_discovery";
  from: string;
  to?: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface ConsensusRequest {
  validatorId: string;
  status: "UNHEALTHY";
  agentId: string;
  timestamp: Date;
  evidence: HealthCheckResult[];
  consensusId?: string;
}

export interface ConsensusResponse {
  validatorId: string;
  consensusId: string;
  agree: boolean;
  agentId: string;
  requesterId: string;
  timestamp: Date;
  evidence?: HealthCheckResult;
}

export interface PeerInfo {
  id: string;
  address: string;
  port: number;
  lastSeen: Date;
  isConnected: boolean;
  status: "active" | "inactive" | "unknown";
}

export interface ReportPayload {
  agentId: string;
  validatorId: string;
  status: "HEALTHY" | "UNHEALTHY";
  message?: string;
  signature?: string;
  agentApiKey: string;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
  error?: Error;
}
