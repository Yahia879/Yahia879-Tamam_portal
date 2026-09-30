import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No DB");

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
  if (!req) throw new Error("Req 104 not found");

  const boqItems = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 104));

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  const pastDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();

  let inwardItems = boqItems.map((b) => ({
    id: String(b.id),
    itemName: b.itemName,
    quantity: parseFloat(b.quantity || "1"),
    unit: b.unit || "وحدة",
    category: b.category || "مواد وتجهيزات",
    frequency: "نصف سنوي",
  }));

  pData.sedanaExecution.inwardOrders = [
    {
      id: "INW-104-01",
      orderNumber: "INW-104-01",
      orderDate: pastDate.split("T")[0],
      supplierName: "المورد المعتمد - توريد ابتدائي",
      invoiceNumber: "INV-104-INIT",
      deliveryNoteNumber: "DN-104-INIT",
      notes: "توريد ابتدائي لكامل بنود الميزانية بالمستودع",
      items: inwardItems,
      createdAt: pastDate,
      createdBy: 1,
      createdByName: "النظام",
    }
  ];

  await db.update(mosqueRequests).set({ programData: pData, updatedAt: new Date() }).where(eq(mosqueRequests.id, 104));

  console.log("=== RESET 104 COMPLETE ===");

  const callerAdmin = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'المدير' } as any,
    req: {} as any,
    res: {} as any,
  });

  const callerRequester = appRouter.createCaller({
    user: { id: req.userId, role: 'service_requester', name: 'طالب الخدمة' } as any,
    req: {} as any,
    res: {} as any,
  });

  const inv: any = await callerAdmin.sedanaExecution.getVirtualInventory({ requestId: 104 });
  console.log("Virtual Inventory items:", inv.inventoryItems.map((i: any) => ({
    name: i.name,
    approvedQty: i.approvedQty,
    cycleQuantity: i.cycleQuantity,
    availableStock: i.availableStock,
    remainingToDisburse: i.remainingToDisburse,
    daysUntilNextDue: i.daysUntilNextDue,
    isDue: i.isDue,
  })));

  // Verify getMyPendingOutbounds for admin vs requester
  const adminPending = await callerAdmin.sedanaExecution.getMyPendingOutbounds();
  console.log("Admin pending outbounds (MUST BE 0):", adminPending.length);

  const reqPending = await callerRequester.sedanaExecution.getMyPendingOutbounds();
  console.log("Requester pending outbounds before outbound:", reqPending.length);

  process.exit(0);
}

main().catch(console.error);
