import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not found");

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 102)).limit(1);
  if (!req) {
    console.log("Request 102 not found!");
    process.exit(1);
  }

  const boqItems = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 102));

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  // Set date 200 days in the past so 180-day frequency timer is zero (isDue: true)
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
      id: "INW-102-01",
      orderNumber: "INW-102-01",
      orderDate: pastDate.split("T")[0],
      supplierName: "المورد المعتمد - توريد ابتدائي",
      invoiceNumber: "INV-102-INIT",
      deliveryNoteNumber: "DN-102-INIT",
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
    .where(eq(mosqueRequests.id, 102));

  console.log("Updated request 102 with 200-day past date!");

  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  const inv: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 102 });
  console.log("Virtual Inventory for Request 102:");
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
