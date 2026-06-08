// src/pages/admin/ManageWorkflows.tsx
// Gestion des circuits workflow : deux templates par catégorie (supplier + client)
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, Trash2, Edit2, RefreshCw, Search, ChevronRight, Check, User, Users, Truck, Building2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Employee = {
  id: number; full_name: string; email: string; role: string;
  job_title?: string; is_available: boolean; department_id?: number;
  department?: { name: string };
};

type Step = {
  id?: number; step_order: number; label: string;
  user_id?: number | null;
  role_label?: string;
  assignment_type: 'OR' | 'AND';
  department_id?: number | '';
  _user?: Employee | null;
};

type Template = {
  id: number; name: string; category_id?: number;
  context: 'supplier' | 'client';
  is_active: boolean; steps: Step[];
  category?: { id: number; name: string };
};

type Category   = { id: number; name: string };
type Department = { id: number; name: string };

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'API error'); e.body = json; throw e; }
  return json;
}

// ─── Employee Picker ──────────────────────────────────────────────────────────
function EmployeePicker({ employees, selected, departmentId, onSelect, onClose }: {
  employees: Employee[]; selected?: number | null;
  departmentId?: number | ''; onSelect: (e: Employee | null) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Filtrer les employés du département sélectionné s'il y en a un
  const pool = useMemo(() =>
    departmentId ? employees.filter(e => e.department_id === Number(departmentId)) : employees,
    [employees, departmentId]);

  const filtered = pool.filter(e => {
    const q = search.toLowerCase();
    const ok = e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.job_title ?? '').toLowerCase().includes(q);
    return ok && (filter === 'all' ? true : filter === 'available' ? e.is_available : !e.is_available);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">Sélectionner un employé</h3>
            <p className="text-xs text-muted-foreground">
              {departmentId ? "Affichage des employés du département sélectionné" : "Assigné directement à cette étape"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Rechercher..." value={search}
              onChange={e => setSearch(e.target.value)} className="form-input pl-10 w-full" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'available', 'unavailable'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {f === 'all' ? `Tous (${pool.length})` : f === 'available' ? `✅ (${pool.filter(e => e.is_available).length})` : `❌ (${pool.filter(e => !e.is_available).length})`}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-3 space-y-1">
          <button onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left ${!selected ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-muted/50'}`}>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aucun (auto-assign)</p>
            </div>
            {!selected && <Check className="h-4 w-4 text-indigo-600 ml-auto" />}
          </button>
          {filtered.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-6">Aucun employé trouvé</p>
            : filtered.map(emp => (
              <button key={emp.id} onClick={() => { onSelect(emp); onClose(); }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left ${selected === emp.id ? 'bg-indigo-50 border-indigo-300' : 'border-transparent hover:bg-muted/50'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${emp.is_available ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.job_title ?? emp.role}{emp.department?.name && ` • ${emp.department.name}`}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${emp.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {emp.is_available ? 'Dispo' : 'Indispo'}
                </span>
                {selected === emp.id && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
              </button>
            ))}
        </div>
        <div className="p-3 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">Annuler</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Row ─────────────────────────────────────────────────────────────────
function StepRow({ step, index, employees, departments, onChange, onDelete }: {
  step: Step; index: number; employees: Employee[]; departments: Department[];
  onChange: (s: Step) => void; onDelete: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedUser = step.user_id ? employees.find(e => e.id === step.user_id) ?? step._user : null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm w-full">
        <span className="text-sm font-bold text-indigo-600 w-6 flex-shrink-0 text-center">{index + 1}</span>
        
        {/* Choix du département concerné par l'étape */}
        <div className="flex flex-col min-w-[140px] flex-1">
          <select 
            value={step.department_id ?? ''} 
            onChange={e => {
              const dId = e.target.value ? Number(e.target.value) : '';
              // Réinitialise l'employé si le département change pour éviter les erreurs
              onChange({ ...step, department_id: dId, user_id: null, _user: null });
            }}
            className="form-input text-xs border p-1.5 rounded w-full bg-slate-50 font-medium">
            <option value="">-- Département --</option>
            {departments.map(d => (
  <option key={d.id} value={d.id}>
    {d.name}
  </option>
))}
          </select>
        </div>

        {/* Choix de l'employé (Dépend du département choisi au-dessus) */}
        <button onClick={() => setShowPicker(true)}
          className={`flex items-center gap-2 flex-[1.5] min-w-0 px-3 py-2 rounded-lg border text-left transition-colors ${selectedUser ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' : 'bg-muted/30 border-dashed border-muted-foreground/30 hover:bg-muted/50'}`}>
          {selectedUser ? (
            <>
              <div className="h-6 w-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                {selectedUser.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{selectedUser.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedUser.job_title ?? selectedUser.role}</p>
              </div>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {step.department_id ? "Choisir un employé..." : "Sélectionnez un dépt."}
              </span>
            </>
          )}
        </button>

        <input value={step.role_label ?? ''} onChange={e => onChange({ ...step, role_label: e.target.value })}
          placeholder="Rôle (fallback)" className="form-input text-xs w-24 flex-shrink-0 border p-1.5 rounded" />
        
        <select value={step.assignment_type}
          onChange={e => onChange({ ...step, assignment_type: e.target.value as 'OR' | 'AND' })}
          className="form-input text-xs w-16 flex-shrink-0 border p-1.5 rounded">
          <option value="OR">OR</option>
          <option value="AND">AND</option>
        </select>
        
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 text-red-500 flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showPicker && (
        <EmployeePicker 
          employees={employees} 
          selected={step.user_id}
          departmentId={step.department_id}
          onSelect={emp => onChange({ ...step, user_id: emp?.id ?? null, _user: emp, label: emp?.full_name ?? step.label })}
          onClose={() => setShowPicker(false)} 
        />
      )}
    </>
  );
}

// ─── Template Modal ───────────────────────────────────────────────────────────
function TemplateModal({ template, categories, departments, employees, token, onClose, onSaved, defaultContext, initialCategoryId }: {
  template: Template | null; categories: Category[]; departments: Department[];
  employees: Employee[]; token: string; onClose: () => void; onSaved: () => void;
  defaultContext: 'supplier' | 'client';
  initialCategoryId?: number | '';
}) {
  const isEdit = !!template;
  const [name, setName]       = useState(template?.name ?? '');
  const [catId, setCatId]     = useState<number | ''>(template?.category_id ?? initialCategoryId ?? '');
  const [context]             = useState<'supplier' | 'client'>(template?.context ?? defaultContext);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [steps, setSteps]     = useState<Step[]>(
    template?.steps?.length
      ? [...template.steps].sort((a, b) => a.step_order - b.step_order)
      : [{ step_order: 1, label: '', user_id: null, role_label: '', assignment_type: 'OR', department_id: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const addStep    = () => setSteps(prev => [...prev, { step_order: prev.length + 1, label: '', user_id: null, role_label: '', assignment_type: 'OR', department_id: '' }]);
  const updateStep = (i: number, s: Step) => setSteps(prev => prev.map((x, idx) => idx === i ? s : x));
  const deleteStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })));

  const handleSave = async () => {
    if (!name.trim()) return setErr('Nom requis');
    if (!steps.length) return setErr('Au moins 1 étape requise');
    setSaving(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        category_id: catId || null,
        context,
        is_active: isActive,
        steps: steps.map(s => ({
          step_order:      s.step_order,
          label:           s._user?.full_name ?? s.role_label ?? s.label ?? `Étape ${s.step_order}`,
          user_id:         s.user_id ?? null,
          role_label:      s.role_label ?? null,
          assignment_type: s.assignment_type,
          department_id:   s.department_id || null,
        })),
      };
      if (isEdit) {
        await api(`/api/workflow-templates/${template!.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      } else {
        await api('/api/workflow-templates', { method: 'POST', body: JSON.stringify(payload) }, token);
      }
      onSaved();
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
    finally { setSaving(false); }
  };

  const contextColor = context === 'supplier'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-teal-100 text-teal-700 border-teal-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col bg-white">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle>{isEdit ? 'Modifier' : 'Nouveau'} Circuit</CardTitle>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${contextColor}`}>
                  {context === 'supplier' ? '🚚 Fournisseur' : '🏢 Client'}
                </span>
              </div>
              <CardDescription>
                Chaque étape associe un département cible puis un employé spécifique.
              </CardDescription>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 space-y-4 pt-4">
          {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{err}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Traitement bug technique" className="form-input w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Catégorie (déclencheur)</label>
              <select value={catId} onChange={e => setCatId(e.target.value ? Number(e.target.value) : '')}
                className="form-input w-full">
                <option value="">Manuel</option>
                {categories.map(c => (
  <option key={c.id} value={c.id}>
    {c.name}
  </option>
))}
              </select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_1.5fr_96px_64px_32px] gap-2 px-3 font-semibold uppercase tracking-wider">
            <span>#</span>
            <span>Département</span>
            <span>Employé assigné</span>
            <span>Rôle (fallback)</span>
            <span>Type</span>
            <span></span>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 -ml-1" />}
                {i === 0 && <div className="w-4 flex-shrink-0" />}
                <div className="flex-1">
                  <StepRow step={step} index={i} employees={employees} departments={departments}
                    onChange={s => updateStep(i, s)} onDelete={() => deleteStep(i)} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStep} className="w-full border-dashed gap-1 mt-1">
              <Plus className="h-3.5 w-3.5" /> Ajouter une étape
            </Button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 space-y-1">
            <p><strong>OR</strong> — L'employé choisi est notifié directement.</p>
            <p><strong>AND</strong> — Tous les intervenants reçoivent une notification. Le premier à traiter fait avancer le circuit.</p>
          </div>
        </CardContent>

        <div className="p-4 border-t flex gap-3 flex-shrink-0 bg-gray-50">
          <Button onClick={handleSave} disabled={saving} className="btn-gradient flex-1 gap-2">
            <Check className="h-4 w-4" /> {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le circuit'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Annuler</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ tpl, employees, context, onEdit, onDelete, deletingId }: {
  tpl: Template | null; employees: Employee[];
  context: 'supplier' | 'client';
  onEdit: (t: Template) => void; onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  const isSupplier = context === 'supplier';
  const emptyColor = isSupplier
    ? 'border-orange-200 bg-orange-50/40'
    : 'border-teal-200 bg-teal-50/40';

  if (!tpl) {
    return (
      <div className={`border-2 border-dashed ${emptyColor} rounded-lg p-6 text-center`}>
        <p className="text-sm text-muted-foreground mb-1 font-medium">
          Aucun workflow {isSupplier ? 'fournisseur' : 'client'} configuré
        </p>
        <p className="text-xs text-muted-foreground">Cliquez sur "Nouveau" pour en créer un.</p>
      </div>
    );
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{tpl.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tpl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {tpl.is_active ? 'Actif' : 'Inactif'}
              </span>
              <span className="text-xs text-muted-foreground">{tpl.steps?.length ?? 0} étape(s)</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {(tpl.steps ?? []).sort((a, b) => a.step_order - b.step_order).map((step, i) => {
                const emp = step.user_id ? employees.find(e => e.id === step.user_id) : null;
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${step.assignment_type === 'AND' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-foreground'}`}>
                      <span className="font-bold text-indigo-500">{i + 1}.</span>
                      {emp ? (
                        <>
                          <div className="h-3.5 w-3.5 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                            {emp.full_name.charAt(0)}
                          </div>
                          <span>{emp.full_name.split(' ')[0]}</span>
                        </>
                      ) : (
                        <span>{step.role_label || step.label || 'Auto'}</span>
                      )}
                      {step.assignment_type === 'AND' && <span className="text-amber-700 font-bold">·AND</span>}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(tpl)}
              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(tpl.id)} disabled={deletingId === tpl.id}
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ManageWorkflows: React.FC = () => {
  const { token } = useAuth();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const [templates, setTemplates]     = useState<Template[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState<'supplier' | 'client'>('supplier');
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Template | null>(null);
  const [modalContext, setModalContext] = useState<'supplier' | 'client'>('supplier');
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | ''>('');

const load = async () => {
  setLoading(true);

  try {
    const [tplRes, catRes, deptRes, usersRes] = await Promise.all([
      api('/api/workflow-templates', {}, tk()),
      api('/api/categories', {}, tk()),
      api('/api/departments', {}, tk()),
      api('/api/users?limit=100', {}, tk())
    ]);

    console.log('Templates =>', tplRes);
    console.log('Categories =>', catRes);
    console.log('Departments =>', deptRes);
    console.log('Users =>', usersRes);

    const templatesData =
      tplRes?.data?.templates ??
      tplRes?.templates ??
      tplRes?.data ??
      [];

    const categoriesData =
      catRes?.data?.categories ??
      catRes?.categories ??
      catRes?.data ??
      [];

    const departmentsData =
      deptRes?.data?.departments ??
      deptRes?.departments ??
      deptRes?.data ??
      [];

    const usersData =
      usersRes?.data?.users ??
      usersRes?.users ??
      usersRes?.data ??
      [];

    const employeesData = usersData.filter(
      (u: any) =>
        u.role === 'employee' ||
        u.role === 'company_admin'
    );

    setTemplates(Array.isArray(templatesData) ? templatesData : []);
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
    setEmployees(Array.isArray(employeesData) ? employeesData : []);

  } catch (error) {
    console.error('Load error:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { load(); }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce workflow ?')) return;
    setDeletingId(id);
    try {
      await api(`/api/workflow-templates/${id}`, { method: 'DELETE' }, tk());
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) { alert(e?.body?.message ?? 'Erreur'); }
    finally { setDeletingId(null); }
  };

  const handleSaved = () => { load(); setShowModal(false); };

  const openCreate = (ctx: 'supplier' | 'client', catId: number | '' = '') => {
    setEditTarget(null); setModalContext(ctx); setSelectedCatId(catId); setShowModal(true);
  };

  const openEdit = (tpl: Template) => {
    setEditTarget(tpl); setModalContext(tpl.context); setSelectedCatId(tpl.category_id ?? ''); setShowModal(true);
  };

  // Grouper par catégorie
  const grouped = useMemo(() => {
    const map = new Map<string | number, { category: Category | null; supplier: Template | null; client: Template | null }>();

    categories.forEach(c => map.set(c.id, { category: c, supplier: null, client: null }));

    templates.forEach(t => {
      const key = t.category_id ?? `__no_cat_${t.id}`;
      if (!map.has(key)) {
        map.set(key, { category: t.category ?? null, supplier: null, client: null });
      }
      const entry = map.get(key)!;
      if (t.context === 'supplier') entry.supplier = t;
      else entry.client = t;
    });

    return Array.from(map.values()).filter(entry => {
      const q = search.toLowerCase();
      if (!q) return entry.supplier || entry.client;
      const catName = entry.category?.name ?? '';
      return catName.toLowerCase().includes(q) ||
        entry.supplier?.name.toLowerCase().includes(q) ||
        entry.client?.name.toLowerCase().includes(q);
    });
  }, [templates, categories, search]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-500" /> Circuits Workflow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deux circuits par catégorie : <strong>Fournisseur</strong> (premier intervenant) et <strong>Client</strong> (escalade)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => openCreate('supplier')}>
            <Truck className="h-4 w-4" /> Nouveau Fournisseur
          </Button>
          <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => openCreate('client')}>
            <Building2 className="h-4 w-4" /> Nouveau Client
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Rechercher..." value={search}
          onChange={e => setSearch(e.target.value)} className="form-input pl-10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['supplier', 'client'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? tab === 'supplier' ? 'border-orange-500 text-orange-700' : 'border-teal-500 text-teal-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {tab === 'supplier' ? <Truck className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            {tab === 'supplier' ? 'Fournisseur' : 'Client'}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              tab === 'supplier' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
            }`}>
              {templates.filter(t => t.context === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Vue par catégorie */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.length === 0 ? (
            <Card><CardContent className="pt-6 text-center py-16 text-muted-foreground">
              Aucun circuit configuré. Créez votre premier workflow !
            </CardContent></Card>
          ) : (
            grouped.map((entry, idx) => {
              const tpl = activeTab === 'supplier' ? entry.supplier : entry.client;
              const otherTpl = activeTab === 'supplier' ? entry.client : entry.supplier;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        📁 {entry.category?.name ?? 'Sans catégorie'}
                      </span>
                      {otherTpl && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          activeTab === 'supplier' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {activeTab === 'supplier' ? '✓ Client existant' : '✓ Fournisseur existant'}
                        </span>
                      )}
                    </div>
                    {!tpl && (
                      <Button size="sm" variant="outline"
                        className={`text-xs gap-1 ${activeTab === 'supplier' ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : 'border-teal-300 text-teal-700 hover:bg-teal-50'}`}
                        onClick={() => openCreate(activeTab, entry.category?.id ?? '')}>
                        <Plus className="h-3.5 w-3.5" />
                        Créer workflow {activeTab === 'supplier' ? 'fournisseur' : 'client'}
                      </Button>
                    )}
                  </div>
                  <TemplateCard
                    tpl={tpl}
                    employees={employees}
                    context={activeTab}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Légende */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <p className="font-semibold mb-1">⚡ Flux d'escalade</p>
        <p className="text-xs text-amber-700">
          Quand le fournisseur démarre un ticket, le circuit <strong>Fournisseur</strong> est activé.
          Si le fournisseur ne peut pas résoudre, il peut escalader vers le circuit <strong>Client</strong>.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <TemplateModal
          template={editTarget}
          categories={categories}
          departments={departments}
          employees={employees}
          token={tk()}
          defaultContext={modalContext}
          initialCategoryId={selectedCatId}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default ManageWorkflows;