// src/pages/admin/AgentScoreboard.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Star, Trophy, AlertCircle, CheckCircle, Clock, Ticket, User } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Agent = {
  rank: number; id: number; full_name: string; email: string; role: string;
  is_available: boolean; is_eligible: boolean;
  performance_score: number; composite_score: number;
  tickets_resolved: number; tickets_assigned: number;
  active_tickets: number; avg_resolution_time: number | null;
};

async function apiFetch(path: string, token: string) {
  const res  = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? 'Error');
  return json?.data;
}

// Barre de score colorée
function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct   = Math.min(Math.round((score / max) * 100), 100);
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
        {score}%
      </span>
    </div>
  );
}

// Badge rang
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs text-muted-foreground font-mono w-5 text-center">#{rank}</span>;
}

const AgentScoreboard: React.FC = () => {
  const { token } = useAuth();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const [agents, setAgents]   = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'eligible' | 'available'>('all');

  const load = async (refresh = false) => {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch(`/api/dashboard/scoreboard${refresh ? '?refresh=true' : ''}`, tk());
      setAgents(data?.agents ?? []);
    } catch (e: any) { setError(e?.message ?? 'Erreur'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const formatTime = (mins: number | null) => {
    if (!mins) return '—';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
  };

  const filtered = agents.filter(a => {
    if (filter === 'eligible')  return a.is_eligible;
    if (filter === 'available') return a.is_available;
    return true;
  });

  const eligible   = agents.filter(a => a.is_eligible).length;
  const available  = agents.filter(a => a.is_available).length;
  const newAgents  = agents.filter(a => !a.is_eligible).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" /> Scoreboard Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Classement basé sur performance, disponibilité et charge de travail
          </p>
        </div>
        <Button onClick={() => load(true)} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Recalculer scores
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Agents</p>
          <p className="text-2xl font-bold">{agents.length}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Éligibles</p>
          <p className="text-2xl font-bold text-emerald-600">{eligible}</p>
          <p className="text-xs text-muted-foreground">tickets résolus ≥ 1</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Disponibles</p>
          <p className="text-2xl font-bold text-blue-600">{available}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Nouveaux</p>
          <p className="text-2xl font-bold text-amber-600">{newAgents}</p>
          <p className="text-xs text-muted-foreground">non éligibles encore</p>
        </CardContent></Card>
      </div>

      {/* Légende assignation */}
      <div className="flex flex-wrap gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
        <p className="text-sm font-semibold text-indigo-800 w-full">Règles d'assignation automatique :</p>
        <div className="flex items-center gap-2 text-xs text-indigo-700">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span><strong>Éligible + Disponible + Score max</strong> → priorité absolue</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-700">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span><strong>Nouvel agent (0 résolution)</strong> → exclu sauf si aucun autre disponible</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-700">
          <Star className="h-3.5 w-3.5 text-purple-500" />
          <span><strong>Score = 50% perf + 30% dispo + 20% charge</strong></span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'eligible', 'available'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f === 'all' ? `Tous (${agents.length})` : f === 'eligible' ? `Éligibles (${eligible})` : `Disponibles (${available})`}
          </button>
        ))}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs">
                  <th className="px-4 py-3 text-left">Rang</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left w-40">Score Composite</th>
                  <th className="px-4 py-3 text-left w-36">Performance</th>
                  <th className="px-4 py-3 text-center">Résolu</th>
                  <th className="px-4 py-3 text-center">Assignés</th>
                  <th className="px-4 py-3 text-center">Actifs</th>
                  <th className="px-4 py-3 text-center">Temps moy.</th>
                  <th className="px-4 py-3 text-center">Dispo</th>
                  <th className="px-4 py-3 text-center">Éligible</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Aucun agent</td></tr>
                ) : filtered.map(agent => (
                  <tr key={agent.id} className={`border-b last:border-0 transition-colors ${
                    !agent.is_eligible ? 'bg-amber-50/30' :
                    !agent.is_available ? 'bg-slate-50/50' :
                    'hover:bg-muted/20'
                  }`}>
                    {/* Rang */}
                    <td className="px-4 py-3">
                      <RankBadge rank={agent.rank} />
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          agent.composite_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          agent.composite_score >= 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {agent.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{agent.full_name}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Score composite */}
                    <td className="px-4 py-3">
                      <ScoreBar score={agent.composite_score} />
                    </td>

                    {/* Performance */}
                    <td className="px-4 py-3">
                      <ScoreBar score={Math.round(agent.performance_score)} />
                    </td>

                    {/* Résolu */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-emerald-600">{agent.tickets_resolved}</span>
                    </td>

                    {/* Assignés total */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">{agent.tickets_assigned}</span>
                    </td>

                    {/* Actifs */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${agent.active_tickets > 3 ? 'text-red-600' : agent.active_tickets > 1 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {agent.active_tickets}
                      </span>
                    </td>

                    {/* Temps moyen */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />{formatTime(agent.avg_resolution_time)}
                      </span>
                    </td>

                    {/* Disponible */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        agent.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {agent.is_available ? 'Dispo' : 'Indispo'}
                      </span>
                    </td>

                    {/* Éligible */}
                    <td className="px-4 py-3 text-center">
                      {agent.is_eligible ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                          <span className="text-xs text-amber-600">Nouveau</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Note explicative */}
      <p className="text-xs text-muted-foreground">
        * Le score composite est recalculé en temps réel à chaque résolution de ticket.
        Les agents marqués <strong>Nouveau</strong> seront exclus de l'assignation automatique jusqu'à leur première résolution.
      </p>
    </div>
  );
};

export default AgentScoreboard;
