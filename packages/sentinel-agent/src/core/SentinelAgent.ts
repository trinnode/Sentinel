import { Config } from "./Config";
import { Logger } from "../utils/Logger";
import { BeaconNodeMonitor } from "../monitoring/BeaconNodeMonitor";
import { ApiClient } from "./ApiClient";
import { ConsensusRequest, HealthCheckResult, ReportPayload } from "../types";
import { PeerNetwork } from "../p2p/PeerNetwork";

export class SentinelAgent {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly beaconMonitor: BeaconNodeMonitor;
  private readonly apiClient: ApiClient;

  private peerNetwork?: PeerNetwork;
  private isRunning = false;
  private monitoringInProgress = false;
  private lastHealthCheck?: HealthCheckResult;
  private lastReportedStatus?: HealthCheckResult["status"];
  private monitoringInterval?: NodeJS.Timeout;

  private readonly handleIncomingConsensusRequest = async (
    request: ConsensusRequest & { consensusId?: string }
  ): Promise<void> => {
    if (!this.peerNetwork) {
      return;
    }

    if (request.validatorId !== this.config.getValidatorId()) {
      this.logger.debug("Ignoring consensus request for unrelated validator", {
        validatorId: request.validatorId,
      });
      return;
    }

    const consensusId = request.consensusId;

    if (!consensusId) {
      this.logger.warn("Received consensus request without consensusId", {
        validatorId: request.validatorId,
      });
      return;
    }

    try {
      const latestHealth =
        this.lastHealthCheck || (await this.beaconMonitor.manualHealthCheck());

      if (
        !this.lastHealthCheck ||
        latestHealth.timestamp > this.lastHealthCheck.timestamp
      ) {
        this.lastHealthCheck = latestHealth;
      }

      const agree = latestHealth.status === "UNHEALTHY";

      this.logger.logConsensusEvent(
        request.validatorId,
        "consensus_response_prepared",
        {
          requester: request.agentId,
          consensusId,
          agree,
        }
      );

      this.peerNetwork.sendConsensusResponse({
        validatorId: request.validatorId,
        consensusId,
        agree,
        agentId: this.config.getAgentId(),
        requesterId: request.agentId,
        timestamp: new Date(),
        evidence: agree ? latestHealth : undefined,
      });
    } catch (error) {
      this.logger.error(
        "Failed to handle incoming consensus request",
        error instanceof Error ? error : undefined,
        {
          validatorId: request.validatorId,
        }
      );
    }
  };

  constructor() {
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();
    this.beaconMonitor = new BeaconNodeMonitor();
    this.apiClient = new ApiClient();
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Sentinel agent is already running");
      return;
    }

