import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedRolePermissions() {
  console.log("🚀 بدء حقن وتحديث صلاحيات الأدوار الأساسية حسب الصورة (image.png)...");

  try {
    const rolePermissionsMapping = {
      super_admin: "*", // جميع الشاشات / صلاحيات كاملة
      system_admin: "*", // جميع الشاشات / إدارة النظام والمستخدمين

      // مكتب المشاريع (المساجد، الطلبات، المشاريع، المالية، العقود، التقارير)
      projects_office: [
        "requests", 
        "mosques", 
        "projects", 
        "reports", 
        "suppliers", 
        "quotations", 
        "contracts", 
        "disbursements", 
        "field_visits", 
        "financial_reports",
        "financial_approval",
        "disbursement_orders",
        "progress_reports"
      ],

      // الفريق الميداني (الزيارات الميدانية، التقويم، طلباتي)
      field_team: [
        "field_visits",
        "appointments.view_own", 
        "requests.view", 
        "requests.manage_as_field_team", 
        "requests.edit"
      ],

      // الإدارة المالية (الموردون، عروض الأسعار، الاعتماد المالي، العقود، طلبات الصرف، أوامر الصرف، تقارير الإنجاز، التقرير المالي)
      financial: [
        "suppliers",
        "quotations",
        "financial_approval",
        "contracts",
        "disbursements",
        "disbursement_orders",
        "progress_reports",
        "financial_reports"
      ],

      // المدير المالي (غير مذكور بالصورة بشكل مستقل ولكنه دور نظامي أساسي بالمسارات المالية)
      financial_manager: [
        "financial", 
        "quotations", 
        "disbursements", 
        "disbursement_orders",
        "suppliers", // صلاحيات الموردين كاملة للمميز المالي
        "financial_reports",
        "requests.view",
        "requests.view_details",
        "reports.view"
      ],

      // مدير المشروع (المشاريع، التقارير)
      project_manager: [
        "projects.view", 
        "projects.view_details", 
        "projects.edit", 
        "reports", 
        "handovers"
      ],

      // فريق الاستجابة السريعة (الطلبات فقط)
      quick_response: [
        "requests.view", 
        "requests.manage_as_quick_response",
        "field_visits.view", // لرؤية تفاصيل الزيارة المخصصة لهم
        "reports.create" // لرفع تقرير الاستجابة السريعة
      ],

      // الاتصال المؤسسي (الشركاء، الهوية البصرية، التقارير)
      corporate_comm: [

        "reports", 
        "settings.view", // للشركاء والهوية البصرية
        "settings_branding.edit",
        "analytics.view",
        "requests.view",
        "requests.upload_final_report"
      ],

      // طالب الخدمة (دور نظامي أساسي بالبوابة لتقديم طلبات الصيانة والبناء)
      service_requester: [
        "requests.view", 
        "requests.create", 
        "mosques.view"
      ]
    };

    // 1. جلب كل الصلاحيات المتوفرة بجدول الصلاحيات للتأكد من المبررات
    const allPermissions = await db.select().from(schema.permissions);
    const allPermIds = allPermissions.map(p => p.id);
    console.log(`ℹ️ عدد الصلاحيات المتوفرة بقاعدة البيانات حالياً: ${allPermIds.length}`);

    // 2. مسح الصلاحيات القديمة للأدوار المذكورة لتجنب الفائض
    const rolesToClear = Object.keys(rolePermissionsMapping);
    console.log(`🧹 مسح الصلاحيات القديمة للأدوار: ${rolesToClear.join(", ")}`);
    await db.delete(schema.rolePermissions).where(
      inArray(schema.rolePermissions.roleId, rolesToClear)
    );

    // 3. بناء مصفوفة الإدخال الجديد
    const rolePermsToInsert = [];

    for (const [roleId, permList] of Object.entries(rolePermissionsMapping)) {
      if (permList === "*") {
        allPermIds.forEach(pId => {
          if ((roleId === "super_admin" || roleId === "system_admin") && pId === "appointments.view_own") {
            return;
          }
          rolePermsToInsert.push({ roleId, permissionId: pId });
        });
      } else {
        allPermIds.forEach(pId => {
          const match = permList.some(key => pId === key || pId.startsWith(key + "."));
          if (match) {
            rolePermsToInsert.push({ roleId, permissionId: pId });
          }
        });
      }
    }

    console.log(`🔗 إدخال ${rolePermsToInsert.length} علاقة صلاحية دور جديدة...`);

    // تقسيم البيانات لمجموعات لتجنب حدود الاستعلام الكبيرة
    const chunkSize = 100;
    for (let i = 0; i < rolePermsToInsert.length; i += chunkSize) {
      const chunk = rolePermsToInsert.slice(i, i + chunkSize);
      await db.insert(schema.rolePermissions).values(chunk);
    }

    console.log("🎉 تم حقن وتحديث صلاحيات الأدوار الأساسية بنجاح تام وفقاً للنموذج المطلوب!");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء عملية حقن صلاحيات الأدوار:", error);
  } finally {
    await connection.end();
  }
}

seedRolePermissions();