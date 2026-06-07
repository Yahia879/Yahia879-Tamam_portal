import "dotenv/config";
import { sendEmailNotification } from "../server/routers/notifications";

async function run() {
  console.log("Sending direct sync email to hamoud9trap@gmail.com...");
  const res = await sendEmailNotification(
    "hamoud9trap@gmail.com",
    "اختبار الاتصال المؤسسي",
    "هذا إشعار تجريبي مباشر لموظف الاتصال المؤسسي حمود للتأكد من وصول الرسائل بنجاح."
  );
  console.log("Result of direct send:", res);
  process.exit(0);
}

run().catch(console.error);
