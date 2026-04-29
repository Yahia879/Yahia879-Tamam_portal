import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { pbkdf2Sync, randomBytes } from "crypto";

// دالة تشفير كلمة المرور
function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// دالة إنشاء salt عشوائي
function generateSalt() {
  return randomBytes(16).toString("hex");
}

async function setTestPasswords() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const testAccounts = [
    { email: "project.manager@test.tamam.sa", name: "مدير المشاريع - تجريبي" },
    { email: "field.team@test.tamam.sa", name: "فريق ميداني - تجريبي" },
    { email: "projects.office@test.tamam.sa", name: "مكتب المشاريع - تجريبي" },
    { email: "financial@test.tamam.sa", name: "الشؤون المالية - تجريبي" },
    { email: "requester@test.tamam.sa", name: "طالب خدمة - تجريبي" },
    { email: "admin@tamam.sa", name: "المدير العام" },
  ];

  const password = "Test@123456";
  const salt = generateSalt();
  const passwordHash = `${salt}:${hashPassword(password, salt)}`;

  console.log("🔐 إنشاء كلمات مرور للحسابات التجريبية...\n");

  for (const account of testAccounts) {
    try {
      const [result] = await connection.execute(
        "UPDATE users SET passwordHash = ?, status = 'active' WHERE email = ?",
        [passwordHash, account.email]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ ${account.name}: ${account.email}`);
      } else {
        console.log(`⚠️  ${account.name}: ${account.email} - لم يتم العثور على الحساب`);
      }
    } catch (error) {
      console.log(`❌ خطأ في ${account.email}:`, error.message);
    }
  }

  console.log(`\n✅ تم تحديث كلمات المرور بنجاح!`);
  console.log(`\n📋 بيانات تسجيل الدخول:`);
  console.log(`كلمة المرور الموحدة: ${password}\n`);

  testAccounts.forEach((account) => {
    console.log(`${account.name}:`);
    console.log(`  البريد: ${account.email}`);
    console.log(`  كلمة المرور: ${password}\n`);
  });

  await connection.end();
}

setTestPasswords().catch(console.error);
