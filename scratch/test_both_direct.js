import "dotenv/config";
import { getDb } from "../server/db";
import { createNotification } from "../server/routers/notifications";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  console.log("1. Triggering test request notification for user 77...");
  const res1 = await createNotification({
    userId: 77,
    type: "request_update",
    title: "طلب جديد للتجربة 77",
    message: "هذا إشعار تجريبي للاتصال المؤسسي 77.",
    relatedType: "request",
    relatedId: 9999
  });
  console.log("Notification 77 created:", res1 ? "Success" : "Failed");

  console.log("2. Triggering test request notification for user 83...");
  const res2 = await createNotification({
    userId: 83,
    type: "request_update",
    title: "طلب جديد للتجربة 83",
    message: "هذا إشعار تجريبي للاتصال المؤسسي 83.",
    relatedType: "request",
    relatedId: 9999
  });
  console.log("Notification 83 created:", res2 ? "Success" : "Failed");

  // Wait a few seconds for async email sending to complete
  console.log("Waiting for email sends...");
  await new Promise(resolve => setTimeout(resolve, 8000));
  process.exit(0);
}

run().catch(console.error);
