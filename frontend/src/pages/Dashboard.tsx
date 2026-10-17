import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Project, Payment } from '../types/domain';
import { Badge, ErrorNotice, Loading, money } from '../components/ui/Common';

export function ProjectCards({ projects }: { projects: Project[] }) {
  return projects.length ? <div className="project-grid">{projects.map(p => <Link className="panel project-card" key={p.id} to={`/projects/${p.id}`}><span className="eyebrow">{p.currency} · {p.milestones.length} MILESTONES</span><h3>{p.title}</h3><p>{p.description}</p><div className="row"><strong>{money(p.budgetMinor, p.currency)}</strong><span>{p.milestones.filter(m => m.status === 'PAID').length} paid</span></div><div className="progress-track"><span style={{ width: `${p.milestones.length ? p.milestones.filter(m => m.status === 'PAID').length / p.milestones.length * 100 : 0}%` }}/></div></Link>)}</div> : <div className="panel empty">No projects yet. <span>Create a project as a client, or ask your client to assign your registered email.</span></div>;
}
export function Dashboard() {
  const { user } = useAuth();
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<Project[]>('/projects') });
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => api<Payment[]>('/payments/history') });
  if (projects.isPending || payments.isPending) return <Loading/>;
  if (projects.isError || payments.isError) return <ErrorNotice error={projects.error ?? payments.error}/>;
  const milestones = projects.data.flatMap(p => p.milestones);
  return <><div className="page-heading"><div><p className="eyebrow">{user.role === 'CLIENT' ? 'CLIENT' : 'FREELANCER'} OVERVIEW</p><h1>Hello, {user.name.split(' ')[0]}.</h1><p>Every agreement, deliverable, and decision in one place.</p></div>{user.role === 'CLIENT' && <Link className="button" to="/projects/new">Create project</Link>}</div>
    <div className="metric-grid">{[
      ['Projects', projects.data.length], ['Active milestones', milestones.filter(m => m.status !== 'PAID' && m.status !== 'DRAFT').length],
      ['Awaiting review', milestones.filter(m => ['SUBMITTED', 'UNDER_REVIEW'].includes(m.status)).length], ['Approved', milestones.filter(m => m.status === 'APPROVED').length],
      ['Revision requests', milestones.filter(m => m.status === 'CHANGES_REQUESTED').length], ['Confirmed Sandbox payments', payments.data.filter(p => p.status === 'COMPLETED').length],
    ].map(([label, count]) => <div className="panel metric" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
    <div className="section-heading"><h2>Your projects</h2><Link className="text-link" to="/projects">View all</Link></div><ProjectCards projects={projects.data}/>
    <section className="panel"><h2>Milestone activity</h2>{milestones.length ? milestones.slice(0, 12).map(m => <Link className="list-row" key={m.id} to={`/milestones/${m.id}`}><span>{m.title}</span><Badge value={m.status}/></Link>) : <p className="muted">Milestone progress will appear here.</p>}</section></>;
}
export function ProjectList() {
  const { user } = useAuth();
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<Project[]>('/projects') });
  return <><div className="page-heading"><div><p className="eyebrow">SHARED AGREEMENTS</p><h1>Projects</h1></div>{user.role === 'CLIENT' && <Link className="button" to="/projects/new">Create project</Link>}</div><ErrorNotice error={projects.error}/>{projects.isPending ? <Loading/> : projects.data && <ProjectCards projects={projects.data}/>}</>;
}
