import React, { useEffect, useState } from 'react';
import {
  Tag, Trash2, Search, Plus, X, Edit2, Check, RefreshCw,
  AlertTriangle, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
} from '@/services/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const SWATCHES = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#64748B',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? '#000' : 'transparent' }}
        />
      ))}
    </div>
  );
}

function EditRow({ cat, token, onDone }: { cat: Category; token: string; onDone: (updated: Category) => void }) {
  const [name, setName] = useState(cat.name);
  const [desc, setDesc] = useState(cat.description ?? '');
  const [team, setTeam] = useState(cat.default_team ?? '');
  const [color, setColor] = useState(cat.color ?? '#6366F1');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return setErr('Name is required');
    setSaving(true); setErr(null);
    try {
      const updated = await updateCategory(cat.id, { name, description: desc, default_team: team, color }, token);
      onDone(updated);
    } catch (e: any) {
      setErr(e?.body?.message ?? e?.message ?? 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <tr className="bg-indigo-50/60 border-b">
      <td className="px-6 py-4" colSpan={4}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Name" />
          <input value={team} onChange={e => setTeam(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Default Team" />
          <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Description" />
        </div>
        <div className="flex items-center justify-between">
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} Sauvegarder
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDone(cat)}>Annuler</Button>
          </div>
        </div>
        {err && <p className="text-xs text-red-600 mt-2">⚠️ {err}</p>}
      </td>
    </tr>
  );
}

const ManageCategories: React.FC = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Suppression State
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const cats = await listCategories(tk());
      setCategories(cats);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.message ?? 'Failed to load categories');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  // LOGIQUE DE SUPPRESSION MODALE
  const executeDelete = async () => {
    if (!catToDelete) return;
    setDeletingId(catToDelete.id);
    setDeleteError(null);
    try {
      await deleteCategory(catToDelete.id, tk());
      setCategories(prev => prev.filter(c => c.id !== catToDelete.id));
      setCatToDelete(null);
    } catch (e: any) {
      setDeleteError(e?.body?.message ?? e?.message ?? 'Failed to delete');
    } finally { setDeletingId(null); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) return setCreateError('Name is required');
    setCreating(true);
    try {
      const cat = await createCategory({ name: newName.trim(), description: newDesc, default_team: newTeam, color: newColor }, tk());
      setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setShowModal(false); resetModal();
    } catch (e: any) {
      setCreateError(e?.body?.message ?? e?.message ?? 'Failed to create');
    } finally { setCreating(false); }
  };

  const resetModal = () => {
    setNewName(''); setNewDesc(''); setNewTeam(''); setNewColor('#6366F1'); setCreateError(null);
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Catégories</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérer les types de tickets</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" onClick={() => { resetModal(); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter une Catégorie
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-input rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="px-6 py-4 text-left font-semibold">Catégorie</th>
                    <th className="px-6 py-4 text-left font-semibold">Équipe par défaut</th>
                    <th className="px-6 py-4 text-left font-semibold">Créée le</th>
                    <th className="px-6 py-4 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cat => (
                    editingId === cat.id ? (
                      <EditRow key={cat.id} cat={cat} token={tk()} onDone={(upd) => { setCategories(prev => prev.map(c => c.id === upd.id ? upd : c)); setEditingId(null); }} />
                    ) : (
                      <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full flex items-center justify-center shadow-inner text-white" style={{ backgroundColor: cat.color ?? '#6366F1' }}>
                              <Tag className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-indigo-600 transition-colors">{cat.name}</p>
                              {cat.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{cat.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cat.default_team ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{cat.default_team}</span> : '—'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {cat.created_at ? new Date(cat.created_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(cat.id)} className="h-8 w-8 p-0 hover:text-indigo-600"><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setCatToDelete(cat)} className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL SUPPRESSION (BLUE/INDIGO STYLE) */}
      {catToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4"><AlertTriangle className="h-8 w-8 text-red-600" /></div>
              <h3 className="text-lg font-bold">Supprimer "{catToDelete.name}" ?</h3>
              <p className="text-sm text-muted-foreground mt-2">Cette action est irréversible.</p>
              {deleteError && <p className="mt-3 text-xs text-red-500 font-medium bg-red-50 p-2 rounded w-full">{deleteError}</p>}
            </div>
            <div className="flex gap-3 mt-8">
              <button className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-slate-50 transition-colors" onClick={() => setCatToDelete(null)}>Annuler</button>
              <button className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2" onClick={executeDelete} disabled={!!deletingId}>
                {deletingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Nouvelle Catégorie</CardTitle>
                <button onClick={() => { setShowModal(false); resetModal(); }} className="p-1 rounded hover:bg-muted transition"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4 text-left">
                {createError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {createError}</div>}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Nom</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Équipe</label>
                  <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} className="w-full px-3 py-2 bg-muted/50 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Couleur</label>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={creating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">{creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Créer</Button>
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

export default ManageCategories;