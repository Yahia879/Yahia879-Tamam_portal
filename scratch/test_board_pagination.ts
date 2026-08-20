import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../server/db";
import { disbursementOrders, disbursementRequests } from "../drizzle/schema";
import { inArray, count, desc, eq } from "drizzle-orm";

async function testPagination() {
  const db = await getDb();
  if (!db) {
    console.error("No DB");
    return;
  }

  const baseWhere = inArray(
    disbursementOrders.status,
    ["approved", "executed", "pending", "pending_executive", "edited", "rejected", "draft"] as any
  );

  const [totalCountRes] = await db
    .select({ count: count() })
    .from(disbursementOrders)
    .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
    .where(baseWhere);

  console.log("Total orders matching baseWhere in DB:", totalCountRes?.count);

  const page1 = await db
    .select({
      orderId: disbursementOrders.id,
      orderNumber: disbursementOrders.orderNumber,
      amount: disbursementOrders.amount,
      beneficiaryName: disbursementOrders.beneficiaryName,
      status: disbursementOrders.status,
    })
    .from(disbursementOrders)
    .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
    .where(baseWhere)
    .orderBy(desc(disbursementOrders.createdAt))
    .limit(20)
    .offset(0);

  console.log("Page 1 count:", page1.length);
  console.log("Page 1 order numbers (first 5):", page1.slice(0, 5).map(o => o.orderNumber));

  const page2 = await db
    .select({
      orderId: disbursementOrders.id,
      orderNumber: disbursementOrders.orderNumber,
      amount: disbursementOrders.amount,
      beneficiaryName: disbursementOrders.beneficiaryName,
      status: disbursementOrders.status,
    })
    .from(disbursementOrders)
    .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
    .where(baseWhere)
    .orderBy(desc(disbursementOrders.createdAt))
    .limit(20)
    .offset(20);

  console.log("Page 2 count:", page2.length);
  console.log("Page 2 order numbers (first 5):", page2.slice(0, 5).map(o => o.orderNumber));
  process.exit(0);
}

testPagination();
