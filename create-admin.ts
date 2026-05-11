import "dotenv/config";
import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { pbkdf2Sync, randomBytes } from "crypto";

// دالة التشفير المطابقة تماماً للنظام
function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

async function main() {
  try {
    const db = await getDb();
    const email = "comm@tamam.org";
    const password = "Admin@123456";

    // توليد Salt وحساب Hash بالتنسيق المطلوب {salt}:{hash}
    const salt = randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);
    const finalHash = `${salt}:${hash}`;

    await db.insert(users).values({
      email: email,
      name: "Corporate Communications",
      passwordHash: finalHash,
      role: "corporate_comm",
      status: "active",
      loginMethod: "local"
    }).onDuplicateKeyUpdate({
      set: { 
        passwordHash: finalHash,
        status: "active",
        role: "corporate_comm",
        name: "Corporate Communications"
      }
    });

    console.log("✅ تم إنشاء/تحديث مستخدم الاتصال المؤسسي بنجاح!");
    process.exit(0);
  } catch (error) {
    console.error("❌ خطأ:", error);
    process.exit(1);
  }
}

main();
