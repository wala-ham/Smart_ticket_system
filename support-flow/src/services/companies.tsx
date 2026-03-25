const API_BASE = 'http://localhost:5000';

export type AdminInfo = {
  id: number;
  full_name?: string;
  name?: string;
  email?: string;
};

export type Organization = {
  id: number;
  name: string;
  type?: 'physique' | 'morale';
  email?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
  admin_user_id?: number | null;
  admin?: AdminInfo;
  admin_name?: string;
  admin_email?: string;
  created_at?: string;
  updated_at?: string;
  contract_plan?: 'basic' | 'pro' | 'enterprise';
  contract_status?: 'active' | 'trial' | 'suspended' | 'expired';
  contract_start_date?: string;
  contract_end_date?: string;
  contract_pdf_url?: string;
  [key: string]: any;
};

export type OrgStats = {
  total_tickets?: number;
  open_tickets?: number;
  resolved_tickets?: number;
  total_users?: number;
  [key: string]: any;
};

type ListParams = {
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
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }

  console.debug('[API RESPONSE]', `${API_BASE}${path}`, res.status, json);

  if (!res.ok) {
    const err: any = new Error('API request failed');
    err.status = res.status;
    err.body   = json ?? text;
    throw err;
  }
  return json;
}

export const listOrganizations = async (params: ListParams = {}, token?: string) => {
  const qs = new URLSearchParams();
  if (params.page)  qs.append('page',  String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  const json = await request(`/api/organizations?${qs.toString()}`, { method: 'GET' }, token);

  if (json?.data?.organizations) return { organizations: json.data.organizations as Organization[], total: json.data.pagination?.total ?? json.data.total ?? null };
  if (Array.isArray(json?.data))  return { organizations: json.data as Organization[], total: null };
  if (json?.organizations)        return { organizations: json.organizations as Organization[], total: json.total ?? null };
  if (Array.isArray(json))        return { organizations: json as Organization[], total: null };
  return { organizations: [], total: null };
};

export const getOrganization = async (id: number | string, token?: string) => {
  const json = await request(`/api/organizations/${id}`, { method: 'GET' }, token);
  if (json?.data?.organization) return json.data.organization as Organization;
  return (json?.data ?? json) as Organization;
};

export type CreateOrganizationPayload = {
  name: string;
  type: string;
  email: string;
  phone?: string;
  address?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  contract_plan?: 'basic' | 'pro' | 'enterprise';
  contract_end_date?: string;
};

// Returns `any` intentionally — caller extracts org.id safely with optional chaining
export const createOrganization = async (
  payload: CreateOrganizationPayload,
  token?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return request(`/api/organizations`, { method: 'POST', body: JSON.stringify(payload) }, token);
};

export const updateOrganization = async (id: number | string, payload: Partial<Organization>, token?: string) => {
  const json = await request(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  if (json?.data?.organization) return json.data.organization as Organization;
  return (json?.data ?? json) as Organization;
};

export const deleteOrganization = async (id: number | string, token?: string) => {
  const json = await request(`/api/organizations/${id}`, { method: 'DELETE' }, token);
  return json?.data ?? json;
};

export const getOrganizationStats = async (id: number | string, token?: string) => {
  const json = await request(`/api/organizations/${id}/stats`, { method: 'GET' }, token);
  return (json?.data ?? json) as OrgStats;
};
