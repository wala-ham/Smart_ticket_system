// src/components/TicketWorkflow.tsx
// Embed dans TicketDetails.tsx : <TicketWorkflow ticketId={ticket.id} token={tk()} userRole={user?.role} />
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Play, CheckCircle, Clock, User } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type HistoryEntry = {
  id: number; step_number: number; step_label?: string;
  action: string; acted_at: string; comment?: string;
  actor?: { full_name: string }; assignee?: { full_name: string };
};
type WorkflowState = {
  id: number; current_step: number; status: string; context: string;
  template?: { name: string; steps: { step_order: number; label: string; assignment_type: string }[] };
};

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'Error'); e.body = json; throw e; }
  return json;
}

export const TicketWorkflow: React.FC<{ ticketId: number; token: string; userRole?: string }> = ({ ticketId, token, userRole }) => {
  const [state, setState]     = useState<WorkflowState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [msg, setMsg]         = useState<string | null>(null);

  const isStaff = ['super_admin', 'company_admin', 'employee'].includes(userRole ?? '');

  const load = async () => {
    setLoading(true);
    try {
      const json = await api(`/api/tickets/${ticketId}/workflow/state`, {}, token);
      setState(json?.data?.state ?? null);
      setHistory(json?.data?.history ?? []);
    } catch { setState(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [ticketId]);

  const startWorkflow = async () => {
    setActing(true); setErr(null);
    try {
      await api(`/api/tickets/${ticketId}/workflow/start`, { method: 'POST', body: JSON.stringify({ context: 'supplier' }) }, token);
      setMsg('Workflow started!'); await load();
    } catch (e: any) { setErr(e?.body?.message ?? e?.message); }
    finally { setActing(false); }
  };

  const forward = async () => {
    setActing(true); setErr(null);
    try {
      const res = await api(`/api/tickets/${ticketId}/workflow/forward`, { method: 'PUT', body: JSON.stringify({ comment }) }, token);
      setMsg(res?.data?.completed ? 'Workflow completed — ticket resolved!' : 'Moved to next step');
      setComment(''); await load();
    } catch (e: any) { setErr(e?.body?.message ?? e?.message); }
    finally { setActing(false); }
  };

  const backward = async () => {
    if (!comment.trim()) return setErr('Comment required to go backward');
    setActing(true); setErr(null);
    try {
      await api(`/api/tickets/${ticketId}/workflow/backward`, { method: 'PUT', body: JSON.stringify({ comment }) }, token);
      setMsg('Sent back to previous step'); setComment(''); setShowComment(false); await load();
    } catch (e: any) { setErr(e?.body?.message ?? e?.message); }
    finally { setActing(false); }
  };

  const steps = state?.template?.steps ?? [];

  if (loading) return (
    <div className="card-gradient p-6 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground animate-pulse">Loading workflow...</p>
    </div>
  );

  return (
    <div className="card-gradient p-6 rounded-lg border border-border space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Play className="h-4 w-4 text-indigo-500" />
        Workflow
        {state && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{state.template?.name}</span>}
      </h3>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{err}</p>}
      {msg && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">{msg}</p>}

      {!state ? (
        // No workflow active
        isStaff ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">No workflow running on this ticket.</p>
            <Button onClick={startWorkflow} disabled={acting} size="sm" className="btn-gradient gap-2">
              <Play className="h-3.5 w-3.5" /> {acting ? 'Starting...' : 'Start Workflow'}
            </Button>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">No active workflow.</p>
      ) : (
        <>
          {/* Progress bar */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Step {state.current_step} of {steps.length}</span>
                <span className={state.status === 'completed' ? 'text-emerald-600 font-semibold' : ''}>{state.status}</span>
              </div>
              <div className="flex gap-1">
                {steps.map(s => (
                  <div key={s.step_order} className={`flex-1 h-2 rounded-full transition-all ${
                    s.step_order < state.current_step  ? 'bg-emerald-400' :
                    s.step_order === state.current_step ? 'bg-indigo-500' : 'bg-muted'
                  }`} title={s.label} />
                ))}
              </div>
              {/* Current step label */}
              {steps.find(s => s.step_order === state.current_step) && (
                <p className="text-xs font-medium text-indigo-700">
                  Current: {steps.find(s => s.step_order === state.current_step)?.label}
                  {steps.find(s => s.step_order === state.current_step)?.assignment_type === 'AND' &&
                    <span className="ml-1 text-amber-600">(AND — all notified)</span>}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {state.status === 'active' && isStaff && (
            <div className="space-y-2">
              {showComment && (
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Comment (required for backward)..." rows={2}
                  className="form-input w-full text-sm resize-none" />
              )}
              <div className="flex gap-2">
                <Button onClick={forward} disabled={acting} size="sm" className="btn-gradient flex-1 gap-1">
                  <ArrowRight className="h-3.5 w-3.5" /> {acting ? '...' : 'Traiter'}
                </Button>
                {state.current_step > 1 && (
                  <Button onClick={() => showComment ? backward() : setShowComment(true)}
                    disabled={acting} size="sm" variant="outline" className="flex-1 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <ArrowLeft className="h-3.5 w-3.5" /> {showComment ? 'Confirm Reculer' : 'Reculer'}
                  </Button>
                )}
                {showComment && (
                  <Button size="sm" variant="ghost" onClick={() => { setShowComment(false); setComment(''); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {state.status === 'completed' && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Workflow completed
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-xs py-1">
                    <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold ${
                      h.action === 'forward'   ? 'bg-emerald-100 text-emerald-700' :
                      h.action === 'backward'  ? 'bg-amber-100 text-amber-700'    :
                      h.action === 'completed' ? 'bg-blue-100 text-blue-700'      :
                      'bg-slate-100 text-slate-600'
                    }`}>{h.action}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Step {h.step_number}</span>
                      {h.step_label && <span className="text-foreground ml-1">— {h.step_label}</span>}
                      {h.actor && <span className="ml-1 flex items-center gap-0.5 inline-flex"><User className="h-2.5 w-2.5" />{h.actor.full_name}</span>}
                      {h.comment && <p className="text-muted-foreground italic mt-0.5 truncate">{h.comment}</p>}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(h.acted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TicketWorkflow;
