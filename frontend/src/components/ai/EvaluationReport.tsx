import type { Evaluation } from '../../types/domain';
import { Badge } from '../ui/Common';

export function EvaluationReport({ evaluation }: { evaluation: Evaluation }) {
  const report = evaluation.assessmentJson;
  return <article className="evaluation"><p className="mode-notice">{evaluation.provider === 'mock' ? 'SIMULATED MOCK AI' : 'REAL AI'} · {evaluation.model} · Advisory only</p><h3>Evidence assessment</h3><Badge value={evaluation.recommendation}/><p>{report.evidenceSummary}</p>{report.criteria.map((item, i) => <div className="criterion" key={i}><strong>{item.criterion}</strong><Badge value={item.assessment}/><p>{item.evidence}</p></div>)}
    {([['Missing requirements', report.missingRequirements], ['Unverified claims', report.unverifiedClaims], ['Risks', report.risks], ['Recommended next steps', report.nextSteps], ['Limitations', report.limitations]] as [string, string[]][]).map(([heading, items]) => <div key={heading}><h4>{heading}</h4>{items.length ? <ul>{items.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p className="muted">None reported. This is not proof of completeness.</p>}</div>)}
    <p className="muted">AI cannot approve this milestone or authorize payment. The client must independently inspect the deliverables.</p></article>;
}
