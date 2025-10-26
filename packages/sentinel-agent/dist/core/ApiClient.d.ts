import { AxiosResponse } from 'axios';
import { ReportPayload } from '../types';
export declare class ApiClient {
    private client;
    private config;
    private logger;
    constructor();
    private setupInterceptors;
    sendReport(payload: ReportPayload): Promise<boolean>;
    testConnection(): Promise<boolean>;
    getAgentInfo(): Promise<any>;
    updateAgentStatus(status: string, metadata?: any): Promise<void>;
    retryRequest<T>(requestFn: () => Promise<AxiosResponse<T>>, maxRetries?: number): Promise<AxiosResponse<T>>;
    private delay;
    healthCheck(): Promise<{
        healthy: boolean;
        responseTime: number;
        error?: string;
    }>;
}
//# sourceMappingURL=ApiClient.d.ts.map