import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Trash2, Search, ChevronLeft, ChevronRight,
  Plus, Users, X, Eye as EyeIcon, EyeOff, 
  AlertTriangle, Loader2, ArrowUpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listUsers, createEmployee, deleteUser, User } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const TEAMS = ['Support', 'Technique', 'Billing', 'Commercial', 'RH', 'IT'];

const ManageAgents: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);


type Department = {
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

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any)
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error('API error');
    e.body = json;
    e.status = res.status;
    throw e;
  }

  return json;

}
const listDepartments = (token: string) =>
  apiFetch('/api/departments', {}, token).then(j => (j?.data?.departments ?? j?.departments ?? []) as Department[]);


const loadDeps = async () => {
  const tk = token ?? localStorage.getItem('auth_token');
  if (!tk) return;
  setLoadingDeps(true);
  try {
    const data = await listDepartments(tk); // Utilise ta fonction listDepartments
    setDepartments(data);
  } catch (err) {
    console.error("Erreur lors du chargement des départements", err);
  } finally {
    setLoadingDeps(false);
  }
};

useEffect(() => {
  load(); // Ton chargement d'agents existant
  loadDeps(); // Chargement des départements
}, [token]);
  // States pour la liste
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);

  // States pour la suppression
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States pour la création (Modal)
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Charger les agents
  const load = async () => {
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) { setError('Not authenticated'); return; }
    setLoading(true); setError(null);
    try {
      const res = await listUsers({ role: 'employee', page, limit }, tk);
      setAgents(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.body?.message || err?.message || 'Failed to load agents');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, page]);

  // Exécuter la suppression (appelée depuis la modal)
  const executeDelete = async () => {
    if (!agentToDelete) return;
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return;

    setDeletingId(agentToDelete);
    setErrorMsg(null);
    try {
      await deleteUser(agentToDelete, tk);
      setAgents(prev => prev.filter(a => a.id !== agentToDelete));
      if (total !== null) setTotal(total - 1);
      setAgentToDelete(null); // Ferme la modal
    } catch (err: any) {
      setErrorMsg(err?.body?.message || err?.message || 'Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  // Création d'un agent
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) return setCreateError('Full name is required');
    if (!newEmail.trim()) return setCreateError('Email is required');
    if (!newPassword.trim()) return setCreateError('Password is required');
    if (!newTeam) return setCreateError('Team is required');

    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return setCreateError('Not authenticated');
    
    setCreating(true);
    try {
      await createEmployee(
        { full_name: newName.trim(), email: newEmail.trim(), password: newPassword, team: newTeam },
        tk
      );
      setShowModal(false);
      resetModal();
      await load();
    } catch (err: any) {
      setCreateError(err?.body?.message || err?.message || 'Failed to create agent');
    } finally { setCreating(false); }
  };

  const resetModal = () => {
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewTeam('');
    setShowPwd(false); setCreateError(null);
  };

  const filtered = agents.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.team?.toLowerCase().includes(search.toLowerCase())
  );

  // Helpers de rendu
  const getTeamBadge = (team?: string) => (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
      {team ?? '—'}
    </span>
  );

  const getStatusDot = (active?: boolean) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  const getAvailableDot = (available?: boolean) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {available ? 'Available' : 'Unavailable'}
    </span>
  );

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Agents</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérer les membres de votre équipe support</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" onClick={() => { resetModal(); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter un Agent
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou équipe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-input rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-muted-foreground">Chargement des agents...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">⚠️ {error}</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-lg">Aucun agent trouvé</p>
              <Button variant="outline" onClick={() => { setSearch(''); setPage(1); }} className="mt-4">Effacer la recherche</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-4 text-left font-semibold">Agent</th>
                      <th className="px-6 py-4 text-left font-semibold">Département</th>
                      <th className="px-6 py-4 text-left font-semibold">Statut</th>
                      <th className="px-6 py-4 text-left font-semibold">Dispo</th>
                      <th className="px-6 py-4 text-left font-semibold">Arrivée</th>
                      <th className="px-6 py-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(agent => (
                      <tr
                        key={agent.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4" onClick={() => navigate(`/admin/agents/${agent.id}`)}>
                          <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                              {agent.full_name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">{agent.full_name}</p>
                              <p className="text-[11px] text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getTeamBadge(agent.team)}</td>
                        <td className="px-6 py-4">{getStatusDot(agent.is_active)}</td>
                        <td className="px-6 py-4">{getAvailableDot(agent.is_available)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{formatDate(agent.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => navigate(`/admin/agents/${agent.id}`)}
                              className="h-8 w-8 p-0 hover:text-indigo-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setAgentToDelete(agent.id)}
                              className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-xs text-muted-foreground">
               Total: <span className="font-bold text-foreground">{total ?? 0}</span> agents
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={total !== null && page * limit >= total}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* MODAL DE SUPPRESSION (OPTIMISÉE) */}
      {agentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Supprimer cet agent ?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Cette action est irréversible. L'accès de l'agent à la plateforme sera immédiatement révoqué.
              </p>
              {errorMsg && <p className="mt-3 text-xs text-red-500 font-medium bg-red-50 p-2 rounded w-full">{errorMsg}</p>}
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                className="flex-1 px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50 transition-colors"
                onClick={() => { setAgentToDelete(null); setErrorMsg(null); }}
                disabled={!!deletingId}
              >
                Annuler
              </button>
              <button 
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                onClick={executeDelete}
                disabled={!!deletingId}
              >
                {deletingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Oui, Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-border animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Nouvel Agent</CardTitle>
                  <CardDescription>Ajouter un nouveau membre à votre équipe</CardDescription>
                </div>
                <button onClick={() => { setShowModal(false); resetModal(); }} className="p-1 rounded hover:bg-muted transition">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                {createError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
                    <AlertTriangle className="h-4 w-4" /> {createError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Nom Complet</label>
                  <input type="text" placeholder="ex: Karim Ben Ali" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Email Professionnel</label>
                  <input type="email" placeholder="agent@cabinet.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all" required />
                </div>

                <div className="space-y-1.5">
  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
    Équipe / Département
  </label>
  <select 
    value={newTeam} 
    onChange={e => setNewTeam(e.target.value)} 
    className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all" 
    required
    disabled={loadingDeps} // Désactivé pendant le chargement
  >
    <option value="">
      {loadingDeps ? 'Chargement...' : 'Choisir un département...'}
    </option>
    
    {/* On boucle dynamiquement sur les départements reçus de l'API */}
    {departments.map((dept) => (
      <option key={dept.id} value={dept.name}>
        {dept.name}
      </option>
    ))}
  </select>
</div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="6 caractères min."
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-primary outline-none transition-all pr-10"
                      required minLength={6}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={creating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {creating ? 'Création...' : 'Créer l\'Agent'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1">
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageAgents;