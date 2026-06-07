import "dotenv/config";
import { getDb } from "../server/db";
import { createNotification } from "../server/routers/notifications";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  // Override console.log to capture notifications router outputs
  console.log("Triggering createNotification for user 83 with request_update...");
  const res = await createNotification({
    userId: 83,
    type: "request_update",
    title: "طلب تجريبي للاتصال المؤسسي 83",
    message: "مرحباً، هذا بريد تجريبي للاتصال المؤسسي 83.",
    relatedType: "request",
    relatedId: 9999
  });
  
  console.log("Create notification result:", res ? "Success" : "Failed");
  
  // Wait to see if the async sendEmailNotification resolves or prints anything
  await new Promise(resolve => setTimeout(resolve, 8000));
  process.exit(0);
}

run().catch(console.error);
