// src/pages/Dashboard.tsx — fixed version
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TicketCheck, Clock, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle, RefreshCw, ChevronRight, BarChart3, Brain, Sparkles, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_BASE = 'http://localhost:5000';

async function apiFetch(path: string, token: string) {
  const res  = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Error');
  return json?.data;
}

const n = (v: any) => parseInt(v ?? 0) || 0; // parse count from SQL string

function KpiCard({ title, value, subtitle, icon, color }: { title: string; value: any; subtitle?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = { open: 'bg-blue-400', in_progress: 'bg-amber-400', suspended: 'bg-orange-400', resolved: 'bg-emerald-400', closed: 'bg-slate-400' };
const PRIORITY_COLOR: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-blue-500', low: 'bg-green-500' };
const PRIORITY_BADGE: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-blue-100 text-blue-700', low: 'bg-green-100 text-green-700' };

const formatDuration = (mins: any) => {
  const m = parseInt(mins ?? 0);
  if (!m) return '—';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const navigate        = useNavigate();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const [stats, setStats]     = useState<any>(null);
  const [agents, setAgents]   = useState<any[]>([]);
  const [recent, setRecent]   = useState<any>(null);
  const [ml, setMl]           = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'overview' | 'agents' | 'ml'>('overview');

  const load = async () => {
    setLoading(true);
    try {
      const [s, a, r, m] = await Promise.all([
        apiFetch('/api/dashboard/stats',       tk()),
        apiFetch('/api/dashboard/agents',      tk()),
        apiFetch('/api/dashboard/recent',      tk()),
        apiFetch('/api/dashboard/ml-insights', tk()),
      ]);
      setStats(s);
      setAgents(a?.agents ?? []);
      setRecent(r);
      setMl(m);
    } catch (e: any) {
      console.error('Dashboard load error:', e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="mt-3 text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );

  const maxStatus = Math.max(...(stats?.by_status?.map((s: any) => n(s.count)) ?? [1]), 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Bonjour {user?.full_name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['overview', 'agents', 'ml'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'overview' ? '📊 Vue globale' : t === 'agents' ? '👥 Agents' : '🤖 ML Insights'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Tickets" value={n(stats?.totals?.total)}
              icon={<TicketCheck className="h-5 w-5 text-blue-600" />} color="bg-blue-100"
              subtitle={`${stats?.resolution_rate ?? 0}% taux résolution`} />
            <KpiCard title="En attente" value={n(stats?.totals?.open) + n(stats?.totals?.in_progress)}
              icon={<Clock className="h-5 w-5 text-amber-600" />} color="bg-amber-100"
              subtitle={`${n(stats?.totals?.open)} ouverts + ${n(stats?.totals?.in_progress)} en cours`} />
            <KpiCard title="Critiques actifs" value={n(stats?.totals?.critical)}
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />} color="bg-red-100"
              subtitle="Priorité critique non résolus" />
            <KpiCard title="Temps moyen résolution" value={formatDuration(stats?.avg_duration_minutes)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} color="bg-emerald-100"
              subtitle={`${n(stats?.totals?.resolved)} tickets résolus`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Par statut */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" />Par Statut</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stats?.by_status?.length ? stats.by_status.map((s: any) => (
                  <div key={s.status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium">{s.status.replace('_', ' ')}</span>
                      <span className="font-bold">{n(s.count)}</span>
                    </div>
                    <MiniBar value={n(s.count)} max={maxStatus} color={STATUS_COLOR[s.status] ?? 'bg-slate-400'} />
                  </div>
                )) : <p className="text-xs text-muted-foreground">Aucune donnée</p>}
              </CardContent>
            </Card>

            {/* Par priorité */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Par Priorité</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map(p => {
                  const found = stats?.by_priority?.find((x: any) => x.priority === p);
                  const count = n(found?.count);
                  return (
                    <div key={p} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize font-medium">{p}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                      <MiniBar value={count} max={n(stats?.totals?.total) || 1} color={PRIORITY_COLOR[p]} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Par catégorie */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Top Catégories</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats?.by_category?.length ? stats.by_category.slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color ?? '#6366f1' }} />
                      <span className="text-xs font-medium truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold ml-2">{n(c.count)}</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Aucune donnée</p>}
              </CardContent>
            </Card>
          </div>

          {/* Graphe 30 jours */}
          {/* <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tickets créés — 30 derniers jours</CardTitle></CardHeader>
            <CardContent>
              {stats?.last_30_days?.length ? (
                <div className="flex items-end gap-0.5 h-20">
                  {stats.last_30_days.map((d: any, i: number) => {
                    const maxV = Math.max(...stats.last_30_days.map((x: any) => n(x.count)), 1);
                    const pct  = (n(d.count) / maxV) * 100;
                    return (
                      <div key={i} className="flex-1 group relative flex flex-col justify-end">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          {d.date}: {n(d.count)}
                        </div>
                        <div className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-sm transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Pas de données sur 30 jours</p>
              )}
            </CardContent>
          </Card> */}
          {/* Graphe 30 jours */}
<Card className="border-0 shadow-sm">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-semibold">Tickets créés — 30 derniers jours</CardTitle>
  </CardHeader>
  <CardContent>
    {stats?.last_30_days && stats.last_30_days.length > 0 ? (
      <div className="flex items-end gap-1 h-24 pt-6"> {/* Hauteur augmentée pour mieux voir */}
        {(() => {
          // 1. On convertit tout en nombres et on trouve le max
          const counts = stats.last_30_days.map((d: any) => parseInt(d.count, 10) || 0);
          const maxV = Math.max(...counts, 1);

          return stats.last_30_days.map((d: any, i: number) => {
            const currentCount = parseInt(d.count, 10) || 0;
            // 2. Calcul du pourcentage
            const pct = (currentCount / maxV) * 100;

            return (
              <div key={i} className="flex-1 group relative flex flex-col justify-end h-full">
                {/* Tooltip au survol */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {d.date}: {currentCount}
                </div>
                
                {/* La barre */}
                <div 
                  className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t-sm transition-all duration-300" 
                  style={{ height: `${Math.max(pct, 5)}%` }} 
                />
              </div>
            );
          });
        })()}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground text-center py-6">Pas de données sur 30 jours</p>
    )}
  </CardContent>
</Card>

          {/* Récents + Critiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Tickets Récents</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} className="h-7 text-xs gap-1">
                  Voir tout <ChevronRight className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {(recent?.recent ?? []).slice(0, 6).map((t: any) => (
                  <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">{t.creator?.full_name ?? '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${PRIORITY_BADGE[t.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
                {!(recent?.recent?.length) && <p className="text-xs text-muted-foreground text-center py-4">Aucun ticket récent</p>}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />Critiques Non Résolus</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {(recent?.critical ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 py-4">
                    <CheckCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">Aucun ticket critique actif !</p>
                  </div>
                ) : (recent?.critical ?? []).map((t: any) => (
                  <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer border border-red-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-red-800 truncate">{t.subject}</p>
                      <p className="text-xs text-red-500">{t.category?.name}</p>
                    </div>
                    <span className="text-xs font-mono text-red-600 flex-shrink-0">{t.ticket_number}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── AGENTS ── */}
      {tab === 'agents' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Agent</th>
                      <th className="px-4 py-3 text-center">Actifs</th>
                      <th className="px-4 py-3 text-center">Résolus</th>
                      <th className="px-4 py-3 text-center">Taux</th>
                      <th className="px-4 py-3 text-center">Temps moy.</th>
                      <th className="px-4 py-3 text-center">Dispo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Aucun agent trouvé</td></tr>
                    ) : agents.map((a, i) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                              {a.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-medium">{a.full_name}</p>
                              <p className="text-xs text-muted-foreground">{a.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-amber-600">{a.active_tickets}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-emerald-600">{a.resolved_tickets}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            a.resolution_rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            a.resolution_rate >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{a.resolution_rate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {formatDuration(a.avg_duration_minutes)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.is_available ? 'Dispo' : 'Indispo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ML INSIGHTS ── */}
      {tab === 'ml' && ml && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-purple-600" />Recommandations ML</h2>
            {(ml.recommendations ?? []).map((rec: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border flex items-start gap-3 ${
                rec.impact === 'high' ? 'border-red-200 bg-red-50' :
                rec.impact === 'medium' ? 'border-amber-200 bg-amber-50' :
                'border-emerald-200 bg-emerald-50'
              }`}>
                <span className="text-xl flex-shrink-0">{rec.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.message}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                  rec.impact === 'high' ? 'bg-red-100 text-red-700' :
                  rec.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>{rec.impact}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Précision IA */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />Précision IA</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Confiance catégorie', val: ml.ai_accuracy?.avg_category_confidence, color: 'bg-purple-500' },
                  { label: 'Confiance priorité',  val: ml.ai_accuracy?.avg_priority_confidence, color: 'bg-indigo-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span>{label}</span><span className="font-bold">{n(val)}%</span></div>
                    <div className="w-full bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${color}`} style={{ width: `${n(val)}%` }} /></div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{n(ml.ai_accuracy?.total_analyzed)} tickets analysés par IA</p>
              </CardContent>
            </Card>

            {/* Catégories lentes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Catégories les plus lentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ml.slow_categories ?? []).length ? ml.slow_categories.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? '#6366f1' }} />
                      <span className="font-medium">{c.category_name}</span>
                    </div>
                    <span className="text-muted-foreground">{formatDuration(c.avg_duration)} <span className="text-foreground">({n(c.total)})</span></span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Pas encore de données résolues</p>}
              </CardContent>
            </Card>

            {/* Sentiment impact */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Sentiment vs Résolution</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ml.sentiment_impact ?? []).length ? ml.sentiment_impact.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      s.sentiment === 'urgent' ? 'bg-red-100 text-red-700' :
                      s.sentiment === 'negative' ? 'bg-orange-100 text-orange-700' :
                      s.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{s.sentiment}</span>
                    <span className="text-muted-foreground">{n(s.total)} tickets — <span className="font-medium text-foreground">{formatDuration(s.avg_duration)}</span></span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Pas de données sentiment</p>}
              </CardContent>
            </Card>

            {/* Charge hebdo */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Charge hebdomadaire</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {(ml.weekly_comparison ?? []).map((w: any, i: number) => (
                    <div key={i} className="flex-1 text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{n(w.count)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{w.period.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;