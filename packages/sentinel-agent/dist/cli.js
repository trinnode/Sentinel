#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const SentinelAgent_1 = require("./core/SentinelAgent");
const Config_1 = require("./core/Config");
const Logger_1 = require("./utils/Logger");
const program = new commander_1.Command();
let agent = null;
async function createAgent() {
    if (agent)
        return agent;
    const logger = Logger_1.Logger.getInstance();
    const config = Config_1.Config.getInstance();
    // Validate configuration
    const validation = config.validateConfig();
    if (!validation.valid) {
        logger.error("Configuration validation failed", undefined, {
            errors: validation.errors,
        });
        throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }
    agent = new SentinelAgent_1.SentinelAgent();
    return agent;
}
// Start command
program
    .name("sentinel-agent")
    .description("Sentinel Agent for blockchain validator monitoring")
    .version("1.0.0");
program
    .command("start")
    .description("Start the Sentinel agent")
    .option("-c, --config <path>", "Path to configuration file")
    .action(async (options) => {
    try {
        const logger = Logger_1.Logger.getInstance();
        if (options.config) {
            // Load custom config file
            logger.info(`Loading configuration from ${options.config}`);
            // This would load a custom config file if provided
        }
        const agent = await createAgent();
        await agent.start();
        logger.info("Sentinel Agent started successfully");
        logger.info("Press Ctrl+C to stop the agent");
        // Keep process alive
        process.stdin.resume();
        // Handle shutdown
        process.on("SIGINT", async () => {
            logger.info("Shutting down...");
            await agent.shutdown();
            process.exit(0);
        });
    }
    catch (error) {
        console.error("Failed to start agent:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Stop command
program
    .command("stop")
    .description("Stop the Sentinel agent")
    .action(async () => {
    try {
        const logger = Logger_1.Logger.getInstance();
        if (!agent) {
            logger.info("No running agent instance found");
            return;
        }
        await agent.shutdown();
        logger.info("Sentinel Agent stopped successfully");
    }
    catch (error) {
        console.error("Failed to stop agent:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Status command
program
    .command("status")
    .description("Show agent status")
    .action(async () => {
    try {
        const logger = Logger_1.Logger.getInstance();
        const config = Config_1.Config.getInstance();
        console.log("=== Sentinel Agent Status ===");
        console.log(`Agent ID: ${config.getAgentId()}`);
        console.log(`Backend URL: ${config.getBackendApiUrl()}`);
        console.log(`Beacon Node URL: ${config.getBeaconNodeUrl()}`);
        console.log(`Health Check Interval: ${config.getHealthCheckInterval()}ms`);
        console.log(`Validator ID: ${config.getValidatorId()}`);
        console.log(`Consensus Threshold: ${config.getConsensusThreshold()}`);
        if (agent) {
            const status = agent.getStatus();
            console.log(`Running: ${status.isRunning ? "Yes" : "No"}`);
            if (status.lastHealthCheck) {
                console.log(`Last Health Check: ${status.lastHealthCheck.status} (${status.lastHealthCheck.responseTime}ms)`);
            }
        }
        else {
            console.log("Running: No");
        }
    }
    catch (error) {
        console.error("Failed to get status:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Health check command
program
    .command("health-check")
    .description("Perform a manual health check")
    .action(async () => {
    try {
        const logger = Logger_1.Logger.getInstance();
        if (!agent) {
            agent = await createAgent();
        }
        logger.info("Performing manual health check...");
        const result = await agent.performManualHealthCheck();
        console.log("=== Health Check Result ===");
        console.log(`Status: ${result.status}`);
        console.log(`Response Time: ${result.responseTime}ms`);
        console.log(`Timestamp: ${result.timestamp}`);
        if (result.error) {
            console.log(`Error: ${result.error}`);
        }
        if (result.beaconStatus) {
            console.log(`Beacon Node Healthy: ${result.beaconStatus.isHealthy}`);
            if (result.beaconStatus.blockHeight) {
                console.log(`Block Height: ${result.beaconStatus.blockHeight}`);
            }
        }
    }
    catch (error) {
        console.error("Health check failed:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Config command
program
    .command("config")
    .description("Show current configuration")
    .action(() => {
    try {
        const config = Config_1.Config.getInstance();
        const fullConfig = config.getConfig();
        console.log("=== Current Configuration ===");
        console.log(JSON.stringify(fullConfig, null, 2));
    }
    catch (error) {
        console.error("Failed to show config:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Validate command
program
    .command("validate")
    .description("Validate current configuration")
    .action(() => {
    try {
        const config = Config_1.Config.getInstance();
        const validation = config.validateConfig();
        console.log("=== Configuration Validation ===");
        if (validation.valid) {
            console.log("✅ Configuration is valid");
        }
        else {
            console.log("❌ Configuration has errors:");
            validation.errors.forEach((error) => {
                console.log(`  - ${error}`);
            });
            process.exit(1);
        }
    }
    catch (error) {
        console.error("Failed to validate config:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Test connection command
program
    .command("test-connection")
    .description("Test connection to backend API")
    .action(async () => {
    try {
        const logger = Logger_1.Logger.getInstance();
        const { ApiClient } = await Promise.resolve().then(() => __importStar(require("./core/ApiClient")));
        const apiClient = new ApiClient();
        logger.info("Testing backend connection...");
        const isConnected = await apiClient.testConnection();
        if (isConnected) {
            console.log("✅ Successfully connected to backend API");
        }
        else {
            console.log("❌ Failed to connect to backend API");
            process.exit(1);
        }
    }
    catch (error) {
        console.error("Connection test failed:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// Parse command line arguments
program.parse();
// Show help if no command is provided
if (!program.args.length) {
    program.help();
}
//# sourceMappingURL=cli.js.map