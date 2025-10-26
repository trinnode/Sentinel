#!/usr/bin/env node

import { SentinelAgent } from "./core/SentinelAgent";
import { Config } from "./core/Config";
import { Logger } from "./utils/Logger";

async function main() {
  const logger = Logger.getInstance();
  const agent = new SentinelAgent();

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");
    await shutdown();
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully");
    await shutdown();
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
    shutdown(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at", undefined, { reason, promise });
    shutdown(1);
  });

  try {
    const config = Config.getInstance();

    // Validate configuration before starting
    const validation = config.validateConfig();
    if (!validation.valid) {
      logger.error("Configuration validation failed", undefined, {
        errors: validation.errors,
      });
      process.exit(1);
    }

    logger.info("Starting Sentinel Agent...", {
      agentId: config.getAgentId(),
      backendUrl: config.getBackendApiUrl(),
      beaconNodeUrl: config.getBeaconNodeUrl(),
    });

    await agent.start();

    logger.info("Sentinel Agent is now running. Press Ctrl+C to stop.");

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    logger.error(
      "Failed to start Sentinel Agent",
      error instanceof Error ? error : undefined
    );
    process.exit(1);
  }

  async function shutdown(code = 0) {
    try {
      await agent.shutdown();
    } catch (error) {
      logger.error(
        "Error during shutdown",
        error instanceof Error ? error : undefined
      );
    } finally {
      process.exit(code);
    }
  }
}

// Run the agent if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { SentinelAgent };
