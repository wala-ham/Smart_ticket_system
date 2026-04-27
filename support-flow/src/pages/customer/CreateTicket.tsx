// src/pages/CreateTicket.tsx — version avec analyse IA temps réel
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createTicketWithFiles } from '@/services/tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Send, Upload, X, Building2, Sparkles, Loader2 } from 'lucide-react';
import { AIAnalysisBadge } from '@/components/AIAnalysisBadge';

const API_BASE = 'http://localhost:5000';

type AIAnalysis = { category?: string; department_name?: string; priority?: string; confidence?: number; summary?: string; sentiment?: string; keywords?: string[] };

const CreateTicket: React.FC = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [subject, setSubject]           = useState('');
  const [description, setDescription]   = useState('');
  const [categoryId, setCategoryId]     = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [attachments, setAttachments]   = useState<File[]>([]);

  const [categories, setCategories]     = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments]   = useState<{ id: number; name: string }[]>([]);

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // IA
  const [aiAnalysis, setAiAnalysis]     = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const aiDebounceRef                   = useRef<NodeJS.Timeout | null>(null);

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(j => { const c = j?.data?.categories ?? j?.data ?? j?.categories ?? []; setCategories(Array.isArray(c) ? c : []); })
      .catch(() => {}).finally(() => setCategoriesLoading(false));
    fetch(`${API_BASE}/api/departments`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(j => { const d = j?.data?.departments ?? j?.departments ?? []; setDepartments(Array.isArray(d) ? d.filter((x: any) => x.is_active !== false) : []); })
      .catch(() => {}).finally(() => setDepartmentsLoading(false));
  }, [token]);

  // ── Analyse IA en temps réel (debounce 1.5s) ─────────────────────────────
  // useEffect(() => {
  //   if (subject.length < 5 || description.length < 10) { setAiAnalysis(null); return; }
  //   if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
  //   aiDebounceRef.current = setTimeout(async () => {
  //     setAiLoading(true);
  //     try {
  //       const res  = await fetch(`${API_BASE}/api/ai/analyze-ticket`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
  //         body: JSON.stringify({ subject, description }),
  //       });
  //       const json = await res.json();
  //       if (json?.success && json?.data) {
  //         setAiAnalysis(json.data);
  //         // Auto-sélectionner la catégorie si pas encore choisie
  //         if (!categoryId && json.data.category_id) setCategoryId(json.data.category_id);
  //       }
  //     } catch { /* ignore */ }
  //     finally { setAiLoading(false); }
  //   }, 1500);
  //   return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current); };
  // }, [subject, description]);
  // ── Analyse IA en temps réel (debounce 1.5s) ─────────────────────────────
  useEffect(() => {
    if (subject.length < 5 || description.length < 10) { setAiAnalysis(null); return; }
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

    aiDebounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/ai/analyze-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
          body: JSON.stringify({ subject, description }),
        });
        const json = await res.json();

        if (json?.success && json?.data) {
          setAiAnalysis(json.data);

          // 1. Auto-sélectionner la catégorie si vide
          if (!categoryId && json.data.category_id) {
            setCategoryId(json.data.category_id);
          }

          // 2. NOUVEAU : Auto-sélectionner le département si vide
          if (!departmentId && json.data.department_id) {
            setDepartmentId(json.data.department_id);
          }
        }
      } catch (err) {
        console.error("Erreur IA:", err);
      } finally {
        setAiLoading(false);
      }
    }, 1500);

    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current); };
  }, [subject, description]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!subject.trim())     return setError('Subject is required');
    if (!description.trim()) return setError('Description is required');
    setLoading(true);
    try {
      await createTicketWithFiles({
        subject: subject.trim(), description: description.trim(),
        category_id:   categoryId   ? Number(categoryId)   : undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        files: attachments.length > 0 ? attachments : undefined,
      }, tk());
      setSuccess(true);
      setTimeout(() => navigate('/tickets', { replace: true }), 2000);
    } catch (err: any) {
      setError(err?.body?.message || err?.message || 'Failed to create ticket');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Ticket</h1>
          <p className="text-muted-foreground mt-2">Notre IA analyse votre demande en temps réel</p>
        </div>

        {success && (
          <Card className="border-emerald-200 bg-emerald-50"><CardContent className="pt-6">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">✓</div>
              <div><p className="font-semibold">Ticket créé avec succès!</p><p className="text-sm">Redirection...</p></div>
            </div>
          </CardContent></Card>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/5"><CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive"><AlertCircle className="h-5 w-5" /><p className="font-medium">{error}</p></div>
          </CardContent></Card>
        )}

        <Card>
          <CardHeader><CardTitle>Détails du Ticket</CardTitle><CardDescription>Décrivez votre problème — l'IA détectera automatiquement la catégorie et la priorité</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Sujet <span className="text-destructive">*</span></label>
                <input type="text" placeholder="Décrivez brièvement votre problème..."
                  value={subject} onChange={e => setSubject(e.target.value)}
                  disabled={loading} className="form-input w-full" required />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Description <span className="text-destructive">*</span></label>
                <textarea placeholder="Décrivez votre problème en détail..."
                  value={description} onChange={e => setDescription(e.target.value)}
                  disabled={loading} className="form-input w-full min-h-32 resize-none" required />
              </div>

              {/* ── Analyse IA temps réel ──────────────────────────────────── */}
              {(aiLoading || aiAnalysis) && (
                <div className="space-y-2">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-purple-600 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyse IA en cours...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <AIAnalysisBadge analysis={aiAnalysis} />
                  ) : null}
                </div>
              )}

              {/* Category + Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Catégorie
                    {aiAnalysis?.category && !categoryId && (
                      <span className="ml-2 text-xs text-purple-600 font-normal">
                        <Sparkles className="h-3 w-3 inline" /> IA suggère: {aiAnalysis.category}
                      </span>
                    )}
                  </label>
                  {categoriesLoading ? <div className="p-2 text-sm text-muted-foreground">Chargement...</div> : (
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loading} className="form-input">
                      <option value="">Auto (IA)</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                {/* <div className="space-y-2">
                  <label className="text-sm font-semibold">Département <span className="text-xs text-muted-foreground">(Optionnel)</span></label>
                  {departmentsLoading ? <div className="p-2 text-sm text-muted-foreground">Chargement...</div> : (
                    <select value={departmentId} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loading} className="form-input">
                      <option value="">Auto-assign</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div> */}
                <div className="space-y-2">
  <label className="text-sm font-semibold">
    Département 
    {/* Petit indicateur visuel IA */}
    {aiAnalysis?.department_name && !departmentId && (
      <span className="ml-2 text-xs text-purple-600 font-normal">
        <Sparkles className="h-3 w-3 inline" /> IA suggère: {aiAnalysis.department_name}
      </span>
    )}
  </label>
  {departmentsLoading ? <div className="p-2 text-sm text-muted-foreground">Chargement...</div> : (
    <select 
      value={departmentId} 
      onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
      disabled={loading} 
      className="form-input"
    >
      <option value="">Auto-assign (IA)</option>
      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  )}
</div>
              </div>

              {/* Priority info from AI */}
              {aiAnalysis?.priority && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span>Priorité détectée par l'IA : <strong className="text-foreground">{aiAnalysis.priority}</strong> ({aiAnalysis.confidence}% confiance)</span>
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Pièces jointes <span className="text-muted-foreground text-xs">(Optionnel)</span></label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition">
                  <input type="file" multiple onChange={handleFileChange} disabled={loading}
                    className="hidden" id="file-input" accept="image/*,.pdf,.doc,.docx,.txt" />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Cliquer pour uploader</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOC (Max 10MB)</p>
                    </div>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(idx)} disabled={loading} className="p-1 hover:bg-destructive/10 rounded">
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading || !subject.trim() || !description.trim()} className="gradient-primary flex-1 gap-2">
                  <Send className="h-4 w-4" /> {loading ? 'Création...' : 'Créer le Ticket'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/tickets')} disabled={loading} className="flex-1">Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTicket;