    try {
      this.logger.info("Starting Sentinel Agent...");

      const configValidation = this.config.validateConfig();
      if (!configValidation.valid) {
        throw new Error(
          `Invalid configuration: ${configValidation.errors.join(", ")}`
        );
      }

      const apiHealthy = await this.apiClient.testConnection();
      if (!apiHealthy) {
        throw new Error("Cannot connect to backend API");
      }

      await this.initializePeerNetwork();

      this.isRunning = true;

      this.beaconMonitor.start();

      await this.startMonitoringLoop();

      this.logger.info("Sentinel Agent started successfully", {
        agentId: this.config.getAgentId(),
        backendUrl: this.config.getBackendApiUrl(),
        beaconNodeUrl: this.config.getBeaconNodeUrl(),
      });
    } catch (error) {
      this.logger.error(
        "Failed to start Sentinel Agent",
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info("Stopping Sentinel Agent...");

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.beaconMonitor.stop();

    await this.teardownPeerNetwork();

    this.logger.info("Sentinel Agent stopped");
  }

  private async initializePeerNetwork(): Promise<void> {
    if (!this.config.isP2PEnabled()) {
      this.logger.debug("P2P consensus disabled; skipping peer network init");
      return;
    }

    if (this.peerNetwork) {
      return;
    }

    const peerNetwork = new PeerNetwork();
    peerNetwork.on("consensus_request", this.handleIncomingConsensusRequest);

    try {
      await peerNetwork.start();
      this.peerNetwork = peerNetwork;
      this.logger.info("Peer network initialized", {
        bootstrapPeers: this.config.getP2PBootstrapPeers().length,
      });
    } catch (error) {
      peerNetwork.off("consensus_request", this.handleIncomingConsensusRequest);
      this.logger.error(
        "Failed to initialize peer network",
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  private async teardownPeerNetwork(): Promise<void> {
    if (!this.peerNetwork) {
      return;
    }

    this.peerNetwork.off(
      "consensus_request",
      this.handleIncomingConsensusRequest
    );

    try {
      await this.peerNetwork.stop();
    } catch (error) {
      this.logger.error(
        "Failed to stop peer network",
        error instanceof Error ? error : undefined
      );
    } finally {
      this.peerNetwork = undefined;
    }
  }

  private async startMonitoringLoop(): Promise<void> {
    await this.performMonitoringCycle();

    this.monitoringInterval = setInterval(() => {
      void this.performMonitoringCycle();
    }, this.config.getHealthCheckInterval());
  }

  private async performMonitoringCycle(): Promise<void> {
    if (!this.isRunning || this.monitoringInProgress) {
      return;
    }

    this.monitoringInProgress = true;
    this.logger.debug("Starting monitoring cycle");

    try {
      const healthResult = await this.beaconMonitor.performHealthCheck();
      this.lastHealthCheck = healthResult;

      await this.handleHealthResult(healthResult);
      await this.updateAgentStatus(healthResult);
    } catch (error) {
      this.logger.error(
        "Error in monitoring cycle",
        error instanceof Error ? error : undefined
      );
    } finally {
      this.monitoringInProgress = false;
    }
  }

  private async handleHealthResult(
    healthResult: HealthCheckResult
  ): Promise<void> {
    const shouldReportUnhealthy = healthResult.status === "UNHEALTHY";
    const statusChanged = this.hasStatusChanged(healthResult.status);

    if (shouldReportUnhealthy) {
      const consensusConfirmed = await this.confirmUnhealthyWithPeers(
        healthResult
      );

      if (!consensusConfirmed) {
        this.logger.warn(
          "Consensus threshold not met; skipping unhealthy report",
          {
            validatorId: healthResult.validatorId,
          }
        );
        return;
      }

      await this.sendHealthReport(healthResult);
      return;
    }

    if (statusChanged) {
      await this.sendHealthReport(healthResult);
    } else {
      this.logger.debug("No status change detected; skipping report", {
        validatorId: healthResult.validatorId,
        status: healthResult.status,
      });
    }
  }

  private async confirmUnhealthyWithPeers(
    healthResult: HealthCheckResult
  ): Promise<boolean> {
    if (!this.config.isP2PEnabled() || !this.peerNetwork) {
      return true;
    }

    try {
      const threshold = this.config.getConsensusThreshold();
      const consensusResult = await this.peerNetwork.requestConsensus(
        {
          validatorId: healthResult.validatorId,
          status: "UNHEALTHY",
          agentId: this.config.getAgentId(),
          timestamp: new Date(),
          evidence: [healthResult],
        },
        this.config.getConsensusTimeout()
      );

      this.logger.logConsensusEvent(
        healthResult.validatorId,
        "consensus_result",
        {
          consensusId: consensusResult.consensusId,
          agreeCount: consensusResult.agreeCount,
          totalPeers: consensusResult.totalPeers,
          threshold,
        }
      );

      if (consensusResult.totalPeers === 0) {
        this.logger.warn(
          "No peers responded to consensus request; proceeding with local report",
          {
            validatorId: healthResult.validatorId,
          }
        );
        return true;
      }

      const selfInclusiveAgreeCount = consensusResult.agreeCount + 1;
      return selfInclusiveAgreeCount >= threshold;
    } catch (error) {
      this.logger.error(
        "Consensus confirmation failed",
        error instanceof Error ? error : undefined,
        {
          validatorId: healthResult.validatorId,
        }
      );
      return false;
    }
  }

  private hasStatusChanged(
    currentStatus: HealthCheckResult["status"]
  ): boolean {
    if (!this.lastReportedStatus) {
      return true;
    }

    return this.lastReportedStatus !== currentStatus;
  }

  private async sendHealthReport(
    healthResult: HealthCheckResult
  ): Promise<void> {
    const payload: ReportPayload = {
      agentId: this.config.getAgentId(),
      validatorId: healthResult.validatorId,
      status: healthResult.status,
      message:
        healthResult.error ||
        `Validator is ${healthResult.status.toLowerCase()}`,
      agentApiKey: this.config.getAgentApiKey(),
    };

    try {
      const success = await this.apiClient.sendReport(payload);

      if (success) {
        this.lastReportedStatus = healthResult.status;
        this.logger.info("Health report sent successfully", {
          validatorId: healthResult.validatorId,
          status: healthResult.status,
          responseTime: healthResult.responseTime,
        });
      } else {
        this.logger.error("Failed to send health report");
      }
    } catch (error) {
      this.logger.error(
        "Error sending health report",
        error instanceof Error ? error : undefined
      );
    }
  }

  private async updateAgentStatus(
    healthResult: HealthCheckResult
  ): Promise<void> {
    try {
      await this.apiClient.updateAgentStatus("active", {
        lastHealthCheck: healthResult,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        "Failed to update agent status",
        error instanceof Error ? error : undefined
      );
    }
  }

  public async performManualHealthCheck(): Promise<HealthCheckResult> {
    this.logger.info("Manual health check requested");

    try {
      const result = await this.beaconMonitor.manualHealthCheck();
      this.lastHealthCheck = result;

      await this.handleHealthResult(result);
      await this.updateAgentStatus(result);

      return result;
    } catch (error) {
      this.logger.error(
        "Manual health check failed",
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  public getStatus(): {
    isRunning: boolean;
    lastHealthCheck?: HealthCheckResult;
    config: any;
  } {
    return {
      isRunning: this.isRunning,
      lastHealthCheck: this.lastHealthCheck,
      config: {
        agentId: this.config.getAgentId(),
        backendUrl: this.config.getBackendApiUrl(),
        beaconNodeUrl: this.config.getBeaconNodeUrl(),
        healthCheckInterval: this.config.getHealthCheckInterval(),
        validatorId: this.config.getValidatorId(),
      },
    };
  }

  public isAgentRunning(): boolean {
    return this.isRunning;
  }

  public async shutdown(): Promise<void> {
    this.logger.info("Shutting down Sentinel Agent...");

    await this.stop();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.close();
    this.logger.info("Sentinel Agent shutdown complete");
  }
}
