import 'dotenv/config';
import { getDb } from '../server/db';
import { disbursementOrders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [d] = await db.select().from(disbursementOrders).where(eq(disbursementOrders.id, 167));
  console.log('Disbursement 167:', JSON.stringify(d, null, 2));
  process.exit(0);
}
main().catch(console.error);
