import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "./drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { mode: "default" });

// كلمة المرور: Admin@123456
// Hash باستخدام bcrypt مع 10 rounds
const passwordHash = "$2a$10$rKZN5YvN5YvN5YvN5YvN5.XqN5YvN5YvN5YvN5YvN5YvN5YvN5YvNu";

// حذف الحساب القديم إن وجد
// حذف الحساب القديم إن وجد
await db.delete(users).where({ email: "admin@tamam.sa" }).catch(() => {});

// إنشاء حساب المدير
const [result] = await db.insert(users).values({
  email: "admin@tamam.sa",
  passwordHash: passwordHash,
  name: "مدير النظام",
  role: "system_admin",
  phone: "0500000000",
  nationalId: "1000000000",
  city: "أبها",
  district: "الموظفين",
  isApproved: true,
  approvalStatus: "approved"
});

console.log("✅ تم إنشاء حساب المدير بنجاح!");
console.log("البريد الإلكتروني: admin@tamam.sa");
console.log("كلمة المرور: Admin@123456");

await connection.end();
