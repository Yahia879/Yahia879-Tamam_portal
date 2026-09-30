import 'dotenv/config';
import { getDb } from '../server/db';
import { projects, mosqueRequests } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [proj] = await db.select().from(projects).where(eq(projects.id, 35));
  console.log('Project 35:', proj?.name, 'programType:', proj?.programType, 'requestId:', proj?.requestId);
  if (proj?.requestId) {
    const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, proj.requestId));
    console.log('Linked request:', req?.id, 'programType:', req?.programType, 'currentStage:', req?.currentStage);
  }

  const [req105] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 105));
  console.log('\nRequest 105:', req105?.id, 'currentStage:', req105?.currentStage, 'status:', req105?.status, 'programType:', req105?.programType);
  let pd: any = req105?.programData;
  if (typeof pd === 'string') pd = JSON.parse(pd);
  console.log('Req 105 procurement:', JSON.stringify(pd?.sedanaProcurement || {}, null, 2));

  process.exit(0);
}
main().catch(console.error);
