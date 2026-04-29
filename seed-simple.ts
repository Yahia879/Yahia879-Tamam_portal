#!/usr/bin/env tsx
/**
 * Script مبسط لتعبئة قاعدة البيانات بالبيانات الأساسية فقط
 */

import "dotenv/config";
import { getDb } from "./server/db.ts";
import * as schema from "./drizzle/schema";

async function main() {
  console.log("🚀 بدء تعبئة البيانات الأساسية...\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ فشل الاتصال بقاعدة البيانات");
    process.exit(1);
  }

  // حذف البيانات القديمة
  console.log("🗑️ حذف البيانات القديمة...");
  await db.execute("SET FOREIGN_KEY_CHECKS = 0");
  
  const tablesToTruncate = [
    "request_history",
    "request_comments",
    "disbursement_orders",
    "disbursement_requests",
    "contracts",
    "quotations",
    "project_milestones",
    "projects",
    "field_visit_reports",
    "quick_response_reports",
    "mosque_requests",
    "suppliers",
    "mosques",
    "users",
  ];
  
  for (const table of tablesToTruncate) {
    try {
      await db.execute(`TRUNCATE TABLE ${table}`);
    } catch (error: any) {
      if (error.cause?.code !== 'ER_NO_SUCH_TABLE') {
        console.warn(`⚠️ تحذير: ${table} - ${error.message}`);
      }
    }
  }
  
  await db.execute("SET FOREIGN_KEY_CHECKS = 1");
  console.log("✅ تم حذف البيانات القديمة\n");

  // 1. إنشاء مستخدمين
  console.log("👥 إنشاء مستخدمين...");
  
  await db.insert(schema.users).values([
    {
      email: "admin@tamam.org",
      name: "عبدالإله المرزوقي",
      phone: "0501234567",
      role: "super_admin",
      status: "active",
    },
    {
      email: "projects@tamam.org",
      name: "أحمد المشاريع",
      phone: "0501234568",
      role: "projects_office",
      status: "active",
    },
    {
      email: "field@tamam.org",
      name: "محمد الميداني",
      phone: "0501234569",
      role: "field_team",
      status: "active",
    },
    {
      email: "finance@tamam.org",
      name: "فاطمة المالية",
      phone: "0501234570",
      role: "financial",
      status: "active",
    },
    {
      email: "requester1@test.com",
      name: "خالد طالب الخدمة",
      phone: "0501234571",
      role: "service_requester",
      status: "active",
    },
  ]);

  console.log("✅ تم إنشاء 5 مستخدمين\n");

  // 2. إنشاء مساجد
  console.log("🕌 إنشاء مساجد...");
  
  await db.insert(schema.mosques).values([
    {
      name: "مسجد الرحمن",
      city: "أبها",
      neighborhood: "حي الموظفين",
      status: "active",
    },
    {
      name: "مسجد النور",
      city: "خميس مشيط",
      neighborhood: "حي الراقي",
      status: "active",
    },
  ]);

  console.log("✅ تم إنشاء 2 مساجد\n");

  // 3. إنشاء موردين
  console.log("🏢 إنشاء موردين...");
  
  await db.insert(schema.suppliers).values([
    {
      name: "شركة البناء المتقدم",
      type: "contractor",
      entityType: "company",
      commercialRegister: "1234567890",
      email: "info@advanced-construction.com",
      phone: "0501111111",
      contactPerson: "أحمد البناء",
      status: "active",
      approvalStatus: "approved",
    },
    {
      name: "مؤسسة التجهيزات الحديثة",
      type: "supplier",
      entityType: "establishment",
      commercialRegister: "1234567891",
      email: "info@modern-equipment.com",
      phone: "0502222222",
      contactPerson: "محمد التجهيزات",
      status: "active",
      approvalStatus: "approved",
    },
  ]);

  console.log("✅ تم إنشاء 2 موردين\n");

  // 4. إنشاء طلبات في مراحل مختلفة
  console.log("📝 إنشاء 11 طلب في مراحل مختلفة...");
  
  const stages = [
    "submitted",
    "initial_review",
    "field_visit",
    "technical_eval",
    "financial_eval",
    "execution",
    "closed",
  ];
  
  const programs = ["bunyan", "daaem", "enaya", "emdad", "ethraa", "sedana", "taqa", "miyah", "suqya"];

  for (let i = 0; i < 11; i++) {
    const stage = stages[i % stages.length];
    const program = programs[i % programs.length];
    
    await db.insert(schema.mosqueRequests).values({
      requestNumber: `${program.toUpperCase().substring(0, 3)}-${Date.now()}-${i}`,
      userId: 5, // requester1
      programType: program,
      mosqueId: i < 2 ? i + 1 : null,
      currentStage: stage,
      status: stage === "closed" ? "completed" : "under_review",
      submittedAt: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000),
      requestTrack: "standard",
    });
  }

  console.log("✅ تم إنشاء 11 طلب\n");

  console.log("🎉 تم الانتهاء من تعبئة البيانات الأساسية بنجاح!\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ حدث خطأ:", error);
  process.exit(1);
});
