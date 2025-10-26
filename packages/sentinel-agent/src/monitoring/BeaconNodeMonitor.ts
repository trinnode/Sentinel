import axios, { AxiosResponse } from "axios";
import { Config } from "../core/Config";
import { Logger } from "../utils/Logger";
import { HealthCheckResult, BeaconNodeStatus } from "../types";

export class BeaconNodeMonitor {
  private config: Config;
  private logger: Logger;
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();
  }

  public start(): void {
    if (this.isRunning) {
      this.logger.warn("Beacon node monitor is already running");
      return;
    }

    this.isRunning = true;
    this.logger.info("Starting beacon node monitor", {
      beaconNodeUrl: this.config.getBeaconNodeUrl(),
      interval: this.config.getHealthCheckInterval(),
    });

    // Run initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.getHealthCheckInterval());
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info("Stopping beacon node monitor");

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const validatorId = this.config.getValidatorId();

    try {
      this.logger.debug("Performing beacon node health check", {
        url: this.config.getBeaconNodeUrl(),
      });

      const response = await this.checkBeaconNodeHealth();
      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        validatorId,
        status: response.isHealthy ? "HEALTHY" : "UNHEALTHY",
        responseTime,
        timestamp: new Date(),
        beaconStatus: response,
      };

      this.logger.logHealthCheck(
        validatorId,
        result.status,
        responseTime,
        response.error
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const result: HealthCheckResult = {
        validatorId,
        status: "UNHEALTHY",
        responseTime,
        timestamp: new Date(),
        error: errorMessage,
      };

      this.logger.logHealthCheck(
        validatorId,
        "UNHEALTHY",
        responseTime,
        errorMessage
      );
      return result;
    }
  }

  private async checkBeaconNodeHealth(): Promise<BeaconNodeStatus> {
    const beaconNodeUrl = this.config.getBeaconNodeUrl();
    const timeout = this.config.getConfig().healthCheckTimeout;
    const maxRetries = this.config.getConfig().healthCheckRetries;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Health check attempt ${attempt}/${maxRetries}`, {
          url: beaconNodeUrl,
        });

        const startTime = Date.now();
        const response = await axios.get(
          `${beaconNodeUrl}/eth/v1/node/health`,
          {
            timeout,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          }
        );

        const responseTime = Date.now() - startTime;

        if (response.status === 200) {
          // Try to get additional info
          let blockHeight: number | undefined;
          try {
            const blockResponse = await axios.get(
              `${beaconNodeUrl}/eth/v1/beacon/blocks/head`,
              {
                timeout: timeout / 2,
              }
            );

            if (blockResponse.data && blockResponse.data.data) {
              blockHeight = parseInt(blockResponse.data.data.message.slot);
            }
          } catch (blockError) {
            this.logger.debug("Could not fetch block height", {
              error: blockError,
            });
          }

          return {
            isHealthy: true,
            responseTime,
            blockHeight,
            timestamp: new Date(),
          };
        } else {
          lastError = new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        this.logger.debug(`Health check attempt ${attempt} failed`, {
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          // Wait before retry
          await this.delay(1000);
        }
      }
    }

    return {
      isHealthy: false,
      responseTime: this.config.getConfig().healthCheckTimeout,
      timestamp: new Date(),
      error: lastError?.message || "Health check failed after all retries",
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async getBeaconNodeInfo(): Promise<any> {
    try {
      const beaconNodeUrl = this.config.getBeaconNodeUrl();

      // Get node identity
      const identityResponse = await axios.get(
        `${beaconNodeUrl}/eth/v1/node/identity`,
        {
          timeout: this.config.getConfig().requestTimeout,
        }
      );

      // Get sync status
      const syncResponse = await axios.get(
        `${beaconNodeUrl}/eth/v1/node/syncing`,
        {
          timeout: this.config.getConfig().requestTimeout,
        }
      );

      // Get peer count
      const peerResponse = await axios.get(
        `${beaconNodeUrl}/eth/v1/node/peer_count`,
        {
          timeout: this.config.getConfig().requestTimeout,
        }
      );

      return {
        identity: identityResponse.data,
        syncStatus: syncResponse.data,
        peerCount: peerResponse.data,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        "Failed to get beacon node info",
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  public isMonitoring(): boolean {
    return this.isRunning;
  }

  // Manual health check for testing
  public async manualHealthCheck(): Promise<HealthCheckResult> {
    this.logger.info("Manual health check requested");
    return await this.performHealthCheck();
  }
}
