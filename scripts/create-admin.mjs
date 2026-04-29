import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

// دالة تشفير كلمة المرور
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function createAdmin() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("🔐 إنشاء حساب مدير النظام...");

    const adminEmail = "admin@tamam.sa";
    const adminPassword = "Admin@123456";
    const hashedPassword = hashPassword(adminPassword);

    // التحقق من عدم وجود الحساب مسبقاً
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existing.length > 0) {
      console.log("⚠️ حساب المدير موجود مسبقاً");
      
      // تحديث كلمة المرور والدور
      await connection.execute(
        `UPDATE users SET passwordHash = ?, role = 'super_admin', status = 'active' WHERE email = ?`,
        [hashedPassword, adminEmail]
      );
      console.log("✅ تم تحديث بيانات حساب المدير");
    } else {
      // إنشاء حساب جديد
      await connection.execute(
        `INSERT INTO users (openId, name, email, passwordHash, role, status, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, 'super_admin', 'active', NOW(), NOW(), NOW())`,
        [
          `admin-${Date.now()}`,
          "مدير النظام",
          adminEmail,
          hashedPassword,
        ]
      );
      console.log("✅ تم إنشاء حساب مدير النظام بنجاح");
    }

    console.log("\n📋 بيانات الدخول:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 البريد الإلكتروني: ${adminEmail}`);
    console.log(`🔑 كلمة المرور: ${adminPassword}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️ يُنصح بتغيير كلمة المرور بعد أول تسجيل دخول");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
  } finally {
    await connection.end();
  }
}

createAdmin();
