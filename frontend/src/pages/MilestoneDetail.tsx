import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Milestone } from '../types/domain';
import { Badge, ErrorNotice, Field, Loading, money } from '../components/ui/Common';
import { EvidenceForm } from '../components/evidence/EvidenceForm';
import { EvaluationReport } from '../components/ai/EvaluationReport';
import { PayPalCheckout } from '../components/payments/PayPalCheckout';
import { MilestoneEditor } from '../components/milestones/MilestoneEditor';

export function MilestoneDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['milestone', id], queryFn: () => api<Milestone>(`/milestones/${id}`) });
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { void client.invalidateQueries({ queryKey: ['milestone', id] }); void client.invalidateQueries({ queryKey: ['projects'] }); void client.invalidateQueries({ queryKey: ['payments'] }); }, [client, id]);
  if (query.isPending) return <Loading/>;
  if (query.isError) return <ErrorNotice error={query.error}/>;
  const m = query.data;
  const owner = user.role === 'CLIENT';
  const latest = m.submissions?.[0];
  async function action(path: string, body?: unknown) { setBusy(true); setError(undefined); try { await api(path, { method: 'POST', body }); refresh(); } catch (e) { setError(e); } finally { setBusy(false); } }
  return <><Link className="text-link" to={`/projects/${m.projectId}`}>← {m.project?.title}</Link><div className="page-heading"><div><p className="eyebrow">MILESTONE {m.sequence}</p><h1>{m.title}</h1><Badge value={m.status}/></div><strong className="budget">{money(m.amountMinor, m.project?.currency)}</strong></div><ErrorNotice error={error}/>
    <section className="panel"><h2>The agreed outcome</h2><p className="preserve">{m.description}</p><h3>Acceptance criteria</h3><ol>{m.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}</ol></section>
    {owner && ['DRAFT', 'OPEN'].includes(m.status) && !latest && <details className="panel"><summary>Edit milestone agreement</summary><MilestoneEditor initial={m} projectId={m.projectId} onSaved={refresh}/></details>}
    {!owner && ['OPEN', 'CHANGES_REQUESTED'].includes(m.status) && <EvidenceForm milestoneId={m.id} onSaved={refresh}/>}
    {owner && m.status === 'SUBMITTED' && <section className="panel"><h2>Ready for client review</h2><p>Start the review, inspect the evidence, and optionally request an advisory AI assessment.</p><button className="button" disabled={busy} onClick={() => { void action(`/milestones/${m.id}/review`); }}>Start review</button></section>}
    {m.submissions?.map((submission, i) => <section className="panel" key={submission.id}><div className="section-heading"><h2>Evidence · revision {submission.revisionNumber}</h2><span className="muted">{i === 0 ? 'Current submission' : 'Preserved history'}</span></div><p className="preserve">{submission.description}</p><h3>Evidence notes</h3><p className="preserve">{submission.evidenceNotes}</p><div className="row">{submission.githubUrl && <a className="text-link" href={submission.githubUrl} target="_blank" rel="noreferrer">Repository reference ↗</a>}{submission.demoUrl && <a className="text-link" href={submission.demoUrl} target="_blank" rel="noreferrer">Demo reference ↗</a>}</div><p className="muted">References are unverified links. VeriFlow has not fetched or tested their content.</p>
      <button className="secondary" disabled={busy} onClick={() => { void action(`/ai/submissions/${submission.id}/evaluate`); }}>{busy ? 'Working...' : 'Request AI evidence assessment'}</button>{submission.evaluations.map(e => <EvaluationReport evaluation={e} key={e.id}/>)}</section>)}
    {owner && m.status === 'UNDER_REVIEW' && latest && <section className="panel"><h2>Client decision</h2><p>You make the final decision. AI feedback never approves work or authorizes payment.</p><form onSubmit={e => {
      e.preventDefault(); const form = new FormData(e.currentTarget); void action(`/milestones/${m.id}/decision`, { submissionId: latest.id, decision: form.get('decision'), notes: form.get('notes') });
    }}><Field label="Decision"><select name="decision"><option value="CHANGES_REQUESTED">Request changes</option><option value="APPROVED">Approve work</option></select></Field><Field label="Decision notes"><textarea name="notes" required minLength={3} maxLength={4000}/></Field><button className="button" disabled={busy}>Record client decision</button></form></section>}
    {!!m.approvals?.length && <section className="panel"><h2>Decision history</h2>{m.approvals.map(a => <div className="decision" key={a.id}><Badge value={a.decision}/><p>{a.notes}</p><small>{new Date(a.createdAt).toLocaleString()}</small></div>)}</section>}
    {owner && ['APPROVED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(m.status) && <PayPalCheckout milestoneId={m.id} currency={m.project?.currency ?? 'USD'} existing={m.payment} onConfirmed={refresh}/>}
    {m.payment && <section className="panel"><h2>Sandbox transaction record</h2><Badge value={m.payment.status}/><p>{money(m.payment.amountMinor, m.payment.currency)}</p><p>Order: {m.payment.paypalOrderId ?? 'Creation unresolved'}</p><p>Capture: {m.payment.paypalCaptureId ?? 'No verified capture'}</p>{m.payment.status === 'COMPLETED' && <p className="success-notice">Server-verified Sandbox capture. Test money only.</p>}</section>}
  </>;
}
