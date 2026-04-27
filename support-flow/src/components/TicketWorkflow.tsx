// src/components/TicketWorkflow.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight, ArrowLeft, PauseCircle, RotateCcw, StopCircle, CheckCircle, Clock, User, Receipt } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Step = { step_order: number; label: string; assignment_type: string };
type WFState = { id: number; current_step: number; status: string; context: string; template?: { name: string; steps: Step[] } };
type HistEntry = { id: number; step_number: number; step_label?: string; action: string; acted_at: string; comment?: string; step_duration_minutes?: number; actor?: { full_name: string }; assignee?: { full_name: string } };
type Billing = { id: number; amount: number; currency: string; status: string; duration_minutes: number; hourly_rate: number };

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e: any = new Error(json?.message ?? 'Error'); e.body = json; throw e; }
  return json;
}

// ─── Logique dynamique des boutons selon statut ────────────────────────────────
// function getAvailableActions(ticketStatus: string, wfStatus: string) {
//   // workflow pas démarré
//   if (!wfStatus) return ['started'];

//   // workflow terminé
//   if (wfStatus === 'completed') return ['billing'];

//   // en pause
//   if (ticketStatus === 'suspended') return ['resumed'];

//   // en cours
//   if (ticketStatus === 'in_progress') {
//     return ['forward', 'backward', 'suspended', 'stopped'];
//   }

//   // fallback
//   if (ticketStatus === 'open') return ['started'];

//   return [];
//   // if (!wfStatus || wfStatus === 'completed') {
//   //   return ticketStatus === 'resolved' || ticketStatus === 'closed'
//   //     ? ['billing']
//   //     : ['start'];
//   // }
//   //   if (wfStatus === 'completed') return ['billing'];
//   // if (ticketStatus === 'suspended')  return ['resume'];


//   // if (ticketStatus === 'in_progress') return ['suspend', 'forward', 'backward', 'stop'];
//   // if (ticketStatus === 'open')        return ['start'];
//   // return [];
// }
function getAvailableActions(ticketStatus: string, wfStatus: string) {
   if (!wfStatus) return ['started'];
  // workflow terminé
  if (wfStatus === 'completed') return ['billing'];


  // en pause
  if (ticketStatus === 'suspended') return ['resumed'];

  // en cours
  if (ticketStatus === 'in_progress') {
    return ['forward', 'backward', 'suspended', 'stopped'];
  }
  // fallback
  if (ticketStatus === 'open') return ['started'];
  return [];
}

