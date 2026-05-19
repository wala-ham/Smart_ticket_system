// src/pages/admin/ManageWorkflows.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, Trash2, Edit2, RefreshCw, Search, ChevronRight, Check, GitCommit } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

type Step = {
  id?: number;
  step_order: number;
  label: string;
  role_label: string;
  assignment_type: 'OR' | 'AND';
  department_id?: number | '';
};

type Template = {
  id: number;
  name: string;
  category_id?: number;
  context: string;
  is_active: boolean;
  steps: Step[];
  category?: { id: number; name: string };
};

type Category = { id: number; name: string };
type Department = { id: number; name: string };

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(json?.message ?? 'API error');
    e.body = json;
    throw e;
  }
  return json;
}

function StepRow({
  step,
  index,
  departments,
  onChange,
  onDelete
}: {
  step: Step;
  index: number;
  departments: Department[];
  onChange: (s: Step) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
      <span className="text-xs font-bold text-indigo-600 w-5 flex-shrink-0">
        {index + 1}
      </span>

      {/* ROLE LABEL */}
      <input
        value={step.role_label || ''}
        onChange={e => onChange({ ...step, role_label: e.target.value })}
        placeholder="Ex: Développeur"
        className="form-input text-sm w-40 flex-shrink-0 border p-1 rounded"
      />

      {/* ASSIGNMENT TYPE */}
      <select
        value={step.assignment_type}
        onChange={e =>
          onChange({
            ...step,
            assignment_type: e.target.value as 'OR' | 'AND'
          })
        }
        className="form-input text-sm w-20 flex-shrink-0 border p-1 rounded"
      >
        <option value="OR">OR</option>
        <option value="AND">AND</option>
      </select>

      {/* DEPARTMENT */}
      <select
        value={step.department_id ?? ''}
        onChange={e =>
          onChange({
            ...step,
            department_id: e.target.value ? Number(e.target.value) : ''
          })
        }
        className="form-input text-sm w-36 flex-shrink-0 border p-1 rounded"
      >
        <option value="">All org</option>
        {departments.map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <button
        onClick={onDelete}
        className="p-1.5 rounded hover:bg-red-100 text-red-500 ml-auto"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TemplateModal({
  template,
  categories,
  departments,
  token,
  onClose,
  onSaved
}: {
  template: Template | null;
  categories: Category[];
  departments: Department[];
  token: string;
  onClose: () => void;
  onSaved: (t: Template) => void;
}) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? '');
  const [catId, setCatId] = useState<number | ''>(template?.category_id ?? '');
  const [context, setContext] = useState(template?.context ?? 'supplier');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  const [steps, setSteps] = useState<Step[]>(
    template?.steps?.length
      ? template.steps.sort((a, b) => a.step_order - b.step_order)
      : [
          {
            step_order: 1,
            label: '',
            role_label: '',
            assignment_type: 'OR'
          }
        ]
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addStep = () =>
    setSteps(prev => [
      ...prev,
      {
        step_order: prev.length + 1,
        label: '',
        role_label: '',
        assignment_type: 'OR'
      }
    ]);

  const updateStep = (i: number, s: Step) =>
    setSteps(prev => prev.map((x, idx) => (idx === i ? s : x)));

  const deleteStep = (i: number) =>
    setSteps(prev =>
      prev
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, step_order: idx + 1 }))
    );

  const handleSave = async () => {
    if (!name.trim()) return setErr('Name required');
    if (!steps.length) return setErr('At least 1 step required');

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        name,
        category_id: catId || undefined,
        context,
        is_active: isActive,
        steps: steps.map(s => ({ ...s, label: s.role_label })) // Remplir label pour la cohérence BD si nécessaire
      };

      const json = isEdit
        ? await api(`/api/workflow-templates/${template!.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          }, token)
        : await api('/api/workflow-templates', {
            method: 'POST',
            body: JSON.stringify(payload)
          }, token);

      onSaved(json?.data?.template);
    } catch (e: any) {
      setErr(e?.body?.message ?? e?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {isEdit ? 'Edit' : 'New'} Workflow Template
              </CardTitle>
              <CardDescription>
                OR = auto-assign • AND = notify all
              </CardDescription>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto flex-1">
          {err && <p className="text-red-500 text-sm font-medium">{err}</p>}

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Workflow name (Ex: Bug de connexion)"
            className="form-input w-full border p-2 rounded text-sm"
          />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Étapes du circuit</label>
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                departments={departments}
                onChange={s => updateStep(i, s)}
                onDelete={() => deleteStep(i)}
              />
            ))}

            <Button type="button" variant="outline" onClick={addStep} className="w-full mt-2 border-dashed">
              <Plus className="h-4 w-4 mr-1" /> Add Step
            </Button>
          </div>
        </CardContent>

        <div className="p-4 border-t flex gap-2 justify-end bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><Check className="h-4 w-4 mr-1" /> Save</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const ManageWorkflows: React.FC = () => {
  const { token } = useAuth();
  const tk = () => token ?? localStorage.getItem('auth_token') ?? '';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);

  const load = async () => {
    try {
      const [tpl, cat, dept] = await Promise.all([
        api('/api/workflow-templates', {}, tk()).then(j => j.data.templates),
        api('/api/categories', {}, tk()).then(j => j.data.categories),
        api('/api/departments', {}, tk()).then(j => j.data.departments)
      ]);

      setTemplates(tpl);
      setCategories(cat);
      setDepartments(dept);
    } catch (err) {
      console.error("Error loading workflow data", err);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Alignement de l'en-tête et du bouton à droite */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Workflows</h1>
          <p className="text-sm text-gray-500">Configurez les circuits de validation pour vos processus.</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Workflow
        </Button>
      </div>

      {/* Liste des workflows */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Aucun workflow configuré pour le moment.</p>
        ) : (
          templates.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <span className="font-semibold text-lg text-gray-900">{t.name}</span>
                  
                  {/* Affichage du Circuit associé */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mr-1">Circuit associé :</span>
                    {t.steps && t.steps.length > 0 ? (
                      t.steps
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((step, idx) => (
                          <React.Fragment key={step.id ?? idx}>
                            <span className="px-2 py-0.5 bg-white border rounded shadow-sm text-gray-700 font-medium">
                              {step.role_label || 'Sans rôle'}
                            </span>
                            {idx < t.steps.length - 1 && (
                              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))
                    ) : (
                      <span className="text-xs italic text-gray-400">Aucune étape définie</span>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={() => { setEditTarget(t); setShowModal(true); }} className="text-gray-500 hover:text-indigo-600">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showModal && (
        <TemplateModal
          template={editTarget}
          categories={categories}
          departments={departments}
          token={tk()}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            load(); // Recharge la liste
            setShowModal(false); // ✅ Ferme le modal après enregistrement réussi !
          }}
        />
      )}
    </div>
  );
};

export default ManageWorkflows;