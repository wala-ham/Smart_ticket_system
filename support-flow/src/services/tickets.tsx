const API_BASE = 'http://localhost:5000';

export type Ticket = {
  id: number;
  ticket_number?: string;
  subject: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category_id?: number | null;
  department_id?: number | null; // ← NOUVEAU
  created_by?: number;
  assigned_to?: number | null;
  workflow_step?: 'department' | 'worklist'; // ← NOUVEAU
  in_worklist?: boolean;                     // ← NOUVEAU
  worklist_at?: string | null;               // ← NOUVEAU
  ai_category_confidence?: number | null;
  ai_priority_confidence?: number | null;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  [key: string]: any;
};

export type Comment = {
  id?: number;
  content: string;
  is_internal?: boolean;
  created_by?: number;
  created_at?: string;
  [key: string]: any;
};

type ListParams = {
  status?: string;
  priority?: string;
  department_id?: number; // ← NOUVEAU
  in_worklist?: boolean;  // ← NOUVEAU
  page?: number;
  limit?: number;
  [key: string]: any;
};

async function request(path: string, options: RequestInit = {}, token?: string) {
  if (!token) {
    const stored = localStorage.getItem('auth_token');
    if (stored) token = stored;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.debug('[API REQUEST]', options.method ?? 'GET', `${API_BASE}${path}`, { headers, body: options.body });
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

export const listTickets = async (params: ListParams = {}, token?: string) => {
  const qs = new URLSearchParams();
  if (params.status)        qs.append('status',        params.status);
  if (params.priority)      qs.append('priority',      params.priority);
  if (params.department_id) qs.append('department_id', String(params.department_id));
  if (params.in_worklist !== undefined) qs.append('in_worklist', String(params.in_worklist));
  if (params.page)          qs.append('page',          String(params.page));
  if (params.limit)         qs.append('limit',         String(params.limit));
  // pass-through any other params
  Object.keys(params).forEach(k => {
    if (!['status','priority','department_id','in_worklist','page','limit'].includes(k)
        && params[k] !== undefined && params[k] !== null) {
      qs.append(k, String((params as any)[k]));
    }
  });

  const json = await request(`/api/tickets?${qs.toString()}`, { method: 'GET' }, token);
  if (json?.data?.tickets) return { tickets: json.data.tickets as Ticket[], total: json.data.pagination?.total ?? json.data.total ?? null };
  if (json?.tickets)        return { tickets: json.tickets as Ticket[], total: json.total ?? null };
  if (Array.isArray(json))  return { tickets: json as Ticket[], total: null };
  return { tickets: json?.data ?? [], total: null };
};

export const getTicket = async (id: number | string, token?: string) => {
  const json = await request(`/api/tickets/${id}`, { method: 'GET' }, token);
  return json?.data ?? json;
};

export const createTicket = async (
  payload: { subject: string; description: string; category_id?: number; department_id?: number },
  token?: string
) => {
  const json = await request(`/api/tickets`, { method: 'POST', body: JSON.stringify(payload) }, token);
  return json?.data ?? json;
};

// Create ticket with file attachments (+ department_id support)
export const createTicketWithFiles = async (
  payload: {
    subject: string;
    description: string;
    category_id: number;
    department_id?: number; // ← NOUVEAU
    files?: File[];
  },
  token?: string
) => {
  if (!token) {
    const stored = localStorage.getItem('auth_token');
    if (stored) token = stored;
  }

  const formData = new FormData();
  formData.append('subject',     payload.subject);
  formData.append('description', payload.description);
  formData.append('category_id', String(payload.category_id));

  // ← NOUVEAU : envoie department_id si fourni
  if (payload.department_id) {
    formData.append('department_id', String(payload.department_id));
  }

  if (payload.files && payload.files.length > 0) {
    payload.files.forEach(file => formData.append('attachments', file));
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  console.debug('[API REQUEST]', 'POST', `${API_BASE}/api/tickets`, {
    filesCount:    payload.files?.length || 0,
    department_id: payload.department_id,
  });

  const res  = await fetch(`${API_BASE}/api/tickets`, { method: 'POST', headers, body: formData });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }

  console.debug('[API RESPONSE]', `${API_BASE}/api/tickets`, res.status, json);

  if (!res.ok) {
    const err: any = new Error('API request failed');
    err.status = res.status;
    err.body   = json ?? text;
    throw err;
  }
  return json?.data ?? json;
};

export const updateTicket = async (id: number | string, payload: Partial<Ticket>, token?: string) => {
  const json = await request(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  return json?.data ?? json;
};

export const addComment = async (
  id: number | string,
  payload: { content: string; is_internal?: boolean },
  token?: string
) => {
  const json = await request(`/api/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }, token);
  return json?.data ?? json;
};

export const assignTicket = async (
  id: number | string,
  payload: { employee_id: number },
  token?: string
) => {
  const json = await request(`/api/tickets/${id}/assign`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  return json?.data ?? json;
};

// ← NOUVEAU : escalader un ticket vers le worklist
export const escalateTicket = async (id: number | string, token?: string) => {
  const json = await request(`/api/tickets/${id}/escalate`, { method: 'PUT' }, token);
  return json?.data ?? json;
};

// ← NOUVEAU : assigner manuellement depuis le worklist
export const worklistAssign = async (
  id: number | string,
  payload: { employee_id: number },
  token?: string
) => {
  const json = await request(`/api/tickets/${id}/worklist-assign`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  return json?.data ?? json;
};

export const tokenFromStorage = () => localStorage.getItem('auth_token') ?? null;