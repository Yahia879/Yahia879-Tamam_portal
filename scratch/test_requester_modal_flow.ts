import 'dotenv/config';
import { appRouter } from '../server/routers';
import { getDb } from '../server/db';
import { mosqueRequests } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  console.log("1. Creating outbound order on request 104...");
  const outRes = await caller.sedanaExecution.createOutboundOrder({
    requestId: 104,
    scheduledDate: "2026-09-23",
    periodLabel: "الدفعة الدورية - دفعة رقم 1",
    outboundMethod: "direct_imam",
    items: [
      {
        id: "494",
        itemName: "عامل نظافة متفرغ للمسجد",
        quantity: 1,
        unit: "شهر",
      },
      {
        id: "495",
        itemName: "صابون سائل للأيدي",
        quantity: 4,
        unit: "جالون",
      }
    ],
  });
  console.log("Created outbound order:", outRes.order.orderNumber, "Status:", outRes.order.status);

  console.log("2. Fetching getMyPendingOutbounds...");
  const pending = await caller.sedanaExecution.getMyPendingOutbounds();
  console.log("Pending outbounds count:", pending.length);
  const found = pending.find((p: any) => p.requestId === 104);
  console.log("Found pending order for req 104:", found ? {
    requestId: found.requestId,
    mosqueName: found.mosqueName,
    orderNumber: found.outbound.orderNumber,
    items: found.outbound.items,
  } : "NOT FOUND");

  if (found) {
    console.log("3. Testing rejection flow...");
    const rejectRes = await caller.sedanaExecution.rejectOutboundReceipt({
      requestId: 104,
      outboundOrderId: found.outbound.id,
      reason: "المواد لم تصل بعد للمسجد - تجربة الرفض",
    });
    console.log("Reject response:", rejectRes.message, "Status:", rejectRes.outbound.status, "Reason:", rejectRes.outbound.rejectionReason);

    const pendingAfter = await caller.sedanaExecution.getMyPendingOutbounds();
    console.log("Pending outbounds count after rejection:", pendingAfter.length);
  }

  // Reset request 104 to initial clean state with 0 timer for user manual testing
  const db = await getDb();
  if (db) {
    const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
    let pData: any = req?.programData;
    if (typeof pData === "string") pData = JSON.parse(pData);
    if (pData?.sedanaExecution) {
      pData.sedanaExecution.outboundOrders = [];
      pData.sedanaExecution.deliveryOrders = [];
      await db.update(mosqueRequests).set({ programData: pData, updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));
      console.log("Reset Request 104 to clean state ready for user test in browser!");
    }
  }

  process.exit(0);
}

main().catch(console.error);
