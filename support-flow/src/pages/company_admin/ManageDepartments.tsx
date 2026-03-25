// src/pages/admin/ManageDepartments.tsx
import React, { useEffect, useState } from 'react';
import {
  Building2, Trash2, Search, Plus, X, Edit2, Check,
  RefreshCw, Users, UserCheck, ToggleLeft, ToggleRight, UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
const API_BASE = 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Department = {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  manager_id?: number | null;
  is_active: boolean;
  created_at?: string;
  manager?: { id: number; full_name: string; email: string };
  members?: { id: number; full_name: string; email: string; role: string }[];
};

type Employee = { id: number; full_name: string; email: string; role: string };

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error('API error'); e.body = json; e.status = res.status; throw e; }
  return json;
}

const listDepartments  = (token: string) =>
  apiFetch('/api/departments', {}, token).then(j => (j?.data?.departments ?? j?.departments ?? []) as Department[]);

const createDepartment = (payload: Partial<Department>, token: string) =>
  apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(payload) }, token).then(j => j?.data?.department as Department);
const updateDepartment = (id: number, payload: Partial<Department>, token: string) =>
  apiFetch(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token).then(j => j?.data?.department as Department);
const deleteDepartment = (id: number, token: string) =>
  apiFetch(`/api/departments/${id}`, { method: 'DELETE' }, token);
const updateMember = (deptId: number, user_id: number, action: 'add' | 'remove', token: string) =>
  apiFetch(`/api/departments/${deptId}/members`, { method: 'PUT', body: JSON.stringify({ user_id, action }) }, token);
const listEmployees = (token: string) =>
  apiFetch('/api/users?limit=100', {}, token).then(j => {
    const list = j?.data?.users ?? j?.users ?? j?.data ?? [];
    return (Array.isArray(list) ? list : []) as Employee[];
  });

