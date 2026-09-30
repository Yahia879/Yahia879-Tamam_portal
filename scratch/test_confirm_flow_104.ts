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

  console.log("=== STEP 1: INITIAL STATE ===");
  const inv1: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("Items before outbound:", inv1.inventoryItems.map((i: any) => ({
    name: i.name,
    availableStock: i.availableStock,
    totalOutbound: i.totalOutbound,
    totalDelivered: i.totalDelivered,
    pendingReceiptQty: i.pendingReceiptQty,
    daysUntilNextDue: i.daysUntilNextDue,
    isDue: i.isDue,
  })));

  console.log("\n=== STEP 2: CREATE OUTBOUND ORDER (pending_receipt) ===");
  const outRes = await caller.sedanaExecution.createOutboundOrder({
    requestId: 104,
    scheduledDate: "2026-09-24",
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
  console.log("Created order:", outRes.order.orderNumber, "Status:", outRes.order.status);

  const inv2: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("Items after outbound creation (waiting for beneficiary):", inv2.inventoryItems.map((i: any) => ({
    name: i.name,
    availableStock: i.availableStock,
    totalOutbound: i.totalOutbound,
    totalDelivered: i.totalDelivered,
    pendingReceiptQty: i.pendingReceiptQty,
    lastConfirmedOutboundDate: i.lastConfirmedOutboundDate,
  })));

  console.log("\n=== STEP 3: BENEFICIARY CONFIRMS RECEIPT ===");
  const confirmRes = await caller.sedanaExecution.confirmOutboundReceipt({
    requestId: 104,
    outboundOrderId: outRes.order.id,
    notes: "تم استلام المواد كاملة وبحالة ممتازة",
  });
  console.log("Confirmation message:", confirmRes.message);

  const inv3: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("Items after beneficiary confirmation:", inv3.inventoryItems.map((i: any) => ({
    name: i.name,
    availableStock: i.availableStock,
    totalOutbound: i.totalOutbound,
    totalDelivered: i.totalDelivered, // Must be 1 and 4!
    pendingReceiptQty: i.pendingReceiptQty,
    lastConfirmedOutboundDate: i.lastConfirmedOutboundDate,
    nextDueDate: i.nextDueDate,
    daysUntilNextDue: i.daysUntilNextDue, // Timer started!
    isDue: i.isDue,
  })));

  console.log("Outbound orders table status:", inv3.outboundOrders.map((o: any) => ({
    orderNumber: o.orderNumber,
    status: o.status,
    confirmedAt: o.confirmation?.confirmedAt,
  })));

  // Clean up and reset Request 104 for browser testing
  const db = await getDb();
  if (db) {
    const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
    let pData: any = req?.programData;
    if (typeof pData === "string") pData = JSON.parse(pData);
    if (pData?.sedanaExecution) {
      pData.sedanaExecution.outboundOrders = [];
      pData.sedanaExecution.deliveryOrders = [];
      await db.update(mosqueRequests).set({ programData: pData, updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));
      console.log("\nReset Request 104 to clean state ready for user test in browser!");
    }
  }

  process.exit(0);
}

main().catch(console.error);
