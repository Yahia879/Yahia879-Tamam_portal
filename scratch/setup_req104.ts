import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, quantitySchedules } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not found");

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 104)).limit(1);
  if (!req) {
    console.log("Request 104 not found!");
    process.exit(1);
  }

  const boqItems = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, 104));

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  // 200 days ago
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

  await db
    .update(mosqueRequests)
    .set({
      programData: pData,
      updatedAt: new Date(),
    })
    .where(eq(mosqueRequests.id, 104));

  console.log("Updated request 104 in DB with stock and 0 timer!");
  process.exit(0);
}

main().catch(console.error);
