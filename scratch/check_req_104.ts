import 'dotenv/config';
import { appRouter } from '../server/routers';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const caller = appRouter.createCaller({ user: { id: 1, role: 'admin', name: 'المدير' } as any, req: {} as any, res: {} as any });
  const inv = await caller.sedanaExecution.getVirtualInventory({ requestId: 104 });
  
  console.log('Request 104 inventory items:');
  inv.inventoryItems.forEach((it: any) => {
    console.log({
      id: it.id,
      name: it.name,
      approvedQty: it.approvedQty,
      quantity: it.quantity,
      totalInward: it.totalInward,
      totalOutbound: it.totalOutbound,
      totalDelivered: it.totalDelivered,
      availableStock: it.availableStock,
      remainingToDisburse: it.remainingToDisburse,
      cycleQuantity: it.cycleQuantity,
      isAllCompleted: it.isAllCompleted,
      nextDueDate: it.nextDueDate,
      daysUntilNextDue: it.daysUntilNextDue,
      isDue: it.isDue,
    });
  });

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104));
  let pd: any = req.programData;
  if (typeof pd === 'string') pd = JSON.parse(pd);
  console.log('Outbound orders in 104:', JSON.stringify(pd?.sedanaExecution?.outboundOrders || [], null, 2));

  const qs = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 104));
  console.log('Quantity Schedules in 104:', qs);

  process.exit(0);
}
main().catch(console.error);
