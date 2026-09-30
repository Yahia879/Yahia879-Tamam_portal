import 'dotenv/config';
import { appRouter } from '../server/routers';
import { getDb } from '../server/db';
import { mosqueRequests, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");

  // Temporarily set req 104's userId to admin (user id 1)
  await db.update(mosqueRequests).set({ userId: 1 }).where(eq(mosqueRequests.id, 104));

  const callerAdmin = appRouter.createCaller({ user: { id: 1, role: 'admin', name: 'المدير' } as any, req: {} as any, res: {} as any });

  const out = await callerAdmin.sedanaExecution.createOutboundOrder({
    requestId: 104,
    scheduledDate: '2026-09-24',
    periodLabel: 'دفعة مسؤول',
    outboundMethod: 'direct_imam',
    items: [{ id: '494', itemName: 'عامل نظافة متفرغ للمسجد', quantity: 1, unit: 'شهر' }]
  });

  console.log('Admin creator - outbound order status (MUST BE delivered):', out.order.status);
  
  const inv: any = await callerAdmin.sedanaExecution.getVirtualInventory({ requestId: 104 });
  const item = inv.inventoryItems.find((i: any) => i.id === '494');
  console.log('Countdown started immediately:', {
    lastConfirmedOutboundDate: item.lastConfirmedOutboundDate,
    nextDueDate: item.nextDueDate,
    daysUntilNextDue: item.daysUntilNextDue,
    isDue: item.isDue
  });

  // Restore userId to 96 and clean outbounds for Req 104
  let pData: any = (await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)))[0].programData;
  if (typeof pData === 'string') pData = JSON.parse(pData);
  pData.sedanaExecution.outboundOrders = [];
  await db.update(mosqueRequests).set({ userId: 96, programData: pData, currentStage: 'execution', status: 'approved', updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));

  console.log('Case B passed & Req 104 restored to User 96 with 0 outbound orders!');
  process.exit(0);
}
main().catch(console.error);
