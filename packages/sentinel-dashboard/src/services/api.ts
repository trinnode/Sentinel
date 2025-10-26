import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ApiResponse,
  User,
  Validator,
  CreateValidatorRequest,
  UpdateValidatorRequest,
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentReport,
  WebhookConfig,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  API_ENDPOINTS,
  STORAGE_KEYS,
} from "../types";

class ApiService {
  private client: AxiosInstance;
  private wsClient: WebSocket | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.logout();
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post<
      ApiResponse<{ user: User; token: string }>
    >(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    return response.data;
  }

  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post<
      ApiResponse<{ user: User; token: string }>
    >(API_ENDPOINTS.AUTH.REGISTER, { email, password, name });
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>(
      API_ENDPOINTS.AUTH.ME
    );
    return response.data;
  }

  // Validator methods
  async getValidators(): Promise<ApiResponse<{ validators: Validator[] }>> {
    const response = await this.client.get<
      ApiResponse<{ validators: Validator[] }>
    >(API_ENDPOINTS.VALIDATORS.LIST);
    return response.data;
  }

  async getValidator(
    id: string
  ): Promise<ApiResponse<{ validator: Validator }>> {
    const response = await this.client.get<
      ApiResponse<{ validator: Validator }>
    >(API_ENDPOINTS.VALIDATORS.GET(id));
    return response.data;
  }

  async createValidator(
    data: CreateValidatorRequest
  ): Promise<ApiResponse<{ validator: Validator }>> {
    const response = await this.client.post<
      ApiResponse<{ validator: Validator }>
    >(API_ENDPOINTS.VALIDATORS.CREATE, data);
    return response.data;
  }

  async updateValidator(
    id: string,
    data: UpdateValidatorRequest
  ): Promise<ApiResponse<{ validator: Validator }>> {
    const response = await this.client.put<
      ApiResponse<{ validator: Validator }>
    >(API_ENDPOINTS.VALIDATORS.UPDATE(id), data);
    return response.data;
  }

  async deleteValidator(id: string): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>(
      API_ENDPOINTS.VALIDATORS.DELETE(id)
    );
    return response.data;
  }

  async getValidatorApiKey(
    id: string
  ): Promise<
    ApiResponse<{ validatorId: string; name: string; agentApiKey: string }>
  > {
    const response = await this.client.get<
      ApiResponse<{ validatorId: string; name: string; agentApiKey: string }>
    >(API_ENDPOINTS.VALIDATORS.GET_API_KEY(id));
    return response.data;
  }

  async regenerateValidatorApiKey(
    id: string
  ): Promise<
    ApiResponse<{ validatorId: string; name: string; agentApiKey: string }>
  > {
    const response = await this.client.post<
      ApiResponse<{ validatorId: string; name: string; agentApiKey: string }>
    >(API_ENDPOINTS.VALIDATORS.REGENERATE_KEY(id));
    return response.data;
  }

  // Agent methods
  async getAgents(): Promise<ApiResponse<{ agents: Agent[] }>> {
    const response = await this.client.get<ApiResponse<{ agents: Agent[] }>>(
      API_ENDPOINTS.AGENTS.LIST
    );
    return response.data;
  }

  async getAgent(id: string): Promise<ApiResponse<{ agent: Agent }>> {
    const response = await this.client.get<ApiResponse<{ agent: Agent }>>(
      API_ENDPOINTS.AGENTS.GET(id)
    );
    return response.data;
  }

  async createAgent(
    data: CreateAgentRequest
  ): Promise<ApiResponse<{ agent: Agent }>> {
    const response = await this.client.post<ApiResponse<{ agent: Agent }>>(
      API_ENDPOINTS.AGENTS.CREATE,
      data
    );
    return response.data;
  }

  async updateAgent(
    id: string,
    data: UpdateAgentRequest
  ): Promise<ApiResponse<{ agent: Agent }>> {
    const response = await this.client.put<ApiResponse<{ agent: Agent }>>(
      API_ENDPOINTS.AGENTS.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteAgent(id: string): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>(
      API_ENDPOINTS.AGENTS.DELETE(id)
    );
    return response.data;
  }

  async getAgentReports(
    id: string
  ): Promise<ApiResponse<{ reports: AgentReport[] }>> {
    const response = await this.client.get<
      ApiResponse<{ reports: AgentReport[] }>
    >(API_ENDPOINTS.AGENTS.REPORTS(id));
    return response.data;
  }

  // Webhook methods
  async getWebhooks(): Promise<ApiResponse<{ webhooks: WebhookConfig[] }>> {
    const response = await this.client.get<
      ApiResponse<{ webhooks: WebhookConfig[] }>
    >(API_ENDPOINTS.WEBHOOKS.LIST);
    return response.data;
  }

  async getWebhook(
    id: string
  ): Promise<ApiResponse<{ webhook: WebhookConfig }>> {
    const response = await this.client.get<
      ApiResponse<{ webhook: WebhookConfig }>
    >(API_ENDPOINTS.WEBHOOKS.GET(id));
    return response.data;
  }

  async createWebhook(
    data: CreateWebhookRequest
  ): Promise<ApiResponse<{ webhook: WebhookConfig }>> {
    const response = await this.client.post<
      ApiResponse<{ webhook: WebhookConfig }>
    >(API_ENDPOINTS.WEBHOOKS.CREATE, data);
    return response.data;
  }

  async updateWebhook(
    id: string,
    data: UpdateWebhookRequest
  ): Promise<ApiResponse<{ webhook: WebhookConfig }>> {
    const response = await this.client.put<
      ApiResponse<{ webhook: WebhookConfig }>
    >(API_ENDPOINTS.WEBHOOKS.UPDATE(id), data);
    return response.data;
  }

  async deleteWebhook(id: string): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>(
      API_ENDPOINTS.WEBHOOKS.DELETE(id)
    );
    return response.data;
  }

  async testWebhook(id: string): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>(
      API_ENDPOINTS.WEBHOOKS.TEST(id)
    );
    return response.data;
  }

  async getWebhookEvents(): Promise<ApiResponse<{ events: string[] }>> {
    const response = await this.client.get<ApiResponse<{ events: string[] }>>(
      API_ENDPOINTS.WEBHOOKS.EVENTS
    );
    return response.data;
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage: (message: any) => void): void {
    if (this.wsClient?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:3002";
    this.wsClient = new WebSocket(wsUrl);

    this.wsClient.onopen = () => {
      console.log("WebSocket connected");
      // Send authentication if token exists
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        this.wsClient?.send(
          JSON.stringify({
            type: "authenticate",
            token,
          })
        );
      }
    };

    this.wsClient.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.wsClient.onclose = () => {
      console.log("WebSocket disconnected");
      // Reconnect after delay
      setTimeout(() => this.connectWebSocket(onMessage), 5000);
    };

    this.wsClient.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    // Update axios default headers
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    delete this.client.defaults.headers.common["Authorization"];
    this.disconnectWebSocket();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default apiService;
