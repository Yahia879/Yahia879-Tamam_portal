import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not found");

  // Get request 101
  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 101)).limit(1);
  if (!req) throw new Error("Request 101 not found");

  let pData: any = req.programData;
  if (typeof pData === "string") pData = JSON.parse(pData);
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  // Clear outbound and delivery orders in 101
  pData.sedanaExecution.outboundOrders = [];
  pData.sedanaExecution.deliveryOrders = [];

  // Ensure inward orders exist and dates are set in the past so timers are ready (isDue = true)
  const pastDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  pData.sedanaExecution.inwardOrders = [
    {
      id: "INW-101-01",
      orderNumber: "INW-101-01",
      orderDate: pastDate.split("T")[0],
      supplierName: "المورد المعتمد - توريد ابتدائي",
      invoiceNumber: "INV-101-INIT",
      deliveryNoteNumber: "DN-101-INIT",
      notes: "توريد ابتدائي لكامل بنود الميزانية بالمستودع",
      items: [
        {
          id: "488",
          itemName: "عامل نظافة متفرغ للمسجد",
          quantity: 5,
          unit: "شهر",
          category: "العمالة",
          frequency: "شهري",
        },
        {
          id: "489",
          itemName: "صابون سائل للأيدي",
          quantity: 5,
          unit: "جالون",
          category: "مواد وتجهيزات",
          frequency: "شهري",
        }
      ],
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
    .where(eq(mosqueRequests.id, 101));

  console.log("Successfully reset Request 101!");
  process.exit(0);
}

main().catch(console.error);
