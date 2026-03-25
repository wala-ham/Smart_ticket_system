const API_BASE = 'http://localhost:5000';

export type User = {
  id: number;
  full_name: string;
  email: string;
  role?: 'company_admin' | 'employee' | 'client';
  team?: string;
  is_active?: boolean;
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type EmployeeStats = {
  total_assigned?: number;
  open_tickets?: number;
  resolved_tickets?: number;
  avg_resolution_time?: string;
  [key: string]: any;
};

type ListParams = {
  role?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
};

async function request(path: string, options: RequestInit = {}, token?: string) {
  if (!token) {
    const stored = localStorage.getItem('auth_token');
    if (stored) token = stored;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.debug('[API REQUEST]', options.method ?? 'GET', `${API_BASE}${path}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  console.debug('[API RESPONSE]', `${API_BASE}${path}`, res.status, json);

  if (!res.ok) {
    const err: any = new Error('API request failed');
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }
  return json;
}

function parseUsers(json: any): { users: User[]; total: number | null } {
  if (json?.data?.users) return { users: json.data.users, total: json.data.total ?? null };
  if (Array.isArray(json?.data)) return { users: json.data, total: null };
  if (json?.users) return { users: json.users, total: json.total ?? null };
  if (Array.isArray(json)) return { users: json, total: null };
  return { users: [], total: null };
}

export const listUsers = async (params: ListParams = {}, token?: string) => {
  const qs = new URLSearchParams();
  if (params.role) qs.append('role', params.role);
  if (params.page) qs.append('page', String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  const json = await request(`/api/users?${qs.toString()}`, { method: 'GET' }, token);
  return parseUsers(json);
};

export const getUser = async (id: number | string, token?: string) => {
  const json = await request(`/api/users/${id}`, { method: 'GET' }, token);
  if (json?.data?.user) return json.data.user as User;
  return (json?.data ?? json) as User;
};

export const createEmployee = async (
  payload: { full_name: string; email: string; password: string; team: string },
  token?: string
) => {
  const json = await request(`/api/users/employees`, { method: 'POST', body: JSON.stringify(payload) }, token);
  if (json?.data?.user) return json.data.user as User;
  return (json?.data ?? json) as User;
};

export const createClient = async (
  payload: { full_name: string; email: string; password: string },
  token?: string
) => {
  const json = await request(`/api/users/clients`, { method: 'POST', body: JSON.stringify(payload) }, token);
  if (json?.data?.user) return json.data.user as User;
  return (json?.data ?? json) as User;
};

export const updateUser = async (id: number | string, payload: Partial<User>, token?: string) => {
  const json = await request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  if (json?.data?.user) return json.data.user as User;
  return (json?.data ?? json) as User;
};

export const deleteUser = async (id: number | string, token?: string) => {
  const json = await request(`/api/users/${id}`, { method: 'DELETE' }, token);
  return json?.data ?? json;
};

export const getEmployeeStats = async (id: number | string, token?: string) => {
  const json = await request(`/api/users/employees/${id}/stats`, { method: 'GET' }, token);
  return (json?.data ?? json) as EmployeeStats;
};

export const getAvailableEmployees = async (token?: string) => {
  const json = await request(`/api/users/employees/available`, { method: 'GET' }, token);
  return parseUsers(json).users;
};
