import "dotenv/config";
import { getDb } from "../server/db";
import { notifyUsersByRole } from "../server/routers/notifications";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  console.log("Triggering request notification for role 'corporate_comm'...");
  await notifyUsersByRole(
    ["corporate_comm"],
    "request_update",
    "طلب جديد للجميع",
    "هذا إشعار تجريبي للجميع للتأكد من وصول إيميل إشعارات الطلبات والمساجد لجميع موظفي الاتصال المؤسسي.",
    "request",
    9999
  );

  console.log("Waiting for async operations...");
  await new Promise(resolve => setTimeout(resolve, 8000));
  process.exit(0);
}

run().catch(console.error);
