// src/components/TicketWorkflow.tsx
// Support circuit supplier + client avec escalade et statistiques
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, ArrowRight, ArrowLeft, PauseCircle, RotateCcw, StopCircle,
  CheckCircle, Clock, User, Receipt, Truck, Building2, AlertTriangle,
  Loader2, BarChart2, ChevronDown, ChevronUp,
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Step = { step_order: number; label: string; assignment_type: string };
type WFState = {
  id: number; current_step: number; status: string; context: string;
  escalated_from_state_id?: number | null; escalated_at?: string | null;
  template?: { id: number; name: string; steps: Step[] };
};
type HistEntry = {
  id: number; step_number: number; step_label?: string; action: string;
  acted_at: string; comment?: string; step_duration_minutes?: number;
  actor?: { full_name: string }; assignee?: { full_name: string };
  template_id?: number;
};
type WorkflowStats = {
  supplier_duration_minutes: number; client_duration_minutes: number;
  total_duration_minutes: number; escalated: boolean; contexts: string[];
};
type Billing = { id: number; amount: number; currency: string; status: string; duration_minutes: number; hourly_rate: number };

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'Error'); e.body = json; throw e; }
  return json;
}

function getAvailableActions(ticketStatus: string, wfStatus: string, context: string) {
  if (!wfStatus) return ['start_supplier'];
  if (wfStatus === 'completed') return ['billing'];
  if (wfStatus === 'escalated') return ['start_client_done']; // état intermédiaire
  if (ticketStatus === 'suspended') return ['resumed'];
  if (ticketStatus === 'in_progress') {
    const base = ['forward', 'backward', 'suspended', 'stopped'];
    // Le fournisseur peut escalader vers le client
    if (context === 'supplier') base.push('escalate_to_client');
    return base;
  }
  if (ticketStatus === 'open') return ['start_supplier'];
  return [];
}

const contextBadge = (ctx: string) =>
  ctx === 'supplier'
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold"><Truck className="h-3 w-3" />Fournisseur</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold"><Building2 className="h-3 w-3" />Client</span>;

