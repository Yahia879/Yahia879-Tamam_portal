import { appRouter } from '../server/routers';
import { getDb } from '../server/db';

async function test() {
  const db = await getDb();
  const caller = appRouter.createCaller({
    user: { id: 1, role: 'super_admin', name: 'Admin', email: 'admin@test.com' } as any,
    req: {} as any,
    res: {} as any,
  });

  const resWithExclude = await caller.projects.getAll({ excludeClosedRequests: true });
  console.log('Total returned with excludeClosedRequests: true ->', resWithExclude.length);
  const p22 = resWithExclude.find(p => p.id === 22);
  console.log('Project 22 with excludeClosedRequests: true ->', p22 ? 'FOUND (ERROR)' : 'NOT FOUND (CORRECT)');

  const resWithoutExclude = await caller.projects.getAll({});
  console.log('Total returned with excludeClosedRequests: false/none ->', resWithoutExclude.length);
  const p22_none = resWithoutExclude.find(p => p.id === 22);
  console.log('Project 22 with excludeClosedRequests: none ->', p22_none ? 'FOUND' : 'NOT FOUND');

  process.exit(0);
}

test().catch(console.error);
