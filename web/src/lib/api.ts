import type {
  DashboardStats,
  RequestRecord,
  ApiKey,
  WorkflowTemplate,
  ScheduleRecord,
  ConfigStatus,
} from '../types';

const BASE = '';
const TOKEN_KEY = 'playwright_dashboard_token';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // ── Authentication ──────────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async login(username: string, password: string):Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const res = await fetch(`${BASE}/api/v1/dashboard/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getAuthStatus(): Promise<{ authenticated: boolean; user?: { username: string; isDefault: boolean } }> {
    try {
      const res = await fetch(`${BASE}/api/v1/dashboard/auth/status`, {
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE}/api/v1/dashboard/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // ignore network errors on logout
    } finally {
      this.clearToken();
    }
  },

  async changePassword(currentPassword: string, newPassword: string, newUsername?: string): Promise<any> {
    const res = await fetch(`${BASE}/api/v1/dashboard/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword, newUsername }),
    });
    return res.json();
  },

  // ── Stats & History ─────────────────────────────────────────────────────────
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${BASE}/api/v1/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getHistory(page = 1, limit = 20): Promise<{ items: RequestRecord[]; total: number }> {
    const res = await fetch(`${BASE}/api/v1/dashboard/history?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getHistoryDetail(id: string): Promise<RequestRecord> {
    const res = await fetch(`${BASE}/api/v1/dashboard/history/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch request detail');
    return res.json();
  },

  // ── API Keys ────────────────────────────────────────────────────────────────
  async getKeys(): Promise<ApiKey[]> {
    const res = await fetch(`${BASE}/api/v1/dashboard/keys`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.keys || [];
  },

  async createKey(name: string, description?: string): Promise<ApiKey> {
    const res = await fetch(`${BASE}/api/v1/dashboard/keys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create key');
    return data.key;
  },

  async toggleKey(id: string, active: boolean): Promise<ApiKey> {
    const res = await fetch(`${BASE}/api/v1/dashboard/keys/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ active }),
    });
    const data = await res.json();
    return data.key;
  },

  async deleteKey(id: string): Promise<boolean> {
    const res = await fetch(`${BASE}/api/v1/dashboard/keys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.success;
  },

  // ── Templates ───────────────────────────────────────────────────────────────
  async getTemplates(): Promise<WorkflowTemplate[]> {
    const res = await fetch(`${BASE}/api/v1/dashboard/templates`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.templates || [];
  },

  async getTemplate(id: string): Promise<WorkflowTemplate> {
    const res = await fetch(`${BASE}/api/v1/dashboard/templates/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.template;
  },

  async saveTemplate(payload: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const res = await fetch(`${BASE}/api/v1/dashboard/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to save template');
    return data.template;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const res = await fetch(`${BASE}/api/v1/dashboard/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.success;
  },

  // ── Schedules ───────────────────────────────────────────────────────────────
  async getSchedules(): Promise<ScheduleRecord[]> {
    const res = await fetch(`${BASE}/api/v1/dashboard/schedules`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.schedules || [];
  },

  async createSchedule(payload: any): Promise<ScheduleRecord> {
    const res = await fetch(`${BASE}/api/v1/dashboard/schedules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create schedule');
    return data.schedule;
  },

  async toggleSchedule(id: string, active: boolean): Promise<ScheduleRecord> {
    const res = await fetch(`${BASE}/api/v1/dashboard/schedules/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.schedule;
  },

  async triggerSchedule(id: string): Promise<any> {
    const res = await fetch(`${BASE}/api/v1/dashboard/schedules/${id}/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const res = await fetch(`${BASE}/api/v1/dashboard/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data.success;
  },

  // ── Setup / Onboarding ─────────────────────────────────────────────────────
  async getConfigStatus(): Promise<ConfigStatus> {
    const res = await fetch(`${BASE}/api/v1/dashboard/setup/status`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async testRedis(params: any): Promise<any> {
    const res = await fetch(`${BASE}/api/v1/dashboard/setup/test-redis`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async saveConfig(params: any): Promise<any> {
    const res = await fetch(`${BASE}/api/v1/dashboard/setup/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // ── VNC Info ────────────────────────────────────────────────────────────────
  async getVncInfo(): Promise<{ host: string; port: number; vncUrl: string; active?: boolean; note?: string }> {
    const res = await fetch(`${BASE}/api/v1/dashboard/vnc`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ── Public Execution APIs ───────────────────────────────────────────────────
  async executeSync(payload: any, apiKey?: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(`${BASE}/api/v1/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async executeAsync(payload: any, apiKey?: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(`${BASE}/api/v1/async`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
