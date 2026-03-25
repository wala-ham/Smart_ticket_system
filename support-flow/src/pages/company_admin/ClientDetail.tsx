import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser, updateUser, User } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft, Edit2, Save, X, AlertCircle, CheckCircle,
  Mail, UserCheck, Calendar, Shield
} from 'lucide-react';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const tk = token ?? localStorage.getItem('auth_token');
      if (!tk) { setError('Not authenticated'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const u = await getUser(id, tk);
        setClient(u);
        setEditName(u.full_name ?? '');
        setEditEmail(u.email ?? '');
        setEditIsActive(u.is_active ?? true);
      } catch (err: any) {
        setError(err?.body?.message || err?.message || 'Failed to load client');
      } finally { setLoading(false); }
    };
    load();
  }, [id, token]);

  const handleSave = async () => {
    if (!id || !client) return;
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const updated = await updateUser(id, {
        full_name: editName.trim(),
        email: editEmail.trim(),
        is_active: editIsActive,
      }, tk);
      setClient({ ...client, ...updated });
      setSaveSuccess(true); setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.body?.message || err?.message || 'Failed to update client');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (client) {
      setEditName(client.full_name ?? '');
      setEditEmail(client.email ?? '');
      setEditIsActive(client.is_active ?? true);
    }
    setSaveError(null); setEditing(false);
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="mt-3 text-muted-foreground">Loading client...</p>
      </div>
    </div>
  );

  if (error || !client) return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error ?? 'Client not found'}</p>
          <Button variant="outline" onClick={() => navigate('/admin/clients')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate('/admin/clients')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to Clients
            </button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {client.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{client.full_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                    Client
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${client.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${client.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {client.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
                <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Banners */}
        {saveSuccess && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Client updated successfully!</p>
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

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Client Details
            </CardTitle>
            {editing && <CardDescription>Edit the fields below then click Save</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Full Name */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Full Name</p>
                {editing
                  ? <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="form-input w-full" />
                  : <p className="text-foreground font-medium">{client.full_name}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                {editing
                  ? <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="form-input w-full" />
                  : <p className="text-foreground font-medium">{client.email}</p>}
              </div>
            </div>

            {/* Status toggle */}
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
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${editIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${editIsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium">{editIsActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Registered</p>
                  <p className="text-sm text-foreground">{formatDate(client.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm text-foreground">{formatDate(client.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDetail;