export const TicketWorkflow: React.FC<{
  ticketId: number; token: string; userRole?: string;
  ticketStatus?: string; onStatusChange?: (s: string) => void;
}> = ({ ticketId, token, userRole, ticketStatus = 'open', onStatusChange }) => {

  const [state, setState]       = useState<WFState | null>(null);
  const [allStates, setAllStates] = useState<WFState[]>([]);
  const [history, setHistory]   = useState<HistEntry[]>([]);
  const [stats, setStats]       = useState<WorkflowStats | null>(null);
  const [billing, setBilling]   = useState<Billing | null>(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [comment, setComment]   = useState('');
  const [showComment, setShowComment] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showBilling, setShowBilling]     = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateComment, setEscalateComment]     = useState('');
  const [hourlyRate, setHourlyRate] = useState('100');
  const [err, setErr]   = useState<string | null>(null);
  const [msg, setMsg]   = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const isStaff = ['super_admin', 'company_admin', 'employee'].includes(userRole ?? '');
  const isAdmin = ['super_admin', 'company_admin'].includes(userRole ?? '');

  const load = async () => {
    setLoading(true);
    try {
      const json  = await api(`/api/tickets/${ticketId}/workflow/state`, {}, token);
      const fetchedState  = json?.data?.state   ?? null;
      const fetchedStates = json?.data?.states  ?? [];
      const fetchedStats  = json?.data?.stats   ?? null;
      setState(fetchedState);
      setAllStates(fetchedStates);
      setHistory(json?.data?.history ?? []);
      setStats(fetchedStats);

      const wfStatus = fetchedState?.status ?? '';
      if (wfStatus === 'completed' && isAdmin) {
        try {
          const bj = await api(`/api/tickets/${ticketId}/billing`, {}, token);
          setBilling(bj?.data?.billing ?? null);
        } catch { setBilling(null); }
      } else { setBilling(null); }
    } catch { setState(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [ticketId]);

  const call = async (action: string, body: object = {}) => {
    setActing(true); setErr(null); setMsg(null);
    try {
      const isPost    = ['start_supplier', 'start_client'].includes(action);
      const method    = isPost ? 'POST' : 'PUT';
      let endpoint    = `/api/tickets/${ticketId}/workflow/`;

      if      (action === 'start_supplier') endpoint += 'start';
      else if (action === 'start_client')   endpoint += 'start';
      else                                  endpoint += action;

      const res = await api(endpoint, { method, body: JSON.stringify(body) }, token);

      const newStatus = res?.data?.status || (
        ['start_supplier', 'start_client'].includes(action) ? 'in_progress' : undefined
      );
      if (newStatus && onStatusChange) onStatusChange(newStatus);
      await load();
      if (res?.data?.completed) setMsg('✅ Workflow terminé — ticket résolu !');
      else if (action === 'suspended') setMsg('Ticket suspendu');
      else if (action === 'resumed')   setMsg('Traitement repris');
      else setMsg('Action effectuée');
      setComment(''); setShowComment(false); setPendingAction(null);
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
    finally { setActing(false); }
  };

  const handleEscalate = async () => {
    setActing(true); setErr(null);
    try {
      const res = await api(`/api/tickets/${ticketId}/workflow/escalate-to-client`, {
        method: 'POST',
        body: JSON.stringify({ comment: escalateComment }),
      }, token);
      setShowEscalateModal(false);
      setEscalateComment('');
      if (onStatusChange) onStatusChange('in_progress');
      await load();
      setMsg(`⚡ Escalade effectuée — Circuit client "${res?.data?.client_template_name}" démarré`);
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
    finally { setActing(false); }
  };

  const handleBilling = async () => {
    setActing(true); setErr(null);
    try {
      const res = await api(`/api/tickets/${ticketId}/billing`, {
        method: 'POST',
        body: JSON.stringify({ hourly_rate: parseFloat(hourlyRate) }),
      }, token);
      setBilling(res?.data?.billing);
      setShowBilling(false);
      setMsg(`Facture créée — ${res?.data?.billing?.amount} ${res?.data?.billing?.currency}`);
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
    finally { setActing(false); }
  };

  const steps    = state?.template?.steps ?? [];
  const wfStatus = state?.status ?? '';
  const context  = state?.context ?? 'supplier';
  const actions  = isStaff ? getAvailableActions(ticketStatus, wfStatus, context) : [];

  const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    start_supplier:   { label: 'Démarrer (fournisseur)', icon: <Play className="h-3.5 w-3.5" />,         color: 'bg-orange-600 hover:bg-orange-700 text-white' },
    forward:          { label: 'Suivant',                 icon: <ArrowRight className="h-3.5 w-3.5" />,   color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    backward:         { label: 'Précédent',               icon: <ArrowLeft className="h-3.5 w-3.5" />,    color: 'border border-amber-400 text-amber-700 hover:bg-amber-50' },
    suspended:        { label: 'Suspendre',               icon: <PauseCircle className="h-3.5 w-3.5" />,  color: 'border border-orange-400 text-orange-700 hover:bg-orange-50' },
    resumed:          { label: 'Reprendre',               icon: <RotateCcw className="h-3.5 w-3.5" />,    color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    stopped:          { label: 'Arrêter',                 icon: <StopCircle className="h-3.5 w-3.5" />,   color: 'border border-red-400 text-red-700 hover:bg-red-50' },
    escalate_to_client: { label: 'Escalader → Client',   icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
    billing:          { label: 'Facturer',                icon: <Receipt className="h-3.5 w-3.5" />,      color: 'bg-purple-600 hover:bg-purple-700 text-white' },
  };

  if (loading) return (
    <div className="card-gradient p-6 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground animate-pulse">Chargement workflow...</p>
    </div>
  );

  const isEscalated = stats?.escalated;
  const supplierState = allStates.find(s => s.context === 'supplier');
  const clientState   = allStates.find(s => s.context === 'client');

  return (
    <div className="space-y-3">
      {/* ── Bloc circuit actif ── */}
      <div className="card-gradient p-5 rounded-lg border border-border space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-sm">Workflow</span>
            {state && contextBadge(context)}
            {state && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{state.template?.name}</span>}
          </div>
          {state && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              wfStatus === 'completed'   ? 'bg-emerald-100 text-emerald-700' :
              wfStatus === 'escalated'   ? 'bg-amber-100 text-amber-700'    :
              ticketStatus === 'suspended' ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {ticketStatus === 'suspended' ? 'Suspendu' :
               wfStatus === 'completed' ? 'Terminé' :
               wfStatus === 'escalated' ? 'Escaladé' : 'En cours'}
            </span>
          )}
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{err}</p>}
        {msg && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">{msg}</p>}

        {/* Indicateur d'escalade */}
        {isEscalated && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Ce ticket a été <strong>escaladé</strong> depuis le circuit fournisseur vers le circuit client.</span>
          </div>
        )}

        {/* Progress bar */}
        {steps.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {steps.map(s => (
                <div key={s.step_order} title={s.label}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    s.step_order < (state?.current_step ?? 0)  ? (context === 'supplier' ? 'bg-orange-400' : 'bg-teal-400') :
                    s.step_order === (state?.current_step ?? 0) ? 'bg-indigo-500 animate-pulse' :
                    'bg-muted'
                  }`} />
              ))}
            </div>
            <p className="text-xs text-indigo-700 font-medium">
              Étape {state?.current_step} / {steps.length} — {steps.find(s => s.step_order === state?.current_step)?.label}
            </p>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {showComment && (
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Raison du retour (obligatoire)..." rows={2}
                className="form-input w-full text-sm resize-none" />
            )}

            <div className="flex flex-wrap gap-2">
              {actions.filter(a => a !== 'billing' && a !== 'escalate_to_client').map(action => {
                const cfg = actionConfig[action];
                if (!cfg) return null;
                const needsComment = action === 'backward';
                const isStart = action === 'start_supplier';
                return (
                  <button key={action} disabled={acting}
                    onClick={() => {
                      if (needsComment && !showComment) { setShowComment(true); setPendingAction(action); return; }
                      if (needsComment && !comment.trim()) { setErr('Commentaire obligatoire'); return; }
                      if (isStart) {
                        call('start_supplier', { context: 'supplier' });
                      } else {
                        call(action, comment ? { comment } : {});
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.color} disabled:opacity-50`}>
                    {acting ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : cfg.icon}
                    {showComment && needsComment ? `Confirmer ${cfg.label}` : cfg.label}
                  </button>
                );
              })}

              {/* Bouton escalade */}
              {actions.includes('escalate_to_client') && (
                <button disabled={acting}
                  onClick={() => setShowEscalateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalader → Client
                </button>
              )}

              {showComment && (
                <button onClick={() => { setShowComment(false); setComment(''); setPendingAction(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2">
                  Annuler
                </button>
              )}
            </div>

            {/* Facturation */}
            {actions.includes('billing') && isAdmin && (
              <div className="pt-1">
                {billing ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-purple-800 flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Facture créée</p>
                    <p className="text-xs text-purple-700">{billing.amount} {billing.currency} — {billing.duration_minutes} min @ {billing.hourly_rate}/h</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${billing.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{billing.status}</span>
                  </div>
                ) : showBilling ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-purple-800">Créer une facture</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-purple-700 whitespace-nowrap">Taux horaire :</label>
                      <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                        className="form-input text-xs w-24 py-1" min="0" step="0.5" />
                      <span className="text-xs text-purple-600">TND/h</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleBilling} disabled={acting}
                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                        Confirmer
                      </button>
                      <button onClick={() => setShowBilling(false)} className="text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowBilling(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white">
                    <Receipt className="h-3.5 w-3.5" /> Facturer ce ticket
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {wfStatus === 'completed' && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Workflow terminé
          </div>
        )}
      </div>

      {/* ── Statistiques circuits ── */}
      {stats && (stats.supplier_duration_minutes > 0 || stats.client_duration_minutes > 0) && (
        <div className="card-gradient rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setShowStats(v => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
              Statistiques des circuits
            </div>
            {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showStats && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                  <Truck className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                  <p className="text-xs text-orange-700 font-medium">Fournisseur</p>
                  <p className="text-lg font-bold text-orange-800">{stats.supplier_duration_minutes} <span className="text-xs font-normal">min</span></p>
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-center">
                  <Building2 className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-teal-700 font-medium">Client</p>
                  <p className="text-lg font-bold text-teal-800">{stats.client_duration_minutes} <span className="text-xs font-normal">min</span></p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">
                  <Clock className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                  <p className="text-xs text-indigo-700 font-medium">Total</p>
                  <p className="text-lg font-bold text-indigo-800">{stats.total_duration_minutes} <span className="text-xs font-normal">min</span></p>
                </div>
              </div>
              {/* Barre de répartition */}
              {stats.total_duration_minutes > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Répartition du temps</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    <div
                      className="bg-orange-400 transition-all duration-500"
                      style={{ width: `${Math.round(stats.supplier_duration_minutes / stats.total_duration_minutes * 100)}%` }} />
                    <div
                      className="bg-teal-400 transition-all duration-500"
                      style={{ width: `${Math.round(stats.client_duration_minutes / stats.total_duration_minutes * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>Fournisseur {stats.total_duration_minutes > 0 ? Math.round(stats.supplier_duration_minutes / stats.total_duration_minutes * 100) : 0}%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>Client {stats.total_duration_minutes > 0 ? Math.round(stats.client_duration_minutes / stats.total_duration_minutes * 100) : 0}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div className="card-gradient p-4 rounded-lg border border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historique complet</p>

          {/* Séparation par contexte */}
          {allStates.map((st, si) => {
            const stHistory = history.filter(h => {
              const matchingState = allStates.find(s => s.template?.id=== h.template_id);
              return matchingState?.id === st.id || allStates.findIndex(s => s.template?.id === h.template_id) === si;
            });
            if (!stHistory.length) return null;

            return (
              <div key={st.id} className="space-y-1">
                <div className={`flex items-center gap-2 text-xs font-semibold py-1 ${si > 0 ? 'border-t border-dashed border-muted pt-2 mt-2' : ''}`}>
                  {contextBadge(st.context)}
                  <span className="text-muted-foreground">{st.template?.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${st.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : st.status === 'escalated' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {st.status}
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {stHistory.map(h => (
                    <div key={h.id} className="flex items-start gap-2 text-xs py-1 border-b border-muted/30 last:border-0">
                      <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold min-w-[60px] text-center ${
                        h.action === 'forward'    ? 'bg-emerald-100 text-emerald-700' :
                        h.action === 'backward'   ? 'bg-amber-100 text-amber-700'    :
                        h.action === 'completed'  ? 'bg-blue-100 text-blue-700'      :
                        h.action === 'suspended'  ? 'bg-orange-100 text-orange-700'  :
                        h.action === 'resumed'    ? 'bg-cyan-100 text-cyan-700'      :
                        h.action === 'stopped'    ? 'bg-red-100 text-red-700'        :
                        h.action === 'escalated'  ? 'bg-amber-200 text-amber-800'    :
                        h.action === 'started'    ? 'bg-indigo-100 text-indigo-700'  :
                        'bg-slate-100 text-slate-600'
                      }`}>{h.action}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-muted-foreground">Étape {h.step_number}</span>
                          {h.step_label && <span className="font-medium">— {h.step_label}</span>}
                          {h.step_duration_minutes != null && <span className="text-muted-foreground">({h.step_duration_minutes} min)</span>}
                        </div>
                        {h.actor && <span className="flex items-center gap-0.5 text-muted-foreground"><User className="h-2.5 w-2.5" />{h.actor.full_name}</span>}
                        {h.comment && <p className="text-muted-foreground italic truncate">{h.comment}</p>}
                      </div>
                      <span className="text-muted-foreground flex-shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(h.acted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal escalade ── */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full mb-3">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold">Escalader vers le circuit Client ?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Le circuit fournisseur sera fermé et le circuit client sera démarré automatiquement.
              </p>
            </div>
            <textarea
              value={escalateComment}
              onChange={e => setEscalateComment(e.target.value)}
              placeholder="Raison de l'escalade (optionnel)..."
              rows={3}
              className="form-input w-full text-sm resize-none mb-4"
            />
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50"
                onClick={() => setShowEscalateModal(false)} disabled={acting}>
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2 text-sm font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleEscalate} disabled={acting}>
                {acting && <Loader2 className="h-3 w-3 animate-spin" />}
                Escalader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketWorkflow;