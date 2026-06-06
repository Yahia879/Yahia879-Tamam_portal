import 'dotenv/config';
import { getDb } from '../server/db';
import { notifications } from '../drizzle/schema';
import { calculateUserPermissions } from '../server/permissions';
import { eq, and, or, like, desc } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  const userId = 68;
  const userRole = 'quick_response';

  console.log("=== Simulating getMyNotifications for user 68 ===");
  const conditions = [eq(notifications.userId, userId)];

  const userPerms = await calculateUserPermissions(userId);
  const isRequestOfficer =
    ["super_admin", "system_admin", "projects_office"].includes(userRole) ||
    userPerms.includes("requests.view_details");

  console.log("isRequestOfficer:", isRequestOfficer);

  if (isRequestOfficer) {
    conditions.push(
      or(
        like(notifications.title, "%تم استلام طلبك%"),
        like(notifications.title, "%طلب جديد%"),
        like(notifications.title, "%تحديث مرحلة الطلب%"),
        like(notifications.title, "%تم رفع تقرير المعاينة الميدانية%"),
        like(notifications.title, "%تم رفع تقرير الاستجابة السريعة%"),
        like(notifications.message, "%تم استلام طلبك%"),
        like(notifications.message, "%طلب جديد%"),
        like(notifications.message, "%بإنشاء طلب%"),
        like(notifications.message, "%بنقل الطلب%"),
        like(notifications.message, "%تم رفع تقرير زيارة ميدانية%"),
        like(notifications.message, "%تم رفع تقرير المعاينة الميدانية%"),
        like(notifications.message, "%تم رفع تقرير الاستجابة السريعة%")
      ) as any
    );
  }

  const results = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));

  console.log(`Fetched ${results.length} notifications:`);
  console.log(JSON.stringify(results.map(r => ({ id: r.id, title: r.title, message: r.message })), null, 2));

  process.exit(0);
})();
