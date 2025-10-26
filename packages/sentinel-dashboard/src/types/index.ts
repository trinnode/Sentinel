// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Validator types
export interface Validator {
  id: string;
  name: string;
  beaconNodeUrl: string;
  userId: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  alerts?: Alert[];
}

export interface CreateValidatorRequest {
  name: string;
  beaconNodeUrl: string;
}

export interface UpdateValidatorRequest {
  name?: string;
  beaconNodeUrl?: string;
  isActive?: boolean;
}

// Agent types
export interface Agent {
  id: string;
  apiKey: string;
  name?: string;
  isActive: boolean;
  lastSeen: string;
  createdAt: string;
  validatorId?: string;
  validator?: Pick<Validator, "id" | "name" | "beaconNodeUrl">;
  reports?: AgentReport[];
}

export interface CreateAgentRequest {
  name?: string;
  validatorId: string;
}

export interface UpdateAgentRequest {
  name?: string;
  isActive?: boolean;
}

// Report types
export interface AgentReport {
  id: string;
  agentId: string;
  validatorId?: string;
  status: "HEALTHY" | "UNHEALTHY" | "CONSENSUS_REACHED" | "CONSENSUS_FAILED";
  message?: string;
  signature?: string;
  consensus: boolean;
  createdAt: string;
}

// Alert types
export interface Alert {
  id: string;
  validatorId: string;
  userId: string;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  message: string;
  reportId?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Webhook types
export interface WebhookConfig {
  id: string;
  userId: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  secret?: string;
  events: string[];
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  isActive?: boolean;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Dashboard state types
export interface DashboardStats {
  totalValidators: number;
  activeValidators: number;
  totalAlerts: number;
  pendingAlerts: number;
  healthyAgents: number;
  totalAgents: number;
}

// Form state types
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Navigation types
export interface NavItem {
  name: string;
  href: string;
  icon: any;
  current?: boolean;
}

// Status indicator types
export type StatusType = "success" | "warning" | "danger" | "info";

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: any;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

// Filter and pagination types
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  search?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Toast notification types
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    ME: "/api/auth/me",
  },
  VALIDATORS: {
    LIST: "/api/validators",
    GET: (id: string) => `/api/validators/${id}`,
    CREATE: "/api/validators",
    UPDATE: (id: string) => `/api/validators/${id}`,
    DELETE: (id: string) => `/api/validators/${id}`,
    GET_API_KEY: (id: string) => `/api/validators/${id}/agent-key`,
    REGENERATE_KEY: (id: string) => `/api/validators/${id}/regenerate-key`,
  },
  AGENTS: {
    LIST: "/api/agents",
    GET: (id: string) => `/api/agents/${id}`,
    CREATE: "/api/agents",
    UPDATE: (id: string) => `/api/agents/${id}`,
    DELETE: (id: string) => `/api/agents/${id}`,
    REPORTS: (id: string) => `/api/agents/${id}/reports`,
  },
  WEBHOOKS: {
    LIST: "/api/webhooks",
    GET: (id: string) => `/api/webhooks/${id}`,
    CREATE: "/api/webhooks",
    UPDATE: (id: string) => `/api/webhooks/${id}`,
    DELETE: (id: string) => `/api/webhooks/${id}`,
    TEST: (id: string) => `/api/webhooks/${id}/test`,
    EVENTS: "/api/webhooks/events/list",
  },
  REPORTS: "/api/report",
} as const;

// WebSocket event types
export const WS_EVENTS = {
  VALIDATOR_UPDATE: "validator_update",
  ALERT: "alert",
  AGENT_UPDATE: "agent_update",
  CONSENSUS_UPDATE: "consensus_update",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "sentinel_auth_token",
  USER: "sentinel_user",
  THEME: "sentinel_theme",
} as const;
