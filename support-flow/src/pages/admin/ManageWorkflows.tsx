// src/pages/admin/ManageWorkflows.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, Trash2, Edit2, RefreshCw, Search, ChevronRight, Check } from 'lucide-react';

const API_BASE = 'http://localhost:5000';
type Step = { id?: number; step_order: number; label: string; role: string; assignment_type: 'OR' | 'AND'; department_id?: number | '' };
type Template = { id: number; name: string; category_id?: number; context: string; is_active: boolean; steps: Step[]; category?: { id: number; name: string } };
type Category = { id: number; name: string };
type Department = { id: number; name: string };

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'API error'); e.body = json; throw e; }
  return json;
}

const ROLES = ['employee', 'company_admin', 'developer', 'designer', 'architect'];

function StepRow({ step, index, departments, onChange, onDelete }: {
  step: Step; index: number; departments: Department[];
  onChange: (s: Step) => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
      <span className="text-xs font-bold text-indigo-600 w-5 flex-shrink-0">{index + 1}</span>
      <input value={step.label} onChange={e => onChange({ ...step, label: e.target.value })}
        placeholder="Step label..." className="form-input text-sm flex-1 min-w-0" />
      <select value={step.role} onChange={e => onChange({ ...step, role: e.target.value })}
        className="form-input text-sm w-36 flex-shrink-0">
        <option value="">Any role</option>
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <select value={step.assignment_type} onChange={e => onChange({ ...step, assignment_type: e.target.value as 'OR' | 'AND' })}
        className="form-input text-sm w-20 flex-shrink-0">
        <option value="OR">OR</option>
        <option value="AND">AND</option>
      </select>
      <select value={step.department_id ?? ''} onChange={e => onChange({ ...step, department_id: e.target.value ? Number(e.target.value) : '' })}
        className="form-input text-sm w-36 flex-shrink-0">
        <option value="">All org</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 text-red-500"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function TemplateModal({ template, categories, departments, token, onClose, onSaved }: {
  template: Template | null; categories: Category[]; departments: Department[];
  token: string; onClose: () => void; onSaved: (t: Template) => void;
}) {
  const isEdit = !!template;
  const [name, setName]         = useState(template?.name ?? '');
  const [catId, setCatId]       = useState<number | ''>(template?.category_id ?? '');
  const [context, setContext]   = useState(template?.context ?? 'supplier');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [steps, setSteps]       = useState<Step[]>(
    template?.steps?.length ? template.steps : [{ step_order: 1, label: '', role: '', assignment_type: 'OR' }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const addStep    = () => setSteps(prev => [...prev, { step_order: prev.length + 1, label: '', role: '', assignment_type: 'OR' }]);
  const updateStep = (i: number, s: Step) => setSteps(prev => prev.map((x, idx) => idx === i ? s : x));
  const deleteStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })));

  const handleSave = async () => {
    if (!name.trim()) return setErr('Name required');
    if (!steps.length) return setErr('At least 1 step required');
    setSaving(true); setErr(null);
    try {
      const payload = { name, category_id: catId || undefined, context, is_active: isActive, steps };
      const json = isEdit
        ? await api(`/api/workflow-templates/${template!.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
        : await api('/api/workflow-templates', { method: 'POST', body: JSON.stringify(payload) }, token);
      onSaved(json?.data?.template);
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEdit ? 'Edit' : 'New'} Workflow Template</CardTitle>
              <CardDescription>Steps are executed in order. OR = auto-assign, AND = all notified.</CardDescription>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="form-input w-full" placeholder="e.g. Bug Fix Circuit" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category (auto-trigger)</label>
              <select value={catId} onChange={e => setCatId(e.target.value ? Number(e.target.value) : '')} className="form-input w-full">
                <option value="">Manual only</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Context</label>
              <select value={context} onChange={e => setContext(e.target.value)} className="form-input w-full">
                <option value="client">Client (internal)</option>
                <option value="supplier">Supplier (IT company)</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <label className="text-xs font-semibold">Active</label>
              <button onClick={() => setIsActive(p => !p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {isActive ? 'Yes' : 'No'}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Steps — Label / Role / OR|AND / Department</label>
            {steps.map((step, i) => (
              <StepRow key={i} step={step} index={i} departments={departments}
                onChange={s => updateStep(i, s)} onDelete={() => deleteStep(i)} />
            ))}
            <Button variant="outline" size="sm" onClick={addStep} className="gap-1 w-full">
              <Plus className="h-3.5 w-3.5" /> Add Step
            </Button>
          </div>
        </CardContent>
        <div className="p-4 border-t flex gap-3 flex-shrink-0">
          <Button onClick={handleSave} disabled={saving} className="btn-gradient flex-1 gap-2">
            <Check className="h-4 w-4" /> {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

const ManageWorkflows: React.FC = () => {
  const { token } = useAuth();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [editTarget, setEditTarget]   = useState<Template | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [deletingId, setDeletingId]   = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [tpl, cat, dept] = await Promise.all([
        api('/api/workflow-templates', {}, tk()).then(j => j?.data?.templates ?? []),
        api('/api/categories', {}, tk()).then(j => { const d = j?.data?.categories ?? j?.data ?? j?.categories ?? j; return Array.isArray(d) ? d : []; }),
        api('/api/departments', {}, tk()).then(j => j?.data?.departments ?? j?.departments ?? []),
      ]);
      setTemplates(tpl); setCategories(cat); setDepartments(dept);
    } catch (e: any) { setError(e?.message ?? 'Failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this workflow?')) return;
    setDeletingId(id);
    try { await api(`/api/workflow-templates/${id}`, { method: 'DELETE' }, tk()); setTemplates(prev => prev.filter(t => t.id !== id)); }
    catch (e: any) { alert(e?.body?.message ?? 'Failed'); }
    finally { setDeletingId(null); }
  };

  const handleSaved = (t: Template) => {
    setTemplates(prev => { const ex = prev.find(x => x.id === t.id); return ex ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev]; });
    setShowModal(false);
  };

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.category?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure circuits — steps, roles, AND/OR logic</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Button className="btn-gradient" onClick={() => { setEditTarget(null); setShowModal(true); }}><Plus className="h-4 w-4 mr-2" /> New Workflow</Button>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-10" />
      </div>
      {error && <p className="text-destructive">{error}</p>}
      {loading && !templates.length ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center py-16 text-muted-foreground">No workflow templates yet. Create one!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(tpl => (
            <Card key={tpl.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold">{tpl.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tpl.context === 'supplier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{tpl.context}</span>
                      {tpl.category && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{tpl.category.name}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tpl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{tpl.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(tpl.steps ?? []).map((step, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            <span className="font-bold text-indigo-500">{i + 1}. </span>
                            {step.label || step.role || 'Step'}
                            {step.assignment_type === 'AND' && <span className="text-amber-600 font-bold"> AND</span>}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditTarget(tpl); setShowModal(true); }} className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)} disabled={deletingId === tpl.id} className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {showModal && <TemplateModal template={editTarget} categories={categories} departments={departments} token={tk()} onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </div>
  );
};

export default ManageWorkflows;
