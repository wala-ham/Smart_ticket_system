import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getTicket, updateTicket, escalateTicket } from '@/services/tickets';
import TicketWorkflow from '@/components/TicketWorkflow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Paperclip,
  Download,
  Eye,
  X,
  Trash2,
  Plus,
  Sparkles,
  Filter,
  Save,
  Loader2,
  ArrowUpCircle,
  AlertTriangle,
  ChevronsUpDown,
  Building2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE = 'http://localhost:5000';

type Ticket = {
  id: number;
  ticket_number?: string;
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  category_id?: number;
  department_id?: number | null;
  workflow_step?: 'department' | 'worklist';
  in_worklist?: boolean;
  created_by?: number;
  assigned_to?: number | null;
  assignee?: { id: number; full_name: string; email: string; team?: string | null } | null;
  category?: { id: number; name: string; color?: string } | null;
  department?: { id: number; name: string } | null;
  ai_category_confidence?: number | null;
  created_at?: string;
  updated_at?: string;
  attachments?: any[];
  [key: string]: any;
};

type Attachment = {
  id: number;
  filename: string;
  originalname?: string;
  size?: number;
  mimetype?: string;
  url?: string;
  [key: string]: any;
};

type Employee = {
  id: number;
  full_name: string;
  email: string;
  role?: string;
  team?: string | null;
};

type Category = { id: number; name: string; color?: string };

const TicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [ticket, setTicket]           = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); 
  // edit mode
  const [editing, setEditing]         = useState(false);
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId]   = useState<number | ''>('');
  const [status, setStatus]           = useState('');
  const [priority, setPriority]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [uploading]                   = useState(false);

  // categories
  const [categories, setCategories]   = useState<Category[]>([]);

  // assign
  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [assigneeObj, setAssigneeObj]       = useState<Employee | null>(null);
  const [assigning, setAssigning]           = useState(false);
  const canAssign = user?.role === 'super_admin' || user?.role === 'company_admin';
  const isStaff   = user?.role === 'super_admin' || user?.role === 'company_admin' || user?.role === 'employee';

  // escalate
  const [escalating, setEscalating] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  // modal preview
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalUrl, setModalUrl]       = useState<string | null>(null);
  const [modalMime, setModalMime]     = useState<string | undefined>(undefined);
  const [modalName, setModalName]     = useState<string | undefined>(undefined);
  const [modalLoading, setModalLoading] = useState(false);

  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  // ── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/categories`, {
      headers: { Authorization: `Bearer ${tk()}` }
    })
      .then(r => r.json())
      .then(j => {
        const cats = j?.data?.categories ?? j?.data ?? j?.categories ?? j ?? [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setCategories([]));
  }, [token]);

  // ── Fetch employees (admin only) ──────────────────────────────────────────
  useEffect(() => {
    if (!canAssign) return;
    setEmployeesLoading(true);
    fetch(`${API_BASE}/api/users/employees/available`, {
      headers: { Authorization: `Bearer ${tk()}` }
    })
      .then(r => r.json())
      .then(j => {
        const list: Employee[] = j?.data?.employees ?? j?.data ?? j?.employees ?? [];
        setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setEmployeesLoading(false));
  }, [canAssign, token]);

  // ── Fetch ticket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setError('No ticket ID provided'); setLoading(false); return; }
    getTicket(id, tk())
      .then(response => {
        const ticketData: Ticket = response?.ticket ?? response?.data ?? response;
        setTicket(ticketData);
        setAttachments(Array.isArray(ticketData?.attachments) ? ticketData.attachments : []);
        setSubject(ticketData?.subject ?? '');
        setDescription(ticketData?.description ?? '');
        setCategoryId(ticketData?.category_id ?? '');
        setStatus(ticketData?.status ?? '');
        setPriority(ticketData?.priority ?? '');
        if (ticketData?.assigned_to) setSelectedEmployeeId(ticketData.assigned_to);
        if (ticketData?.assignee) setAssigneeObj(ticketData.assignee);
      })
      .catch(err => setError(err?.body?.message || err?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [id, token]);

  // ── Assign ────────────────────────────────────────────────────────────────
  const handleAssignUpdate = async (directValue?: number | '') => {
    if (!ticket) return;
    const empId = directValue !== undefined ? directValue : selectedEmployeeId;
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticket.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ employee_id: empId || null }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.message || 'Failed'); }
      setTicket(prev => prev ? { ...prev, assigned_to: empId || null } : prev);
      if (directValue !== undefined) setSelectedEmployeeId(directValue);
      const emp = employees.find(e => e.id === empId) ?? null;
      setAssigneeObj(emp);
      setSuccessMsg(emp ? `Ticket assigned to ${emp.full_name}` : 'Assignment removed');
    } catch (err: any) {
      alert(err?.message || 'Failed to assign');
    } finally { setAssigning(false); }
  };

  // ── Escalate ──────────────────────────────────────────────────────────────
  const handleEscalate = async () => {
    if (!ticket) return;
    if (!confirm('Escalate this ticket to the worklist? It will be visible to all admins.')) return;
    setEscalating(true);
    try {
      await escalateTicket(ticket.id, tk());
      setTicket(prev => prev ? { ...prev, workflow_step: 'worklist', in_worklist: true } : prev);
      setSuccessMsg('Ticket escalated to worklist successfully!');
    } catch (err: any) {
      alert(err?.body?.message || err?.message || 'Failed to escalate');
    } finally { setEscalating(false); }
  };

  const executeEscalation = async () => {
  if (!ticket) return;
  setEscalating(true);
  try {
    await escalateTicket(ticket.id, tk());
    setTicket(prev => prev ? { ...prev, workflow_step: 'worklist', in_worklist: true } : prev);
    setSuccessMsg('Ticket escalated to worklist successfully!');
    setIsEscalateModalOpen(false); // Ferme la modal après succès
  } catch (err: any) {
    // Remplace l'alert() par un message d'erreur stylisé si tu en as un
    setErrorMsg(err?.body?.message || err?.message || 'Failed to escalate');
  } finally {
    setEscalating(false);
  }
};

  // ── Attachment helpers ────────────────────────────────────────────────────
  const fetchBlob = async (attachment: Attachment) => {
    const url = attachment.url || `${API_BASE}/api/tickets/uploads/${attachment.filename}/download`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tk()}` } });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    return res.blob();
  };

  const previewAttachment = async (attachment: Attachment) => {
    try {
      setModalLoading(true);
      const blob = await fetchBlob(attachment);
      if (modalUrl) URL.revokeObjectURL(modalUrl);
      setModalUrl(URL.createObjectURL(blob));
      setModalMime(blob.type || attachment.mimetype);
      setModalName(attachment.originalname || attachment.filename);
      setModalOpen(true);
    } catch (err: any) { alert(`Cannot open file: ${err?.message}`); }
    finally { setModalLoading(false); }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const blob = await fetchBlob(attachment);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = attachment.originalname || attachment.filename || 'file';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) { alert(`Cannot download: ${err?.message}`); }
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/attachments/${attachmentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tk()}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Delete failed'); }
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setSuccessMsg('Attachment deleted');
    } catch (err: any) { alert(err?.message || 'Failed to delete'); }
    finally { setSaving(false); }
  };

  const closeModal = () => {
    if (modalUrl) URL.revokeObjectURL(modalUrl);
    setModalUrl(null); setModalMime(undefined); setModalName(undefined); setModalOpen(false);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };
  const removeNewFile = (i: number) => setNewAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleStartEdit  = () => { setSuccessMsg(null); setEditing(true); };
  const handleCancelEdit = () => {
    if (ticket) {
      setSubject(ticket.subject ?? '');
      setDescription(ticket.description ?? '');
      setCategoryId(ticket.category_id ?? '');
      setStatus(ticket.status ?? '');
      setPriority(ticket.priority ?? '');
    }
    setNewAttachments([]); setEditing(false);
  };

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true); setSuccessMsg(null);
    try {
      const payload: any = {
        subject: subject?.trim(),
        description: description?.trim(),
        category_id: categoryId ? Number(categoryId) : null,
        ...(user?.role !== 'client' && { status: status || undefined, priority: priority || undefined }),
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const res = await updateTicket(ticket.id, payload, tk());
      const updated = res?.ticket ?? res?.data ?? res;
      setTicket(prev => prev ? { ...prev, ...(updated ?? {}) } : prev);

      if (newAttachments.length > 0) {
        const formData = new FormData();
        newAttachments.forEach(f => formData.append('attachments', f));
        const uploadRes = await fetch(`${API_BASE}/api/tickets/${ticket.id}/attachments`, {
          method: 'POST', headers: { Authorization: `Bearer ${tk()}` }, body: formData
        });
        if (!uploadRes.ok) { const e = await uploadRes.json().catch(() => ({})); throw new Error(e.message || 'Upload failed'); }
        const uploadedData = await uploadRes.json().catch(() => null);
        let newList: any = uploadedData?.attachments ?? uploadedData?.data ?? uploadedData;
        if (!Array.isArray(newList)) newList = newList ? [newList] : [];
        setAttachments(prev => [...prev, ...newList]);
        setNewAttachments([]);
      }
      setSuccessMsg('Ticket updated successfully!');
      setEditing(false);
    } catch (err: any) { alert(err?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate    = (iso?: string) => iso ? new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatTimeAgo = (iso?: string) => {
    if (!iso) return '-';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };
  const getFileIcon = (mime?: string) => {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.includes('pdf')) return '📕';
    if (mime.includes('word') || mime.includes('document')) return '📘';
    return '📄';
  };
  const initials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  // Category name lookup
  const getCategoryName = () => {
    // prefer embedded category object from API
    if (ticket?.category?.name) return ticket.category.name;
    const found = categories.find(c => c.id === (ticket?.category_id ?? categoryId));
    return found?.name ?? (ticket?.category_id ? `Cat ${ticket.category_id}` : '—');
  };

  const assignedEmployee: Employee | null =
    assigneeObj ?? (ticket?.assigned_to ? employees.find(e => e.id === ticket.assigned_to) ?? null : null);

  // Can escalate : staff + ticket not resolved/closed + not already in worklist
  const canEscalate = isStaff
    && ticket?.workflow_step !== 'worklist'
    && !ticket?.in_worklist
    && ticket?.status !== 'resolved'
    && ticket?.status !== 'closed';

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      <p className="mt-3 text-muted-foreground">Loading ticket...</p>
    </div>
  );
  if (error || !ticket) return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold mb-2">{error ? 'Error loading ticket' : 'Ticket not found'}</h2>
      <p className="text-muted-foreground mb-4">{error || "The ticket you're looking for doesn't exist."}</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="font-mono text-primary font-semibold">
              {ticket.ticket_number || `TKT-${String(ticket.id).padStart(3, '0')}`}
            </span>

            {/* Workflow badge */}
            {ticket.in_worklist ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <ArrowUpCircle className="h-3 w-3" /> Worklist
              </span>
            ) : ticket.workflow_step === 'department' && ticket.department?.name ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                <Building2 className="h-3 w-3" /> {ticket.department.name}
              </span>
            ) : null}

            {editing && user?.role !== 'client' ? (
              <>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-36">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
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
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <span className="inline-flex capitalize items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {ticket.status || 'open'}
                </span>
                <span className="inline-flex capitalize items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  {ticket.priority || 'medium'}
                </span>
              </>
            )}
          </div>

          {editing ? (
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="form-input text-2xl font-bold w-full" placeholder="Ticket subject..." />
          ) : (
            <h1 className="text-2xl font-bold text-foreground">{ticket.subject}</h1>
          )}
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-700 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Escalate banner (if already in worklist) */}
      {ticket.in_worklist && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <ArrowUpCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">This ticket is in the Worklist</p>
            <p className="text-xs text-amber-600">It has been escalated from the department and is awaiting manual assignment.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card-gradient p-6 rounded-lg border border-border">
            <h3 className="font-semibold text-foreground mb-4">Description</h3>
            {editing ? (
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="form-input min-h-[140px] w-full" placeholder="Ticket description..." />
            ) : (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            )}
          </div>

          {/* Attachments */}
          <div className="card-gradient p-6 rounded-lg border border-border">
            <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Attachments ({attachments.length})
            </h4>
            {attachments.length > 0 && (
              <div className="space-y-3 mb-4">
                {attachments.map(att => (
                  <div key={att.id} onClick={() => previewAttachment(att)}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition border border-muted-foreground/10 cursor-pointer">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                      {getFileIcon(att.mimetype)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.originalname || att.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={e => { e.stopPropagation(); previewAttachment(att); }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md border hover:bg-muted/60 text-sm">
                        <Eye className="h-4 w-4 mr-1.5" /> View
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); downloadAttachment(att); }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md border hover:bg-muted/60 text-sm">
                        <Download className="h-4 w-4 mr-1.5" /> Download
                      </button>
                      {editing && (
                        <button type="button" onClick={e => { e.stopPropagation(); deleteAttachment(att.id); }}
                          className="inline-flex items-center px-2 py-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {editing && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition">
                  <input type="file" multiple onChange={handleAddFiles} disabled={uploading}
                    className="hidden" id="new-attachments" accept="image/*,.pdf,.doc,.docx,.txt" />
                  <label htmlFor="new-attachments" className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to add attachments</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOC, DOCX, TXT</p>
                    </div>
                  </label>
                </div>
                {newAttachments.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <p className="text-sm font-medium">New files ({newAttachments.length})</p>
                    {newAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span>📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeNewFile(idx)} className="p-1 hover:bg-destructive/10 rounded ml-2">
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
            {/* <TicketWorkflow ticketId={ticket.id} token={tk()} userRole={user?.role} /> */}
            <TicketWorkflow
  ticketId={ticket.id}
  token={tk()}
  userRole={user?.role}
  ticketStatus={ticket.status} 
  onStatusChange={(newStatus) => {
    setTicket(prev => prev ? { ...prev, status: newStatus } : prev);
  }}
/>
          {/* AI Analysis */}
          {/* {ticket.ai_category_confidence !== undefined && (
            <div className="card-gradient p-6 rounded-lg border border-purple-200/50 bg-purple-50/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" /> AI Analysis
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Category Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                      style={{ width: `${ticket.ai_category_confidence ?? 94}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-purple-600">
                    {Math.round(ticket.ai_category_confidence ?? 94)}%
                  </span>
                </div>
              </div>
            </div>
          )} */}
          {/* AI Analysis */}
{ticket.ai_category_confidence !== undefined && (
  <div className="card-gradient p-6 rounded-lg border border-purple-200/50 bg-purple-50/50 space-y-4">
    <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-900">
      <Sparkles className="h-5 w-5 text-purple-500" /> AI Analysis
    </h3>

    {/* Section Catégorie */}
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-purple-700">
          📁 Catégorie : <span className="text-slate-900">{ticket.category?.name || 'Non classé'}</span>
        </span>
        <span className="text-sm font-bold text-purple-600">
          {/* {Math.round(ticket.ai_category_confidence <= 1 ? ticket.ai_category_confidence * 100 : ticket.ai_category_confidence)}% */}
        </span>
      </div>
      <div >
        <div 
          // className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-500"
          // style={{ 
          //   width: `${(ticket.ai_category_confidence <= 1 ? ticket.ai_category_confidence * 100 : ticket.ai_category_confidence)}%` 
          // }} 
        />
      </div>
    </div>

    {/* Section Département */}
    {ticket.ai_department_confidence !== undefined && (
      <div className="space-y-2 pt-2 border-t border-purple-100">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-indigo-700">
            🏢 Département : <span className="text-slate-900">{ticket.department?.name || 'Non assigné'}</span>
          </span>
          <span className="text-sm font-bold text-indigo-600">
            {/* {Math.round(ticket.ai_department_confidence <= 1 ? ticket.ai_department_confidence * 100 : ticket.ai_department_confidence)}% */}
          </span>
        </div>
        {/* <div className="w-full bg-indigo-100 rounded-full h-2">
          <div 
            // className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ 
              // width: `${(ticket.ai_department_confidence <= 1 ? ticket.ai_department_confidence * 100 : ticket.ai_department_confidence)}%` 
            }} 
          />
        </div> */}
      </div>
    )}
  </div>
)}
        </div>
        
        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="card-gradient p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-semibold">Ticket Information</h3>
            <div className="space-y-3 text-sm">

              {/* Category — edit mode shows select, view mode shows name */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> Category
                </span>
                {editing ? (
                  <select value={categoryId}
                    onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                    className="form-input text-xs py-1 px-2 max-w-[160px]">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <span className="font-medium">{getCategoryName()}</span>
                )}
              </div>

              {/* Department */}
              {(ticket.department?.name || ticket.department_id) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> Department
                  </span>
                  <span className="font-medium">
                    {ticket.department?.name ?? `Dept ${ticket.department_id}`}
                  </span>
                </div>
              )}

              {/* Workflow step */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Workflow</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  ticket.in_worklist
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {ticket.in_worklist ? 'Worklist' : ticket.workflow_step ?? 'department'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Created
                </span>
                <span className="font-medium">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Updated
                </span>
                <span className="font-medium">{formatTimeAgo(ticket.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Created By */}
          <div className="card-gradient p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-semibold">Created By</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
                {initials(user?.full_name)}
              </div>
              <div>
                <p className="font-medium text-sm">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Assigned To */}
<div className="card-gradient p-6 rounded-lg border border-border space-y-4 shadow-sm">
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</h3>
  
  <div className="flex items-center gap-4">
    {/* Avatar Dynamique */}
    <div 
      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-base transition-all border-2 border-background shadow-sm"
      style={{ 
        background: assignedEmployee ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
        color: assignedEmployee ? 'hsl(var(--primary))' : 'inherit'
      }}
    >
      {assignedEmployee 
        ? initials(assignedEmployee.full_name) 
        : <User className="h-6 w-6 text-muted-foreground/60" />}
    </div>

    <div className="flex-1">
      {canAssign ? (
        employeesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des membres...
          </div>
        ) : (
          <div className="relative group">
            <select 
              value={selectedEmployeeId}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : '' as const;
                setSelectedEmployeeId(val);
                handleAssignUpdate(val);
              }}
              className="w-full bg-secondary/50 hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-semibold text-foreground appearance-none cursor-pointer border border-transparent focus:border-primary/50 transition-all outline-none"
            >
              <option value="">Not yet assigned</option>
              {/* Groupement par équipe possible si tu veux pousser loin */}
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} className="bg-background text-foreground py-2">
                  {emp.full_name} {emp.team ? ` (${emp.team})` : ''}
                </option>
              ))}
            </select>
            
            {/* Indicateur visuel stylisé */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {assigning 
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                : <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-foreground">
            {assignedEmployee?.full_name ?? <span className="italic text-muted-foreground font-normal text-xs">Not yet assigned</span>}
          </p>
          {assignedEmployee?.team && (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {assignedEmployee.team}
            </div>
          )}
          {assignedEmployee?.email && <p className="text-xs text-muted-foreground/80">{assignedEmployee.email}</p>}
        </div>
      )}
    </div>
  </div>
