import { LogLevel } from '../types';
export declare class Logger {
    private static instance;
    private config;
    private logLevel;
    private logFile?;
    private writeStream?;
    private constructor();
    static getInstance(): Logger;
    private setupLogFile;
    private shouldLog;
    private formatMessage;
    private writeToFile;
    private writeToConsole;
    private log;
    error(message: string, error?: Error, context?: any): void;
    warn(message: string, context?: any): void;
    info(message: string, context?: any): void;
    debug(message: string, context?: any): void;
    setLogLevel(level: LogLevel): void;
    setLogFile(filePath?: string): void;
    close(): void;
    logHealthCheck(validatorId: string, status: string, responseTime: number, error?: string): void;
    logConsensusEvent(validatorId: string, event: string, data?: any): void;
    logP2PEvent(event: string, peerId?: string, data?: any): void;
    logApiRequest(endpoint: string, method: string, statusCode?: number, error?: string): void;
}
//# sourceMappingURL=Logger.d.ts.map