export const TicketWorkflow: React.FC<{
  ticketId: number; token: string; userRole?: string;
  ticketStatus?: string; onStatusChange?: (s: string) => void;
}> = ({ ticketId, token, userRole, ticketStatus = 'open', onStatusChange }) => {

  const [state, setState]     = useState<WFState | null>(null);
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [hourlyRate, setHourlyRate]   = useState('100');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isStaff = ['super_admin', 'company_admin', 'employee'].includes(userRole ?? '');
  const isAdmin = ['super_admin', 'company_admin'].includes(userRole ?? '');

  const load = async () => {
    setLoading(true);
    try {
      const json = await api(`/api/tickets/${ticketId}/workflow/state`, {}, token);
      setState(json?.data?.state ?? null);
      setHistory(json?.data?.history ?? []);
      // Charger billing si ticket résolu
      try {
        const bj = await api(`/api/tickets/${ticketId}/billing`, {}, token);
        setBilling(bj?.data?.billing ?? null);
      } catch { setBilling(null); }
    } catch { setState(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [ticketId]);

  // const call = async (action: string, body: object = {}) => {
  //   setActing(true); setErr(null); setMsg(null);
  //   try {
  //     const methodMap: Record<string, string> = { started: 'POST', forward: 'PUT', backward: 'PUT', suspended: 'PUT', resumed: 'PUT', stopped: 'PUT' };
  //     const res = await api(`/api/tickets/${ticketId}/workflow/${action}`, { method: methodMap[action], body: JSON.stringify(body) }, token);
  //     const newStatus = res?.data?.status ?? (action === 'stopped' ? 'resolved' : action === 'suspended' ? 'suspended' : action === 'resumed' ? 'in_progress' : undefined);
  //     if (newStatus && onStatusChange) onStatusChange(newStatus);
  //     if (res?.data?.completed) setMsg('Workflow terminé — ticket résolu !');
  //     else if (action === 'stopped') setMsg(`Arrêté — durée: ${res?.data?.duration_minutes ?? '?'} min`);
  //     else if (action === 'suspended') setMsg('Ticket suspendu');
  //     else if (action === 'resumed') setMsg('Traitement repris');
  //     else setMsg('Action effectuée');
  //     setComment(''); setShowComment(false);
  //     await load();
  //   } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
  //   finally { setActing(false); }
  // };
const call = async (action: string, body: object = {}) => {
  setActing(true); setErr(null); setMsg(null);
  try {
    const methodMap: Record<string, string> = { 
      started: 'POST', forward: 'PUT', backward: 'PUT', 
      suspended: 'PUT', resumed: 'PUT', stopped: 'PUT' 
    };

    const res = await api(`/api/tickets/${ticketId}/workflow/${action}`, { 
      method: methodMap[action], 
      body: JSON.stringify(body) 
    }, token);

    // 1. Déterminer le nouveau statut du ticket
    // Vérifie bien que ton backend renvoie 'in_progress' quand on fait 'started'
    const newStatus = res?.data?.status || (action === 'started' ? 'in_progress' : undefined);
    
    // 2. Notifier le parent (cela mettra à jour ticket.status via setTicket)
    if (newStatus && onStatusChange) {
      onStatusChange(newStatus);
    }

    // 3. IMPORTANT : Recharger immédiatement les données du workflow
    // Cela va mettre à jour 'state' et 'wfStatus' ce qui débloquera les boutons
    await load(); 

    if (res?.data?.completed) setMsg('Workflow terminé — ticket résolu !');
    else setMsg('Action effectuée');
    
    setComment(''); setShowComment(false);
  } catch (e: any) { 
    setErr(e?.body?.message ?? e?.message ?? 'Erreur'); 
  } finally { 
    setActing(false); 
  }
};
  const handleBilling = async () => {
    setActing(true); setErr(null);
    try {
      const res = await api(`/api/tickets/${ticketId}/billing`, { method: 'POST', body: JSON.stringify({ hourly_rate: parseFloat(hourlyRate) }) }, token);
      setBilling(res?.data?.billing);
      setShowBilling(false);
      setMsg(`Facture créée — ${res?.data?.billing?.amount} ${res?.data?.billing?.currency}`);
    } catch (e: any) { setErr(e?.body?.message ?? e?.message ?? 'Erreur'); }
    finally { setActing(false); }
  };

  const steps   = state?.template?.steps ?? [];
  const wfStatus = state?.status ?? '';
  const actions  = isStaff ? getAvailableActions(ticketStatus, wfStatus) : [];

 const actionConfig: Record<string, { label: string; icon: React.ReactNode; variant: string; color: string }> = {
  started:   { label: 'Démarrer',   icon: <Play className="h-3.5 w-3.5" />,         variant: 'default',  color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  forward:   { label: 'Suivant',    icon: <ArrowRight className="h-3.5 w-3.5" />,   variant: 'default',  color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  backward:  { label: 'Précédent',  icon: <ArrowLeft className="h-3.5 w-3.5" />,    variant: 'outline',  color: 'border-amber-400 text-amber-700 hover:bg-amber-50' },
  suspended: { label: 'Suspendre',  icon: <PauseCircle className="h-3.5 w-3.5" />,  variant: 'outline',  color: 'border-orange-400 text-orange-700 hover:bg-orange-50' },
  resumed:   { label: 'Reprendre',  icon: <RotateCcw className="h-3.5 w-3.5" />,    variant: 'default',  color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  stopped:   { label: 'Arrêter',    icon: <StopCircle className="h-3.5 w-3.5" />,   variant: 'outline',  color: 'border-red-400 text-red-700 hover:bg-red-50' },
  billing:   { label: 'Facturer',   icon: <Receipt className="h-3.5 w-3.5" />,      variant: 'default',  color: 'bg-purple-600 hover:bg-purple-700 text-white' },
};

  if (loading) return (
    <div className="card-gradient p-6 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground animate-pulse">Chargement workflow...</p>
    </div>
  );

  return (
    <div className="card-gradient p-5 rounded-lg border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Play className="h-4 w-4 text-indigo-500" />
          History
          {state && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{state.template?.name}</span>}
        </h3>
        {state && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            wfStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            ticketStatus === 'suspended' ? 'bg-orange-100 text-orange-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {ticketStatus === 'suspended' ? 'Suspendu' : wfStatus === 'completed' ? 'Terminé' : 'En cours'}
          </span>
        )}
      </div>

      {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{err}</p>}
      {msg && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">{msg}</p>}

      {/* Progress steps */}
      {steps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {steps.map(s => (
              <div key={s.step_order} title={s.label}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s.step_order < (state?.current_step ?? 0)  ? 'bg-emerald-400' :
                  s.step_order === (state?.current_step ?? 0) ? 'bg-indigo-500 animate-pulse' :
                  'bg-muted'
                }`} />
            ))}
          </div>
          <p className="text-xs text-indigo-700 font-medium">
            Étape {state?.current_step} / {steps.length} — {steps.find(s => s.step_order === state?.current_step)?.label}
            {steps.find(s => s.step_order === state?.current_step)?.assignment_type === 'AND' &&
              <span className="ml-1 text-amber-600">(AND)</span>}
          </p>
        </div>
      )}

      {/* Actions dynamiques */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {/* Commentaire pour backward */}
          {showComment && (
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Raison du retour (obligatoire)..." rows={2}
              className="form-input w-full text-sm resize-none" />
          )}

          <div className="flex flex-wrap gap-2">
            {actions.filter(a => a !== 'billing').map(action => {
              const cfg = actionConfig[action];
              const needsComment = action === 'backward';
              return (
                <button key={action} disabled={acting}
                  onClick={() => {
                    if (needsComment && !showComment) { setShowComment(true); return; }
                    if (needsComment && !comment.trim()) { setErr('Commentaire obligatoire'); return; }
                    call(action, comment ? { comment } : {});
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.color} disabled:opacity-50`}>
                  {acting && action !== 'billing' ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : cfg.icon}
                  {showComment && needsComment ? `Confirmer ${cfg.label}` : cfg.label}
                </button>
              );
            })}
            {showComment && (
              <button onClick={() => { setShowComment(false); setComment(''); }}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    billing.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    billing.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{billing.status}</span>
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

      {/* Terminé */}
      {wfStatus === 'completed' && (
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" /> Workflow terminé
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historique</p>
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {history.map(h => (
              <div key={h.id} className="flex items-start gap-2 text-xs py-1 border-b border-muted/30 last:border-0">
                <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold min-w-[60px] text-center ${
                  h.action === 'forward'   ? 'bg-emerald-100 text-emerald-700' :
                  h.action === 'backward'  ? 'bg-amber-100 text-amber-700'    :
                  h.action === 'completed' ? 'bg-blue-100 text-blue-700'      :
                  h.action === 'suspended' ? 'bg-orange-100 text-orange-700'  :
                  h.action === 'resumed'   ? 'bg-cyan-100 text-cyan-700'      :
                  h.action === 'stopped'   ? 'bg-red-100 text-red-700'        :
                  'bg-slate-100 text-slate-600'
                }`}>{h.action}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-muted-foreground">Étape {h.step_number}</span>
                    {h.step_label && <span className="font-medium">— {h.step_label}</span>}
                    {h.step_duration_minutes && <span className="text-muted-foreground">({h.step_duration_minutes} min)</span>}
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
    </div>
  );
};

export default TicketWorkflow;
