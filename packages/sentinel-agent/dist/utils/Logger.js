"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const Config_1 = require("../core/Config");
class Logger {
    constructor() {
        this.config = Config_1.Config.getInstance();
        this.logLevel = this.config.getLogLevel();
        this.logFile = this.config.getConfig().logFile;
        if (this.logFile) {
            this.setupLogFile();
        }
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setupLogFile() {
        try {
            const logDir = path_1.default.dirname(this.logFile);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
            this.writeStream = fs_1.default.createWriteStream(this.logFile, { flags: 'a' });
        }
        catch (error) {
            console.error('Failed to setup log file:', error);
        }
    }
    shouldLog(level) {
        return level <= this.logLevel;
    }
    formatMessage(entry) {
        const timestamp = entry.timestamp.toISOString();
        const level = types_1.LogLevel[entry.level];
        let message = `[${timestamp}] ${level}: ${entry.message}`;
        if (entry.context) {
            message += ` | Context: ${JSON.stringify(entry.context)}`;
        }
        if (entry.error) {
            message += ` | Error: ${entry.error.message}`;
            if (entry.error.stack) {
                message += `\n${entry.error.stack}`;
            }
        }
        return message;
    }
    writeToFile(entry) {
        if (this.writeStream) {
            const message = this.formatMessage(entry) + '\n';
            this.writeStream.write(message);
        }
    }
    writeToConsole(entry) {
        const message = this.formatMessage(entry);
        switch (entry.level) {
            case types_1.LogLevel.ERROR:
                console.error(message);
                break;
            case types_1.LogLevel.WARN:
                console.warn(message);
                break;
            case types_1.LogLevel.INFO:
                console.info(message);
                break;
            case types_1.LogLevel.DEBUG:
                console.debug(message);
                break;
        }
    }
    log(entry) {
        if (!this.shouldLog(entry.level)) {
            return;
        }
        this.writeToConsole(entry);
        if (this.logFile) {
            this.writeToFile(entry);
        }
    }
    error(message, error, context) {
        this.log({
            level: types_1.LogLevel.ERROR,
            message,
            timestamp: new Date(),
            context,
            error
        });
    }
    warn(message, context) {
        this.log({
            level: types_1.LogLevel.WARN,
            message,
            timestamp: new Date(),
            context
        });
    }
    info(message, context) {
        this.log({
            level: types_1.LogLevel.INFO,
            message,
            timestamp: new Date(),
            context
        });
    }
    debug(message, context) {
        this.log({
            level: types_1.LogLevel.DEBUG,
            message,
            timestamp: new Date(),
            context
        });
    }
    setLogLevel(level) {
        this.logLevel = level;
        this.info(`Log level changed to ${types_1.LogLevel[level]}`);
    }
    setLogFile(filePath) {
        if (this.writeStream) {
            this.writeStream.end();
        }
        this.logFile = filePath;
        this.config.updateConfig({ logFile: filePath });
        if (filePath) {
            this.setupLogFile();
            this.info(`Log file set to ${filePath}`);
        }
        else {
            this.info('Log file disabled');
        }
    }
    close() {
        if (this.writeStream) {
            this.writeStream.end();
        }
    }
    // Utility methods for common logging scenarios
    logHealthCheck(validatorId, status, responseTime, error) {
        const message = `Health check for validator ${validatorId}: ${status} (${responseTime}ms)`;
        if (error) {
            this.warn(message, { error, responseTime });
        }
        else {
            this.info(message, { status, responseTime });
        }
    }
    logConsensusEvent(validatorId, event, data) {
        this.info(`Consensus event for validator ${validatorId}: ${event}`, data);
    }
    logP2PEvent(event, peerId, data) {
        const message = `P2P ${event}${peerId ? ` with peer ${peerId}` : ''}`;
        this.debug(message, data);
    }
    logApiRequest(endpoint, method, statusCode, error) {
        const message = `API ${method} ${endpoint}${statusCode ? ` - ${statusCode}` : ''}`;
        if (error || (statusCode && statusCode >= 400)) {
            this.error(message, error ? new Error(error) : undefined, { statusCode });
        }
        else {
            this.debug(message, { statusCode });
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map