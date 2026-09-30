import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
  console.log("=== REQUEST 104 RAW PROGRAM DATA ===");
  let pData: any = req?.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  console.log("Outbound orders in 104:", JSON.stringify(pData?.sedanaExecution?.outboundOrders, null, 2));

  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  const inv: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("\n=== INVENTORY ITEMS ===");
  inv.inventoryItems.forEach((it: any) => {
    console.log({
      id: it.id,
      name: it.name,
      totalInward: it.totalInward,
      totalOutbound: it.totalOutbound,
      totalDelivered: it.totalDelivered,
      pendingReceiptQty: it.pendingReceiptQty,
      lastConfirmedOutboundDate: it.lastConfirmedOutboundDate,
      nextDueDate: it.nextDueDate,
      daysUntilNextDue: it.daysUntilNextDue,
      isDue: it.isDue,
      isAllCompleted: it.isAllCompleted,
      cycleStartDate: it.cycleStartDate,
    });
  });

  process.exit(0);
}

main().catch(console.error);
