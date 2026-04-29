import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("🌱 Seeding database...");

  try {
    // 1. Users
    console.log("Adding users...");
    await db.insert(schema.users).values([
      {
        email: "admin@tamam.org",
        name: "عبدالإله المرزوقي",
        phone: "0501234567",
        role: "super_admin",
        status: "active",
      },
      {
        email: "requester1@test.com",
        name: "خالد طالب الخدمة",
        phone: "0501234571",
        role: "service_requester",
        status: "active",
      }
    ]);

    // 2. Mosques
    console.log("Adding mosques...");
    await db.insert(schema.mosques).values([
      {
        name: "مسجد الرحمن",
        city: "أبها",
        district: "حي الموظفين",
        approvalStatus: "approved",
      },
      {
        name: "مسجد النور",
        city: "خميس مشيط",
        district: "حي الراقي",
        approvalStatus: "approved",
      }
    ]);

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await connection.end();
  }
}

seed();
