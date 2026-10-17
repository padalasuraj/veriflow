import { useQuery } from '@tanstack/react-query';
import { Link, Route, Routes } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Layers3, ScanLine, Wallet } from 'lucide-react';
import { getHealth } from '../services/api';

function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: false, refetchInterval: 30_000 });
  return <>
    <section className="hero">
      <div><p className="eyebrow">CLARITY AT EVERY MILESTONE</p><h1>Great work deserves<br/><span>clear agreement.</span></h1><p className="intro">Bring requirements, evidence, and client decisions into one transparent workflow. Build trust before the payment.</p><a className="button" href="#workflow">Explore the workflow <ArrowRight size={18}/></a><p className="fine">Verify Work. Build Trust. Pay Smarter.</p></div>
      <aside className="workflow-card" aria-label="Milestone workflow"><div className="card-heading"><Layers3 size={20}/><span>From brief to better decisions</span></div><p className="eyebrow">THE WORKFLOW</p>{['Agree on measurable criteria', 'Submit evidence of the work', 'Review advisory AI feedback', 'Client approves the milestone'].map((text, i) => <div className="step" key={text}><span>{i + 1}</span><div>{text}</div><Check size={16}/></div>)}<div className="card-footer"><ShieldCheck size={18}/> Human approval stays in control</div></aside>
    </section>
    <section id="workflow"><div className="section-heading"><div><p className="eyebrow">BUILT AROUND ACCOUNTABILITY</p><h2>One shared definition of done.</h2></div><span className="badge">Milestone workspace</span></div><div className="features">{[
      { Icon: Layers3, title: 'Define the outcome', text: 'Clients create projects and milestones with measurable acceptance criteria.' },
      { Icon: ScanLine, title: 'Review the evidence', text: 'Freelancers submit deliverables. AI provides advisory feedback with explicit limitations.' },
      { Icon: Wallet, title: 'Approve with confidence', text: 'Clients make the final decision before authorizing a PayPal Sandbox checkout.' },
    ].map(({ Icon, title, text }) => <article key={title}><Icon className="feature-icon" size={25}/><h3>{title}</h3><p>{text}</p><span className="planned">Available locally</span></article>)}</div></section>
    <section className="status-panel" aria-labelledby="system-heading"><div><p className="eyebrow">LIVE DEVELOPMENT STATUS</p><h2 id="system-heading">A foundation you can verify.</h2><p>Connection status comes from the backend API.</p></div><div className="status-details" aria-live="polite">{health.isPending ? <p>Checking API connection…</p> : health.isError ? <><p role="alert">Cannot reach the API. Check that the backend is running.</p><button onClick={() => { void health.refetch(); }}>Retry connection</button></> : <><p className="connected"><span/> API connected · v{health.data.version}</p><dl>{Object.entries(health.data.integrations).map(([name, status]) => <div key={name}><dt>{name === 'paypal' ? 'PayPal Sandbox' : name === 'ai' ? 'AI provider' : 'Database'}</dt><dd>{status === 'not_implemented' ? 'Not implemented' : status}</dd></div>)}</dl></>}</div></section>
  </>;
}

export function LandingPage() {
  return <div className="shell"><header><Link className="brand" to="/"><ShieldCheck size={29}/>VeriFlow<span>AI</span></Link><Link className="button" to="/login">Open workspace <ArrowRight size={15}/></Link></header><main><Routes><Route path="/" element={<Home/>}/><Route path="*" element={<section className="not-found"><h1>Page not found.</h1><Link className="button" to="/">Return home</Link></section>}/></Routes></main><footer><span>© {new Date().getFullYear()} VeriFlow AI</span><p>Development foundation. PayPal Sandbox uses test money. This product is not escrow and does not send real freelancer payouts.</p></footer></div>;
}
