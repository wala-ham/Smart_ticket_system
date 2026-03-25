import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {  FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrganization, updateOrganization, getOrganizationStats, Organization, OrgStats } from '@/services/companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Building2, Mail, Phone, MapPin, User, Calendar, Shield,
  Edit2, Save, X, ArrowLeft, AlertCircle, CheckCircle,
  BarChart2, Ticket, Users, CheckSquare
} from 'lucide-react';

const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const [editContractEndDate, setEditContractEndDate] = useState('');
  const [editContractPlan, setEditContractPlan] = useState('');
  const [editContractStatus, setEditContractStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const effectiveToken = token ?? localStorage.getItem('auth_token');
      if (!effectiveToken) { setError('Not authenticated'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [orgData, statsData] = await Promise.allSettled([
          getOrganization(id, effectiveToken),
          getOrganizationStats(id, effectiveToken),
        ]);

        if (orgData.status === 'fulfilled') {
          const o = orgData.value;
          setOrg(o);
          // Pre-fill edit form
          setEditName(o.name ?? '');
          setEditType(o.type ?? '');
          setEditEmail(o.email ?? '');
          setEditPhone(o.phone ?? '');
          setEditAddress(o.address ?? '');
          setEditIsActive(o.is_active ?? true);
          setEditContractEndDate(o.contract_end_date ?? '');
          setEditContractPlan(o.contract_plan ?? 'basic');
          setEditContractStatus(o.contract_status ?? 'active');
        } else {
          throw orgData.reason;
        }

        if (statsData.status === 'fulfilled') setStats(statsData.value);
      } catch (err: any) {
        if (err?.status === 401) setError('Unauthorized – token invalid/expired');
        else setError(err?.body?.message || err?.message || 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handleSave = async () => {
    if (!id || !org) return;
    const effectiveToken = token ?? localStorage.getItem('auth_token');
    if (!effectiveToken) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await updateOrganization(id, {
        name: editName.trim(),
        type: editType as any,
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        is_active: editIsActive,
        contract_end_date: editContractEndDate || undefined,
        contract_plan: editContractPlan,
        contract_status: editContractStatus,
      }, effectiveToken);

      setOrg({ ...org, ...updated });
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.body?.message || err?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (org) {
      setEditName(org.name ?? '');
      setEditType(org.type ?? '');
      setEditEmail(org.email ?? '');
      setEditPhone(org.phone ?? '');
      setEditAddress(org.address ?? '');
      setEditIsActive(org.is_active ?? true);
      setEditContractEndDate(org.contract_end_date ?? '');
      setEditContractPlan(org.contract_plan ?? 'basic');
      setEditContractStatus(org.contract_status ?? 'active');
    }
    setSaveError(null);
    setEditing(false);
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const adminName = org?.admin?.full_name ?? org?.admin?.name ?? (org?.admin_user_id ? `Admin #${org.admin_user_id}` : '—');
  const adminEmail = org?.admin?.email ?? '—';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="mt-3 text-muted-foreground">Loading organization...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={() => navigate('/admin/companies')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Companies
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!org) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back + Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/admin/companies')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Companies
            </button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="h-7 w-7 text-primary" />
              {org.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                org.type === 'physique' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'
              }`}>
                {org.type ? org.type.charAt(0).toUpperCase() + org.type.slice(1) : '—'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                org.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${org.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {org.is_active ? 'Active' : 'Suspended'}
              </span>
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Success / Error banners */}
        {saveSuccess && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Organization updated successfully!</p>
              </div>
            </CardContent>
          </Card>
        )}
        {saveError && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{saveError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Tickets', value: stats.total_tickets ?? '—', icon: Ticket, color: 'text-blue-600 bg-blue-100' },
              { label: 'Open Tickets', value: stats.open_tickets ?? '—', icon: BarChart2, color: 'text-amber-600 bg-amber-100' },
              { label: 'Resolved', value: stats.resolved_tickets ?? '—', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-100' },
              { label: 'Users', value: stats.total_users ?? '—', icon: Users, color: 'text-purple-600 bg-purple-100' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Organization Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Organization Details
            </CardTitle>
            {editing && <CardDescription>Edit the fields below and click Save to apply changes</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Name */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Company Name</p>
                {editing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="form-input w-full"
                    placeholder="Company name"
                  />
                ) : (
                  <p className="text-foreground font-medium">{org.name}</p>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                {editing ? (
                  <select value={editType} onChange={e => setEditType(e.target.value)} className="form-input w-full">
                    <option value="">Select type...</option>
                    <option value="physique">Physique</option>
                    <option value="morale">Morale</option>
                  </select>
                ) : (
                  <p className="text-foreground font-medium capitalize">{org.type ?? '—'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                {editing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="form-input w-full"
                    placeholder="contact@company.com"
                  />
                ) : (
                  <p className="text-foreground font-medium">{org.email ?? '—'}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                {editing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="form-input w-full"
                    placeholder="+21612345678"
                  />
                ) : (
                  <p className="text-foreground font-medium">{org.phone ?? '—'}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                {editing ? (
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="form-input w-full"
                    placeholder="Street, City, Country"
                  />
                ) : (
                  <p className="text-foreground font-medium">{org.address ?? '—'}</p>
                )}
              </div>
            </div>

            {/* Status toggle (edit only) */}
            {editing && (
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <div
                      onClick={() => setEditIsActive(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${editIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${editIsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium">{editIsActive ? 'Active' : 'Suspended'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Dates — read only always */}
            <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Created At</p>
                  <p className="text-sm text-foreground">{formatDate(org.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm text-foreground">{formatDate(org.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Account Card — read only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Admin Account
            </CardTitle>
            <CardDescription>Organization administrator — manage via user settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {adminName !== '—' ? adminName.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="font-semibold text-foreground">{adminName}</p>
                <p className="text-sm text-muted-foreground">{adminEmail}</p>
              </div>
              {org.admin_user_id && (
                <span className="ml-auto text-xs text-muted-foreground font-mono">ID #{org.admin_user_id}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nouvelle Card Contract — après Admin Account Card */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileText className="h-5 w-5 text-primary" /> Contract
    </CardTitle>
    <CardDescription>Subscription plan, expiration and limits</CardDescription>
  </CardHeader>
  <CardContent className="space-y-5">

    {/* Status */}
    <div className="flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Shield className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contract Status</p>
        {editing ? (
          <select value={editContractStatus} onChange={e => setEditContractStatus(e.target.value)} className="form-input w-full">
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
        ) : (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            org.contract_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
            org.contract_status === 'trial'  ? 'bg-blue-100 text-blue-700' :
            org.contract_status === 'suspended' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {org.contract_status ?? '—'}
          </span>
        )}
      </div>
    </div>

    {/* Plan */}
    <div className="flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
        {editing ? (
          <select value={editContractPlan} onChange={e => setEditContractPlan(e.target.value)} className="form-input w-full">
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        ) : (
          <p className="text-foreground font-medium capitalize">{org.contract_plan ?? '—'}</p>
        )}
      </div>
    </div>

    {/* Expiration Date */}
    <div className="flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expiration Date</p>
        {editing ? (
          <input
            type="date"
            value={editContractEndDate}
            onChange={e => setEditContractEndDate(e.target.value)}
            className="form-input w-full"
          />
        ) : (
          <p className={`text-foreground font-medium ${
            org.contract_end_date && new Date(org.contract_end_date) < new Date() ? 'text-red-600' : ''
          }`}>
            {org.contract_end_date ? new Date(org.contract_end_date).toLocaleDateString('fr-FR') : '—'}
            {org.contract_end_date && new Date(org.contract_end_date) < new Date() && (
              <span className="ml-2 text-xs text-red-500 font-semibold">EXPIRED</span>
            )}
          </p>
        )}
      </div>
    </div>

    {/* Max Users */}
    {/* <div className="flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Max Users</p>
        {editing ? (
          <input
            type="number"
            value={editMaxUsers}
            onChange={e => setEditMaxUsers(parseInt(e.target.value))}
            className="form-input w-full"
            min={1}
            max={500}
          />
        ) : (
          <p className="text-foreground font-medium">{org.max_users ?? '—'}</p>
        )}
      </div>
    </div> */}

  </CardContent>
</Card>

      </div>
    </div>
  );
};

export default OrganizationDetail;
