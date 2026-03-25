// src/pages/WorklistPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ListChecks, Search, RefreshCw, UserCheck, Eye,
  Clock, Building2, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const API_BASE = 'http://localhost:5000';

type WorklistTicket = {
  id: number;
  ticket_number: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  worklist_at?: string;
  department?: { id: number; name: string };
  category?:   { id: number; name: string; color?: string };
  creator?:    { id: number; full_name: string; email: string };
  assignee?:   { id: number; full_name: string; email: string } | null;
};

type Employee = { id: number; full_name: string; email: string; role: string };

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error('API error'); e.body = json; e.status = res.status; throw e; }
  return json;
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-blue-100 text-blue-700',
    low:      'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[p] ?? map.medium}`}>
      {p === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ ticket, token, onClose, onAssigned }: {
  ticket: WorklistTicket; token: string;
  onClose: () => void; onAssigned: (updated: WorklistTicket) => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected]   = useState<number | ''>('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/users?role=employee&limit=100', {}, token)
      .then(j => {
        const list = j?.data?.users ?? j?.users ?? j?.data ?? [];
        setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAssign = async () => {
    if (!selected) return setError('Please select an employee');
    setSaving(true); setError(null);
    try {
      const res = await apiFetch(
        `/api/tickets/${ticket.id}/worklist-assign`,
        { method: 'PUT', body: JSON.stringify({ employee_id: selected }) },
        token
      );
      onAssigned(res?.data?.ticket ?? ticket);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.message ?? 'Failed to assign');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Assign Ticket</h2>
            <p className="text-sm text-muted-foreground">{ticket.subject}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition text-muted-foreground">✕</button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">⚠ {error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading employees…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No employees found</p>
        ) : (
          <select
            value={selected}
            onChange={e => setSelected(e.target.value ? Number(e.target.value) : '')}
            className="form-input w-full"
          >
            <option value="">Select an employee…</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} — {emp.email}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-3">
          <Button onClick={handleAssign} disabled={saving || !selected} className="btn-gradient flex-1 gap-2">
            <UserCheck className="h-4 w-4" /> {saving ? 'Assigning…' : 'Assign'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const WorklistPage: React.FC = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [tickets, setTickets]       = useState<WorklistTicket[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [assignTarget, setAssignTarget] = useState<WorklistTicket | null>(null);

  // pagination
  const [page, setPage]   = useState(1);
  const LIMIT = 10;

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const json = await apiFetch('/api/tickets/worklist', {}, tk());
      setTickets(json?.data?.tickets ?? json?.tickets ?? []);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.message ?? 'Failed to load worklist');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const handleAssigned = (updated: WorklistTicket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setAssignTarget(null);
  };

  const filtered = tickets.filter(t =>
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const formatWait = (iso?: string) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ListChecks className="h-8 w-8 text-indigo-500" />
              Worklist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tickets escalated from departments and waiting for assignment
            </p>
          </div>
          <div className="flex items-center gap-3">
            {tickets.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                {tickets.filter(t => !t.assignee).length} unassigned
              </span>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search tickets…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="mt-3 text-muted-foreground">Loading worklist…</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">⚠️ {error}</p>
            <Button variant="outline" onClick={load} className="mt-3">Retry</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-16">
              <ListChecks className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-lg font-medium">Worklist is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'No tickets match your search' : 'All escalated tickets have been handled 🎉'}
              </p>
              {search && <Button variant="outline" onClick={() => setSearch('')} className="mt-4">Clear search</Button>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Ticket</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Subject</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Priority</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Origin Dept</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Waiting</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Assigned To</th>
                      <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(ticket => (
                      <tr
                        key={ticket.id}
                        className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!ticket.assignee ? 'bg-amber-50/40' : ''}`}
                      >
                        {/* Ticket number */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-primary font-medium text-xs">
                            {ticket.ticket_number}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-medium text-foreground line-clamp-1">{ticket.subject}</p>
                          {ticket.creator && (
                            <p className="text-xs text-muted-foreground mt-0.5">by {ticket.creator.full_name}</p>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-4">
                          <PriorityBadge p={ticket.priority} />
                        </td>

                        {/* Department origin */}
                        <td className="px-6 py-4">
                          {ticket.department ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              <Building2 className="h-3 w-3" />
                              {ticket.department.name}
                            </span>
                          ) : <span className="text-xs text-muted-foreground italic">—</span>}
                        </td>

                        {/* Waiting time */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatWait(ticket.worklist_at)}
                          </span>
                        </td>

                        {/* Assigned to */}
                        <td className="px-6 py-4">
                          {ticket.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-sm font-medium">{ticket.assignee.full_name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setAssignTarget(ticket)}
                              className="gap-1.5 text-xs px-3 h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                              title="Assign to employee"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Assign
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(page - 1) * LIMIT + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(page * LIMIT, filtered.length)}</span> of{' '}
              <span className="font-medium text-foreground">{filtered.length}</span> tickets
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <AssignModal
          ticket={assignTarget}
          token={tk()}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
};

export default WorklistPage;
