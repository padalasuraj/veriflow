import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Project } from '../types/domain';
import { ErrorNotice, Field } from '../components/ui/Common';

interface Form { title: string; description: string; requirements: string; deliverables: string; budgetMinor: number; currency: string; freelancerEmail: string }
export function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>({ defaultValues: { currency: 'USD', budgetMinor: 60000 } });
  if (user.role !== 'CLIENT') return <p role="alert">Only clients can create projects.</p>;
  return <><div className="page-heading"><div><p className="eyebrow">START WITH A SHARED BRIEF</p><h1>Create a project</h1><p>Amounts are integer minor units: 60000 = $600.00 USD.</p></div></div><form className="panel form-panel" onSubmit={handleSubmit(async data => {
    setError(undefined);
    try { const project = await api<Project>('/projects', { method: 'POST', body: { ...data, freelancerEmail: data.freelancerEmail || undefined } }); await client.invalidateQueries({ queryKey: ['projects'] }); navigate(`/projects/${project.id}`); } catch (e) { setError(e); }
  })}>
    <Field label="Project title"><input required minLength={3} maxLength={150} {...register('title')}/></Field>
    <Field label="Project description"><textarea required minLength={10} maxLength={8000} {...register('description')}/></Field>
    <Field label="Requirements"><textarea required minLength={3} maxLength={8000} {...register('requirements')}/></Field>
    <Field label="Deliverables"><textarea required minLength={3} maxLength={4000} {...register('deliverables')}/></Field>
    <div className="two-column"><Field label="Budget in minor units"><input required type="number" min={1} max={100000000} step={1} {...register('budgetMinor', { valueAsNumber: true })}/></Field><Field label="Currency"><select {...register('currency')}>{['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}</select></Field></div>
    <Field label="Freelancer email (optional)"><input type="email" {...register('freelancerEmail')}/></Field><p className="muted">The freelancer must register first. You can assign them later.</p><ErrorNotice error={error}/><button className="button" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create project'}</button></form></>;
}
