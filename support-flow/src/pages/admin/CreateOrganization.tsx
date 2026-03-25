import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createOrganization } from '@/services/companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertCircle, Send, FileText, Building2, User,
  Eye, EyeOff, CheckCircle, Loader2, Upload
} from 'lucide-react';
import { generateContractPDF } from '@/utils/contractPdf';

const API_BASE = 'http://localhost:5000';

async function uploadContractPdf(orgId: number, blob: Blob, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('contract', blob, `Contract_org${orgId}.pdf`);

  const res  = await fetch(`${API_BASE}/api/organizations/${orgId}/contract-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  console.log('[Upload] status:', res.status, 'body:', json);
  if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
  return json.data.contract_pdf_url as string;
}

type Step = 'idle' | 'creating' | 'generating' | 'uploading' | 'done' | 'error';

const StepBadge: React.FC<{ step: Step }> = ({ step }) => {
  const steps: { key: Step; label: string }[] = [
    { key: 'creating',   label: 'Creating org'       },
    { key: 'generating', label: 'Generating PDF'     },
    { key: 'uploading',  label: 'Uploading contract' },
    { key: 'done',       label: 'Done!'              },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const isPast    = currentIdx > i;
        const isCurrent = currentIdx === i;
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              isPast    ? 'bg-emerald-100 text-emerald-700' :
              isCurrent ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' :
                          'bg-slate-100 text-slate-400'
            }`}>
              {isPast    ? <CheckCircle className="h-3 w-3" /> :
               isCurrent ? <Loader2 className="h-3 w-3 animate-spin" /> :
                           <span className="h-3 w-3 rounded-full border-2 border-current inline-block" />}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`h-px w-4 ${isPast ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CreateOrganization: React.FC = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [name, setName]                       = useState('');
  const [type, setType]                       = useState<'physique' | 'morale' | ''>('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [address, setAddress]                 = useState('');
  const [adminName, setAdminName]             = useState('');
  const [adminEmail, setAdminEmail]           = useState('');
  const [adminPassword, setAdminPassword]     = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractPlan, setContractPlan]       = useState<'basic' | 'pro' | 'enterprise'>('basic');
  const [step, setStep]                       = useState<Step>('idle');
  const [error, setError]                     = useState<string | null>(null);
  const [pdfUrl, setPdfUrl]                   = useState<string | null>(null);

  const isLoading = ['creating', 'generating', 'uploading'].includes(step);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim())          return setError('Company name is required');
    if (!type)                 return setError('Please select a type');
    if (!email.trim())         return setError('Company email is required');
    if (!adminName.trim())     return setError('Admin name is required');
    if (!adminEmail.trim())    return setError('Admin email is required');
    if (!adminPassword.trim()) return setError('Admin password is required');

    const effectiveToken = token ?? localStorage.getItem('auth_token') ?? '';
    if (!effectiveToken) return setError('Not authenticated');

    try {
      // ── Step 1: Create org ──────────────────────────────────────────────────
      setStep('creating');
      const res = await createOrganization({
        name: name.trim(), type, email: email.trim(),
        phone:             phone.trim()   || undefined,
        address:           address.trim() || undefined,
        admin_name:        adminName.trim(),
        admin_email:       adminEmail.trim(),
        admin_password:    adminPassword,
        contract_end_date: contractEndDate || undefined,
        contract_plan:     contractPlan,
      }, effectiveToken);

      const orgId: number = res?.data?.organization?.id ?? res?.organization?.id ?? res?.id;
      console.log('[CreateOrg] response:', res, '→ orgId:', orgId);
      if (!orgId) throw new Error('Organization ID not found in response — check console');

      // ── Step 2: Generate PDF (synchronous) ──────────────────────────────────
      setStep('generating');
      // ✅ No await — generateContractPDF is synchronous and returns { blob, url } directly
      const { blob } = generateContractPDF({
        orgName:         name.trim(),
        orgEmail:        email.trim(),
        orgPhone:        phone.trim()   || undefined,
        orgAddress:      address.trim() || undefined,
        orgType:         type,
        adminName:       adminName.trim(),
        adminEmail:      adminEmail.trim(),
        plan:            contractPlan,
        contractEndDate: contractEndDate || undefined,
        contractStatus:  'active',
        createdAt:       new Date().toISOString(),
      });
      console.log('[CreateOrg] PDF blob size:', blob.size);

      // ── Step 3: Upload ──────────────────────────────────────────────────────
      setStep('uploading');
      const uploadedUrl = await uploadContractPdf(orgId, blob, effectiveToken);
      console.log('[CreateOrg] uploaded:', uploadedUrl);
      setPdfUrl(uploadedUrl);

      setStep('done');
      setTimeout(() => navigate('/admin/companies', { replace: true }), 2500);

    } catch (err: any) {
      console.error('[CreateOrg] error:', err);
      setStep('error');
      setError(err?.body?.message || err?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Company</h1>
          <p className="text-muted-foreground mt-2">Register a new organization and set up its admin account</p>
        </div>

        {isLoading && (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="pt-5 pb-4"><StepBadge step={step} /></CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 text-emerald-700">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <p className="font-semibold">Company created & contract saved!</p>
                  <p className="text-sm">Redirecting to companies list...</p>
                  {pdfUrl && (
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2">
                      <FileText className="h-4 w-4" /> View contract PDF
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                  <p className="text-xs mt-1 opacity-70">Check browser console (F12) for details</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><CardTitle>Organization Info</CardTitle></div>
              <CardDescription>Basic details about the company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Company Name <span className="text-destructive">*</span></label>
                <input type="text" placeholder="e.g. Acme Corp" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} className="form-input w-full" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Type <span className="text-destructive">*</span></label>
                <select value={type} onChange={e => setType(e.target.value as any)} disabled={isLoading} className="form-input w-full" required>
                  <option value="">Select a type...</option>
                  <option value="physique">Physique</option>
                  <option value="morale">Morale</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Company Email <span className="text-destructive">*</span></label>
                <input type="email" placeholder="contact@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} className="form-input w-full" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Phone <span className="text-muted-foreground">(Optional)</span></label>
                <input type="tel" placeholder="+21612345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} className="form-input w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Address <span className="text-muted-foreground">(Optional)</span></label>
                <input type="text" placeholder="Rue de Tunis, Tunis, Tunisia" value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} className="form-input w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /><CardTitle>Admin Account</CardTitle></div>
              <CardDescription>Credentials for the organization's administrator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Admin Full Name <span className="text-destructive">*</span></label>
                <input type="text" placeholder="John Doe" value={adminName} onChange={e => setAdminName(e.target.value)} disabled={isLoading} className="form-input w-full" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Admin Email <span className="text-destructive">*</span></label>
                <input type="email" placeholder="admin@company.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} disabled={isLoading} className="form-input w-full" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Admin Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Strong password..." value={adminPassword} onChange={e => setAdminPassword(e.target.value)} disabled={isLoading} className="form-input w-full pr-10" required />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters with uppercase, number and special character</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><CardTitle>Contract</CardTitle></div>
              <CardDescription>Plan and expiration — PDF auto-generated and saved to the server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Plan</label>
                <select value={contractPlan} onChange={e => setContractPlan(e.target.value as any)} disabled={isLoading} className="form-input w-full">
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Contract Expiration Date <span className="text-muted-foreground">(Optional)</span></label>
                <input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} disabled={isLoading} className="form-input w-full" min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                <Upload className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-indigo-700">
                  PDF <strong>generated in browser</strong> → <strong>uploaded & stored on server</strong>. Always accessible from the companies table.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit"
              disabled={isLoading || step === 'done' || !name.trim() || !type || !email.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()}
              className="gradient-primary flex-1 gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isLoading ? 'Processing...' : 'Create Company'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/companies')} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">💡 Tips:</h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Use a valid company email for official communications</li>
                <li>The admin will receive login credentials at their email</li>
                <li>Choose <strong>Physique</strong> for individual, <strong>Morale</strong> for corporations</li>
                <li>All fields marked with * are required</li>
                <li>The PDF contract is <strong>permanently saved on the server</strong></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateOrganization;
