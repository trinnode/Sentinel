import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Config } from './Config';
import { Logger } from '../utils/Logger';
import { ReportPayload } from '../types';

export class ApiClient {
  private client: AxiosInstance;
  private config: Config;
  private logger: Logger;

  constructor() {
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();

    this.client = axios.create({
      baseURL: this.config.getBackendApiUrl(),
      timeout: this.config.getConfig().requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sentinel-Agent/1.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.logApiRequest(config.url || '', config.method || 'GET');
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.logApiRequest(
          response.config.url || '',
          response.config.method || 'GET',
          response.status
        );
        return response;
      },
      (error) => {
        if (error.response) {
          this.logger.logApiRequest(
            error.config?.url || '',
            error.config?.method || 'GET',
            error.response.status,
            error.response.data?.error || error.message
          );
        } else {
          this.logger.error('API request failed', error);
        }
        return Promise.reject(error);
      }
    );
  }

  public async sendReport(payload: ReportPayload): Promise<boolean> {
    try {
      const response = await this.client.post('/api/report', payload);

      if (response.status === 200 && response.data.success) {
        this.logger.info('Report sent successfully', {
          reportId: response.data.reportId,
          status: payload.status
        });
        return true;
      } else {
        this.logger.error('Failed to send report', undefined, {
          status: response.status,
          data: response.data
        });
        return false;
      }
    } catch (error) {
      this.logger.error('Error sending report to backend', error instanceof Error ? error : undefined, {
        payload: {
          agentId: payload.agentId,
          validatorId: payload.validatorId,
          status: payload.status
        }
      });
      return false;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');

      if (response.status === 200 && response.data.status === 'OK') {
        this.logger.info('Backend API connection test successful');
        return true;
      } else {
        this.logger.error('Backend API connection test failed', undefined, {
          status: response.status,
          data: response.data
        });
        return false;
      }
    } catch (error) {
      this.logger.error('Backend API connection test error', error instanceof Error ? error : undefined);
      return false;
    }
  }

  public async getAgentInfo(): Promise<any> {
    try {
      const response = await this.client.get(`/api/agents/${this.config.getAgentId()}`);

      if (response.status === 200) {
        return response.data.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('Failed to get agent info', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  public async updateAgentStatus(status: string, metadata?: any): Promise<void> {
    try {
      // This would be implemented when we have an agent status update endpoint
      this.logger.debug('Agent status update', { status, metadata });
    } catch (error) {
      this.logger.error('Failed to update agent status', error instanceof Error ? error : undefined);
    }
  }

  // Retry mechanism for failed requests
  public async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries?: number
  ): Promise<AxiosResponse<T>> {
    const retries = maxRetries || this.config.getConfig().maxRetries;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < retries) {
          this.logger.warn(`Request attempt ${attempt} failed, retrying...`, {
            error: lastError.message,
            attempt,
            maxRetries: retries
          });

          // Exponential backoff
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        } else {
          this.logger.error(`Request failed after ${retries} attempts`, lastError);
        }
      }
    }

    throw lastError!;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for the API client itself
  public async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();

    try {
      await this.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        healthy: false,
        responseTime,
        error: errorMessage
      };
    }
  }
}
