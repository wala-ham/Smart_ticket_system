// src/pages/admin/ManageWorkflows.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, Trash2, Edit2, RefreshCw, Search, ChevronRight, Check, User, Users } from 'lucide-react';
const API_BASE = 'http://localhost:5000';

type Employee = {
  id: number; full_name: string; email: string; role: string;
  job_title?: string; is_available: boolean; department_id?: number;
  department?: { name: string };
  performance_score?: number; tickets_resolved?: number;
};

type Step = {
  id?: number; step_order: number; label: string;
  user_id?: number | null;        // ← employé sélectionné directement
  role_label?: string;            // ← fallback si indisponible
  assignment_type: 'OR' | 'AND';
  department_id?: number | '';
  // enrichi côté affichage
  _user?: Employee | null;
};

// type Template = {
//   id: number; name: string; category_id?: number; context: string;
//   is_active: boolean; steps: Step[];
//   category?: { id: number; name: string };
// };
type Template = {
  id: number; name: string; category_id?: number; 
  department_id?: number | null; // ← Remplacé 'context: string' par ça
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

// ─── Employee Picker Modal ─────────────────────────────────────────────────────
// function EmployeePicker({ employees, selected, onSelect, onClose }: {
//   employees: Employee[]; selected?: number | null;
//   onSelect: (emp: Employee | null) => void; onClose: () => void;
// }) {
//   const [search, setSearch]   = useState('');
//   const [filter, setFilter]   = useState<'all' | 'available' | 'unavailable'>('all');

//   const filtered = employees.filter(e => {
//     const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
//       e.email.toLowerCase().includes(search.toLowerCase()) ||
//       (e.job_title ?? '').toLowerCase().includes(search.toLowerCase());
//     const matchFilter = filter === 'all' ? true :
//       filter === 'available' ? e.is_available : !e.is_available;
//     return matchSearch && matchFilter;
//   });

//   return (
//     <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
//       <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b">
//           <div>
//             <h3 className="font-semibold text-lg">Sélectionner un employé</h3>
//             <p className="text-xs text-muted-foreground">Cet employé sera assigné directement à cette étape</p>
//           </div>
//           <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
//         </div>

//         {/* Filters */}
//         <div className="p-4 space-y-3 border-b">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <input type="text" placeholder="Rechercher par nom, email, poste..."
//               value={search} onChange={e => setSearch(e.target.value)}
//               className="form-input pl-10 w-full" />
//           </div>
//           <div className="flex gap-2">
//             {(['all', 'available', 'unavailable'] as const).map(f => (
//               <button key={f} onClick={() => setFilter(f)}
//                 className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
//                   filter === f ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
//                 }`}>
//                 {f === 'all' ? `Tous (${employees.length})` :
//                  f === 'available' ? `✅ Disponibles (${employees.filter(e => e.is_available).length})` :
//                  `❌ Indisponibles (${employees.filter(e => !e.is_available).length})`}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Employee list */}
//         <div className="max-h-72 overflow-y-auto p-3 space-y-1">
//           {/* Option "Aucun" */}
//           <button onClick={() => { onSelect(null); onClose(); }}
//             className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
//               !selected ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-muted/50'
//             }`}>
//             <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
//               <User className="h-4 w-4 text-slate-500" />
//             </div>
//             <div>
//               <p className="text-sm font-medium text-muted-foreground">Aucun (auto-assign)</p>
//               <p className="text-xs text-muted-foreground">Le système choisira automatiquement</p>
//             </div>
//             {!selected && <Check className="h-4 w-4 text-indigo-600 ml-auto" />}
//           </button>

//           {filtered.length === 0 ? (
//             <p className="text-sm text-muted-foreground text-center py-6">Aucun employé trouvé</p>
//           ) : filtered.map(emp => (
//             <button key={emp.id} onClick={() => { onSelect(emp); onClose(); }}
//               className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
//                 selected === emp.id
//                   ? 'bg-indigo-50 border-indigo-300'
//                   : emp.is_available
//                     ? 'border-transparent hover:bg-muted/50'
//                     : 'border-transparent hover:bg-muted/30 opacity-70'
//               }`}>
//               {/* Avatar */}
//               <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
//                 emp.is_available ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
//               }`}>
//                 {emp.full_name.charAt(0).toUpperCase()}
//               </div>

//               {/* Info */}
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm font-medium truncate">{emp.full_name}</p>
//                 <p className="text-xs text-muted-foreground truncate">
//                   {emp.job_title ?? emp.role}
//                   {emp.department?.name && ` • ${emp.department.name}`}
//                 </p>
//               </div>

//               {/* Score */}
//               {emp.performance_score !== undefined && (
//                 <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
//                   emp.performance_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
//                   emp.performance_score >= 50 ? 'bg-amber-100 text-amber-700' :
//                   'bg-slate-100 text-slate-600'
//                 }`}>
//                   {Math.round(emp.performance_score)}%
//                 </span>
//               )}

//               {/* Dispo badge */}
//               <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
//                 emp.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
//               }`}>
//                 {emp.is_available ? 'Dispo' : 'Indispo'}
//               </span>

//               {selected === emp.id && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
//             </button>
//           ))}
//         </div>

//         <div className="p-3 border-t">
//           <Button variant="outline" onClick={onClose} className="w-full">Annuler</Button>
//         </div>
//       </div>
//     </div>
//   );
// }
// ─── Employee Picker Modal ─────────────────────────────────────────────────────
function EmployeePicker({ employees, selected, departmentId, onSelect, onClose }: {
  employees: Employee[]; 
  selected?: number | null;
  departmentId?: number | ''; // ← Ajout de la prop du département de l'étape
  onSelect: (emp: Employee | null) => void; 
  onClose: () => void;
}) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | 'available' | 'unavailable'>('all');

  // 1. Filtrage d'abord par département s'il est spécifié
  const deptEmployees = useMemo(() => {
    if (!departmentId) return employees;
    return employees.filter(e => e.department_id === departmentId);
  }, [employees, departmentId]);

  // 2. Application des filtres de recherche et de disponibilité
  const filtered = deptEmployees.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.job_title ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true :
      filter === 'available' ? e.is_available : !e.is_available;
    return matchSearch && matchFilter;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">Sélectionner un employé</h3>
            <p className="text-xs text-muted-foreground">
              {departmentId ? "Employés du département sélectionné" : "Cet employé sera assigné directement à cette étape"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Rechercher par nom, email, poste..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="form-input pl-10 w-full" />
          </div>
          <div className="flex gap-2">
            {(['all', 'available', 'unavailable'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                {f === 'all' ? `Tous (${deptEmployees.length})` :
                 f === 'available' ? `✅ Disponibles (${deptEmployees.filter(e => e.is_available).length})` :
                 `❌ Indisponibles (${deptEmployees.filter(e => !e.is_available).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Employee list */}
        <div className="max-h-72 overflow-y-auto p-3 space-y-1">
          {/* Option "Aucun" */}
          <button onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
              !selected ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-muted/50'
            }`}>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aucun (auto-assign)</p>
              <p className="text-xs text-muted-foreground">Le système choisira automatiquement</p>
            </div>
            {!selected && <Check className="h-4 w-4 text-indigo-600 ml-auto" />}
          </button>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun employé trouvé dans ce département</p>
          ) : filtered.map(emp => (
            <button key={emp.id} onClick={() => { onSelect(emp); onClose(); }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                selected === emp.id
                  ? 'bg-indigo-50 border-indigo-300'
                  : emp.is_available
                    ? 'border-transparent hover:bg-muted/50'
                    : 'border-transparent hover:bg-muted/30 opacity-70'
              }`}>
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                emp.is_available ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {emp.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {emp.job_title ?? emp.role}
                  {emp.department?.name && ` • ${emp.department.name}`}
                </p>
              </div>

              {/* Score */}
              {emp.performance_score !== undefined && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  emp.performance_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  emp.performance_score >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {Math.round(emp.performance_score)}%
                </span>
              )}

              {/* Dispo badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                emp.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
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
// function StepRow({ step, index, employees, departments, onChange, onDelete }: {
//   step: Step; index: number; employees: Employee[]; departments: Department[];
//   onChange: (s: Step) => void; onDelete: () => void;
// }) {
//   const [showPicker, setShowPicker] = useState(false);

//   const selectedUser = step.user_id
//     ? employees.find(e => e.id === step.user_id) ?? step._user
//     : null;

//   return (
//     <>
//       <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm">
//         {/* Numéro */}
//         <span className="text-sm font-bold text-indigo-600 w-6 flex-shrink-0 text-center">{index + 1}</span>

//         {/* Sélecteur d'employé */}
//         <button onClick={() => setShowPicker(true)}
//           className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg border text-left transition-colors ${
//             selectedUser
//               ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
//               : 'bg-muted/30 border-dashed border-muted-foreground/30 hover:bg-muted/50'
//           }`}>
//           {selectedUser ? (
//             <>
//               <div className="h-6 w-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
//                 {selectedUser.full_name.charAt(0)}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-xs font-semibold truncate">{selectedUser.full_name}</p>
//                 <p className="text-xs text-muted-foreground truncate">{selectedUser.job_title ?? selectedUser.role}</p>
//               </div>
//               <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
//                 selectedUser.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
//               }`}>
//                 {selectedUser.is_available ? '✓' : '✗'}
//               </span>
//             </>
//           ) : (
//             <>
//               <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
//               <span className="text-sm text-muted-foreground">Choisir un employé...</span>
//             </>
//           )}
//         </button>

//         {/* Fallback role_label si indisponible */}
//         <input value={step.role_label ?? ''} onChange={e => onChange({ ...step, role_label: e.target.value })}
//           placeholder="Fallback (ex: Développeur)"
//           title="Si l'employé choisi est indisponible, le système cherchera ce rôle"
//           className="form-input text-xs w-32 flex-shrink-0 border p-1.5 rounded" />

//         {/* OR / AND */}
//         <select value={step.assignment_type}
//           onChange={e => onChange({ ...step, assignment_type: e.target.value as 'OR' | 'AND' })}
//           className="form-input text-xs w-16 flex-shrink-0 border p-1.5 rounded">
//           <option value="OR">OR</option>
//           <option value="AND">AND</option>
//         </select>

//         {/* Département */}
//         <select value={step.department_id ?? ''}
//           onChange={e => onChange({ ...step, department_id: e.target.value ? Number(e.target.value) : '' })}
//           className="form-input text-xs w-28 flex-shrink-0 border p-1.5 rounded">
//           <option value="">Toute org</option>
//           {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
//         </select>

//         {/* Supprimer */}
//         <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 text-red-500 flex-shrink-0">
//           <X className="h-3.5 w-3.5" />
//         </button>
//       </div>

//       {showPicker && (
//         <EmployeePicker
//           employees={employees}
//           selected={step.user_id}
//           onSelect={emp => onChange({ ...step, user_id: emp?.id ?? null, _user: emp, label: emp?.full_name ?? step.label })}
//           onClose={() => setShowPicker(false)}
//         />
//       )}
//     </>
//   );
// }


// ─── Step Row ─────────────────────────────────────────────────────────────────
function StepRow({ step, index, employees, onChange, onDelete }: {
  step: Step; index: number; employees: Employee[];
  onChange: (s: Step) => void; onDelete: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const selectedUser = step.user_id
    ? employees.find(e => e.id === step.user_id) ?? step._user
    : null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm">
        {/* Numéro */}
        <span className="text-sm font-bold text-indigo-600 w-6 flex-shrink-0 text-center">{index + 1}</span>

        {/* Sélecteur d'employé */}
        <button onClick={() => setShowPicker(true)}
          className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg border text-left transition-colors ${
            selectedUser
              ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
              : 'bg-muted/30 border-dashed border-muted-foreground/30 hover:bg-muted/50'
          }`}>
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
              <span className="text-sm text-muted-foreground">Choisir un employé...</span>
            </>
          )}
        </button>

        {/* Fallback rôle */}
        <input value={step.role_label ?? ''} onChange={e => onChange({ ...step, role_label: e.target.value })}
          placeholder="Fallback (ex: Développeur)"
          className="form-input text-xs w-32 flex-shrink-0 border p-1.5 rounded" />

        {/* OR / AND */}
        <select value={step.assignment_type}
          onChange={e => onChange({ ...step, assignment_type: e.target.value as 'OR' | 'AND' })}
          className="form-input text-xs w-16 flex-shrink-0 border p-1.5 rounded">
          <option value="OR">OR</option>
          <option value="AND">AND</option>
        </select>

        {/* Supprimer l'étape */}
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-100 text-red-500 flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showPicker && (
        <EmployeePicker
          employees={employees} // Contient uniquement les employés filtrés
          selected={step.user_id}
          onSelect={emp => onChange({ ...step, user_id: emp?.id ?? null, _user: emp, label: emp?.full_name ?? step.label })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ─── Template Modal ───────────────────────────────────────────────────────────
// function TemplateModal({ template, categories, departments, employees, token, onClose, onSaved }: {
//   template: Template | null; categories: Category[]; departments: Department[];
//   employees: Employee[]; token: string; onClose: () => void; onSaved: () => void;
// }) {
//   const isEdit = !!template;
//   const [name, setName]       = useState(template?.name ?? '');
//   const [catId, setCatId]     = useState<number | ''>(template?.category_id ?? '');
//   const [context, setContext] = useState(template?.context ?? 'supplier');
//   const [isActive, setIsActive] = useState(template?.is_active ?? true);
//   const [steps, setSteps]     = useState<Step[]>(
//     template?.steps?.length
//       ? template.steps.sort((a, b) => a.step_order - b.step_order)
//       : [{ step_order: 1, label: '', user_id: null, role_label: '', assignment_type: 'OR' }]
//   );
//   const [saving, setSaving]   = useState(false);
//   const [err, setErr]         = useState<string | null>(null);

//   const addStep    = () => setSteps(prev => [...prev, { step_order: prev.length + 1, label: '', user_id: null, role_label: '', assignment_type: 'OR' }]);
//   const updateStep = (i: number, s: Step) => setSteps(prev => prev.map((x, idx) => idx === i ? s : x));
//   const deleteStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })));

//   const handleSave = async () => {
//     if (!name.trim()) return setErr('Nom requis');
//     if (!steps.length) return setErr('Au moins 1 étape requise');
//     setSaving(true); setErr(null);
//     try {
//       const payload = {
//         name: name.trim(), category_id: catId || undefined,
//         context, is_active: isActive,
//         steps: steps.map(s => ({
//           step_order:      s.step_order,
//           label:           s._user?.full_name ?? s.role_label ?? s.label ?? `Étape ${s.step_order}`,
//           user_id:         s.user_id ?? null,
//           role_label:      s.role_label ?? null,
//           assignment_type: s.assignment_type,
//           department_id:   s.department_id || null,
//         })),
//       };
//       if (isEdit) {
//         await api(`/api/workflow-templates/${template!.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
//       } else {
//         await api('/api/workflow-templates', { method: 'POST', body: JSON.stringify(payload) }, token);
//       }
//       onSaved();
//     } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
//     finally { setSaving(false); }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
//       <Card className="w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col bg-white">
//         <CardHeader className="flex-shrink-0 border-b">
//           <div className="flex items-center justify-between">
//             <div>
//               <CardTitle>{isEdit ? 'Modifier' : 'Nouveau'} Circuit Workflow</CardTitle>
//               <CardDescription>
//                 Associez chaque étape à un employé spécifique — OR = auto-assign • AND = tous notifiés
//               </CardDescription>
//             </div>
//             <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
//           </div>
//         </CardHeader>

//         <CardContent className="overflow-y-auto flex-1 space-y-4 pt-4">
//           {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{err}</p>}

//           {/* Nom + Catégorie + Contexte */}
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//             <div className="sm:col-span-1 space-y-1">
//               <label className="text-xs font-semibold text-muted-foreground uppercase">Nom *</label>
//               <input value={name} onChange={e => setName(e.target.value)}
//                 placeholder="Ex: Bug de connexion" className="form-input w-full" />
//             </div>
//             <div className="space-y-1">
//               <label className="text-xs font-semibold text-muted-foreground uppercase">Catégorie (déclencheur)</label>
//               <select value={catId} onChange={e => setCatId(e.target.value ? Number(e.target.value) : '')}
//                 className="form-input w-full">
//                 <option value="">Manuel</option>
//                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//               </select>
//             </div>
//             <div className="space-y-1">
//               <label className="text-xs font-semibold text-muted-foreground uppercase">Contexte</label>
//               <select value={context} onChange={e => setContext(e.target.value)} className="form-input w-full">
//                 <option value="client">Client (interne)</option>
//                 <option value="supplier">Fournisseur (IT)</option>
//               </select>
//             </div>
//           </div>

//           {/* Légende colonnes */}
//           <div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_128px_64px_112px_32px] gap-2 px-3">
//             <span>#</span>
//             <span>Employé assigné → cliquer pour choisir</span>
//             <span>Fallback rôle</span>
//             <span>OR/AND</span>
//             <span>Département</span>
//             <span></span>
//           </div>

//           {/* Steps */}
//           <div className="space-y-2">
//             {steps.map((step, i) => (
//               <div key={i} className="flex items-center gap-1">
//                 {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 -ml-1" />}
//                 {i === 0 && <div className="w-4 flex-shrink-0" />}
//                 <div className="flex-1">
//                   <StepRow step={step} index={i} employees={employees} departments={departments}
//                     onChange={s => updateStep(i, s)} onDelete={() => deleteStep(i)} />
//                 </div>
//               </div>
//             ))}

//             <Button variant="outline" size="sm" onClick={addStep} className="w-full border-dashed gap-1 mt-1">
//               <Plus className="h-3.5 w-3.5" /> Ajouter une étape
//             </Button>
//           </div>

//           {/* Info AND/OR */}
//           <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1 text-xs text-blue-700">
//             <p><strong>OR</strong> — Le système assigne automatiquement l'employé choisi. S'il est indisponible, le fallback est utilisé.</p>
//             <p><strong>AND</strong> — Tous les intervenants reçoivent une notification. Le premier à traiter fait avancer le circuit.</p>
//           </div>
//         </CardContent>

//         <div className="p-4 border-t flex gap-3 flex-shrink-0 bg-gray-50">
//           <Button onClick={handleSave} disabled={saving} className="btn-gradient flex-1 gap-2">
//             <Check className="h-4 w-4" /> {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le circuit'}
//           </Button>
//           <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Annuler</Button>
//         </div>
//       </Card>
//     </div>
//   );
// }

function TemplateModal({ template, categories, departments, employees, token, onClose, onSaved }: {
  template: Template | null; categories: Category[]; departments: Department[];
  employees: Employee[]; token: string; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!template;
  const [name, setName]       = useState(template?.name ?? '');
  const [catId, setCatId]     = useState<number | ''>(template?.category_id ?? '');
  const [departmentId, setDepartmentId] = useState<number | ''>(template?.department_id ?? ''); // ← État pour le département global
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [steps, setSteps]     = useState<Step[]>(
    template?.steps?.length
      ? template.steps.sort((a, b) => a.step_order - b.step_order)
      : [{ step_order: 1, label: '', user_id: null, role_label: '', assignment_type: 'OR' }]
  );
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  // 1. Filtrer les employés du département sélectionné pour tout le formulaire
  const filteredEmployeesByDept = useMemo(() => {
    if (!departmentId) return employees; // Si "Toute l'organisation"
    return employees.filter(emp => emp.department_id === departmentId);
  }, [employees, departmentId]);

  // Réinitialiser les employés des étapes si on change de département global et qu'ils n'en font plus partie
  useEffect(() => {
    if (!departmentId) return;
    setSteps(prevSteps => 
      prevSteps.map(step => {
        if (step.user_id) {
          const stillValid = filteredEmployeesByDept.some(e => e.id === step.user_id);
          if (!stillValid) {
            return { ...step, user_id: null, _user: null, label: '' }; // Reset si l'employé n'est pas dans le nouveau département
          }
        }
        return step;
      })
    );
  }, [departmentId, filteredEmployeesByDept]);

  const addStep    = () => setSteps(prev => [...prev, { step_order: prev.length + 1, label: '', user_id: null, role_label: '', assignment_type: 'OR' }]);
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
        department_id: departmentId || null, // ← Payload mis à jour avec le département global
        is_active: isActive,
        steps: steps.map(s => ({
          step_order:      s.step_order,
          label:           s._user?.full_name ?? s.role_label ?? s.label ?? `Étape ${s.step_order}`,
          user_id:         s.user_id ?? null,
          role_label:      s.role_label ?? null,
          assignment_type: s.assignment_type,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col bg-white">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEdit ? 'Modifier' : 'Nouveau'} Circuit Workflow</CardTitle>
              <CardDescription>
                Créez un modèle de workflow pour un département spécifique.
              </CardDescription>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 space-y-4 pt-4">
          {err && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{err}</p>}

          {/* Nom + Catégorie + Département Global */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Bug de connexion" className="form-input w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Catégorie (déclencheur)</label>
              <select value={catId} onChange={e => setCatId(e.target.value ? Number(e.target.value) : '')}
                className="form-input w-full">
                <option value="">Manuel</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            {/* ICI : Remplacement de Contexte par Département */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Département concerné</label>
              <select 
                value={departmentId} 
                onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')} 
                className="form-input w-full font-medium text-indigo-600"
              >
                <option value="">Toute l'organisation (Tous)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Légende colonnes */}
          <div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_128px_64px_32px] gap-2 px-3">
            <span>#</span>
            <span>Employé du département → cliquer pour choisir</span>
            <span>Fallback rôle</span>
            <span>OR/AND</span>
            <span></span>
          </div>

          {/* Steps */}
         {/* Steps */}
<div className="space-y-2">
  {steps.map((step, i) => (
    <div key={i} className="flex items-center gap-1">
      {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 -ml-1" />}
      {i === 0 && <div className="w-4 flex-shrink-0" />}
      <div className="flex-1">
        <StepRow 
          step={step} 
          index={i} 
          employees={filteredEmployeesByDept} // Déjà filtrés par le département global
          // La ligne departments={departments} a été supprimée ici pour enlever l'erreur
          onChange={s => updateStep(i, s)} 
          onDelete={() => deleteStep(i)} 
        />
      </div>
    </div>
  ))}

  <Button variant="outline" size="sm" onClick={addStep} className="w-full border-dashed gap-1 mt-1">
    <Plus className="h-3.5 w-3.5" /> Ajouter une étape
  </Button>
</div>

          {/* Info AND/OR */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1 text-xs text-blue-700">
            <p><strong>OR</strong> — Le système assigne automatiquement l'employé choisi. S'il est indisponible, le fallback est utilisé.</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ManageWorkflows: React.FC = () => {
  const { token } = useAuth();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const [templates, setTemplates]   = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tpl, cat, dept, emps] = await Promise.all([
        api('/api/workflow-templates', {}, tk()).then(j => j?.data?.templates ?? []),
        api('/api/categories', {}, tk()).then(j => { const d = j?.data?.categories ?? j?.data ?? j?.categories ?? j; return Array.isArray(d) ? d : []; }),
        api('/api/departments', {}, tk()).then(j => j?.data?.departments ?? j?.departments ?? []),
        // Charger tous les employés avec leur score
        // api('/api/dashboard/scoreboard', {}, tk()).then(j => j?.agents ?? []).catch(() => []),
        // api('/api/dashboard/scoreboard', {}, tk()).then(j => j?.agents ?? j?.data?.agents ?? []).catch(() => []),
        api('/api/users?limit=100', {}, tk()).then(j => {
  const list = j?.data?.users ?? j?.users ?? [];
  return list.filter((u: any) => 
    ['employee', 'company_admin'].includes(u.role)
    // organization_id est déjà filtré côté backend si le middleware est correct
  );
}).catch(() => []),
      ]);
      setTemplates(tpl); setCategories(cat); setDepartments(dept); setEmployees(emps);
    } catch (e: any) { console.error('Load error:', e.message); }
    finally { setLoading(false); }
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

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-500" /> Circuits Workflow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les circuits par catégorie — chaque étape est assignée à un employé spécifique
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="btn-gradient" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau Circuit
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Rechercher..." value={search}
          onChange={e => setSearch(e.target.value)} className="form-input pl-10" />
      </div>

      {/* Templates list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center py-16 text-muted-foreground">
          Aucun circuit configuré. Créez votre premier workflow !
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(tpl => (
            <Card key={tpl.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{tpl.name}</span>
                      {/* <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        tpl.context === 'supplier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>{tpl.context}</span> */}
                      {tpl.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          📁 {tpl.category.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        tpl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>{tpl.is_active ? 'Actif' : 'Inactif'}</span>
                    </div>

                    {/* Circuit steps */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {(tpl.steps ?? []).sort((a, b) => a.step_order - b.step_order).map((step, i) => {
                        const emp = step.user_id ? employees.find(e => e.id === step.user_id) : null;
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                              step.assignment_type === 'AND' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-muted text-foreground'
                            }`}>
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
                      {!(tpl.steps?.length) && (
                        <span className="text-xs text-muted-foreground italic">Aucune étape</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm"
                      onClick={() => { setEditTarget(tpl); setShowModal(true); }}
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm"
                      onClick={() => handleDelete(tpl.id)} disabled={deletingId === tpl.id}
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TemplateModal
          template={editTarget}
          categories={categories}
          departments={departments}
          employees={employees}
          token={tk()}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default ManageWorkflows;
