import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
  console.log('Req 104:', req ? { id: req.id, userId: req.userId, stage: req.currentStage, status: req.status } : 'Not found');
  if (req) {
    const boq = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 104));
    console.log('BOQ items:', boq.map(b => ({ id: b.id, name: b.itemName, qty: b.quantity, desc: b.itemDescription })));
  }
  process.exit(0);
}
main().catch(console.error);