// ─── Inline Edit Row ──────────────────────────────────────────────────────────
function EditRow({ dept, token, employees, onDone }: {
  dept: Department; token: string; employees: Employee[]; onDone: (u: Department) => void;
}) {
  const [name, setName]           = useState(dept.name);
  const [desc, setDesc]           = useState(dept.description ?? '');
  const [managerId, setManagerId] = useState<number | ''>(dept.manager_id ?? '');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return setErr('Name is required');
    setSaving(true); setErr(null);
    try {
      onDone(await updateDepartment(dept.id, {
        name, description: desc,
        manager_id: managerId ? Number(managerId) : null
      }, token));
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <tr className="bg-indigo-50/60 border-b">
      <td className="px-6 py-3" colSpan={5}>
        <div className="space-y-3">
          {err && <p className="text-xs text-red-600">! {err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="form-input w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className="form-input w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Manager</label>
              <select value={managerId} onChange={e => setManagerId(e.target.value ? Number(e.target.value) : '')} className="form-input w-full text-sm">
                <option value="">No manager</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 btn-gradient">
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDone(dept)}>Cancel</Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Members Modal ────────────────────────────────────────────────────────────
function MembersModal({ dept, token, allEmployees, onClose, onUpdated }: {
  dept: Department; token: string; allEmployees: Employee[];
  onClose: () => void; onUpdated: (dept: Department) => void;
}) {
  // IDs currently in this department
  const [memberIds, setMemberIds] = useState<Set<number>>(
    new Set((dept.members ?? []).map(m => m.id))
  );
  const [saving, setSaving]   = useState<number | null>(null);
  const [search, setSearch]   = useState('');

  const filtered = allEmployees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (emp: Employee) => {
    const isMember = memberIds.has(emp.id);
    const action   = isMember ? 'remove' : 'add';
    setSaving(emp.id);
    try {
      await updateMember(dept.id, emp.id, action, token);
      setMemberIds(prev => {
        const next = new Set(prev);
        isMember ? next.delete(emp.id) : next.add(emp.id);
        return next;
      });
      // build updated dept members list for parent
      const updatedMembers = action === 'add'
        ? [...(dept.members ?? []), { id: emp.id, full_name: emp.full_name, email: emp.email, role: emp.role }]
        : (dept.members ?? []).filter(m => m.id !== emp.id);
      onUpdated({ ...dept, members: updatedMembers });
    } catch (e: any) {
      alert(e?.body?.message ?? e?.message ?? 'Failed');
    } finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Members — {dept.name}
              </CardTitle>
              <CardDescription>
                {memberIds.size} member{memberIds.size !== 1 ? 's' : ''} — click to add/remove
              </CardDescription>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search employees..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>

          {/* Employee list */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 italic">No employees found</p>
            ) : filtered.map(emp => {
              const isMember  = memberIds.has(emp.id);
              const isLoading = saving === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => toggle(emp)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                    isMember
                      ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isMember ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>

                  {/* Role badge */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                    {emp.role}
                  </span>

                  {/* Check / loading */}
                  <div className="flex-shrink-0 w-5">
                    {isLoading ? (
                      <div className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    ) : isMember ? (
                      <Check className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Plus className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ManageDepartments: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [membersTarget, setMembersTarget] = useState<Department | null>(null);

  // create modal
  const [showModal, setShowModal]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newManagerId, setNewManagerId] = useState<number | ''>('');
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  // load departments + employees in parallel
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [depts, emps] = await Promise.all([
        listDepartments(tk()),
        listEmployees(tk()),
      ]);
      setDepartments(depts);
      setEmployees(emps.filter(e => ['employee', 'company_admin'].includes(e.role)));
    } catch (e: any) {
      setError(e?.body?.message ?? e?.message ?? 'Failed to load');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);

const handleDelete = async (id: number, name: string) => {
  setDeletingId(id);
  try {
    await deleteDepartment(id, tk());
    setDepartments(prev => prev.filter(d => d.id !== id));
    
    toast({
      title: "Succès",
      description: `Le département "${name}" a été supprimé.`,
    });
  } catch (e: any) {
    toast({
      title: "Erreur",
      description: e?.body?.message ?? "Impossible de supprimer ce département.",
      variant: "destructive",
    });
  } finally {
    setDeletingId(null);
  }
};

  const handleToggleActive = async (dept: Department) => {
  try {
    const updated = await updateDepartment(dept.id, { is_active: !dept.is_active }, tk());
    setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
    
    toast({
      title: updated.is_active ? "Département activé" : "Département désactivé",
      description: `Le statut de "${dept.name}" a été mis à jour.`,
    });
  } catch (e: any) {
    toast({
      title: "Erreur",
      description: "Échec de la modification du statut.",
      variant: "destructive",
    });
  }
};

  const resetModal = () => { setNewName(''); setNewDesc(''); setNewManagerId(''); setCreateError(null); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) return setCreateError('Name is required');
    setCreating(true);
    try {
      const dept = await createDepartment({
        name:       newName.trim(),
        description: newDesc,
        manager_id: newManagerId ? Number(newManagerId) : undefined,
      }, tk());
      setDepartments(prev => [...prev, dept].sort((a, b) => a.name.localeCompare(b.name)));
      setShowModal(false); resetModal();
    } catch (e: any) {
      setCreateError(e?.body?.message ?? e?.message ?? 'Failed to create');
    } finally { setCreating(false); }
  };

  const applyEdit = (updated: Department) => {
    setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditingId(null);
  };

  const handleMembersUpdated = (updated: Department) => {
    setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
    setMembersTarget(updated);
  };

  // const filtered = departments.filter(d =>
  //   d.name.toLowerCase().includes(search.toLowerCase()) ||
  //   d.description?.toLowerCase().includes(search.toLowerCase())
  // );

  const filtered = React.useMemo(() => {
  return departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );
}, [departments, search]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Departments</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your organization's departments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="btn-gradient" onClick={() => { resetModal(); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Department
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search departments..."
            value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-10" />
        </div>
      </div>

      {/* Content */}
      {loading && departments.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="mt-3 text-muted-foreground">Loading departments...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">!! {error}</p>
            <Button variant="outline" onClick={load} className="mt-3">Retry</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-lg">No departments found</p>
              {search && <Button variant="outline" onClick={() => setSearch('')} className="mt-4">Clear search</Button>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Department</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Manager</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Members</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                    <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(dept =>
                    editingId === dept.id ? (
                      <EditRow key={dept.id} dept={dept} token={tk()} employees={employees} onDone={applyEdit} />
                    ) : (
                      <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        {/* Department */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100">
                              <Building2 className="h-4 w-4 text-indigo-600" />
                            </span>
                            <div>
                              <p className="font-semibold text-foreground">{dept.name}</p>
                              {dept.description && <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Manager */}
                        <td className="px-6 py-4">
                          {dept.manager ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-sm font-medium text-foreground">{dept.manager.full_name}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground italic">No manager</span>}
                        </td>

                        {/* Members */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setMembersTarget(dept)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                          >
                            <Users className="h-3 w-3" />
                            {dept.members?.length ?? 0} member{(dept.members?.length ?? 0) !== 1 ? 's' : ''}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <button onClick={() => handleToggleActive(dept)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              dept.is_active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                            {dept.is_active
                              ? <><ToggleRight className="h-3.5 w-3.5" /> Active</>
                              : <><ToggleLeft  className="h-3.5 w-3.5" /> Inactive</>}
                          </button>
                        </td>

                        {/* Actions */}
                        {/* Actions */}
<td className="px-6 py-4">
  <div className="flex items-center justify-center gap-2">
    {/* Bouton Membres */}
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => setMembersTarget(dept)}
      className="h-9 w-9 p-0 hover:bg-indigo-100 hover:text-indigo-600" 
      title="Manage members"
    >
      <UserPlus className="h-4 w-4" />
    </Button>

    {/* Bouton Editer */}
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => setEditingId(dept.id)}
      className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600" 
      title="Edit"
    >
      <Edit2 className="h-4 w-4" />
    </Button>

    {/* BLOC SUPPRESSION AVEC CONFIRMATION */}
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={deletingId === dept.id}
          className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Supprimer"
        >
          {deletingId === dept.id ? (
            <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va supprimer définitivement le département <strong>{dept.name}</strong>. 
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => handleDelete(dept.id, dept.name)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirmer la suppression
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {departments.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{' '}
          <span className="font-medium text-foreground">{departments.length}</span> departments
        </p>
      )}

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add New Department</CardTitle>
                  <CardDescription>Create a department for your organization</CardDescription>
                </div>
                <button onClick={() => { setShowModal(false); resetModal(); }} className="p-1 rounded hover:bg-muted transition">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                {createError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    !! {createError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Name <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="e.g. Finance, IT, HR..."
                    value={newName} onChange={e => setNewName(e.target.value)}
                    className="form-input w-full" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Description</label>
                  <input type="text" placeholder="Short description..."
                    value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    className="form-input w-full" />
                </div>

                {/* Manager select */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">
                    Manager <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  {employees.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No employees available</p>
                  ) : (
                    <select value={newManagerId}
                      onChange={e => setNewManagerId(e.target.value ? Number(e.target.value) : '')}
                      className="form-input w-full">
                      <option value="">Select a manager...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} — {emp.role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={creating} className="btn-gradient flex-1 gap-2">
                    <Plus className="h-4 w-4" /> {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline"
                    onClick={() => { setShowModal(false); resetModal(); }}
                    disabled={creating} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Members Modal ───────────────────────────────────────────────────── */}
      {membersTarget && (
        <MembersModal
          dept={membersTarget}
          token={tk()}
          allEmployees={employees}
          onClose={() => setMembersTarget(null)}
          onUpdated={handleMembersUpdated}
        />
      )}
    </div>
  );
};

export default ManageDepartments;
