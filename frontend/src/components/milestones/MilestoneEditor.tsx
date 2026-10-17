import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../services/api';
import type { DraftMilestone, Milestone } from '../../types/domain';
import { ErrorNotice, Field } from '../ui/Common';

export function MilestoneEditor({ projectId, initial, onSaved }: { projectId: string; initial?: DraftMilestone | Milestone; onSaved: () => void }) {
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const editing = initial && 'id' in initial;
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { title: initial?.title ?? '', description: initial?.description ?? '', amountMinor: initial?.amountMinor ?? 10000, acceptanceCriteria: initial?.acceptanceCriteria.join('\n') ?? '', status: editing ? initial.status : 'OPEN' } });
  if (saved) return <p className="success-notice" role="status">Milestone saved. Review it in the agreement list above.</p>;
  return <form className="milestone-editor" onSubmit={handleSubmit(async data => {
    setError(undefined);
    try {
      await api(editing ? `/milestones/${initial.id}` : `/projects/${projectId}/milestones`, { method: editing ? 'PATCH' : 'POST', body: { ...data, acceptanceCriteria: data.acceptanceCriteria.split('\n').map(s => s.trim()).filter(Boolean) } });
      setSaved(true); onSaved();
    } catch (e) { setError(e); }
  })}>
    <Field label="Milestone title"><input required minLength={3} maxLength={150} {...register('title')}/></Field>
    <Field label="Milestone description"><textarea required minLength={3} maxLength={4000} {...register('description')}/></Field>
    <div className="two-column"><Field label="Amount in minor units"><input required type="number" min={1} max={100000000} step={1} {...register('amountMinor', { valueAsNumber: true })}/></Field><Field label="Agreement status"><select {...register('status')}><option value="OPEN">Open for submission</option>{(!editing || initial.status === 'DRAFT') && <option value="DRAFT">Draft</option>}</select></Field></div>
    <Field label="Acceptance criteria (one per line)"><textarea required maxLength={10000} {...register('acceptanceCriteria')}/></Field><ErrorNotice error={error}/><button className="button" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editing ? 'Save agreement' : 'Save milestone'}</button>
  </form>;
}
