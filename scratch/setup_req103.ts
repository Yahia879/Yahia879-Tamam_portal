import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not found");

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 103)).limit(1);
  if (!req) {
    console.log("Request 103 not found!");
    process.exit(1);
  }

  const boqItems = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 103));
  console.log("Request 103 BOQ items:", boqItems.map(b => ({ id: b.id, name: b.itemName, qty: b.quantity, unit: b.unit, desc: b.itemDescription })));

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  // Set date 200 days in past to ensure all frequencies (monthly, quarterly, semi-annually) reach zero timer (isDue = true)
  const pastDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();

  let inwardItems: any[] = [];
  if (boqItems.length > 0) {
    inwardItems = boqItems.map((b) => ({
      id: String(b.id),
      itemName: b.itemName,
      quantity: parseFloat(b.quantity || "1"),
      unit: b.unit || "وحدة",
      category: b.category || "مواد وتجهيزات",
      frequency: "شهري",
    }));
  } else if (pData.evaluation?.items) {
    inwardItems = pData.evaluation.items.map((it: any, idx: number) => ({
      id: String(it.key || it.id || idx + 1),
      itemName: it.name || it.itemName || `صنف ${idx + 1}`,
      quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
      unit: it.unit || "وحدة",
      category: it.category || "مواد وتجهيزات",
      frequency: "شهري",
    }));
  } else if (pData.basketItems) {
    inwardItems = pData.basketItems.map((b: any, idx: number) => ({
      id: String(b.id || idx + 1),
      itemName: b.name,
      quantity: parseFloat(b.quantity || "1"),
      unit: b.unit || "وحدة",
      category: b.category || "مواد وتجهيزات",
      frequency: b.frequency || "شهري",
    }));
  }

  pData.sedanaExecution.inwardOrders = [
    {
      id: "INW-103-01",
      orderNumber: "INW-103-01",
      orderDate: pastDate.split("T")[0],
      supplierName: "المورد المعتمد - توريد ابتدائي",
      invoiceNumber: "INV-103-INIT",
      deliveryNoteNumber: "DN-103-INIT",
      notes: "توريد ابتدائي لكامل بنود الميزانية بالمستودع",
      items: inwardItems,
      createdAt: pastDate,
      createdBy: 1,
      createdByName: "النظام",
    }
  ];

  await db
    .update(mosqueRequests)
    .set({
      programData: pData,
      updatedAt: new Date(),
    })
    .where(eq(mosqueRequests.id, 103));

  console.log("Updated request 103 in DB!");

  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  const inv: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 103 });
  console.log("Virtual Inventory for Request 103:");
  inv.inventoryItems.forEach((i: any) => {
    console.log({
      id: i.id,
      name: i.name,
      approvedQty: i.approvedQty,
      availableStock: i.availableStock,
      nextDueDate: i.nextDueDate,
      daysUntilNextDue: i.daysUntilNextDue,
      isDue: i.isDue,
    });
  });

  process.exit(0);
}

main().catch(console.error);
