import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../services/api';
import { ErrorNotice, Field } from '../ui/Common';

export function EvidenceForm({ milestoneId, onSaved }: { milestoneId: string; onSaved: () => void }) {
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ description: string; evidenceNotes: string; githubUrl: string; demoUrl: string }>();
  return <section className="panel"><h2>Submit work evidence</h2><p className="muted">Explain what was delivered and how the client can reproduce your checks. URLs are recorded as references; the AI does not open them.</p><form onSubmit={handleSubmit(async data => {
    setError(undefined);
    try { await api(`/milestones/${milestoneId}/submissions`, { method: 'POST', body: { ...data, githubUrl: data.githubUrl || undefined, demoUrl: data.demoUrl || undefined } }); reset(); onSaved(); } catch (e) { setError(e); }
  })}><Field label="What did you deliver?"><textarea required minLength={10} maxLength={8000} {...register('description')}/></Field><Field label="Evidence and reproduction notes"><textarea required minLength={10} maxLength={12000} {...register('evidenceNotes')}/></Field><div className="two-column"><Field label="Repository URL (optional)"><input type="url" {...register('githubUrl')}/></Field><Field label="Demo URL (optional)"><input type="url" {...register('demoUrl')}/></Field></div><ErrorNotice error={error}/><button className="button" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit evidence'}</button></form></section>;
}
