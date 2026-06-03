import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users, mosqueRequests, notifications } from "../drizzle/schema";
import { eq, and, or, like } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  try {
    // 1. التحقق من وجود طالب الخدمة التجريبي
    let [requester] = await db
      .select()
      .from(users)
      .where(eq(users.email, "requester@tamam.sa"))
      .limit(1);

    let requesterId: number;

    if (!requester) {
      console.log("Creating service_requester user...");
      const [result] = await db.insert(users).values({
        email: "requester@tamam.sa",
        passwordHash: "$2a$10$YvN5YvN5YvN5YvN5YvN5.eN5YvN5YvN5YvN5YvN5YvN5YvN5O", // نفس كلمة مرور الأدمن الافتراضية
        name: "طالب خدمة تجريبي",
        phone: "0509999999",
        role: "service_requester",
        status: "active",
      });
      requesterId = Number(result.insertId);
      console.log(`Created requester user with ID: ${requesterId}`);
    } else {
      requesterId = requester.id;
      console.log(`Found existing requester user with ID: ${requesterId}`);
    }

    // 2. تحديث ملكية كافة الطلبات لتصبح تابعة لطالب الخدمة الجديد
    const updateRequestsResult = await db
      .update(mosqueRequests)
      .set({ userId: requesterId })
      .where(eq(mosqueRequests.userId, 1)); // تغيير المالك من الأدمن (1) إلى طالب الخدمة

    console.log(`Updated requests ownership:`, updateRequestsResult);

    // 3. تحديث الإشعارات الموجهة لمقدم الطلب (التي كانت ترسل للأدمن 1 بالخطأ لأن الطلبات كانت ملكه)
    // الإشعارات التي تحتوي على عناوين أو رسائل موجهة لصاحب الطلب
    const requesterNotificationTitles = [
      "✅ تم استلام طلبك",
      "📋 جدولة زيارة ميدانية",
      "🔍 التقييم الفني جارٍ",
      "📊 إعداد جدول الكميات",
      "💰 تقييم العروض المالية",
      "📝 مرحلة التعاقد",
      "🏗️ بدء التنفيذ",
      "🎉 اكتمال التنفيذ",
      "✨ تم إغلاق الطلب بنجاح",
      "تحديث حالة الطلب",
      "تم اعتماد طلبك مالياً",
      "تحديث التقييم الفني"
    ];

    const updateNotificationsResult = await db
      .update(notifications)
      .set({ userId: requesterId })
      .where(
        and(
          eq(notifications.userId, 1),
          or(
            // الإشعارات التي عنوانها يخص طالب الخدمة
            ...requesterNotificationTitles.map(title => eq(notifications.title, title)),
            // أو الإشعارات التي نص رسالتها موجه للطلب
            like(notifications.message, "%طلبك%"),
            eq(notifications.message, "تم إنشاء طلب جديد وهو بانتظار المعالجة")
          )
        )
      );

    console.log(`Isolated requester notifications:`, updateNotificationsResult);

  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
