import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Trash2, Search, ChevronLeft, ChevronRight,
  Plus, UserCheck, X, Eye as EyeIcon, EyeOff,
  AlertTriangle, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listUsers, createClient, deleteUser, User } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ManageClients: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Liste et pagination
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);

  // Suppression
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal Création
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) { setError('Not authenticated'); return; }
    setLoading(true); setError(null);
    try {
      const res = await listUsers({ role: 'client', page, limit }, tk);
      setClients(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.body?.message || err?.message || 'Failed to load clients');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, page]);

  // Logique de suppression (Modal)
  const executeDelete = async () => {
    if (!clientToDelete) return;
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return;

    setDeletingId(clientToDelete);
    setDeleteError(null);
    try {
      await deleteUser(clientToDelete, tk);
      setClients(prev => prev.filter(c => c.id !== clientToDelete));
      if (total !== null) setTotal(total - 1);
      setClientToDelete(null); 
    } catch (err: any) {
      setDeleteError(err?.body?.message || err?.message || 'Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) return setCreateError('Full name is required');
    if (!newEmail.trim()) return setCreateError('Email is required');
    if (!newPassword.trim()) return setCreateError('Password is required');
    
    const tk = token ?? localStorage.getItem('auth_token');
    if (!tk) return setCreateError('Not authenticated');
    
    setCreating(true);
    try {
      await createClient({ full_name: newName.trim(), email: newEmail.trim(), password: newPassword }, tk);
      setShowModal(false);
      resetModal();
      await load();
    } catch (err: any) {
      setCreateError(err?.body?.message || err?.message || 'Failed to create client');
    } finally { setCreating(false); }
  };

  const resetModal = () => {
    setNewName(''); setNewEmail(''); setNewPassword('');
    setShowPwd(false); setCreateError(null);
  };

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusDot = (active?: boolean) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérer les comptes clients</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" onClick={() => { resetModal(); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter un Client
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-input rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 text-center text-destructive text-sm font-medium">⚠️ {error}</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Aucun client trouvé</p>
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setPage(1); }} className="mt-4">Réinitialiser</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="px-6 py-4 text-left font-semibold">Client</th>
                      <th className="px-6 py-4 text-left font-semibold">Statut</th>
                      <th className="px-6 py-4 text-left font-semibold">Enregistré</th>
                      <th className="px-6 py-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(client => (
                      <tr key={client.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                          <div className="flex items-center gap-3 cursor-pointer">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                              {client.full_name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">{client.full_name}</p>
                              <p className="text-[11px] text-muted-foreground">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusDot(client.is_active)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{formatDate(client.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clients/${client.id}`)} className="h-8 w-8 p-0 hover:text-indigo-600">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setClientToDelete(client.id)} className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50">
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

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground"><b>{}</b> </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={total !== null && page * limit >= total}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* MODAL SUPPRESSION */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold">Supprimer ce client ?</h3>
              <p className="text-sm text-muted-foreground mt-2">Cette action est définitive et révoquera tous ses accès.</p>
              {deleteError && <p className="mt-3 text-xs text-red-500 font-medium bg-red-50 p-2 rounded w-full">{deleteError}</p>}
            </div>
            <div className="flex gap-3 mt-8">
              <button className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-slate-50 transition-colors" onClick={() => setClientToDelete(null)}>Annuler</button>
              <button className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2" onClick={executeDelete} disabled={!!deletingId}>
                {deletingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Nouveau Client</CardTitle>
                <button onClick={() => { setShowModal(false); resetModal(); }} className="p-1 rounded hover:bg-muted transition">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                {createError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {createError}
                  </div>
                )}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Nom Complet</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Email</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                      required minLength={6}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={creating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Créer le Client
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1">Annuler</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageClients;