import fs from 'fs';
import path from 'path';
import { LogLevel, LogEntry } from '../types';
import { Config } from '../core/Config';

export class Logger {
  private static instance: Logger;
  private config: Config;
  private logLevel: LogLevel;
  private logFile?: string;
  private writeStream?: fs.WriteStream;

  private constructor() {
    this.config = Config.getInstance();
    this.logLevel = this.config.getLogLevel();
    this.logFile = this.config.getConfig().logFile;

    if (this.logFile) {
      this.setupLogFile();
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupLogFile(): void {
    try {
      const logDir = path.dirname(this.logFile!);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      this.writeStream = fs.createWriteStream(this.logFile!, { flags: 'a' });
    } catch (error) {
      console.error('Failed to setup log file:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
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

  private writeToFile(entry: LogEntry): void {
    if (this.writeStream) {
      const message = this.formatMessage(entry) + '\n';
      this.writeStream.write(message);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const message = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.DEBUG:
        console.debug(message);
        break;
    }
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    this.writeToConsole(entry);

    if (this.logFile) {
      this.writeToFile(entry);
    }
  }

  public error(message: string, error?: Error, context?: any): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      context,
      error
    });
  }

  public warn(message: string, context?: any): void {
    this.log({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context
    });
  }

  public info(message: string, context?: any): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context
    });
  }

  public debug(message: string, context?: any): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context
    });
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${LogLevel[level]}`);
  }

  public setLogFile(filePath?: string): void {
    if (this.writeStream) {
      this.writeStream.end();
    }

    this.logFile = filePath;
    this.config.updateConfig({ logFile: filePath });

    if (filePath) {
      this.setupLogFile();
      this.info(`Log file set to ${filePath}`);
    } else {
      this.info('Log file disabled');
    }
  }

  public close(): void {
    if (this.writeStream) {
      this.writeStream.end();
    }
  }

  // Utility methods for common logging scenarios
  public logHealthCheck(validatorId: string, status: string, responseTime: number, error?: string): void {
    const message = `Health check for validator ${validatorId}: ${status} (${responseTime}ms)`;
    if (error) {
      this.warn(message, { error, responseTime });
    } else {
      this.info(message, { status, responseTime });
    }
  }

  public logConsensusEvent(validatorId: string, event: string, data?: any): void {
    this.info(`Consensus event for validator ${validatorId}: ${event}`, data);
  }

  public logP2PEvent(event: string, peerId?: string, data?: any): void {
    const message = `P2P ${event}${peerId ? ` with peer ${peerId}` : ''}`;
    this.debug(message, data);
  }

  public logApiRequest(endpoint: string, method: string, statusCode?: number, error?: string): void {
    const message = `API ${method} ${endpoint}${statusCode ? ` - ${statusCode}` : ''}`;
    if (error || (statusCode && statusCode >= 400)) {
      this.error(message, error ? new Error(error) : undefined, { statusCode });
    } else {
      this.debug(message, { statusCode });
    }
  }
}
