import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

// إنشاء طلب تجريبي
const [result] = await db.insert(schema.mosqueRequests).values({
  requestNumber: "TEST-2026-002",
  programType: "binyan",
  mosqueName: "مسجد الاختبار",
  mosqueCity: "أبها",
  mosqueDistrict: "حي الاختبار",
  mosqueLatitude: "18.2164",
  mosqueLongitude: "42.5053",
  requestorName: "مستخدم تجريبي",
  requestorPhone: "0501234567",
  requestorEmail: "test@example.com",
  requestorIdNumber: "1234567890",
  currentStage: "field_visit",
  status: "under_review",
  submittedAt: new Date(),
  fieldVisitScheduledDate: new Date("2026-01-25 10:00:00"),
});

console.log("✅ تم إنشاء الطلب بنجاح!");
console.log("Request ID:", result.insertId);

await connection.end();
