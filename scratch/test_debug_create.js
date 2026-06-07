import "dotenv/config";
import { getDb } from "../server/db";
import { users, roles as rolesTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmailNotification } from "../server/routers/notifications";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  const userId = 77;
  const [user] = await db
    .select({ 
      role: users.role, 
      phone: users.phone,
      email: users.email,
      receiveRequestEmail: users.receiveRequestEmail,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  console.log("User:", user);

  const [roleSetting] = await db
    .select({
      receiveRequestEmail: rolesTable.receiveRequestEmail,
    })
    .from(rolesTable)
    .where(eq(rolesTable.id, user.role))
    .limit(1);

  console.log("Role Setting:", roleSetting);

  const isEmailEnabled = user.receiveRequestEmail || (roleSetting && roleSetting.receiveRequestEmail);
  console.log("isEmailEnabled evaluated to:", isEmailEnabled);

  if (isEmailEnabled && user.email) {
    console.log("Sending email to:", user.email);
    const result = await sendEmailNotification(user.email, "طلب جديد للتجربة المباشرة", "هذا إشعار تجريبي للتأكد من وصول إيميل إشعارات الطلبات والمساجد بنجاح.");
    console.log("Send email result:", result);
  }

  process.exit(0);
}

run().catch(console.error);
