import "dotenv/config";
import { getDb } from "../server/db";
import { createNotification } from "../server/routers/notifications";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  console.log("Triggering test request notification for user 77...");
  const result = await createNotification({
    userId: 77,
    type: "request_update",
    title: "طلب جديد للتجربة",
    message: "هذا إشعار تجريبي للتأكد من وصول إيميل إشعارات الطلبات والمساجد بنجاح.",
    relatedType: "request",
    relatedId: 9999
  });

  console.log("Notification created successfully:", result);
  // Wait a few seconds for async email sending to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  process.exit(0);
}

run().catch(console.error);
