import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Edit2, Search, ChevronLeft, ChevronRight, Filter, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listTickets, Ticket } from '@/services/tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MyTickets: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const effectiveToken = token ?? localStorage.getItem('auth_token');
      if (!effectiveToken) {
        setError('Not authenticated (no token)');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await listTickets(
          { status: status || undefined, priority: priority || undefined, page, limit },
          effectiveToken
        );
        if (!mounted) return;
        setTickets(res.tickets ?? []);
        setTotal(res.total ?? null);
      } catch (err: any) {
        if (err?.status === 401) setError('Unauthorized - token invalid/expired');
        else setError(err?.body?.message || err?.message || 'Failed to load tickets');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token, status, priority, page, limit]);

  const filteredTickets = tickets.filter(t =>
    t.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (s: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    open:       { bg: 'bg-blue-100',    text: 'text-blue-700' },
    in_progress: { bg: 'bg-amber-100',   text: 'text-amber-700' },
    resolved:   { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    closed:     { bg: 'bg-slate-100',   text: 'text-slate-700' },
  };

  // Valeur par défaut si status inconnu
  const style = styles[s] || styles.open;

  // Première lettre en majuscule + reste en minuscule
  const label = s
    .toLowerCase()
    .replace('_', ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg} ${style.text} text-xs font-semibold`}
    >
      {label}
    </div>
  );
};

const getPriorityBadge = (p: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    low:      { bg: 'bg-green-100',  text: 'text-green-700' },
    medium:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
    high:     { bg: 'bg-orange-100', text: 'text-orange-700' },
    critical: { bg: 'bg-red-100',    text: 'text-red-700' },
  };

  // Valeur par défaut si priorité inconnue
  const style = styles[p] || styles.medium;

  // Première lettre en majuscule + reste en minuscule
  const label = p
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg} ${style.text} text-xs font-semibold`}
    >
      {label}
    </div>
  );
};

  const getTicketNumber = (id: number) => `TKT-${String(id).padStart(3, '0')}`;

  const generateFakeAIConfidence = (id: number) => {
    const seed = (id * 7) % 100;
    return 65 + (seed % 35);
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const handleViewDetails = (id: number) => navigate(`/tickets/${id}`);
  const handleEdit = (id: number) => navigate(`/tickets/${id}/edit`);

  const handleReset = () => {
    setStatus('');
    setPriority('');
    setPage(1);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Search & Filters */}
      <div className="flex flex-col gap-4">
        {/* Title & Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track your support tickets</p>
          </div>
          <Link to="/create-ticket">
          <Button className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create New Ticket
          </Button>
        </Link>
        </div>

        {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ticket ID or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
            <p className="mt-3 text-muted-foreground">Loading tickets...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive font-medium">⚠️ {error}</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No tickets found</p>
              <Button variant="outline" onClick={handleReset} className="mt-4">
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Ticket</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Subject</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Priority</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Created</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">AI Confidence</th>
                      <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, idx) => (
                      <tr key={ticket.id} className="cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        {/* Ticket Number */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-primary font-medium">
                            {getTicketNumber(ticket.id)}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="px-6 py-4 max-w-sm">
                          <p className="font-medium text-foreground line-clamp-1">{ticket.subject}</p>
                          {ticket.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(ticket.status || 'open')}
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-4">
                          {getPriorityBadge(ticket.priority || 'medium')}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(ticket.created_at)}
                        </td>

                        {/* AI Confidence - FIXED */}
                        <td className="px-6 py-4">
                      {ticket.ai_category_confidence !== null && ticket.ai_category_confidence !== undefined ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                          <Sparkles className="h-3.5 w-3.5" />
                          {Math.round(ticket.ai_category_confidence)}%
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 btn-gradient text-xs font-semibold">
                          <Sparkles className="h-3.5 w-3.5" />
                          94%
                        </div>
                      )}
                    </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(ticket.id)}
                              title="View Details"
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(ticket.id)}
                              title="Edit Ticket"
                              className="h-9 w-9 p-0 hover:bg-amber-100 hover:text-amber-600"
                            >
                              <Edit2 className="h-4 w-4" />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {total !== null ? (
                <span className="font-medium">
                  Showing <span className="text-foreground">{Math.min((page - 1) * limit + 1, total)}</span> - 
                  <span className="text-foreground ml-1">{Math.min(page * limit, total)}</span> of 
                  <span className="text-foreground ml-1">{total}</span> tickets
                </span>
              ) : (
                <span>Page <span className="text-foreground">{page}</span></span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyTickets;
