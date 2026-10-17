import 'dotenv/config';
import assert from 'node:assert/strict';
import { connectDatabase } from '../src/config/database.js';

const first = connectDatabase();
try {
  const project = await first.project.findUniqueOrThrow({ where: { id: 'demo-project' }, include: { client: true, freelancer: true, milestones: { orderBy: { sequence: 'asc' } } } });
  assert.equal(project.client.email, 'client@veriflow.local');
  assert.equal(project.freelancer?.email, 'freelancer@veriflow.local');
  assert.equal(project.budgetMinor, 60000);
  assert.deepEqual(project.milestones.map(m => m.amountMinor), [15000, 25000, 20000]);
  assert.equal(project.milestones.reduce((sum, m) => sum + m.amountMinor, 0), project.budgetMinor);
} finally { await first.$disconnect(); }
const second = connectDatabase();
try {
  assert.equal(await second.project.count({ where: { id: 'demo-project' } }), 1);
  assert.equal(await second.milestone.count({ where: { projectId: 'demo-project' } }), 3);
  console.log('Demo relationships, $600 allocation and persistence after reconnect verified. No data changed.');
} finally { await second.$disconnect(); }
