// src/pages/TicketsTreeView.tsx
// Vue Tree : liste de tickets avec actions workflow inline (sans ouvrir la fiche)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  RefreshCw, Search, Play, ArrowRight, ArrowLeft,
  PauseCircle, RotateCcw, StopCircle, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Ticket = {
  id: number; ticket_number?: string; subject: string;
  status: string; priority: string;
  category?: { name: string; color?: string };
  department?: { name: string };
  assignee?: { full_name: string };
  workflow_step?: string; in_worklist?: boolean;
  started_at?: string; duration_minutes?: number;
};

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'Error'); e.body = json; throw e; }
  return json;
}

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  suspended:   'bg-orange-100 text-orange-700',
  resolved:    'bg-emerald-100 text-emerald-700',
  closed:      'bg-slate-100 text-slate-600',
};
const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-blue-100 text-blue-700',
  low:      'bg-green-100 text-green-700',
};

// Boutons d'action disponibles selon statut
function getActions(status: string, hasWf: boolean) {
  if (!hasWf)                      return ['start'];
  if (status === 'open')           return ['start'];
  if (status === 'in_progress')    return ['forward', 'backward', 'suspend', 'stop'];
  if (status === 'suspended')      return ['resume'];
  return [];
}

const ACTION_CFG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  start:    { icon: <Play className="h-3 w-3" />,          label: 'Démarrer',  color: 'text-indigo-600 hover:bg-indigo-100' },
  forward:  { icon: <ArrowRight className="h-3 w-3" />,    label: 'Suivant',   color: 'text-emerald-600 hover:bg-emerald-100' },
  backward: { icon: <ArrowLeft className="h-3 w-3" />,     label: 'Précédent', color: 'text-amber-600 hover:bg-amber-100' },
  suspend:  { icon: <PauseCircle className="h-3 w-3" />,   label: 'Suspendre', color: 'text-orange-600 hover:bg-orange-100' },
  resume:   { icon: <RotateCcw className="h-3 w-3" />,     label: 'Reprendre', color: 'text-blue-600 hover:bg-blue-100' },
  stop:     { icon: <StopCircle className="h-3 w-3" />,    label: 'Arrêter',   color: 'text-red-600 hover:bg-red-100' },
};

// ─── Inline Comment Popup ─────────────────────────────────────────────────────
function CommentPopup({ onConfirm, onCancel }: { onConfirm: (c: string) => void; onCancel: () => void }) {
  const [c, setC] = useState('');
  return (
    <div className="absolute z-20 right-0 top-8 w-64 bg-white border rounded-lg shadow-xl p-3 space-y-2">
      <p className="text-xs font-semibold">Raison du retour (obligatoire)</p>
      <textarea value={c} onChange={e => setC(e.target.value)} rows={2} className="form-input w-full text-xs resize-none" placeholder="Expliquez..." />
      <div className="flex gap-2">
        <button onClick={() => c.trim() && onConfirm(c)} className="text-xs px-2 py-1 rounded bg-amber-600 text-white flex-1">Confirmer</button>
        <button onClick={onCancel} className="text-xs px-2 py-1 rounded border flex-1">Annuler</button>
      </div>
    </div>
  );
}

// ─── Action Cell ──────────────────────────────────────────────────────────────
function ActionCell({ ticket, token, onUpdate }: { ticket: Ticket; token: string; onUpdate: (id: number, status: string) => void }) {
  const [acting, setActing]           = useState(false);
  const [showComment, setShowComment] = useState(false);

  const doAction = async (action: string, comment?: string) => {
    setActing(true);
    try {
      const methodMap: Record<string, string> = { start: 'POST', forward: 'PUT', backward: 'PUT', suspend: 'PUT', resume: 'PUT', stop: 'PUT' };
      const body = comment ? { comment } : {};
      const res = await apiFetch(`/api/tickets/${ticket.id}/workflow/${action}`, { method: methodMap[action], body: JSON.stringify(body) }, token);
      const newStatus =
        action === 'stop'    ? 'resolved'    :
        action === 'suspend' ? 'suspended'   :
        action === 'resume'  ? 'in_progress' :
        res?.data?.completed ? 'resolved'    : 'in_progress';
      onUpdate(ticket.id, newStatus);
    } catch (e: any) { alert(e?.body?.message ?? e?.message); }
    finally { setActing(false); setShowComment(false); }
  };

  const actions = getActions(ticket.status, !!ticket.workflow_step);

  return (
    <div className="relative flex items-center gap-1">
      {actions.map(action => (
        <button key={action} disabled={acting} title={ACTION_CFG[action].label}
          onClick={() => action === 'backward' ? setShowComment(true) : doAction(action)}
          className={`p-1.5 rounded transition-colors ${ACTION_CFG[action].color} disabled:opacity-40`}>
          {acting ? <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> : ACTION_CFG[action].icon}
        </button>
      ))}
      {showComment && (
        <CommentPopup
          onConfirm={c => doAction('backward', c)}
          onCancel={() => setShowComment(false)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TicketsTreeView: React.FC = () => {
  const { token, user } = useAuth();
  const navigate        = useNavigate();

  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const LIMIT = 15;

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) qs.append('status', statusFilter);
      if (search)       qs.append('search', search);
      const json = await apiFetch(`/api/tickets?${qs}`, {}, tk());
      setTickets(json?.data?.tickets ?? []);
      setTotal(json?.data?.pagination?.total ?? 0);
    } catch (e: any) { setError(e?.message ?? 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token, page, statusFilter]);

  const handleUpdate = (id: number, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const filtered = search
    ? tickets.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  const isStaff = ['super_admin', 'company_admin', 'employee'].includes(user?.role ?? '');
  const getTicketNumber = (id: number) => `TKT-${String(id).padStart(3, '0')}`;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets — Vue Liste</h1>
          <p className="text-sm text-muted-foreground mt-1">Traitement rapide avec actions workflow inline</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-10 w-full" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">Tous statuts</option>
          <option value="open">Open</option>
          <option value="in_progress">En cours</option>
          <option value="suspended">Suspendu</option>
          <option value="resolved">Résolu</option>
          <option value="closed">Fermé</option>
        </select>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gradient-to-r from-muted/50 to-muted/30 text-xs">
                  <th className="px-4 py-3 text-left font-semibold">Ticket</th>
                  <th className="px-4 py-3 text-left font-semibold">Sujet</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold">Priorité</th>
                  <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold">Assigné</th>
                  {isStaff && <th className="px-4 py-3 text-left font-semibold">Actions WF</th>}
                  <th className="px-4 py-3 text-center font-semibold">Voir</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Aucun ticket</td></tr>
                ) : filtered.map(ticket => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    {/* <td className="px-4 py-3">
                      <span className="font-mono text-primary text-xs font-medium">
                        {ticket.ticket_number ?? `TKT-${String(ticket.id).padStart(3, '0')}`}
                      </span>
                    </td> */}
                    <td className="px-6 py-4">
                          <span className="font-mono text-primary font-medium">
                            {getTicketNumber(ticket.id)}
                          </span>
                        </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      {ticket.department && <p className="text-xs text-muted-foreground">{ticket.department.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLE[ticket.priority] ?? 'bg-slate-100'}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {ticket.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {ticket.assignee?.full_name ?? <span className="text-muted-foreground italic">Non assigné</span>}
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 relative">
                        <ActionCell ticket={ticket} token={tk()} onUpdate={handleUpdate} />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="p-1.5 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total} ticket{total !== 1 ? 's' : ''} au total
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Préc
          </Button>
          <span className="flex items-center px-3 text-xs">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total} className="gap-1">
            Suiv <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketsTreeView;
