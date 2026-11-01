export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface HistoryStats {
  totalRequests: number;
  successRate: number;
  avgDuration: number;
  last24hCount: number;
}

export interface DashboardStats {
  queue: QueueCounts;
  history: HistoryStats;
}

export interface RequestRecord {
  id: string;
  type: 'sync' | 'async' | 'scheduled';
  status: 'running' | 'success' | 'failed';
  startedAt: string | number;
  completedAt?: string | number | null;
  duration?: number;
  config?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    userAgent?: string;
    proxy?: { server: string };
  };
  payload?: any;
  workflow?: any[];
  results?: Array<{ action: string; index: number; data: any; error?: string }>;
  variables?: Record<string, any>;
  recording?: {
    filename: string;
    url: string;
  } | null;
  rawResult?: any;
  result?: {
    success: boolean;
    error?: string;
    failedAtIndex?: number;
    results?: Array<{ action: string; index: number; data: any; error?: string }>;
    variables?: Record<string, any>;
    recording?: {
      filename: string;
      url: string;
    } | null;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  active: boolean;
  rawKey?: string;
}

export interface WorkflowConfig {
  headless?: boolean;
  recordVideo?: boolean;
  noMedia?: boolean;
  debug?: boolean;
  humanize?: boolean;
  gpuVendor?: string;
  gpuRenderer?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: {
    server?: string;
    username?: string;
    password?: string;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  workflow: any[];
  config?: WorkflowConfig;
  graph?: {
    nodes: any[];
    edges: any[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRecord {
  id: string;
  name: string;
  description?: string;
  templateId?: string | null;
  cron?: string | null;
  every?: number | null;
  payload: any;
  active: boolean;
  lastRunAt?: string | null;
  lastStatus?: string | null;
  createdAt: string;
}

export interface ConfigStatus {
  server: {
    port: number;
    nodeEnv: string;
    uptime: number;
  };
  redis: {
    host: string;
    port: number;
    hasPassword: boolean;
    tls: boolean;
    status: 'connected' | 'error';
    latencyMs?: number | null;
    error?: string | null;
    version?: string | null;
  };
  vnc: {
    host: string;
    port: number;
  };
  worker: {
    concurrency: number;
    actionTimeout: number;
    workflowTimeout: number;
  };
}