</div>

          {/* ── Escalate card — staff only, not already escalated ── */}
          {/* {canEscalate && (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" /> Escalate to Worklist
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  If this ticket cannot be resolved at the department level, escalate it for org-wide assignment.
                </p>
              </div>
              <Button
                onClick={handleEscalate}
                disabled={escalating}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                <ArrowUpCircle className="h-4 w-4" />
                {escalating ? 'Escalating...' : 'Escalate Ticket'}
              </Button>
            </div>
          )} */}
          <>
  {canEscalate && (
    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3 shadow-sm">
      <div>
        <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
          <ArrowUpCircle className="h-4 w-4" /> Escalade vers Worklist
        </p>
        <p className="text-[11px] text-amber-700 mt-1 leading-tight">
          Ce ticket sera rendu visible à tous les administrateurs pour une réassignation.
        </p>
      </div>
      <Button
        onClick={() => setIsEscalateModalOpen(true)} // On ouvre la modal au lieu du confirm()
        disabled={escalating}
        className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-b-2 border-amber-800 active:border-b-0 transition-all"
        size="sm"
      >
        <ArrowUpCircle className="h-4 w-4" />
        Escalader le Ticket
      </Button>
    </div>
  )}

  {/* MODAL DE CONFIRMATION STYLISÉE */}
  {isEscalateModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border scale-in-center">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-amber-100 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Confirmer l'escalade ?</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Êtes-vous sûr de vouloir envoyer ce ticket dans la **Worklist globale** ? 
            Il ne sera plus restreint à votre département.
          </p>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            className="flex-1 px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50 transition-colors"
            onClick={() => setIsEscalateModalOpen(false)}
            disabled={escalating}
          >
            Annuler
          </button>
          <button 
            className="flex-1 px-4 py-2 text-sm font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            onClick={executeEscalation}
            disabled={escalating}
          >
            {escalating && <Loader2 className="h-3 w-3 animate-spin" />}
            Oui, Escalader
          </button>
        </div>
      </div>
    </div>
  )}
