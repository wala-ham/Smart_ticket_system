import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser, updateUser, getEmployeeStats, User, EmployeeStats } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft, Edit2, Save, X, AlertCircle, CheckCircle,
  Mail, Users, Calendar, Shield, Ticket, CheckSquare, Clock, BarChart2
} from 'lucide-react';

const TEAMS = ['Support', 'Technique', 'Billing', 'Commercial', 'RH', 'IT'];

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<User | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsAvailable, setEditIsAvailable] = useState(true);

  const API_BASE = 'http://localhost:5000';
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
  // 1. Nouvel état pour stocker les départements de l'API
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  
  // 2. Fonction pour appeler ton API
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
  
  // 3. Charger les départements au montage du composant
  useEffect(() => {
    loadDeps(); // Chargement des départements
  }, [token]);
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
  
  


  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const tk = token ?? localStorage.getItem('auth_token');
      if (!tk) { setError('Not authenticated'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const [userData, statsData] = await Promise.allSettled([
          getUser(id, tk),
          getEmployeeStats(id, tk),
        ]);
        if (userData.status === 'fulfilled') {
          const u = userData.value;
          setAgent(u);
          setEditName(u.full_name ?? '');
          setEditEmail(u.email ?? '');
          setEditTeam(u.team ?? '');
          setEditIsActive(u.is_active ?? true);
          setEditIsAvailable(u.is_available ?? true);
        } else throw userData.reason;
        if (statsData.status === 'fulfilled') setStats(statsData.value);
      } catch (err: any) {
        setError(err?.body?.message || err?.message || 'Failed to load agent');
      } finally { setLoading(false); }
    };
    load();
  }, [id, token]);

  const handleSave = async () => {
    if (!id || !agent) return;
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const updated = await updateUser(id, {
        full_name: editName.trim(),
        email: editEmail.trim(),
        team: editTeam,
        is_active: editIsActive,
        is_available: editIsAvailable,
      }, tk);
      setAgent({ ...agent, ...updated });
      setSaveSuccess(true); setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.body?.message || err?.message || 'Failed to update agent');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (agent) {
      setEditName(agent.full_name ?? '');
      setEditEmail(agent.email ?? '');
      setEditTeam(agent.team ?? '');
      setEditIsActive(agent.is_active ?? true);
      setEditIsAvailable(agent.is_available ?? true);
    }
    setSaveError(null); setEditing(false);
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="mt-3 text-muted-foreground">Loading agent...</p>
      </div>
    </div>
  );

  if (error || !agent) return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error ?? 'Agent not found'}</p>
          <Button variant="outline" onClick={() => navigate('/admin/agents')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Agents
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate('/admin/agents')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to Agents
            </button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {agent.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{agent.full_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {agent.team ?? 'No team'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Banners */}
        {saveSuccess && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Agent updated successfully!</p>
              </div>
            </CardContent>
          </Card>
        )}
        {saveError && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{saveError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Assigned', value: stats.total_assigned ?? '128', icon: Ticket, color: 'text-blue-600 bg-blue-100' },
              { label: 'Open', value: stats.open_tickets ?? '31', icon: BarChart2, color: 'text-amber-600 bg-amber-100' },
              { label: 'Resolved', value: stats.resolved_tickets ?? '97', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-100' },
              { label: 'Avg. Time', value: stats.avg_resolution_time ?? '2.8h', icon: Clock, color: 'text-purple-600 bg-purple-100' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Agent Details
            </CardTitle>
            {editing && <CardDescription>Edit fields below then click Save</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Full Name */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Full Name</p>
                {editing
                  ? <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="form-input w-full" />
                  : <p className="text-foreground font-medium">{agent.full_name}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                {editing
                  ? <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="form-input w-full" />
                  : <p className="text-foreground font-medium">{agent.email}</p>}
              </div>
            </div>

            {/* Team */}
            {/* <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Team</p>
                {editing ? (
                  <select value={editTeam} onChange={e => setEditTeam(e.target.value)} className="form-input w-full">
                    <option value="">Select team...</option>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {agent.team ?? '—'}
                  </span>
                )}
              </div>
            </div> */}
            <div className="flex items-start gap-4">
  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
    <Shield className="h-4 w-4 text-muted-foreground" />
  </div>
  <div className="flex-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Team</p>
    {editing ? (
      <select 
        value={editTeam} 
        onChange={e => setEditTeam(e.target.value)} 
        className="form-input w-full bg-background border rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        disabled={loadingDeps}
      >
        <option value="">
          {loadingDeps ? 'Chargement...' : 'Sélectionner une équipe...'}
        </option>
        {/* On mappe sur les départements de l'API au lieu de TEAMS */}
        {departments.map(dept => (
          <option key={dept.id} value={dept.name}>
            {dept.name}
          </option>
        ))}
      </select>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
        {agent.team ?? '—'}
      </span>
    )}
  </div>
</div>

            {/* Status toggle */}
            {editing && (
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <div onClick={() => setEditIsActive(v => !v)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${editIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${editIsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium">{editIsActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>
            )}
            {/* Availability toggle */}
            {editing && (
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Availabality</p>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <div onClick={() => setEditIsAvailable(v => !v)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${editIsAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${editIsAvailable ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium">{editIsAvailable ? 'Available' : 'Unavailable'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Joined</p>
                  <p className="text-sm text-foreground">{formatDate(agent.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm text-foreground">{formatDate(agent.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDetail;
