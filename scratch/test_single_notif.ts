import "dotenv/config";
import { createNotification } from "../server/routers/notifications";

async function main() {
  console.log("Triggering createNotification for User 77...");
  const res = await createNotification({
    userId: 77,
    type: "mosque",
    title: "مسجد جديد اختبار",
    message: "هذا إشعار تجريبي لاختبار إرسال الإيميل"
  });
  console.log("Result:", res);
  
  // Wait for async email sending
  await new Promise(resolve => setTimeout(resolve, 8000));
}

main().catch(console.error);
