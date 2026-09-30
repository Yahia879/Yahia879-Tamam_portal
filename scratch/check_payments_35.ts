import 'dotenv/config';
import { getDb } from '../server/db';
import { projects, mosqueRequests, payments, contracts, disbursementOrders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const pList = await db.select().from(payments).where(eq(payments.projectId, 35));
  console.log('Payments for project 35 count:', pList.length);
  pList.forEach(p => console.log('Payment:', p.id, 'status:', p.status, 'amount:', p.amount, 'description:', p.description));

  const cList = await db.select().from(contracts).where(eq(contracts.projectId, 35));
  console.log('Contracts for project 35 count:', cList.length);
  cList.forEach(c => console.log('Contract:', c.id, 'status:', c.status, 'amount:', c.amount, 'supplier:', c.supplierName));

  const dList = await db.select().from(disbursementOrders).where(eq(disbursementOrders.requestId, 105));
  console.log('Disbursement orders for request 105 count:', dList.length);
  dList.forEach(d => console.log('Disbursement:', d.id, 'status:', d.status, 'amount:', d.amount, 'type:', d.disbursementType));

  process.exit(0);
}
main().catch(console.error);
