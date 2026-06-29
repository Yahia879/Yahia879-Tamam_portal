import "dotenv/config";
import { getDb } from "../server/db";
import { disbursementRequests } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  
  try {
    const result = await db.insert(disbursementRequests).values({
      requestNumber: "DR-2026-0025",
      projectId: 18,
      contractId: 16,
      paymentId: 10,
      title: 'طلب صرف لـ تقرير إنجاز - اختبار',
      description: 'تقرير إنجاز اختبار',
      amount: "1000.00",
      paymentType: "progress",
      dateMiladi: "2026-06-29",
      completionPercentage: 40,
      attachmentsJson: '[{"name":"linked_request_info","url":"{\\"requestType\\":\\"project_linked\\",\\"fundingSupport\\":\\"\\",\\"mainProjectName\\":\\"عقود تأمين\\"}","type":"metadata"}]',
      status: "pending",
      requestedBy: 1,
    });
    console.log("Success!", result);
  } catch (error: any) {
    console.error("error keys:", Object.keys(error));
    console.error("error.message:", error.message);
    console.error("error.sqlMessage:", error.sqlMessage);
    console.error("error.code:", error.code);
    console.error("error.errno:", error.errno);
    console.error("error.sqlState:", error.sqlState);
    if (error.cause) {
      console.error("error.cause message:", error.cause.message);
      console.error("error.cause keys:", Object.keys(error.cause));
      console.error("error.cause.sqlMessage:", error.cause.sqlMessage);
    }
  }
}

main().catch(console.error);
