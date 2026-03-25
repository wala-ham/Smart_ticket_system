// services/categories.ts

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  organization_id?: number | null;
  default_team?: string | null;
  color?: string | null;
  created_at?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  default_team?: string;
  color?: string;
}

// ─── helper ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.message ?? `HTTP ${res.status}`;
    const err: any = new Error(message);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json as T;
}

// ─── Response shapes (matching your API exactly) ─────────────────────────────
// GET /categories        → { success, data: { categories: Category[] } }
// GET /categories/:id    → { success, data: { category: Category } }
// POST /categories       → { success, data: { category: Category } }
// PUT  /categories/:id   → { success, data: { category: Category } }
// DELETE /categories/:id → { success, message }

interface ListResponse   { success: boolean; data: { categories: Category[] } }
interface SingleResponse { success: boolean; data: { category: Category } }
interface OkResponse     { success: boolean; message?: string }

// ─── API calls ────────────────────────────────────────────────────────────────

/** GET /categories — list all */
export async function listCategories(token: string): Promise<Category[]> {
  const res = await request<ListResponse>('/categories', { method: 'GET' }, token);
  return res.data.categories;
}

/** GET /categories/:id */
export async function getCategoryById(id: number, token: string): Promise<Category> {
  const res = await request<SingleResponse>(`/categories/${id}`, { method: 'GET' }, token);
  return res.data.category;
}

/** POST /categories */
export async function createCategory(payload: CategoryPayload, token: string): Promise<Category> {
  const res = await request<SingleResponse>(
    '/categories',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
  return res.data.category;
}

/** PUT /categories/:id */
export async function updateCategory(
  id: number,
  payload: Partial<CategoryPayload>,
  token: string
): Promise<Category> {
  const res = await request<SingleResponse>(
    `/categories/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token
  );
  return res.data.category;
}

/** DELETE /categories/:id */
export async function deleteCategory(id: number, token: string): Promise<void> {
  await request<OkResponse>(`/categories/${id}`, { method: 'DELETE' }, token);
}
