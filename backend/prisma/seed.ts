import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../src/config/database.js';

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
  const passwordHash = await bcrypt.hash('VeriflowDemo2026!', 12);
  const client = await db.user.upsert({ where: { email: 'client@veriflow.local' }, update: {}, create: { id: 'demo-client', email: 'client@veriflow.local', name: 'Alex Morgan', role: 'CLIENT', passwordHash } });
  const freelancer = await db.user.upsert({ where: { email: 'freelancer@veriflow.local' }, update: {}, create: { id: 'demo-freelancer', email: 'freelancer@veriflow.local', name: 'Sam Rivera', role: 'FREELANCER', passwordHash } });
  await db.project.upsert({ where: { id: 'demo-project' }, update: {}, create: {
    id: 'demo-project', title: 'Studio website launch', description: 'Design and build an accessible, responsive website for a small creative studio.', requirements: 'Responsive at mobile and desktop widths. Keyboard-accessible navigation and contact form validation.', deliverables: 'Design files, React source, deployed preview, and handover notes.', clientId: client.id, freelancerId: freelancer.id, currency: 'USD', budgetMinor: 60000,
    milestones: { create: [
      { id: 'demo-design', sequence: 1, title: 'UI Design', description: 'Agree on responsive layouts and visual direction.', amountMinor: 15000, acceptanceCriteria: ['Provide desktop and mobile layouts.', 'Include navigation, contact form, and contrast specifications.'] },
      { id: 'demo-frontend', sequence: 2, title: 'Frontend Implementation', description: 'Implement the approved website with React.', amountMinor: 25000, acceptanceCriteria: ['Navigation is keyboard accessible.', 'Contact form validates email and required fields.', 'Layout adapts at 390px and 1440px.'] },
      { id: 'demo-delivery', sequence: 3, title: 'Final Delivery', description: 'Deliver tested source and handover documentation.', amountMinor: 20000, acceptanceCriteria: ['Provide reproducible build and test commands.', 'Deliver source repository and deployment instructions.'] },
    ] }, auditLogs: { create: { actorId: client.id, eventType: 'DEMO_PROJECT_SEEDED', metadataJson: { localDemo: true } } },
  } });
  console.log('Local demo ready. Accounts: client@veriflow.local / freelancer@veriflow.local. Password: see README. Existing data was preserved.');
}
seed().finally(() => db.$disconnect());
