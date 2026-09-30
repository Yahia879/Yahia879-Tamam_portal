import 'dotenv/config';
import { appRouter } from '../server/routers';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");

  console.log("=== CASE A: REQUEST CREATOR IS SERVICE_REQUESTER (USER 96) ===");
  // Reset req 104
  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
  const boqItems = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 104));

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};
  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  const pastDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
  pData.sedanaExecution.inwardOrders = [
    {
      id: "INW-104-01",
      orderNumber: "INW-104-01",
      orderDate: pastDate.split("T")[0],
      supplierName: "المورد المعتمد - توريد ابتدائي",
      invoiceNumber: "INV-104-INIT",
      deliveryNoteNumber: "DN-104-INIT",
      notes: "توريد ابتدائي",
      items: boqItems.map(b => ({ id: String(b.id), itemName: b.itemName, quantity: parseFloat(b.quantity || "50"), unit: b.unit || "وحدة", category: "مواد وتجهيزات", frequency: "نصف سنوي" })),
      createdAt: pastDate,
      createdBy: 1,
      createdByName: "النظام",
    }
  ];

  await db.update(mosqueRequests).set({ programData: pData, currentStage: "execution", status: "approved", updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));

  const callerAdmin = appRouter.createCaller({ user: { id: 1, role: 'admin', name: 'المدير' } as any, req: {} as any, res: {} as any });
  const callerRequester = appRouter.createCaller({ user: { id: 96, role: 'service_requester', name: 'طالب الخدمة' } as any, req: {} as any, res: {} as any });

  // 1. Admin creates outbound order
  console.log("Admin creates outbound order...");
  const out1 = await callerAdmin.sedanaExecution.createOutboundOrder({
    requestId: 104,
    scheduledDate: "2026-09-24",
    periodLabel: "الدفعة الدورية - دفعة رقم 1",
    outboundMethod: "direct_imam",
    items: [
      { id: "494", itemName: "عامل نظافة متفرغ للمسجد", quantity: 1, unit: "شهر" },
      { id: "495", itemName: "صابون سائل للأيدي", quantity: 4, unit: "جالون" }
    ],
  });
  console.log("Order 1 status:", out1.order.status); // MUST BE pending_receipt

  // 2. Check modal query for admin vs requester
  const adminPending = await callerAdmin.sedanaExecution.getMyPendingOutbounds();
  const reqPending = await callerRequester.sedanaExecution.getMyPendingOutbounds();
  console.log("Admin sees pending outbounds (MUST BE 0):", adminPending.length);
  console.log("Requester sees pending outbounds (MUST BE 1):", reqPending.length);

  // 3. Requester confirms receipt
  console.log("Requester confirms receipt...");
  await callerRequester.sedanaExecution.confirmOutboundReceipt({
    requestId: 104,
    outboundOrderId: out1.order.id,
  });

  const invA: any = await callerAdmin.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("After Requester Confirmation:");
  console.log("Stage (MUST BE execution):", invA.request.currentStage);
  console.log("Items:", invA.inventoryItems.map((i: any) => ({
    name: i.name,
    totalDelivered: i.totalDelivered,
    lastConfirmedOutboundDate: i.lastConfirmedOutboundDate,
    nextDueDate: i.nextDueDate,
    daysUntilNextDue: i.daysUntilNextDue,
    isDue: i.isDue,
    isAllCompleted: i.isAllCompleted,
  })));

  // === RESET FOR MANUAL BROWSER TEST ===
  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];
  await db.update(mosqueRequests).set({ programData: pData, currentStage: "execution", status: "approved", updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));
  console.log("\n=== RESET 104 TO CLEAN READY STATE ===");

  process.exit(0);
}

main().catch(console.error);
