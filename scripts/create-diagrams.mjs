import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('docs/images', { recursive: true });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function diagram(file, title, subtitle, cards, footer) {
  const width = 1200, height = 250 + Math.ceil(cards.length / 3) * 170;
  const boxes = cards.map(([heading, line1, line2], i) => {
    const x = 48 + (i % 3) * 374, y = 155 + Math.floor(i / 3) * 170;
    return `<g transform="translate(${x} ${y})"><rect width="350" height="142" rx="18" fill="#152b3d" stroke="#315268"/><circle cx="30" cy="32" r="16" fill="#41ddbd"/><text x="30" y="38" text-anchor="middle" fill="#071b2b" font-weight="700">${i + 1}</text><text x="58" y="39" font-size="21" font-weight="700">${escape(heading)}</text><text x="22" y="80" fill="#c2d4e2" font-size="17">${escape(line1)}</text><text x="22" y="108" fill="#c2d4e2" font-size="17">${escape(line2)}</text></g>`;
  }).join('');
  writeFileSync(`docs/images/${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(subtitle)}. ${cards.map(c => c.join('. ')).map(escape).join('; ')}</desc><rect width="1200" height="${height}" rx="24" fill="#091c2b"/><g font-family="Segoe UI,Arial,sans-serif" fill="#f4f8fc"><text x="48" y="67" font-size="36" font-weight="700">${escape(title)}</text><text x="48" y="108" font-size="19" fill="#8de7d3">${escape(subtitle)}</text>${boxes}<text x="48" y="${height - 28}" font-size="17" fill="#8de7d3">${escape(footer)}</text></g></svg>\n`);
}
diagram('workflow', 'VeriFlow AI · From agreement to payment', 'A shared record for clients and freelancers. Follow the numbered workflow.', [
  ['Define the agreement', 'Client sets budget and criteria.', 'AI proposes an editable plan.'],
  ['Deliver the evidence', 'Freelancer submits work notes', 'and links; revisions are retained.'],
  ['Assess the submission', 'Advisory AI checks criteria.', 'Unverified evidence stays visible.'],
  ['Make a human decision', 'Client approves or requests', 'changes; AI cannot authorize pay.'],
  ['Approve Sandbox checkout', 'Buyer approves in PayPal.', 'Backend uses the stored amount.'],
  ['Verify and record', 'Server verifies completed capture.', 'Receipt and audit history persist.'],
], 'Changes requested → revised evidence → review again. Only verified capture → PAID.');
diagram('architecture', 'Technical architecture', 'Browser → same-origin /api proxy → Express → persistent database and external services', [
  ['React workspace', 'TypeScript · Vite · React Query', 'Forms, reports and role-based UI'],
  ['Vercel or Netlify', 'Static frontend + SPA fallback', '/api requests proxy to backend'],
  ['Express API', 'Sessions · CSRF · Zod · ownership', 'Business rules enforced on server'],
  ['Persistent SQLite', 'Prisma · relational constraints', 'Evidence, approvals, audit, receipts'],
  ['AI provider', 'Labeled deterministic mock OR', 'OpenAI structured JSON outputs'],
  ['PayPal Sandbox', 'Browser SDK: buyer approval', 'Server: OAuth, Orders v2, capture'],
], 'One persistent backend instance. Secrets stay on the server. No escrow or freelancer payouts.');
// True flowcharts: connectors show direction; diamonds show decisions.
function flowchart(file, title, subtitle, height, draw) {
  const parts = [];
  const box = (x, y, w, heading, detail = '', color = '#152b3d') => {
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="78" rx="16" fill="${color}" stroke="#548097"/><text x="${x + w / 2}" y="${y + 32}" text-anchor="middle" font-size="20" font-weight="700">${escape(heading)}</text><text x="${x + w / 2}" y="${y + 57}" text-anchor="middle" fill="#c2d4e2" font-size="16">${escape(detail)}</text>`);
  };
  const arrow = (path, label = '', x = 0, y = 0) => {
    parts.push(`<path d="${path}" fill="none" stroke="#69dcc5" stroke-width="3" marker-end="url(#arrow)"/>`);
    if (label) parts.push(`<text x="${x}" y="${y}" fill="#9af0dd" font-size="16" text-anchor="middle">${escape(label)}</text>`);
  };
  const decision = (cx, cy, text) => parts.push(`<path d="M ${cx} ${cy - 62} L ${cx + 145} ${cy} L ${cx} ${cy + 62} L ${cx - 145} ${cy} Z" fill="#234b51" stroke="#69dcc5"/><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="19" font-weight="700">${escape(text)}</text>`);
  draw({ box, arrow, decision });
  writeFileSync(`docs/images/${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(subtitle)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="#69dcc5"/></marker></defs><rect width="1200" height="${height}" rx="24" fill="#091c2b"/><g font-family="Segoe UI,Arial,sans-serif" fill="#f4f8fc"><text x="50" y="62" font-size="32" font-weight="700">${escape(title)}</text><text x="50" y="102" fill="#a8c7d7" font-size="18">${escape(subtitle)}</text>${parts.join('')}</g></svg>\n`);
}

flowchart('app-purpose-flowchart', 'What is VeriFlow AI?', 'A shared workspace that connects freelance agreements, delivery evidence and payment accountability.', 850, ({ box, arrow }) => {
  box(350, 145, 500, 'The problem', 'Unclear deliverables and scattered evidence');
  arrow('M 600 223 V 270');
  box(350, 270, 500, 'VeriFlow AI', 'One traceable record from agreement to receipt', '#204b4b');
  arrow('M 600 348 V 375 H 230 V 410');
  arrow('M 600 348 V 410');
  arrow('M 600 348 V 375 H 970 V 410');
  box(60, 410, 340, 'Client', 'Defines criteria and approves work');
  box(430, 410, 340, 'AI assistant', 'Suggests plans and assesses claims');
  box(800, 410, 340, 'Freelancer', 'Delivers work and submits evidence');
  arrow('M 230 488 V 535 H 600 V 580');
  arrow('M 600 488 V 580');
  arrow('M 970 488 V 535 H 600');
  box(350, 580, 500, 'Human-approved PayPal Sandbox checkout', 'Server verifies capture before marking paid');
  arrow('M 600 658 V 710');
  box(350, 710, 500, 'The outcome', 'Clear scope, revision history, decisions and receipts', '#204b4b');
});

flowchart('app-functioning-flowchart', 'How VeriFlow functions: step by step', 'Follow the arrows. Human decisions control approval; only a verified capture marks a milestone paid.', 1920, ({ box, arrow, decision }) => {
  const step = (y, heading, detail) => box(330, y, 540, heading, detail);
  step(145, '1. Register / sign in', 'Separate client and freelancer accounts');
  arrow('M 600 223 V 260');
  step(260, '2. Create and assign a project', 'Client sets requirements, budget and freelancer');
  arrow('M 600 338 V 375');
  step(375, '3. Define milestone agreements', 'Write criteria manually or edit and save an AI plan');
  arrow('M 600 453 V 490');
  step(490, '4. Submit delivery evidence', 'Freelancer adds work notes and reference links');
  arrow('M 600 568 V 605');
  step(605, '5. Start review and inspect the work', 'Optional advisory AI assessment; links are not fetched');
  arrow('M 600 683 V 738');
  decision(600, 800, 'Client approves?');
  arrow('M 455 800 H 170 V 688', 'No: request changes', 173, 765);
  box(25, 610, 275, 'Revise and resubmit', 'Earlier evidence is retained');
  arrow('M 162 610 V 529 H 330');
  arrow('M 600 862 V 925', 'Yes', 630, 898);
  step(925, '6. Load PayPal Sandbox checkout', 'Configured credentials required; server creates order');
  arrow('M 600 1003 V 1058');
  decision(600, 1120, 'Buyer approves?');
  arrow('M 745 1120 H 960 V 964 H 870', 'Cancel: retry checkout', 989, 1035);
  arrow('M 600 1182 V 1240', 'Yes', 630, 1215);
  step(1240, '7. Capture and verify on the server', 'Check order, invoice, capture status, amount and currency');
  arrow('M 600 1318 V 1373');
  decision(600, 1435, 'Capture verified?');
  arrow('M 745 1435 H 965 V 1540', 'No / uncertain', 973, 1405);
  box(800, 1540, 350, 'Keep unpaid / unresolved', 'Reconcile the existing order');
  arrow('M 965 1618 V 1670 H 1170 V 1279 H 870', 'Recheck', 1095, 1660);
  arrow('M 600 1497 V 1550', 'Yes', 630, 1528);
  step(1550, '8. Mark milestone PAID', 'Persist receipt and audit history for both participants');
  arrow('M 600 1628 V 1690');
  step(1690, 'Continue with remaining milestones', 'Repeat delivery, review and payment for each milestone');
  arrow('M 330 1729 H 315 V 529 H 330', 'More milestones', 205, 1700);
  partsNote();
  function partsNote() {
    box(250, 1805, 700, 'When all milestones are paid, the workflow is complete', 'Sandbox test money only. No escrow or freelancer payouts.', '#204b4b');
    arrow('M 600 1768 V 1805', 'All paid', 650, 1793);
  }
});
console.log('Created architecture diagrams and purpose/functioning flowcharts.');
