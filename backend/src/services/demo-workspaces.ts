import type { Database } from '../config/database.js';

export async function removeExpiredDemos(db: Database) {
  const expiredUsers = await db.user.findMany({ where: { isDemo: true, demoExpiresAt: { lte: new Date() } }, select: { id: true } });
  if (!expiredUsers.length) return;
  const userIds = expiredUsers.map(user => user.id);
  const projects = await db.project.findMany({ where: { OR: [{ clientId: { in: userIds } }, { freelancerId: { in: userIds } }] }, select: { id: true } });
  const projectIds = projects.map(project => project.id);
  const milestones = await db.milestone.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } });
  const milestoneIds = milestones.map(milestone => milestone.id);
  const submissions = await db.submission.findMany({ where: { milestoneId: { in: milestoneIds } }, select: { id: true } });
  const submissionIds = submissions.map(submission => submission.id);
  await db.$transaction(async tx => {
    await tx.payment.deleteMany({ where: { milestoneId: { in: milestoneIds } } });
    await tx.approval.deleteMany({ where: { milestoneId: { in: milestoneIds } } });
    await tx.aiEvaluation.deleteMany({ where: { submissionId: { in: submissionIds } } });
    await tx.submission.deleteMany({ where: { milestoneId: { in: milestoneIds } } });
    await tx.auditLog.deleteMany({ where: { OR: [{ projectId: { in: projectIds } }, { actorId: { in: userIds } }] } });
    await tx.milestone.deleteMany({ where: { id: { in: milestoneIds } } });
    await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    await tx.session.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds }, isDemo: true } });
  });
}
