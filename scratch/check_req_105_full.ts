import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, projects, disbursementOrders, payments, contracts } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 105));
  let pd: any = req.programData;
  if (typeof pd === 'string') pd = JSON.parse(pd);

  console.log('Keys in req 105 programData:', Object.keys(pd));
  console.log('sedanaProcurement:', JSON.stringify(pd.sedanaProcurement || {}, null, 2));
  console.log('sedanaExecution:', JSON.stringify(pd.sedanaExecution || {}, null, 2));

  // Let's also check all payments where requestId = 105 or projectId = 35
  const allPayments = await db.select().from(payments);
  const p105 = allPayments.filter((p: any) => p.requestId === 105 || p.projectId === 35);
  console.log('Payments matching 105/35:', p105);

  const allContracts = await db.select().from(contracts);
  const c105 = allContracts.filter((c: any) => c.requestId === 105 || c.projectId === 35);
  console.log('Contracts matching 105/35:', c105);

  process.exit(0);
}
main().catch(console.error);
