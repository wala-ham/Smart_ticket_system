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

  // Variables pour la séparation des circuits
  const hasActiveWorkflow = state !== null && state?.status === 'active';
  const supplierState = allStates.find(s => s.context === 'supplier');
  const clientState = allStates.find(s => s.context === 'client');

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
      if ((wfStatus === 'completed' || ticketStatus === 'resolved') && isAdmin) {
        try {
          const bj = await api(`/api/tickets/${ticketId}/billing`, {}, token);
          if (bj?.data?.billing) setBilling(bj.data.billing);
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
    setActing(true);
    setErr(null);
    try {
      const res = await api(`/api/tickets/${ticketId}/billing`, {
        method: 'POST',
        body: JSON.stringify({ 
          hourly_rate: parseFloat(hourlyRate),
          currency: 'TND'
        }),
      }, token);
      
      setBilling(res?.data?.billing);
      setShowBilling(false);
      setMsg(`✅ Facture créée : ${res?.data?.billing?.amount} TND`);
    } catch (e: any) {
      setErr(e?.body?.message ?? e?.message ?? 'Erreur lors de la création');
    } finally {
      setActing(false);
    }
  };

  const steps    = state?.template?.steps ?? [];
  const wfStatus = state?.status ?? '';
  const context  = state?.context ?? 'supplier';
  
  const getAvailableActions = (ticketStatus: string, wfStatus: string, context: string) => {
    if (hasActiveWorkflow) {
      if (wfStatus === 'active') {
        const base = ['forward', 'backward', 'suspended', 'stopped'];
        if (context === 'supplier') base.push('escalate_to_client');
        return base;
      }
      if (wfStatus === 'completed') return [];
      if (ticketStatus === 'suspended') return ['resumed'];
      return [];
    }
    
    if (!wfStatus || wfStatus === '') return ['start_supplier'];
    return [];
  };

  const actions = isStaff ? getAvailableActions(ticketStatus, wfStatus, context) : [];

  const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    start_supplier:   { label: 'Démarrer (fournisseur)', icon: <Play className="h-3.5 w-3.5" />,         color: 'bg-orange-600 hover:bg-orange-700 text-white' },
    forward:          { label: 'Suivant',                 icon: <ArrowRight className="h-3.5 w-3.5" />,   color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    backward:         { label: 'Précédent',               icon: <ArrowLeft className="h-3.5 w-3.5" />,    color: 'border border-amber-400 text-amber-700 hover:bg-amber-50' },
    suspended:        { label: 'Suspendre',               icon: <PauseCircle className="h-3.5 w-3.5" />,  color: 'border border-orange-400 text-orange-700 hover:bg-orange-50' },
    resumed:          { label: 'Reprendre',               icon: <RotateCcw className="h-3.5 w-3.5" />,    color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    stopped:          { label: 'Arrêter',                 icon: <StopCircle className="h-3.5 w-3.5" />,   color: 'border border-red-400 text-red-700 hover:bg-red-50' },
    escalate_to_client: { label: 'Escalader → Client',   icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  };

  if (loading) return (
    <div className="card-gradient p-6 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground animate-pulse">Chargement workflow...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* ── Workflow Fournisseur (si existant) ── */}
      {supplierState && (
        <div className="card-gradient p-5 rounded-lg border-l-4 border-orange-500 bg-orange-50/10">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-600" />
              <span className="font-bold text-sm text-orange-800">Circuit Fournisseur</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                supplierState.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                supplierState.status === 'escalated' ? 'bg-amber-100 text-amber-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {supplierState.status === 'escalated' ? 'Escaladé' : 
                 supplierState.status === 'completed' ? 'Terminé' : 'En cours'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {supplierState.template?.name}
            </div>
          </div>

          {supplierState.template?.steps?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <div className="flex gap-1">
                {supplierState.template.steps.map(s => (
                  <div key={s.step_order} title={s.label}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      s.step_order < (supplierState.current_step ?? 0) ? 'bg-orange-400' :
                      s.step_order === (supplierState.current_step ?? 0) ? 'bg-orange-600 animate-pulse' :
                      'bg-orange-200'
                    }`} />
                ))}
              </div>
              <p className="text-xs text-orange-700 font-medium">
                Étape {supplierState.current_step} / {supplierState.template.steps.length} — 
                {supplierState.template.steps.find(s => s.step_order === supplierState.current_step)?.label}
              </p>
            </div>
          )}
          
          {stats && stats.supplier_duration_minutes > 0 && (
            <div className="text-xs text-orange-600 flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3" />
              Durée: {stats.supplier_duration_minutes} minutes
            </div>
          )}
        </div>
      )}

      {/* ── Workflow Client (si existant) ── */}
      {clientState && (
        <div className="card-gradient p-5 rounded-lg border-l-4 border-teal-500 bg-teal-50/10">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              <span className="font-bold text-sm text-teal-800">Circuit Client</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                clientState.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                'bg-teal-100 text-teal-700'
              }`}>
                {clientState.status === 'completed' ? 'Terminé' : 'En cours'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {clientState.template?.name}
            </div>
          </div>

          {clientState.template?.steps?.length > 0 && clientState.status === 'active' && (
            <div className="space-y-1.5 mb-3">
              <div className="flex gap-1">
                {clientState.template.steps.map(s => (
                  <div key={s.step_order} title={s.label}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      s.step_order < (clientState.current_step ?? 0) ? 'bg-teal-400' :
                      s.step_order === (clientState.current_step ?? 0) ? 'bg-teal-600 animate-pulse' :
                      'bg-teal-200'
                    }`} />
                ))}
              </div>
              <p className="text-xs text-teal-700 font-medium">
                Étape {clientState.current_step} / {clientState.template.steps.length} — 
                {clientState.template.steps.find(s => s.step_order === clientState.current_step)?.label}
              </p>
            </div>
          )}
          
          {stats && stats.client_duration_minutes > 0 && (
            <div className="text-xs text-teal-600 flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3" />
              Durée: {stats.client_duration_minutes} minutes
            </div>
          )}
        </div>
      )}

      {/* ── Bloc de contrôle (bouton démarrer) ── */}
      {!hasActiveWorkflow && !supplierState && (
        <div className="card-gradient p-5 rounded-lg border border-border">
          <div className="flex flex-col items-center text-center gap-3">
            <Truck className="h-8 w-8 text-orange-500" />
            <p className="text-sm text-muted-foreground">
              Le workflow n'a pas encore été démarré
            </p>
            <button
              onClick={() => call('start_supplier', { context: 'supplier' })}
              disabled={acting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Démarrer le circuit fournisseur
            </button>
          </div>
        </div>
      )}

      {/* ── Actions pour workflow actif ── */}
      {hasActiveWorkflow && actions.length > 0 && (
        <div className="card-gradient p-5 rounded-lg border border-border space-y-3">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-indigo-500" />
            Actions du circuit {context === 'supplier' ? 'fournisseur' : 'client'}
          </div>
          
          {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{err}</p>}
          {msg && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">{msg}</p>}
          
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
              return (
                <button key={action} disabled={acting}
                  onClick={() => {
                    if (needsComment && !showComment) { setShowComment(true); setPendingAction(action); return; }
                    if (needsComment && !comment.trim()) { setErr('Commentaire obligatoire'); return; }
                    call(action, comment ? { comment } : {});
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.color} disabled:opacity-50`}>
                  {acting ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : cfg.icon}
                  {showComment && needsComment ? `Confirmer ${cfg.label}` : cfg.label}
                </button>
              );
            })}

            {actions.includes('escalate_to_client') && (
              <button disabled={acting}
                onClick={() => setShowEscalateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
                <AlertTriangle className="h-3.5 w-3.5" />
                Escalader vers le circuit client
              </button>
            )}

            {showComment && (
              <button onClick={() => { setShowComment(false); setComment(''); setPendingAction(null); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2">
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Historique complet ── */}
      <div className="card-gradient p-4 rounded-lg border border-border space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historique complet</p>
        
        {history.length > 0 ? (
          <>
            {/* Historique Fournisseur */}
            {supplierState && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-orange-200">
                  <Truck className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-800">Circuit Fournisseur</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {history
                    .filter(h => {
                      const stateForHist = allStates.find(s => s.template.id === h.template_id);
                      return stateForHist?.context === 'supplier';
                    })
                    .map(h => (
                      <div key={h.id} className="flex items-start gap-2 text-xs py-1 border-b border-muted/30 last:border-0">
                        <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold min-w-[70px] text-center ${
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
            )}

            {/* Historique Client */}
            {clientState && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-teal-200">
                  <Building2 className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-bold text-teal-800">Circuit Client</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {history
                    .filter(h => {
                      const stateForHist = allStates.find(s => s.template.id === h.template_id);
                      return stateForHist?.context === 'client';
                    })
                    .map(h => (
                      <div key={h.id} className="flex items-start gap-2 text-xs py-1 border-b border-muted/30 last:border-0">
                        <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold min-w-[70px] text-center ${
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
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité pour le moment</p>
            <p className="text-xs">Le suivi des actions apparaîtra ici une fois le workflow démarré</p>
          </div>
        )}
      </div>

      {/* ── SECTION FACTURATION (placée juste après l'historique) ── */}
            {/* ── SECTION FACTURATION (stable - basée sur la durée) ── */}
      {/* Afficher quand une durée totale existe (ticket a été traité) */}
      {stats && stats.total_duration_minutes > 0 && !hasActiveWorkflow && isAdmin && (
        <div className="card-gradient p-5 rounded-lg border border-purple-200 bg-purple-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Facturation</h3>
          </div>

          {billing ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Montant total :</span>
                <span className="text-xl font-bold text-purple-800">
                  {billing.amount} {billing.currency}
                </span>
              </div>
              <div className="flex justify-between text-xs text-purple-600">
                <span>Durée totale : {stats.total_duration_minutes} minutes</span>
                <span>Taux : {billing.hourly_rate} TND/h</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  billing.status === 'paid' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {billing.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
                </span>
                {billing.status !== 'paid' && (
                  <button
                    onClick={async () => {
                      try {
                        await api(`/api/tickets/${ticketId}/billing/status`, {
                          method: 'PUT',
                          body: JSON.stringify({ status: 'paid' })
                        }, token);
                        await load();
                        setMsg('Facture marquée comme payée');
                      } catch (e: any) {
                        setErr(e?.message ?? 'Erreur');
                      }
                    }}
                    className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Marquer comme payée
                  </button>
                )}
              </div>
            </div>
          ) : showBilling ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-purple-600 block mb-1">Durée totale</label>
                  <p className="text-lg font-semibold text-purple-800">
                    {stats.total_duration_minutes} minutes
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    (Fournisseur: {stats.supplier_duration_minutes ?? 0} min + Client: {stats.client_duration_minutes ?? 0} min)
                  </p>
                </div>
                <div>
                  <label className="text-xs text-purple-600 block mb-1">Taux horaire (TND/h)</label>
                  <input 
                    type="number" 
                    value={hourlyRate} 
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min="0"
                    step="10"
                    placeholder="Ex: 100"
                  />
                </div>
              </div>
              
              <div className="bg-purple-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">Montant estimé :</span>
                  <span className="text-xl font-bold text-purple-800">
                    {((stats.total_duration_minutes / 60) * parseFloat(hourlyRate || '0')).toFixed(2)} TND
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBilling}
                  disabled={acting || !hourlyRate || parseFloat(hourlyRate) <= 0}
                  className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                >
                  {acting ? 'Création...' : '💰 Générer la facture'}
                </button>
                <button
                  onClick={() => setShowBilling(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-slate-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowBilling(true)}
              className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Créer la facture
            </button>
          )}
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