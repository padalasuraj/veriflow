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
console.log('Created accessible workflow and architecture SVG diagrams.');
