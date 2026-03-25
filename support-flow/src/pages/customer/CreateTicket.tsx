// src/pages/CreateTicket.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createTicketWithFiles } from '@/services/tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Send, Upload, X, Building2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const CreateTicket: React.FC = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [subject, setSubject]           = useState('');
  const [description, setDescription]   = useState('');
  const [categoryId, setCategoryId]     = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [attachments, setAttachments]   = useState<File[]>([]);

  const [categories, setCategories]     = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments]   = useState<{ id: number; name: string; description?: string }[]>([]);

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  // ── Fetch categories ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/categories`, {
          headers: { Authorization: `Bearer ${tk()}` }
        });
        const json = await res.json();
        const cats = json?.data?.categories ?? json?.data ?? json?.categories ?? [];
        setCategories(Array.isArray(cats) ? cats : []);
      } catch { /* ignore */ }
      finally { setCategoriesLoading(false); }
    };
    fetch_();
  }, [token]);

  // ── Fetch departments ───────────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/departments`, {
          headers: { Authorization: `Bearer ${tk()}` }
        });
        const json = await res.json();
        const depts = json?.data?.departments ?? json?.departments ?? [];
        setDepartments(Array.isArray(depts) ? depts.filter((d: any) => d.is_active !== false) : []);
      } catch { /* ignore */ }
      finally { setDepartmentsLoading(false); }
    };
    fetch_();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeAttachment = (index: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim())     return setError('Subject is required');
    if (!description.trim()) return setError('Description is required');
    if (!categoryId)         return setError('Please select a category');

    setLoading(true);
    try {
      await createTicketWithFiles({
        subject:       subject.trim(),
        description:   description.trim(),
        category_id:   Number(categoryId),
        department_id: departmentId ? Number(departmentId) : undefined,
        files:         attachments.length > 0 ? attachments : undefined,
      }, tk());

      setSuccess(true);
      setSubject(''); setDescription(''); setCategoryId(''); setDepartmentId(''); setAttachments([]);
      setTimeout(() => navigate('/tickets', { replace: true }), 2000);
    } catch (err: any) {
      setError(err?.body?.message || err?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Ticket</h1>
          <p className="text-muted-foreground mt-2">Describe your issue and we'll route it to the right team</p>
        </div>

        {success && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-emerald-700">
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">✓</div>
                <div>
                  <p className="font-semibold">Ticket created successfully!</p>
                  <p className="text-sm">Redirecting to tickets list…</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
            <CardDescription>Fill in the information below to create a new support ticket</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Subject <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" placeholder="Brief description of your issue…"
                  value={subject} onChange={e => setSubject(e.target.value)}
                  disabled={loading} className="form-input w-full" required
                />
                <p className="text-xs text-muted-foreground">Max 255 characters</p>
              </div>

              {/* Category + Department side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Category <span className="text-destructive">*</span>
                  </label>
                  {categoriesLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loading} className="form-input" required
                    >
                      <option value="">Select category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Department <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  {departmentsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loading} className="form-input"
                    >
                      <option value="">Auto-assign…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If selected, ticket goes to this department first
                  </p>
                </div>
              </div>

              {/* Department info banner */}
              {departmentId && (
                <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                  <Building2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-700">
                    Ticket will be <strong>routed to {departments.find(d => d.id === departmentId)?.name}</strong> and 
                    automatically assigned to the least-busy available employee.
                    If unresolved, it will be escalated to the general worklist.
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  placeholder="Provide detailed information about your issue…"
                  value={description} onChange={e => setDescription(e.target.value)}
                  disabled={loading} className="form-input w-full min-h-32 resize-none" required
                />
                <p className="text-xs text-muted-foreground">Describe your issue in detail to help us assist you better</p>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Attachments <span className="text-muted-foreground">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition">
                  <input
                    type="file" multiple onChange={handleFileChange} disabled={loading}
                    className="hidden" id="file-input" accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOC, DOCX, TXT (Max 10MB each)</p>
                    </div>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Attached files ({attachments.length})</p>
                    <div className="space-y-1">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground">📄</span>
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button" onClick={() => removeAttachment(idx)} disabled={loading}
                            className="p-1 hover:bg-destructive/10 rounded transition" title="Remove"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !subject.trim() || !description.trim() || !categoryId}
                  className="gradient-primary flex-1 gap-2"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Creating…' : 'Create Ticket'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/tickets')} disabled={loading} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">📝 Tips for creating a ticket:</h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Be clear and concise with your subject</li>
                <li>Select the <strong>Department</strong> if you know which team handles your issue</li>
                <li>Without a department, the system assigns automatically</li>
                <li>Attach relevant files to help us understand your issue better</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTicket;
