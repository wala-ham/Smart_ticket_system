import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Trash2, Search, ChevronLeft, ChevronRight,
  Plus, Building2, FileText, Download, ExternalLink, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listOrganizations, deleteOrganization, Organization } from '@/services/companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ─── PDF Cell ─────────────────────────────────────────────────────────────────
const PdfCell: React.FC<{ org: Organization }> = ({ org }) => {
  const [downloading, setDownloading] = useState(false);

  if (!org.contract_pdf_url) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
        <FileText className="h-3.5 w-3.5" /> No contract
      </span>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res  = await fetch(org.contract_pdf_url!);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Contract_${(org.name ?? 'org').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Preview */}
      <a
        href={org.contract_pdf_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition"
      >
        <ExternalLink className="h-3 w-3" /> Preview
      </a>

      {/* Download */}
      <button
        onClick={e => { e.stopPropagation(); handleDownload(); }}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition disabled:opacity-50"
      >
        {downloading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Download className="h-3 w-3" />}
        {downloading ? 'Downloading...' : 'Download'}
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ManageCompanies: React.FC = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [page, setPage]                   = useState(1);
  const [limit]                           = useState(10);
  const [total, setTotal]                 = useState<number | null>(null);
  const [deletingId, setDeletingId]       = useState<number | null>(null);

  const load = async () => {
    const effectiveToken = token ?? localStorage.getItem('auth_token');
    if (!effectiveToken) { setError('Not authenticated (no token)'); return; }
    setLoading(true); setError(null);
    try {
      const res = await listOrganizations({ page, limit }, effectiveToken);
      setOrganizations(res.organizations ?? []);
      setTotal(res.total ?? null);
    } catch (err: any) {
      if (err?.status === 401) setError('Unauthorized - token invalid/expired');
      else setError(err?.body?.message || err?.message || 'Failed to load organizations');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, page]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) return;
    const effectiveToken = token ?? localStorage.getItem('auth_token');
    if (!effectiveToken) return;
    setDeletingId(id);
    try {
      await deleteOrganization(id, effectiveToken);
      setOrganizations(prev => prev.filter(o => o.id !== id));
      if (total !== null) setTotal(total - 1);
    } catch (err: any) {
      alert(err?.body?.message || err?.message || 'Failed to delete organization');
    } finally { setDeletingId(null); }
  };

  const filtered = organizations.filter(o =>
    o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeBadge = (type?: string) => {
    const s = type === 'physique' ? { bg: 'bg-sky-100', text: 'text-sky-700' }
            : type === 'morale'   ? { bg: 'bg-violet-100', text: 'text-violet-700' }
            :                       { bg: 'bg-slate-100', text: 'text-slate-600' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        {type ? type.charAt(0).toUpperCase() + type.slice(1) : '—'}
      </span>
    );
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage all registered organizations</p>
          </div>
          <Button className="btn-gradient" onClick={() => navigate('/admin/companies/create')}>
            <Plus className="h-4 w-4 mr-2" /> Add Company
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name or email..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="form-input pl-10" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="mt-3 text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">⚠️ {error}</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6">
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-lg">No companies found</p>
            <Button variant="outline" onClick={() => { setSearchQuery(''); setPage(1); }} className="mt-4">Clear search</Button>
          </div>
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-0 shadow-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Company</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Type</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Contact</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Admin</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Created</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Plan</th>
                      <th className="px-6 py-4 text-left font-semibold text-foreground">Contract</th>
                      <th className="px-6 py-4 text-center font-semibold text-foreground">
                        <div className="flex items-center justify-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" /> PDF
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(org => (
                      <tr key={org.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/companies/${org.id}`)}>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{org.name}</p>
                              {org.address && <p className="text-xs text-muted-foreground">{org.address}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">{getTypeBadge(org.type)}</td>

                        <td className="px-6 py-4">
                          <p className="text-foreground">{org.email ?? '—'}</p>
                          {org.phone && <p className="text-xs text-muted-foreground">{org.phone}</p>}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-foreground">
                            {org.admin?.name ?? org.admin?.full_name ?? org.admin_name ?? (org.admin_user_id ? `Admin #${org.admin_user_id}` : '—')}
                          </p>
                          {(org.admin?.email ?? org.admin_email) && (
                            <p className="text-xs text-muted-foreground">{org.admin?.email ?? org.admin_email}</p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-muted-foreground">{formatDate(org.created_at)}</td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            org.contract_plan === 'enterprise' ? 'bg-violet-100 text-violet-700' :
                            org.contract_plan === 'pro'        ? 'bg-blue-100 text-blue-700' :
                                                                 'bg-slate-100 text-slate-600'
                          }`}>{org.contract_plan ?? 'basic'}</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            org.contract_status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                            org.contract_status === 'trial'     ? 'bg-blue-100 text-blue-700'       :
                            org.contract_status === 'suspended' ? 'bg-amber-100 text-amber-700'     :
                                                                  'bg-red-100 text-red-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              org.contract_status === 'active'    ? 'bg-emerald-500' :
                              org.contract_status === 'trial'     ? 'bg-blue-500'    :
                              org.contract_status === 'suspended' ? 'bg-amber-500'   : 'bg-red-500'
                            }`} />
                            {org.contract_status ?? 'active'}
                          </span>
                          {org.contract_end_date && (
                            <p className={`text-xs mt-1 ${new Date(org.contract_end_date) < new Date() ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                              {new Date(org.contract_end_date) < new Date() ? '⚠ ' : ''}
                              Exp: {new Date(org.contract_end_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </td>

                        {/* ── PDF column — lit contract_pdf_url depuis la DB ── */}
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <PdfCell org={org} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm"
                              onClick={() => navigate(`/admin/companies/${org.id}`)}
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                              onClick={() => handleDelete(org.id)}
                              disabled={deletingId === org.id}
                              className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600" title="Delete">
                              <Trash2 className="h-4 w-4" />
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {total !== null ? (
                <span className="font-medium">
                  Showing <span className="text-foreground">{Math.min((page - 1) * limit + 1, total)}</span>–
                  <span className="text-foreground">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="text-foreground">{total}</span> companies
                </span>
              ) : <span>Page <span className="text-foreground">{page}</span></span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={total !== null && page * limit >= total} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageCompanies;
