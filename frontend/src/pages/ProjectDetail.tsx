import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Project, AuditEvent, Proposal } from '../types/domain';
import { Badge, ErrorNotice, Field, Loading, money, words } from '../components/ui/Common';
import { MilestoneEditor } from '../components/milestones/MilestoneEditor';

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const project = useQuery({ queryKey: ['project', id], queryFn: () => api<Project>(`/projects/${id}`) });
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => api<AuditEvent[]>(`/projects/${id}/audit`) });
  const [proposal, setProposal] = useState<Proposal>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const refresh = () => { void client.invalidateQueries({ queryKey: ['project', id] }); void client.invalidateQueries({ queryKey: ['projects'] }); void client.invalidateQueries({ queryKey: ['audit', id] }); };
  if (project.isPending) return <Loading/>;
  if (project.isError) return <ErrorNotice error={project.error}/>;
  const p = project.data;
  const owner = user.role === 'CLIENT' && p.clientId === user.id;
  const allocated = p.milestones.reduce((sum, m) => sum + m.amountMinor, 0);
  return <><Link className="text-link" to="/projects">← Projects</Link><div className="page-heading"><div><p className="eyebrow">PROJECT AGREEMENT</p><h1>{p.title}</h1><p>{p.description}</p></div><strong className="budget">{money(p.budgetMinor, p.currency)}</strong></div>
    <div className="two-column"><section className="panel"><h2>Scope & requirements</h2><p className="preserve">{p.requirements}</p><h3>Deliverables</h3><p className="preserve">{p.deliverables}</p></section><section className="panel"><h2>Agreement summary</h2><dl className="summary"><div><dt>Client</dt><dd>{p.client?.name}</dd></div><div><dt>Freelancer</dt><dd>{p.freelancer?.name ?? 'Unassigned'}</dd></div><div><dt>Allocated</dt><dd>{money(allocated, p.currency)}</dd></div><div><dt>Unallocated</dt><dd>{money(p.budgetMinor - allocated, p.currency)}</dd></div></dl></section></div>
    {owner && <details className="panel"><summary>Edit project or assign freelancer</summary><form onSubmit={async e => {
      e.preventDefault(); setError(undefined); setBusy(true);
      const form = new FormData(e.currentTarget);
      try { await api(`/projects/${id}`, { method: 'PATCH', body: { title: form.get('title'), description: form.get('description'), requirements: form.get('requirements'), deliverables: form.get('deliverables'), budgetMinor: Number(form.get('budgetMinor')), freelancerEmail: form.get('freelancerEmail') || undefined } }); setNotice('Project updated.'); refresh(); } catch (err) { setError(err); } finally { setBusy(false); }
    }}><Field label="Project title"><input name="title" required defaultValue={p.title}/></Field><Field label="Description"><textarea name="description" required defaultValue={p.description}/></Field><Field label="Requirements"><textarea name="requirements" required defaultValue={p.requirements}/></Field><Field label="Deliverables"><textarea name="deliverables" required defaultValue={p.deliverables}/></Field><Field label="Budget in minor units"><input type="number" name="budgetMinor" min={allocated || 1} step={1} required defaultValue={p.budgetMinor}/></Field><Field label="Assign registered freelancer by email"><input name="freelancerEmail" type="email"/></Field><p className="muted">Reassignment is locked after any submission.</p><button className="button" disabled={busy}>Save project</button></form></details>}
    <ErrorNotice error={error}/>{notice && <p className="success-notice" role="status">{notice}</p>}
    <h2>Milestones</h2><div className="panel">{p.milestones.length ? p.milestones.map(m => <Link className="list-row milestone-row" key={m.id} to={`/milestones/${m.id}`}><span className="sequence">{m.sequence}</span><div><strong>{m.title}</strong><small>{m.acceptanceCriteria.length} acceptance criteria</small></div><Badge value={m.status}/><strong>{money(m.amountMinor, p.currency)}</strong></Link>) : <p className="muted">Define milestones manually or use an AI proposal below.</p>}</div>
    {owner && <section className="panel"><div className="section-heading"><div><p className="eyebrow">ADVISORY PLANNING</p><h2>Make the outcome measurable.</h2></div><button className="button" disabled={busy || allocated > 0} onClick={async () => {
      setBusy(true); setError(undefined);
      try { setProposal(await api<Proposal>('/ai/milestones/draft', { method: 'POST', body: p })); } catch (e) { setError(e); } finally { setBusy(false); }
    }}>{busy ? 'Working...' : 'Draft AI milestone plan'}</button></div><p className="muted">AI planning is available before any budget is allocated. Proposals are editable and only saved when you choose Save milestone.</p>
      {proposal && <div><p className="mode-notice">{proposal.simulated ? 'SIMULATED MOCK AI' : 'REAL AI'} · {proposal.model}. Review each suggestion before saving.</p>{proposal.milestones.map((m, index) => <details open className="proposal" key={index}><summary>Suggested milestone {index + 1}: {m.title}</summary><p>Dependencies: {m.dependencies.join('; ') || 'None'}</p><p>Risks: {m.risks.join('; ')}</p><MilestoneEditor projectId={p.id} initial={m} onSaved={refresh}/></details>)}</div>}
      <details><summary>Add a milestone manually</summary><MilestoneEditor key={p.milestones.length} projectId={p.id} onSaved={refresh}/></details></section>}
    <section className="panel"><h2>Audit timeline</h2><ErrorNotice error={audit.error}/>{audit.data?.length ? <ol className="timeline">{audit.data.map(event => <li key={event.id}><strong>{words(event.eventType)}</strong><span>{event.actor.name} · {new Date(event.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="muted">No recorded activity yet.</p>}</section></>;
}