</>
        </div>
      </div>

      {/* Edit / Save / Cancel */}
      <div className="flex gap-3 pt-6 border-t border-border">
        {!editing ? (
          <>
            <Button onClick={handleStartEdit} className="gap-2">Edit Ticket</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
          </>
        ) : (
          <>
            <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </>
        )}
      </div>

      {/* Attachment preview modal */}
      {modalOpen && modalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{modalName}</span>
                <span className="text-xs text-muted-foreground">{modalMime}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadAttachment({ id: 0, filename: modalName ?? '', originalname: modalName, url: modalUrl! })}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border hover:bg-muted/60 text-sm">
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </button>
                <button onClick={closeModal} className="p-2 rounded-md hover:bg-muted/60"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center">
              {modalLoading ? (
                <div className="text-muted-foreground">Loading preview...</div>
              ) : modalMime?.startsWith('image/') ? (
                <img src={modalUrl} alt={modalName} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : modalMime?.includes('pdf') ? (
                <iframe src={modalUrl} title={modalName} className="w-full h-[70vh] border-0" />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <p className="mb-4">Preview not available for this file type.</p>
                  <button onClick={() => downloadAttachment({ id: 0, filename: modalName ?? '', originalname: modalName, url: modalUrl! })}
                    className="underline text-primary">Download</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetails;
