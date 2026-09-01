import { eq, and, sql, inArray, isNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  modules,
  permissions,
  roles,
  rolePermissions,
  userRoleAssignments,
  userPermissions,
  permissionsAuditLog,
  users
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ==================== دوال مساعدة ====================

/**
 * خريطة توسيع الصلاحيات: تربط معرّفات الصلاحيات البسيطة (من RoleEdit)
 * بالصلاحيات الدقيقة المستخدمة في permissionProcedure
 */
const PERMISSION_EXPANSION: Record<string, string[]> = {
  Create_Ticket: ["Create_Ticket"],
  View_Tickets: ["View_Tickets"],
  staff_management: [
    "permissions.view", "permissions.create", "permissions.edit", "permissions.delete",
    "users.view", "users.edit", "users.create", "users.delete",
  ],
  mosques: ["mosques.view", "mosques.create", "mosques.edit", "mosques.delete", "mosques.approve"],
  mosques_map: ["mosque_map.view"],
  requests: ["requests.view", "requests.create", "requests.edit", "requests.delete", "requests.view_details", "requests.manage_as_field_team", "requests.manage_as_quick_response", "requests.create_quick_request", "requests.upload_final_report", "requests.add_review_note"],
  "requests.view": ["requests.view"],
  "requests.create": ["requests.create"],
  "requests.view_details": ["requests.view", "requests.edit", "requests.delete", "requests.view_details"],
  "requests.add_review_note": ["requests.view", "requests.add_review_note"],
  "requests.manage_as_field_team": ["requests.view", "requests.edit", "requests.manage_as_field_team"],
  "requests.manage_as_quick_response": ["requests.view", "requests.edit", "requests.manage_as_quick_response"],
  appointments_calendar: ["field_visits.view", "appointments.view"],
  projects: ["projects.view", "projects.view_details", "projects.create_multi_mosque", "projects.assign_as_manager", "projects.financials"],
  "projects.view": ["projects.view"],
  "projects.view_details": ["projects.view", "projects.view_details"],
  "projects.create_multi_mosque": ["projects.view", "projects.create_multi_mosque"],
  "projects.financials": ["projects.view", "projects.financials"],
  service_requester_accounts: ["users.view", "users.edit"],
  suppliers: [
    "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete", 
    "suppliers.approve", "suppliers.reject", "suppliers.suspend"
  ],
  quotations: ["quotations.view", "quotations.create", "quotations.edit", "quotations.approve"],
  financial_approval: ["financial.view", "financial.approve", "financial.reject"],
  contracts: ["contracts.view", "contracts.create", "contracts.edit", "contracts.edit_approved", "contracts.delete", "contracts.approve"],
  disbursement_requests: ["disbursements.view", "disbursements.create", "disbursements.edit", "disbursements.approve", "disbursements.exception_approve"],
  disbursement_orders: ["disbursement_orders.view", "disbursement_orders.approve", "disbursement_orders.exception_approve", "disbursement_orders.reject", "disbursement_orders.create_direct"],
  progress_reports: ["progress_reports.view", "progress_reports.add", "progress_reports.edit", "progress_reports.approve", "progress_reports.exception_approve"],
  project_reports: ["project_reports.view", "project_reports.create"],
  financial_report: ["financial_reports.view"],
  reports: ["reports.view_stats", "reports.export_data"],
  "reports.view_stats": ["reports.view_stats", "reports.view"],
  "reports.export_data": ["reports.export_data", "reports.view"],

  // مركز الإحصائيات والتحليلات الشامل
  analytics_hub: [
    "reports.view", "reports.view_stats", "financial_reports.view", "progress_reports.view"
  ],
  "analytics_hub.custom": ["reports.view_stats", "reports.view"],
  "analytics_hub.kpi": ["reports.view_stats", "reports.view"],
  "analytics_hub.technical": ["reports.view_stats", "reports.view", "reports.export_data"],
  "analytics_hub.financial_report": ["financial_reports.view", "financial.view"],
  "analytics_hub.financial_dash": ["financial_reports.view", "financial.view"],
  "analytics_hub.board": ["financial_reports.view", "reports.view"],
  "analytics_hub.beneficiary": ["reports.view"],
  "analytics_hub.operations": ["requests.view", "reports.view"],
  "analytics_hub.progress": ["progress_reports.view"],

  "forms_customization.analytics": ["settings.view", "settings.edit"],
  settings_center: ["settings.view", "settings.edit"],
  programs_services: ["settings.view", "settings.edit"],
  corporate_comm: ["requests.view", "reports.view", "settings.view", "requests.upload_final_report"],
  "requests.upload_final_report": ["requests.view", "requests.upload_final_report"],
  "requests.create_quick_request": ["requests.create_quick_request"],
  field_visits: ["field_visits.view", "field_visits.create", "field_visits.edit", "field_visits.delete"],

  // UI customized keys mapping to bridge checkboxes with database granular permissions
  requesters: ["users.view", "users.edit", "users.delete"],
  "requesters.view": ["users.view"],
  "requesters.approve": ["users.edit"],
  "requesters.edit": ["users.edit"],
  "requesters.delete": ["users.delete"],
  "requesters.suspend": ["users.edit"],

  "suppliers.view": ["suppliers.view"],
  "suppliers.view_details": ["suppliers.view"],
  "suppliers.add": ["suppliers.create"],
  "suppliers.edit": ["suppliers.edit"],
  "suppliers.approve": ["suppliers.approve", "suppliers.reject"],

  mosque_map: ["mosque_map.view"],
  "mosque_map.view": ["mosque_map.view"],

  appointments: ["field_visits.view"],
  "appointments.view": ["field_visits.view"],
  "appointments.view_all": ["field_visits.view"],
  "appointments.view_own": ["field_visits.view"],

  staff: [
    "permissions.view", "permissions.create", "permissions.edit", "permissions.delete",
    "users.view", "users.edit", "users.create", "users.delete",
  ],
  "staff.view": ["users.view", "permissions.view"],
  "staff.add": ["users.create", "permissions.create"],
  "staff.edit": ["users.edit", "permissions.edit"],
  "staff.delete": ["users.delete", "permissions.delete"],
  "staff.manage_users": ["users.edit"],
  "staff.manage_custom_roles": ["permissions.edit"],

  "staff_users.view": ["users.view"],
  "staff_users.add": ["users.create"],
  "staff_users.edit": ["users.edit"],
  "staff_users.suspend": ["users.edit"],
  "staff_users.delete": ["users.delete"],

  "staff_roles.view": ["permissions.view"],
  "staff_roles.customize": ["permissions.edit"],
  "staff_roles.suspend": ["permissions.edit"],

  "staff_custom_roles.view": ["permissions.view"],
  "staff_custom_roles.add": ["permissions.create"],
  "staff_custom_roles.edit": ["permissions.edit"],
  "staff_custom_roles.delete": ["permissions.delete"],
  "staff_notifications.edit": ["settings.view", "settings.edit"],

  settings: ["settings.view", "settings.edit"],
  "settings.view": ["settings.view"],
  "settings.add": ["settings.edit"],
  "settings.edit": ["settings.edit"],
  "settings.delete": ["settings.edit"],

  settings_org: ["settings.view", "settings.edit"],
  "settings_org.view": ["settings.view"],
  "settings_org.edit": ["settings.edit"],
  "settings_org.edit_basic": ["settings.edit"],
  "settings_org.edit_signers": ["settings.edit"],
  "settings_org.edit_banks": ["settings.edit"],
  "settings_org.edit_contracts": ["settings.edit"],

  settings_branding: ["settings.view", "settings.edit"],
  "settings_branding.view": ["settings.view"],
  "settings_branding.edit": ["settings.edit"],

  settings_contracts: ["settings.view", "settings.edit"],
  "settings_contracts.view": ["settings.view"],
  "settings_contracts.edit": ["settings.edit"],

  settings_categories: ["settings.view", "settings.edit"],
  "settings_categories.view": ["settings.view"],
  "settings_categories.add": ["settings.edit"],
  "settings_categories.edit": ["settings.edit"],
  "settings_categories.delete": ["settings.edit"],

  services: ["settings.view", "settings.edit"],
  "services.view": ["settings.view"],
  "services.add": ["settings.edit"],
  "services.edit": ["settings.edit"],
  "services.delete": ["settings.edit"],

  forms_customization: ["forms_customization.evaluation", "forms_customization.services", "forms_customization.registration"],
  "forms_customization.evaluation": ["settings.view"],
  "forms_customization.services": ["settings.view"],
  "forms_customization.registration": ["settings.view"],

  "financial_approval.view": ["financial.view"],
  "financial_approval.approve": ["financial.approve"],

  "quotations.view": ["quotations.view"],
  "quotations.add": ["quotations.create"],
  "quotations.approve": ["quotations.approve"],

  "contracts.view": ["contracts.view"],
  "contracts.create": ["contracts.create"],
  "contracts.edit_approved": ["contracts.edit_approved", "contracts.view"],
  "contracts.approve": ["contracts.approve", "contracts.view"],
  "contracts.template_add": ["contracts.create"],
  "contracts.template_edit": ["contracts.edit"],
  "contracts.template_delete": ["contracts.delete"],
  "contracts.clause_add": ["contracts.create"],

  "disbursement_orders.view": ["disbursement_orders.view_details"],
  "disbursement_orders.approve": ["financial.approve"],
  "disbursement_orders.reject": ["financial.approve"],
  "disbursement_orders.view_details": ["disbursement_orders.view_details"],
  "disbursement_orders.create_direct": ["disbursement_orders.create_direct"],

  financial_reports: ["financial_reports.view"],
  "financial_reports.view": ["financial_reports.view"],
  "financial_reports.export": ["financial_reports.export"],
  "financial_reports.analytics": ["financial_reports.analytics"],

  "progress_reports.view": ["progress_reports.view"],
  "progress_reports.add": ["progress_reports.add", "progress_reports.view"],
  "progress_reports.edit": ["progress_reports.edit", "progress_reports.view"],
  "progress_reports.approve": ["progress_reports.approve", "progress_reports.view"],
  "progress_reports.exception_approve": ["progress_reports.exception_approve", "progress_reports.view"],

  "project_reports.view": ["project_reports.view"],
  "project_reports.create": ["project_reports.create", "project_reports.view"],

  boq: ["boq.add", "boq.edit", "boq.delete"],
  "boq.add": ["boq.add"],
  "boq.edit": ["boq.edit"],
  "boq.delete": ["boq.delete"],
  pending_reports: ["pending_reports.view", "pending_reports.intervene"],
  "pending_reports.view": ["pending_reports.view"],
  "pending_reports.intervene": ["pending_reports.intervene"],

  "disbursements.add": ["disbursements.create"],
  "disbursements.create_custom": ["disbursements.create", "disbursements.create_custom", "disbursements.create_donation"],
  "disbursements.create_donation": ["disbursements.create", "disbursements.create_donation"],
  "disbursements.exception_approve": ["disbursements.exception_approve"],
  "disbursement_orders.exception_approve": ["disbursement_orders.exception_approve"],

  "progress_reports.sign": ["progress_reports.sign", "progress_reports.view"],
  "signing.progress_reports_sign": ["signing.progress_reports_sign", "progress_reports.view"],

  // Board Leadership Permissions Expansion
  board_chairman: ["board_chairman", "board_chairman_view"],
  board_chairman_view: ["board_chairman_view"],
  board_member: ["board_member"],
  "board.board_chairman": ["board_chairman", "board_chairman_view"],
  "board.board_chairman_view": ["board_chairman_view"],
  "board.board_member": ["board_member"],
  "board_leadership.board_chairman": ["board_chairman", "board_chairman_view"],
  "board_leadership.board_chairman_view": ["board_chairman_view"],
  "board_leadership.board_member": ["board_member"],
};

/**
 * دالة للتأكد من وجود صلاحيات الطلبات الجديدة في قاعدة البيانات
 */
async function ensureRequestsPermissionsExist(db: any) {
  try {
    const reqPerms = [
      {
        id: "requests.view",
        moduleId: "requests",
        action: "view",
        nameAr: "عرض كافة الطلبات",
        nameEn: "View requests"
      },
      {
        id: "requests.create",
        moduleId: "requests",
        action: "create",
        nameAr: "اضافة طلب",
        nameEn: "Create request"
      },
      {
        id: "requests.view_details",
        moduleId: "requests",
        action: "view_details",
        nameAr: "عرض تفاصيل الطلب وادارته",
        nameEn: "View request details and manage"
      },
      {
        id: "requests.manage_as_field_team",
        moduleId: "requests",
        action: "manage_as_field_team",
        nameAr: "ادارة الطلبات كفريق ميداني",
        nameEn: "Manage requests as field team"
      },
      {
        id: "requests.manage_as_quick_response",
        moduleId: "requests",
        action: "manage_as_quick_response",
        nameAr: "ادارة الطلبات كفريق استجابة سريعة",
        nameEn: "Manage requests as quick response team"
      },
      {
        id: "requests.upload_final_report",
        moduleId: "requests",
        action: "upload_final_report",
        nameAr: "رفع التقرير الختامي",
        nameEn: "Upload final report"
      },
      {
        id: "requests.add_review_note",
        moduleId: "requests",
        action: "add_review_note",
        nameAr: "إضافة ملاحظة على مراجعة المعلومات والمرفقات",
        nameEn: "Add review note"
      },
      {
        id: "board_chairman",
        moduleId: "board",
        action: "board_chairman",
        nameAr: "عرض مركز الاعتماد المالي",
        nameEn: "View Financial Approval Center"
      },
      {
        id: "board_member",
        moduleId: "board",
        action: "board_member",
        nameAr: "عرض لوحة عضو مجلس الإدارة",
        nameEn: "View Board Member Dashboard"
      },
      {
        id: "projects.create_multi_mosque",
        moduleId: "projects",
        action: "create_multi_mosque",
        nameAr: "إضافة مشروع لعدة مساجد",
        nameEn: "Create Multi-Mosque Project"
      },
      {
        id: "project_reports.view",
        moduleId: "reports",
        action: "view",
        nameAr: "عرض تقارير المشاريع",
        nameEn: "View Project Reports"
      },
      {
        id: "project_reports.create",
        moduleId: "reports",
        action: "create",
        nameAr: "إنشاء تقارير مشاريع",
        nameEn: "Create Project Reports"
      },
      {
        id: "beneficiary_evaluations.view",
        moduleId: "beneficiary_evaluations",
        action: "view",
        nameAr: "عرض تقييمات المستفيدين",
        nameEn: "View Beneficiary Evaluations"
      }
    ];

    // 1. إدخال أو تحديث الصلاحيات في جدول الصلاحيات
    let isFirstTime = false;
    for (const p of reqPerms) {
      const existing = await db.select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.id, p.id))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(permissions).values(p);
        console.log(`Inserted missing permission: ${p.id}`);
        isFirstTime = true;
      } else {
        await db.update(permissions).set({
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          moduleId: p.moduleId,
          action: p.action
        }).where(eq(permissions.id, p.id));
      }
    }

    // 2. تحديث صلاحيات الأدوار الافتراضية
    await db.delete(rolePermissions).where(and(
      eq(rolePermissions.roleId, "board_chairman"),
      eq(rolePermissions.permissionId, "board_member")
    )).catch(() => {});

    const defaultMappings: Record<string, string[]> = {
      board_chairman: ["board_chairman"],
      board_member: ["board_member"],
      general_manager: ["requests.view", "requests.create", "requests.view_details"],
      executive_director: ["requests.view", "requests.create", "requests.view_details"],
      projects_office: ["requests.view", "requests.create", "requests.view_details"],
      field_team: ["requests.view", "requests.manage_as_field_team"],
      quick_response: ["requests.view", "requests.manage_as_quick_response"],
      financial_manager: ["requests.view", "requests.view_details"],
      project_manager: ["requests.view", "requests.create", "requests.view_details"],
      corporate_comm: ["requests.view", "requests.upload_final_report"],
      super_admin: ["beneficiary_evaluations.view"],
      system_admin: ["beneficiary_evaluations.view"],
    };

    const roleNamesAr: Record<string, string> = {
      board_chairman: "رئيس مجلس الإدارة",
      board_member: "عضو مجلس الإدارة",
      general_manager: "المدير التنفيذي",
      executive_director: "المدير التنفيذي",
      financial_manager: "المدير المالي",
      system_admin: "مدير نظام",
      super_admin: "المدير العام",
      projects_office: "مكتب المشاريع",
      project_manager: "مدير المشاريع",
      financial: "الإدارة المالية",
      field_team: "فريق ميداني",
      quick_response: "فريق الاستجابة السريعة",
      corporate_comm: "الاتصال المؤسسي",
      service_requester: "طالب خدمة",
    };

    for (const [roleId, permIds] of Object.entries(defaultMappings)) {
      const [roleExists] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!roleExists) {
        await db.insert(roles).values({
          id: roleId,
          nameAr: roleNamesAr[roleId] || roleId,
          nameEn: roleId,
          isSystem: true,
          isActive: true,
        }).catch(() => {});
      } else if (roleNamesAr[roleId] && roleExists.nameAr !== roleNamesAr[roleId]) {
        await db.update(roles).set({
          nameAr: roleNamesAr[roleId]
        }).where(eq(roles.id, roleId)).catch(() => {});
      }

      for (const permId of permIds) {
        const existingRolePerms = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, permId)
          ));

        if (existingRolePerms.length === 0) {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId: permId
          }).catch(() => {});
        }
      }
    }
    await ensureProjectsPermissionsExist(db);
  } catch (err) {
    console.error("Error in ensureRequestsPermissionsExist:", err);
  }
}

/**
 * دالة للتأكد من وجود صلاحيات المشاريع الجديدة في قاعدة البيانات
 */
async function ensureProjectsPermissionsExist(db: any) {
  try {
    const projPerms = [
      {
        id: "projects.view",
        moduleId: "projects",
        action: "view",
        nameAr: "عرض المشاريع",
        nameEn: "View projects"
      },
      {
        id: "projects.view_details",
        moduleId: "projects",
        action: "view_details",
        nameAr: "عرض تفاصيل المشروع وادارته",
        nameEn: "View project details and manage"
      }
    ];

    let isFirstTime = false;
    for (const p of projPerms) {
      const existing = await db.select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.id, p.id))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(permissions).values(p);
        console.log(`Inserted missing permission: ${p.id}`);
        isFirstTime = true;
      } else {
        await db.update(permissions).set({
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          moduleId: p.moduleId,
          action: p.action
        }).where(eq(permissions.id, p.id));
      }
    }

    if (isFirstTime) {
      const defaultMappings: Record<string, string[]> = {
        projects_office: ["projects.view", "projects.view_details"],
        project_manager: ["projects.view", "projects.view_details"],
      };

      for (const [roleId, permIds] of Object.entries(defaultMappings)) {
        const [roleExists] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
        if (!roleExists) continue;

        const existingRolePerms = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, roleId),
            inArray(rolePermissions.permissionId, ["projects.view", "projects.view_details"])
          ));

        if (existingRolePerms.length === 0) {
          const valuesToInsert = permIds.map(permId => ({
            roleId,
            permissionId: permId
          }));
          await db.insert(rolePermissions).values(valuesToInsert);
          console.log(`Migrated role ${roleId} with projects permissions: ${permIds.join(", ")}`);
        }
      }
    }
  } catch (err) {
    console.error("Error in ensureProjectsPermissionsExist:", err);
  }
  await ensureAllCustomPermissionsExist(db);
  await ensureRequestersPermissionsExist(db);
}

/**
 * دالة للتأكد من ربط صلاحيات طالبي الخدمة بالدور الأساسي مكتب المشاريع (projects_office)
 */
async function ensureRequestersPermissionsExist(db: any) {
  try {
    const roleId = "projects_office";
    const permIds = ["requesters.view", "requesters.approve"];
    
    const [roleExists] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!roleExists) return;

    const existingRolePerms = await db.select()
      .from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        inArray(rolePermissions.permissionId, permIds)
      ));

    if (existingRolePerms.length < permIds.length) {
      // حذف التالف لضمان عدم وجود تكرار عند الربط
      await db.delete(rolePermissions).where(and(
        eq(rolePermissions.roleId, roleId),
        inArray(rolePermissions.permissionId, permIds)
      ));

      const valuesToInsert = permIds.map(permId => ({
        roleId,
        permissionId: permId
      }));
      await db.insert(rolePermissions).values(valuesToInsert);
      console.log(`Migrated role ${roleId} with requesters permissions: ${permIds.join(", ")}`);
    }
  } catch (err) {
    console.error("Error in ensureRequestersPermissionsExist:", err);
  }
}

/**
 * دالة للتأكد من وجود جميع الصلاحيات المخصصة الأخرى في قاعدة البيانات لتجنب أخطاء المفاتيح الأجنبية
 */
async function ensureAllCustomPermissionsExist(db: any) {
  try {
    // Ensure 'boq' module exists in the modules table
    const [existingBoqModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "boq")).limit(1);
    if (!existingBoqModule) {
      await db.insert(modules).values({
        id: "boq",
        nameAr: "إعداد جداول الكميات",
        nameEn: "BOQ Preparation",
        icon: "FileSpreadsheet",
        displayOrder: 10,
        isActive: true
      });
      console.log("Inserted missing custom module: boq");
    }

    // Ensure 'pending_reports' module exists in the modules table
    const [existingPendingReportsModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "pending_reports")).limit(1);
    if (!existingPendingReportsModule) {
      await db.insert(modules).values({
        id: "pending_reports",
        nameAr: "تقارير الطلبات",
        nameEn: "Request Reports",
        icon: "FileText",
        displayOrder: 11,
        isActive: true
      });
      console.log("Inserted missing custom module: pending_reports");
    }

    // Ensure 'technical_support' module exists in the modules table
    const [existingSupportModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "technical_support")).limit(1);
    if (!existingSupportModule) {
      await db.insert(modules).values({
        id: "technical_support",
        nameAr: "الدعم الفني",
        nameEn: "Technical Support",
        icon: "LifeBuoy",
        displayOrder: 12,
        isActive: true
      });
      console.log("Inserted missing custom module: technical_support");
    }

    // Ensure 'beneficiary_evaluations' module exists in the modules table
    const [existingEvalModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "beneficiary_evaluations")).limit(1);
    if (!existingEvalModule) {
      await db.insert(modules).values({
        id: "beneficiary_evaluations",
        nameAr: "رضا المستفيدين",
        nameEn: "Beneficiary Satisfaction",
        icon: "HeartHandshake",
        displayOrder: 4,
        isActive: true
      });
      console.log("Inserted missing custom module: beneficiary_evaluations");
    }

    // Ensure 'analytics_hub' module exists in the modules table
    const [existingAnalyticsModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "analytics_hub")).limit(1);
    if (!existingAnalyticsModule) {
      await db.insert(modules).values({
        id: "analytics_hub",
        nameAr: "مركز الإحصائيات والتحليلات",
        nameEn: "Analytics Hub",
        icon: "BarChart3",
        displayOrder: 8,
        isActive: true
      });
      console.log("Inserted missing custom module: analytics_hub");
    }

    // تنظيف الصلاحيات الملغاة
    try {
      await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, "analytics_hub.project_reports"));
      await db.delete(permissions).where(eq(permissions.id, "analytics_hub.project_reports"));
    } catch {}

    const customPerms = [
      { id: "analytics_hub.custom", moduleId: "analytics_hub", action: "custom", nameAr: "عرض وتخصيص اللوحة المخصصة", nameEn: "View & Customize Dashboard" },
      { id: "analytics_hub.kpi", moduleId: "analytics_hub", action: "kpi", nameAr: "عرض مؤشرات الأداء العامة (KPI)", nameEn: "View KPI Dashboard" },
      { id: "analytics_hub.technical", moduleId: "analytics_hub", action: "technical", nameAr: "عرض التقارير الإحصائية والفنية", nameEn: "View Technical Reports" },
      { id: "analytics_hub.financial_report", moduleId: "analytics_hub", action: "financial_report", nameAr: "عرض التقرير المالي الشامل", nameEn: "View Financial Report" },
      { id: "analytics_hub.financial_dash", moduleId: "analytics_hub", action: "financial_dash", nameAr: "عرض لوحة التحكم المالية", nameEn: "View Financial Dashboard" },
      { id: "analytics_hub.board", moduleId: "analytics_hub", action: "board", nameAr: "عرض تحليلات الإدارة العليا", nameEn: "View Board Analytics" },
      { id: "analytics_hub.beneficiary", moduleId: "analytics_hub", action: "beneficiary", nameAr: "عرض رضا المستفيدين", nameEn: "View Beneficiary Satisfaction" },
      { id: "analytics_hub.operations", moduleId: "analytics_hub", action: "operations", nameAr: "عرض تقارير العمليات والمعاينات", nameEn: "View Operations & Pending Reports" },
      { id: "analytics_hub.progress", moduleId: "analytics_hub", action: "progress", nameAr: "عرض تقارير ونسب الإنجاز", nameEn: "View Progress Reports" },
      { id: "beneficiary_evaluations.view", moduleId: "beneficiary_evaluations", action: "view", nameAr: "عرض تقييمات المستفيدين", nameEn: "View Beneficiary Evaluations" },
      { id: "Create_Ticket", moduleId: "technical_support", action: "create", nameAr: "إنشاء تذكرة دعم فني", nameEn: "Create Support Ticket" },
      { id: "View_Tickets", moduleId: "technical_support", action: "view", nameAr: "عرض تذاكر الدعم الفني", nameEn: "View Support Tickets" },
      { id: "mosque_map.view", moduleId: "mosques", action: "view", nameAr: "عرض خريطة المساجد", nameEn: "View Mosque Map" },
      { id: "requests.view_details", moduleId: "requests", action: "view_details", nameAr: "عرض تفاصيل الطلب وإدارته", nameEn: "View Request Details" },
      { id: "requests.add_review_note", moduleId: "requests", action: "add_review_note", nameAr: "إضافة ملاحظة على مراجعة المعلومات والمرفقات", nameEn: "Add review note" },
      { id: "appointments.view_all", moduleId: "settings", action: "view_all", nameAr: "عرض كافة المواعيد والزيارات للمنشأة", nameEn: "View All Appointments" },
      { id: "appointments.view_own", moduleId: "settings", action: "view_own", nameAr: "عرض زياراتي الميدانية الخاصة بي فقط", nameEn: "View Own Appointments" },
      { id: "projects.view_details", moduleId: "projects", action: "view_details", nameAr: "عرض تفاصيل المشروع وادارته", nameEn: "View Project Details" },
      { id: "requesters.view", moduleId: "users", action: "view", nameAr: "عرض بيانات طالبي الخدمة", nameEn: "View Requesters" },
      { id: "requesters.approve", moduleId: "users", action: "approve", nameAr: "الاعتمادات (رفض أو اعتماد الحساب)", nameEn: "Approve Requesters" },
      { id: "suppliers.view_details", moduleId: "suppliers", action: "view_details", nameAr: "عرض تفاصيل المورد", nameEn: "View Supplier Details" },
      { id: "suppliers.add", moduleId: "suppliers", action: "add", nameAr: "إضافة مورد", nameEn: "Add Supplier" },
      { id: "quotations.add", moduleId: "quotations", action: "add", nameAr: "إضافة عرض سعر", nameEn: "Add Quotation" },
      { id: "financial_approval.view", moduleId: "financial", action: "view", nameAr: "مقارنة عروض الاسعار من دون اعتماد", nameEn: "Compare Quotations" },
      { id: "financial_approval.approve", moduleId: "financial", action: "approve", nameAr: "الاعتماد المالي لعرض السعر", nameEn: "Approve Quotation Financially" },
      { id: "contracts.template_add", moduleId: "settings", action: "template_add", nameAr: "إضافة قالب للعقود", nameEn: "Add Contract Template" },
      { id: "contracts.template_edit", moduleId: "settings", action: "template_edit", nameAr: "تعديل قالب العقد", nameEn: "Edit Contract Template" },
      { id: "contracts.template_delete", moduleId: "settings", action: "template_delete", nameAr: "حذف قالب العقد", nameEn: "Delete Contract Template" },
      { id: "contracts.clause_add", moduleId: "settings", action: "clause_add", nameAr: "إضافة بند للعقد", nameEn: "Add Contract Clause" },
      { id: "forms_customization.evaluation", moduleId: "settings", action: "evaluation", nameAr: "تخصيص استمارة التقييم", nameEn: "Customize Evaluation Form" },
      { id: "forms_customization.services", moduleId: "settings", action: "services", nameAr: "تخصيص نماذج طلبات الخدمات", nameEn: "Customize Service Request Forms" },
      { id: "forms_customization.registration", moduleId: "settings", action: "registration", nameAr: "تخصيص نماذج التسجيل والتبرع", nameEn: "Customize Registration & Donation Forms" },
      { id: "contracts.edit_approved", moduleId: "contracts", action: "edit_approved", nameAr: "تعديل العقود المعتمدة", nameEn: "Edit Approved Contracts" },
      { id: "contracts.approve", moduleId: "contracts", action: "approve", nameAr: "اعتماد العقود", nameEn: "Approve Contracts" },
      { id: "disbursements.view", moduleId: "disbursements", action: "view", nameAr: "عرض طلبات الصرف", nameEn: "View Disbursement Requests" },
      { id: "disbursements.create", moduleId: "disbursements", action: "create", nameAr: "إنشاء طلبات الصرف", nameEn: "Create Disbursement Requests" },
      { id: "disbursements.edit", moduleId: "disbursements", action: "edit", nameAr: "تعديل طلبات الصرف", nameEn: "Edit Disbursement Requests" },
      { id: "disbursements.approve", moduleId: "disbursements", action: "approve", nameAr: "اعتماد طلبات الصرف", nameEn: "Approve Disbursement Requests" },
      { id: "disbursements.add", moduleId: "disbursements", action: "add", nameAr: "إنشاء طلب صرف", nameEn: "Create Disbursement" },
      { id: "disbursement_orders.view", moduleId: "disbursements", action: "view", nameAr: "عرض أوامر الصرف", nameEn: "View Disbursement Orders" },
      { id: "disbursement_orders.approve", moduleId: "disbursements", action: "approve", nameAr: "اعتماد أوامر الصرف", nameEn: "Approve Disbursement Orders" },
      { id: "disbursement_orders.reject", moduleId: "disbursements", action: "reject", nameAr: "رفض أوامر الصرف", nameEn: "Reject Disbursement Orders" },
      { id: "progress_reports.view", moduleId: "reports", action: "view", nameAr: "عرض تقارير الإنجاز", nameEn: "View Progress Reports" },
      { id: "progress_reports.add", moduleId: "reports", action: "add", nameAr: "إضافة تقرير إنجاز", nameEn: "Add Progress Report" },
      { id: "progress_reports.edit", moduleId: "reports", action: "edit", nameAr: "تعديل التقرير", nameEn: "Edit Progress Report" },
      { id: "progress_reports.approve", moduleId: "reports", action: "approve", nameAr: "اعتماد تقارير المتابعة", nameEn: "Approve Progress Reports" },
      { id: "progress_reports.exception_approve", moduleId: "reports", action: "exception_approve", nameAr: "استثناء اعتماد مدير المشروع", nameEn: "Exception Approve Progress Reports" },
      { id: "signing.progress_reports_sign", moduleId: "signing", action: "sign", nameAr: "توقيع تقارير الإنجاز", nameEn: "Sign Progress Reports" },
      { id: "project_reports.view", moduleId: "reports", action: "view", nameAr: "عرض تقارير المشاريع", nameEn: "View Project Reports" },
      { id: "project_reports.create", moduleId: "reports", action: "create", nameAr: "إنشاء تقارير مشاريع", nameEn: "Create Project Reports" },
      { id: "financial_reports.view", moduleId: "reports", action: "view", nameAr: "عرض تقرير المالية والإحصائيات", nameEn: "View Financial Reports" },
      { id: "financial_reports.export", moduleId: "reports", action: "export", nameAr: "تصدير البيانات", nameEn: "Export Financial Reports" },
      { id: "financial_reports.analytics", moduleId: "reports", action: "analytics", nameAr: "تحليل مؤشرات الأداء", nameEn: "Analyze Financial Performance" },
      { id: "reports.view_stats", moduleId: "reports", action: "view_stats", nameAr: "عرض احصائيات الطلبات", nameEn: "View Request Statistics" },
      { id: "reports.export_data", moduleId: "reports", action: "export_data", nameAr: "تصدير البيانات", nameEn: "Export Data" },
      { id: "staff_users.view", moduleId: "users", action: "view", nameAr: "عرض قائمة المستخدمين", nameEn: "View Staff Users" },
      { id: "staff_users.add", moduleId: "users", action: "add", nameAr: "إضافة موظف جديد", nameEn: "Add Staff User" },
      { id: "staff_users.edit", moduleId: "users", action: "edit", nameAr: "تعديل البيانات الأساسية", nameEn: "Edit Staff User" },
      { id: "staff_users.suspend", moduleId: "users", action: "suspend", nameAr: "إيقاف الحساب", nameEn: "Suspend Staff User" },
      { id: "staff_users.delete", moduleId: "users", action: "delete", nameAr: "حذف الحساب", nameEn: "Delete Staff User" },
      { id: "staff_roles.view", moduleId: "permissions", action: "view", nameAr: "عرض الأدوار والصلاحيات", nameEn: "View Staff Roles" },
      { id: "staff_roles.customize", moduleId: "permissions", action: "customize", nameAr: "تخصيص صلاحيات الدور الأساسي", nameEn: "Customize Staff Roles" },
      { id: "staff_roles.suspend", moduleId: "permissions", action: "suspend", nameAr: "إيقاف الدور الأساسي", nameEn: "Suspend Staff Role" },
      { id: "staff_custom_roles.view", moduleId: "permissions", action: "view", nameAr: "عرض الأدوار المخصصة", nameEn: "View Custom Roles" },
      { id: "staff_custom_roles.add", moduleId: "permissions", action: "add", nameAr: "إضافة دور مخصص جديد", nameEn: "Add Custom Role" },
      { id: "staff_custom_roles.edit", moduleId: "permissions", action: "edit", nameAr: "تعديل الدور المخصص", nameEn: "Edit Custom Role" },
      { id: "staff_custom_roles.delete", moduleId: "permissions", action: "delete", nameAr: "حذف الدور المخصص", nameEn: "Delete Custom Role" },
      { id: "staff_notifications.edit", moduleId: "permissions", action: "edit", nameAr: "تعديل تخصيص الإشعارات", nameEn: "Edit Notification Customization" },
      { id: "settings_org.view", moduleId: "settings", action: "view", nameAr: "عرض إعدادات الجمعية", nameEn: "View Org Settings" },
      { id: "settings_org.edit_basic", moduleId: "settings", action: "edit_basic", nameAr: "تعديل معلومات الجمعية الأساسية", nameEn: "Edit Org Basic Info" },
      { id: "settings_org.edit_signers", moduleId: "settings", action: "edit_signers", nameAr: "تعديل المفوضين بالتوقيع", nameEn: "Edit Org Signers" },
      { id: "settings_org.edit_banks", moduleId: "settings", action: "edit_banks", nameAr: "تعديل الحسابات البنكية المعتمدة", nameEn: "Edit Org Banks" },
      { id: "settings_org.edit_contracts", moduleId: "settings", action: "edit_contracts", nameAr: "تعديل إعدادات وصياغة العقود", nameEn: "Edit Org Contracts Settings" },
      { id: "settings_branding.edit", moduleId: "settings", action: "edit", nameAr: "تعديل الهوية البصرية وشعارات البوابة", nameEn: "Edit Branding Settings" },
      { id: "settings_categories.view", moduleId: "settings", action: "view", nameAr: "عرض وتحديث تصنيفات الخدمات", nameEn: "View Categories" },
      { id: "settings_categories.add", moduleId: "settings", action: "add", nameAr: "إضافة تصنيف جديد للخدمات", nameEn: "Add Category" },
      { id: "settings_categories.edit", moduleId: "settings", action: "edit", nameAr: "تعديل وحفظ تصنيف الخدمات", nameEn: "Edit Category" },
      { id: "settings_categories.delete", moduleId: "settings", action: "delete", nameAr: "حذف تصنيف الخدمات", nameEn: "Delete Category" },
      { id: "services.view", moduleId: "settings", action: "view", nameAr: "عرض قائمة البرامج والخدمات", nameEn: "View Services" },
      { id: "services.add", moduleId: "settings", action: "add", nameAr: "إضافة برنامج أو خدمة جديدة", nameEn: "Add Service" },
      { id: "services.edit", moduleId: "settings", action: "edit", nameAr: "تعديل مواصفات البرامج والخدمات", nameEn: "Edit Service" },
      { id: "services.delete", moduleId: "settings", action: "delete", nameAr: "حذف برنامج أو خدمة", nameEn: "Delete Service" },
      { id: "forms_customization.evaluation", moduleId: "settings", action: "evaluation", nameAr: "تخصيص استمارة التقييم", nameEn: "Customize Evaluation Form" },
      { id: "forms_customization.services", moduleId: "settings", action: "services", nameAr: "تخصيص نماذج طلبات الخدمات", nameEn: "Customize Service Request Forms" },
      { id: "forms_customization.registration", moduleId: "settings", action: "registration", nameAr: "تخصيص نماذج التسجيل والتبرع", nameEn: "Customize Registration & Donation Forms" },
      { id: "requests.upload_final_report", moduleId: "requests", action: "upload_final_report", nameAr: "رفع التقرير الختامي", nameEn: "Upload Final Report" },
      { id: "boq.add", moduleId: "boq", action: "add", nameAr: "إضافة بند جديد", nameEn: "Add BOQ Item" },
      { id: "boq.edit", moduleId: "boq", action: "edit", nameAr: "تعديل البنود", nameEn: "Edit BOQ Items" },
      { id: "boq.delete", moduleId: "boq", action: "delete", nameAr: "حذف البنود", nameEn: "Delete BOQ Items" },
      { id: "pending_reports.view", moduleId: "pending_reports", action: "view", nameAr: "عرض التقارير", nameEn: "View Reports" },
      { id: "pending_reports.intervene", moduleId: "pending_reports", action: "intervene", nameAr: "تدخل لرفع التقرير", nameEn: "Intervene to Upload Report" },
      { id: "requests.sign_final_report", moduleId: "requests", action: "sign_final_report", nameAr: "توقيع التقرير الختامي", nameEn: "Sign Final Report" },
      { id: "disbursements.create_custom", moduleId: "disbursements", action: "create_custom", nameAr: "انشاء طلبات صرف مخصصة", nameEn: "Create Custom Disbursement Requests" },
      { id: "disbursements.create_donation", moduleId: "disbursements", action: "create_donation", nameAr: "انشاء طلب صرف لفرصة تبرع", nameEn: "Create Donation Disbursement Request" },
      { id: "disbursements.exception_approve", moduleId: "disbursements", action: "exception_approve", nameAr: "استثناء اعتماد مُعد الطلب", nameEn: "Override Requester Approval" },
      { id: "disbursement_orders.exception_approve", moduleId: "disbursements", action: "exception_approve", nameAr: "استثناء اعتماد مُعد الأمر", nameEn: "Override Order Creator Approval" },
      { id: "disbursements.sign", moduleId: "disbursements", action: "sign", nameAr: "توقيع طلبات الصرف", nameEn: "Sign Disbursement Requests" },
      { id: "disbursement_orders.sign", moduleId: "disbursements", action: "sign_order", nameAr: "توقيع أوامر الصرف", nameEn: "Sign Disbursement Orders" },
      { id: "contracts.sign", moduleId: "contracts", action: "sign", nameAr: "توقيع العقود", nameEn: "Sign Contracts" },
      { id: "final_reports.sign", moduleId: "requests", action: "sign_final_report", nameAr: "توقيع التقارير الختامية", nameEn: "Sign Final Reports" },
      { id: "projects.create_multi_mosque", moduleId: "projects", action: "create_multi_mosque", nameAr: "إضافة مشروع لعدة مساجد", nameEn: "Create Multi-Mosque Project" },
      { id: "projects.assign_as_manager", moduleId: "projects", action: "assign_as_manager", nameAr: "تعيين كمدير للمشاريع", nameEn: "Assign as Project Manager" },
      { id: "projects.financials", moduleId: "projects", action: "financials", nameAr: "مالية المشاريع", nameEn: "Project Financials" },
      { id: "disbursement_orders.create_direct", moduleId: "disbursements", action: "create_direct", nameAr: "انشاء امر صرف مخصص", nameEn: "Create Direct Disbursement Order" },
      { id: "receipt_vouchers.view", moduleId: "disbursements", action: "view", nameAr: "عرض سندات القبض", nameEn: "View Receipt Vouchers" },
      { id: "receipt_vouchers.edit", moduleId: "disbursements", action: "edit", nameAr: "تعديل سند القبض", nameEn: "Edit Receipt Voucher" },
      { id: "receipt_vouchers.exception_approve", moduleId: "disbursements", action: "exception_approve", nameAr: "استثناء اعتماد السند", nameEn: "Exception Approve Receipt Voucher" },
      { id: "requests.create_quick_request", moduleId: "requests", action: "create_quick_request", nameAr: "إنشاء طلب سريع", nameEn: "Create Quick Request" },
    ];

    for (const p of customPerms) {
      const existing = await db.select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.id, p.id))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(permissions).values(p);
        console.log(`Inserted missing custom permission: ${p.id}`);
      } else {
        await db.update(permissions).set({
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          moduleId: p.moduleId,
          action: p.action
        }).where(eq(permissions.id, p.id));
      }
    }
  } catch (err) {
    console.error("Error in ensureAllCustomPermissionsExist:", err);
  }
}

/**
 * حساب الصلاحيات النهائية للمستخدم
 * تدمج صلاحيات الأدوار + الصلاحيات الفردية
 */
export async function calculateUserPermissions(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // 1. الحصول على الدور الأساسي للمستخدم من جدول المستخدمين
  const [userData] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let rolePermissionsData: string[] = [];

  // إذا كان المستخدم super_admin أو system_admin، نمنحه جميع الصلاحيات افتراضياً كبداية
  if (userData?.role === 'super_admin' || userData?.role === 'system_admin') {
    const excludedAdminPerms = [
      'requests.manage_as_field_team',
      'requests.manage_as_quick_response',
      'requests.upload_final_report',
      'board_chairman',
      'receipt_vouchers.exception_approve',
      'progress_reports.exception_approve',
      'disbursements.exception_approve',
      'disbursement_orders.exception_approve',
    ];
    const allPerms = await db.select({ id: permissions.id }).from(permissions);
    // يحصلان أيضاً على جميع الصلاحيات الموسعة (باستثناء appointments.view_own والصلاحيات المستبعدة)
    const expandedSet = new Set(
      allPerms
        .map(p => p.id)
        .filter(id => id !== "appointments.view_own" && !excludedAdminPerms.includes(id))
    );
    Object.keys(PERMISSION_EXPANSION).forEach(k => {
      if (k !== "appointments.view_own" && !excludedAdminPerms.includes(k)) {
        expandedSet.add(k);
      }
    });
    Object.values(PERMISSION_EXPANSION).forEach(subs => subs.forEach(s => {
      if (!excludedAdminPerms.includes(s)) {
        expandedSet.add(s);
      }
    }));
    rolePermissionsData.push(...Array.from(expandedSet));
  }

  // 2. جمع صلاحيات جميع الأدوار المسندة للمستخدم (الدور الأساسي + الأدوار الإضافية)
  const userRolesData = await db
    .select({
      roleId: userRoleAssignments.roleId,
    })
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.userId, userId),
        sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
      )
    );

  const roleIds = userRolesData.map(r => r.roleId);
  const hasCustomRole = roleIds.some(r => r.startsWith("custom_role_"));
  if (userData?.role && !hasCustomRole) {
    roleIds.push(userData.role);
  }

  // إسناد صلاحيات تلقائية للأدوار الأساسية إذا لزم الأمر
  if (userData?.role === "service_requester" && !hasCustomRole) {
    rolePermissionsData.push("requests.create", "requests.view");
  }

  if (userData?.role === "board_chairman" || roleIds.includes("board_chairman")) {
    rolePermissionsData.push("board_chairman");
  }

  if (userData?.role === "board_member" || roleIds.includes("board_member")) {
    rolePermissionsData.push("board_member");
  }

  if (roleIds.length > 0) {
    // جلب صلاحيات من جدول rolePermissions (المصدر التقليدي)
    const rolePermsResult = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));
    
    rolePermissionsData.push(...rolePermsResult.map(rp => rp.permissionId));

    // جلب صلاحيات من حقل description في جدول roles (المصدر للأدوار المخصصة)
    const rolesData = await db
      .select({ id: roles.id, description: roles.description })
      .from(roles)
      .where(inArray(roles.id, roleIds));

    for (const role of rolesData) {
      if (role.description) {
        try {
          const parsed = JSON.parse(role.description);
          if (Array.isArray(parsed)) {
            rolePermissionsData.push(...parsed);
          }
        } catch {
          // ليس JSON صالح، نتجاهل
        }
      }
    }
  }

  // 3. جمع الصلاحيات الفردية
  const userPermsData = await db
    .select({
      permissionId: userPermissions.permissionId,
      granted: userPermissions.granted
    })
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        sql`(${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > NOW())`
      )
    );

  // 4. دمج وتوسيع الصلاحيات
  const allPermissions = new Set<string>();

  // إضافة الصلاحيات المجمعة من كل المصادر
  rolePermissionsData.forEach(p => allPermissions.add(p));

  // دعم الـ Wildcard (إذا وجد '*')
  if (allPermissions.has("*")) {
    const excludedAdminPerms = [
      'requests.manage_as_field_team',
      'requests.manage_as_quick_response',
      'requests.upload_final_report',
      'board_chairman',
      'receipt_vouchers.exception_approve',
      'progress_reports.exception_approve',
      'disbursements.exception_approve',
      'disbursement_orders.exception_approve',
    ];
    const allAvailablePerms = await db.select({ id: permissions.id }).from(permissions);
    allAvailablePerms.forEach(p => {
      if (!excludedAdminPerms.includes(p.id)) {
        allPermissions.add(p.id);
      }
    });
  }

  // توسيع الصلاحيات البسيطة إلى صلاحيات دقيقة لجميع الصلاحيات المجمعة
  const permissionsToExpand = Array.from(allPermissions);
  const excludedAdminPerms = [
    'requests.manage_as_field_team',
    'requests.manage_as_quick_response',
    'requests.upload_final_report',
    'board_chairman',
    'receipt_vouchers.exception_approve',
    'progress_reports.exception_approve',
    'disbursements.exception_approve',
    'disbursement_orders.exception_approve',
  ];
  for (const perm of permissionsToExpand) {
    const expanded = PERMISSION_EXPANSION[perm];
    if (expanded) {
      expanded.forEach(sub => {
        if (!excludedAdminPerms.includes(sub)) {
          allPermissions.add(sub);
        }
      });
    }
  }

  // 6. تطبيق الصلاحيات الفردية (منح أو سحب)
  // بناء خريطة عكسية: من الصلاحية الدقيقة إلى مفاتيح التوسيع الأب
  const reverseExpansionMap: Record<string, string[]> = {};
  for (const [parentKey, childPerms] of Object.entries(PERMISSION_EXPANSION)) {
    for (const child of childPerms) {
      if (!reverseExpansionMap[child]) reverseExpansionMap[child] = [];
      reverseExpansionMap[child].push(parentKey);
    }
  }

  const revokedPermissions = new Set<string>();
  userPermsData.forEach(perm => {
    if (perm.granted) {
      allPermissions.add(perm.permissionId);
      // توسيع الصلاحية المباشرة الممنوحة لتفادي أخطاء الصلاحيات الدقيقة في الواجهة
      const expanded = PERMISSION_EXPANSION[perm.permissionId];
      if (expanded) {
        expanded.forEach(sub => allPermissions.add(sub));
      }
    } else {
      allPermissions.delete(perm.permissionId); // سحب الصلاحية
      revokedPermissions.add(perm.permissionId);
    }
  });

  // إزالة المفاتيح الأب/البديلة التي تعتمد على صلاحيات محجوبة
  // مثلاً: حجب mosque_map.view يزيل أيضاً mosque_map و mosques_map
  revokedPermissions.forEach(revokedPerm => {
    const parentKeys = reverseExpansionMap[revokedPerm] || [];
    for (const parentKey of parentKeys) {
      if (parentKey === "disbursements.add" || parentKey === "disbursements.create_custom" || parentKey === "disbursements.create_donation") {
        continue;
      }
      // نحذف المفتاح الأب فقط إذا كانت كل صلاحياته الفرعية محجوبة أو غير موجودة
      const siblingPerms = PERMISSION_EXPANSION[parentKey] || [];
      const hasRemainingGranted = siblingPerms.some(
        sibling => sibling !== revokedPerm && allPermissions.has(sibling) && !revokedPermissions.has(sibling)
      );
      if (!hasRemainingGranted) {
        allPermissions.delete(parentKey);
      }
    }
  });

  // 7. إضافة مفاتيح الصلاحيات البسيطة تلقائياً لتوافق الواجهة الجانبية والتحقق من المسارات
  if (allPermissions.has("mosques.view")) {
    allPermissions.add("mosques");
  } else {
    allPermissions.delete("mosques");
  }
  if (
    allPermissions.has("requests.view") ||
    allPermissions.has("requests.view_details") ||
    allPermissions.has("requests.manage_as_field_team") ||
    allPermissions.has("requests.manage_as_quick_response")
  ) {
    allPermissions.add("requests");
  } else {
    allPermissions.delete("requests");
  }
  if (allPermissions.has("disbursement_orders.view")) {
    allPermissions.add("disbursement_orders.view_details");
  } else {
    allPermissions.delete("disbursement_orders.view_details");
  }
  if (allPermissions.has("mosque_map.view")) {
    allPermissions.add("mosque_map");
    allPermissions.add("mosques_map");
  } else {
    allPermissions.delete("mosque_map");
    allPermissions.delete("mosques_map");
  }
  if (allPermissions.has("appointments.view_all") || allPermissions.has("appointments.view_own")) {
    allPermissions.add("appointments");
    allPermissions.add("appointments.view");
    allPermissions.add("appointments_calendar");
  } else {
    allPermissions.delete("appointments");
    allPermissions.delete("appointments.view");
    allPermissions.delete("appointments_calendar");
  }
  if (allPermissions.has("projects.view")) {
    allPermissions.add("projects");
  } else {
    allPermissions.delete("projects");
  }
  if (allPermissions.has("reports.view_stats") || allPermissions.has("reports.export_data")) {
    allPermissions.add("reports");
  } else {
    allPermissions.delete("reports");
  }
  if (allPermissions.has("requesters.view") || allPermissions.has("requesters.approve")) {
    allPermissions.add("requesters");
    allPermissions.add("service_requester_accounts");
  } else {
    allPermissions.delete("requesters");
    allPermissions.delete("service_requester_accounts");
  }


  if (
    allPermissions.has("users.view") ||
    allPermissions.has("staff_users.view") ||
    allPermissions.has("staff_roles.view") ||
    allPermissions.has("staff_custom_roles.view") ||
    allPermissions.has("staff_notifications.edit")
  ) {
    allPermissions.add("staff");
    allPermissions.add("staff_management");
  }
  if (allPermissions.has("suppliers.view") || allPermissions.has("suppliers.view_details") || allPermissions.has("suppliers.add") || allPermissions.has("suppliers.edit") || allPermissions.has("suppliers.approve")) {
    allPermissions.add("suppliers");
  }
  if (allPermissions.has("quotations.view")) {
    allPermissions.add("quotations");
  }
  if (allPermissions.has("financial.view")) {
    allPermissions.add("financial_approval");
  }
  if (
    allPermissions.has("contracts.view") ||
    allPermissions.has("contracts.create") ||
    allPermissions.has("contracts.template_add") ||
    allPermissions.has("contracts.template_edit") ||
    allPermissions.has("contracts.template_delete") ||
    allPermissions.has("contracts.clause_add")
  ) {
    allPermissions.add("contracts");
  }
  if (
    allPermissions.has("disbursements.view") ||
    allPermissions.has("disbursements.add") ||
    allPermissions.has("disbursements.create_custom") ||
    allPermissions.has("disbursements.create_donation") ||
    allPermissions.has("disbursements.edit") ||
    allPermissions.has("disbursements.delete") ||
    allPermissions.has("disbursements.approve") ||
    allPermissions.has("disbursements.exception_approve")
  ) {
    allPermissions.add("disbursements");
    allPermissions.add("disbursement_requests");
  }
  if (allPermissions.has("disbursements.create_custom")) {
    allPermissions.add("disbursements.create_donation");
  }
  if (
    allPermissions.has("disbursements.add") ||
    allPermissions.has("disbursements.create_custom") ||
    allPermissions.has("disbursements.create_donation")
  ) {
    allPermissions.add("disbursements.create");
  }
  if (
    allPermissions.has("disbursement_orders.view") ||
    allPermissions.has("disbursement_orders.approve") ||
    allPermissions.has("disbursement_orders.exception_approve") ||
    allPermissions.has("disbursement_orders.reject") ||
    allPermissions.has("disbursement_orders.view_details") ||
    allPermissions.has("disbursement_orders.create_direct")
  ) {
    allPermissions.add("disbursement_orders");
  } else {
    allPermissions.delete("disbursement_orders");
  }
  if (
    allPermissions.has("progress_reports.view") ||
    allPermissions.has("progress_reports.add") ||
    allPermissions.has("progress_reports.edit") ||
    allPermissions.has("progress_reports.approve") ||
    allPermissions.has("progress_reports.exception_approve")
  ) {
    allPermissions.add("progress_reports");
  }
  if (
    allPermissions.has("project_reports.view") ||
    allPermissions.has("project_reports.create")
  ) {
    allPermissions.add("project_reports");
  }
  if (
    allPermissions.has("financial_reports.view") ||
    allPermissions.has("financial_reports.export") ||
    allPermissions.has("financial_reports.analytics")
  ) {
    allPermissions.add("financial_reports");
    allPermissions.add("financial_report");
  }
  if (
    allPermissions.has("settings.view") ||
    allPermissions.has("services.view") ||
    allPermissions.has("services.add") ||
    allPermissions.has("services.edit") ||
    allPermissions.has("services.delete")
  ) {
    allPermissions.add("settings");
    allPermissions.add("settings_center");
    allPermissions.add("services");
    allPermissions.add("programs_services");
  }
  if (
    allPermissions.has("forms_customization.evaluation") ||
    allPermissions.has("forms_customization.services") ||
    allPermissions.has("forms_customization.registration")
  ) {
    allPermissions.add("forms_customization");
  } else {
    allPermissions.delete("forms_customization");
  }

  return Array.from(allPermissions);
}

/**
 * التحقق من صلاحية واحدة
 */
export async function checkPermission(userId: number, permission: string): Promise<boolean> {
  const userPermissions = await calculateUserPermissions(userId);
  return userPermissions.includes(permission);
}

/**
 * التحقق من عدة صلاحيات (يجب أن يملك جميعها)
 */
export async function checkPermissions(userId: number, requiredPermissions: string[]): Promise<boolean> {
  const userPermissions = await calculateUserPermissions(userId);
  return requiredPermissions.every(p => userPermissions.includes(p));
}

/**
 * Middleware للتحقق من الصلاحية
 */
export const permissionProcedure = (permission: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await checkPermission(ctx.user.id, permission);
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `ليس لديك صلاحية: ${permission}`
      });
    }
    return next({ ctx });
  });

/**
 * تسجيل إجراء في سجل التدقيق
 */
async function logAudit(data: {
  actionType: string;
  targetUserId: number;
  targetRoleId?: string;
  permissionId?: string;
  performedBy: number;
  reason?: string;
  oldValue?: string;
  newValue?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(permissionsAuditLog).values(data);
}

// ==================== tRPC Router ====================

export const permissionsRouter = router({
  // ==================== الهيكل الهرمي ====================
  
  /**
   * عرض الهيكل الهرمي الكامل (الوحدات + الصلاحيات)
   */
  getStructure: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await ensureRequestsPermissionsExist(db);
    await ensureAllCustomPermissionsExist(db);

    const modulesData = await db.select().from(modules).where(eq(modules.isActive, true)).orderBy(modules.displayOrder);
    const permissionsData = await db.select().from(permissions);

    return modulesData.map(module => ({
      ...module,
      permissions: permissionsData.filter(p => p.moduleId === module.id)
    }));
  }),

  /**
   * إضافة وحدة جديدة
   */
  createModule: permissionProcedure("permissions.create")
    .input(z.object({
      id: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(modules).values(input);
      return { success: true };
    }),

  /**
   * إضافة صلاحية جديدة
   */
  createPermission: permissionProcedure("permissions.create")
    .input(z.object({
      moduleId: z.string(),
      action: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const permissionId = `${input.moduleId}.${input.action}`;
      await db.insert(permissions).values({
        id: permissionId,
        ...input
      });
      return { success: true, permissionId };
    }),

  // ==================== إدارة الأدوار ====================

  /**
   * عرض جميع الأدوار
   */
  getRoles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return await db.select().from(roles);
  }),

  // تحديث حالة استقبال إشعارات المستفيدين لدور وظيفي
  updateRoleReceiveBeneficiaryNotifications: permissionProcedure("staff_notifications.edit")
    .input(z.object({
      roleId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(roles)
        .set({ receiveBeneficiaryNotifications: input.enabled })
        .where(eq(roles.id, input.roleId));

      return { success: true };
    }),

  // تحديث حالة استقبال إشعارات الطلبات لدور وظيفي
  updateRoleReceiveRequestNotifications: permissionProcedure("staff_notifications.edit")
    .input(z.object({
      roleId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(roles)
        .set({ receiveRequestNotifications: input.enabled })
        .where(eq(roles.id, input.roleId));

      return { success: true };
    }),

  // تحديث حالة استقبال إشعارات المالية والعقود لدور وظيفي
  updateRoleReceiveFinancialAndContractNotifications: permissionProcedure("staff_notifications.edit")
    .input(z.object({
      roleId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(roles)
        .set({ receiveFinancialAndContractNotifications: input.enabled })
        .where(eq(roles.id, input.roleId));

      return { success: true };
    }),

  updateRoleChannelSetting: permissionProcedure("staff_notifications.edit")
    .input(z.object({
      roleId: z.string(),
      category: z.enum(['beneficiary', 'request', 'financial']),
      channel: z.enum(['in_app', 'whatsapp', 'sms', 'email']),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const fieldMap = {
        beneficiary: {
          in_app: "receiveBeneficiaryNotifications",
          email: "receiveBeneficiaryEmail",
          whatsapp: "receiveBeneficiaryWhatsapp",
          sms: "receiveBeneficiarySms"
        },
        request: {
          in_app: "receiveRequestNotifications",
          email: "receiveRequestEmail",
          whatsapp: "receiveRequestWhatsapp",
          sms: "receiveRequestSms"
        },
        financial: {
          in_app: "receiveFinancialAndContractNotifications",
          email: "receiveFinancialEmail",
          whatsapp: "receiveFinancialWhatsapp",
          sms: "receiveFinancialSms"
        }
      } as const;

      const field = fieldMap[input.category][input.channel];

      await db
        .update(roles)
        .set({ [field]: input.enabled })
        .where(eq(roles.id, input.roleId));

      return { success: true };
    }),

  /**
   * عرض صلاحيات دور محدد
   */
  getRolePermissions: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await ensureRequestsPermissionsExist(db);

      const rolePerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      const permsSet = new Set(rolePerms.map(rp => rp.permissionId));

      // Also load from roles.description JSON array to handle UI customized checkbox values
      const [roleData] = await db
        .select({ description: roles.description })
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .limit(1);

      if (roleData?.description) {
        try {
          const parsed = JSON.parse(roleData.description);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => permsSet.add(p));
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }

      return Array.from(permsSet);
    }),

  /**
   * عرض دور محدد
   */
  getRole: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }
      return role;
    }),

  /**
   * إنشاء دور جديد
   */
  createRole: permissionProcedure("permissions.create")
    .input(z.object({
      id: z.string(),
      nameAr: z.string(),
      nameEn: z.string(),
      description: z.string().optional(),
      permissions: z.array(z.string())
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });



      // إنشاء الدور مع تخزين الصلاحيات المخصصة في حقل الوصف كـ JSON
      await db.insert(roles).values({
        id: input.id,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: JSON.stringify(input.permissions),
        isSystem: false
      });

      // التحقق من الصلاحيات الموجودة فعلياً في قاعدة البيانات قبل الربط
      if (input.permissions.length > 0) {
        const existingPerms = await db.select({ id: permissions.id }).from(permissions)
          .where(inArray(permissions.id, input.permissions));
        const validPermIds = existingPerms.map(p => p.id);

        if (validPermIds.length > 0) {
          await db.insert(rolePermissions).values(
            validPermIds.map(permId => ({
              roleId: input.id,
              permissionId: permId
            }))
          );
        }
      }

      await logAudit({
        actionType: "create_role",
        targetUserId: ctx.user.id,
        targetRoleId: input.id,
        performedBy: ctx.user.id,
        newValue: JSON.stringify(input)
      });

      return { success: true };
    }),

  /**
   * تفعيل / إيقاف دور
   */
  toggleRoleStatus: permissionProcedure("permissions.edit")
    .input(z.object({
      roleId: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ input, ctx }) => {
      // منع إيقاف أدوار الإدارة العليا (حماية النظام)
      if ((input.roleId === 'super_admin' || input.roleId === 'system_admin') && !input.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن إيقاف هذا الدور الإداري الأساسي (حماية النظام)" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }

      await db.update(roles).set({ isActive: input.isActive }).where(eq(roles.id, input.roleId));

      await logAudit({
        actionType: "toggle_role_status",
        targetUserId: ctx.user.id,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id,
        reason: input.isActive ? "تفعيل الدور" : "إيقاف الدور (Kill Switch)"
      });

      return { success: true };
    }),

  /**
   * تحديث دور مخصص (الاسم والصلاحيات)
   */
  updateRole: permissionProcedure("permissions.edit")
    .input(z.object({
      roleId: z.string(),
      nameAr: z.string().optional(),
      permissions: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await ensureRequestsPermissionsExist(db);

      const [existingRole] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!existingRole) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }



      // تحديث بيانات الدور (الاسم والوصف)
      const updateData: any = {};
      if (input.nameAr) updateData.nameAr = input.nameAr;
      if (input.permissions) updateData.description = JSON.stringify(input.permissions);

      if (Object.keys(updateData).length > 0) {
        await db.update(roles).set(updateData).where(eq(roles.id, input.roleId));
      }

      // تحديث الصلاحيات في الجدول التبادلي
      if (input.permissions) {
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));

        if (input.permissions.length > 0) {
          // التحقق من الصلاحيات الموجودة فعلياً
          const existingPerms = await db.select({ id: permissions.id }).from(permissions)
            .where(inArray(permissions.id, input.permissions));
          const validPermIds = existingPerms.map(p => p.id);

          if (validPermIds.length > 0) {
            await db.insert(rolePermissions).values(
              validPermIds.map(permId => ({
                roleId: input.roleId,
                permissionId: permId
              }))
            );
          }
        }
      }

      await logAudit({
        actionType: "update_role",
        targetUserId: ctx.user.id,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id,
        newValue: JSON.stringify(input)
      });

      return { success: true };
    }),

  /**
   * إعادة الصلاحيات الافتراضية للدور
   */
  restoreDefaultPermissions: permissionProcedure("permissions.edit")
    .input(z.object({
      roleId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existingRole] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!existingRole) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }

      const rolePermissionsMapping: Record<string, string[] | string> = {
        super_admin: "*",
        system_admin: "*",
        general_manager: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits", "financial_reports", "signing", "requesters", "disbursement_orders", "progress_reports", "financial_approval"],
        executive_director: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits", "financial_reports", "signing", "requesters", "disbursement_orders", "progress_reports", "financial_approval"],
        projects_office: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits", "financial_reports"],
        field_team: ["mosques.view", "requests.view", "requests.edit", "requests.manage_as_field_team", "field_visits"],
        quick_response: ["requests.view", "requests.manage_as_quick_response", "field_visits.view", "reports.create"],
        financial: ["financial", "quotations", "disbursements", "suppliers.view", "financial_reports"],
        financial_manager: ["financial", "quotations", "disbursements", "suppliers", "reports.view", "financial_reports"],
        project_manager: ["projects.view", "projects.edit", "projects.assign_as_manager", "reports", "disbursements.view", "disbursements.create", "disbursements.edit", "contracts.view", "contracts.create", "contracts.edit", "suppliers.view", "handovers"],
        corporate_comm: ["requests.view", "requests.upload_final_report", "reports.view", "settings.view", "analytics.view"],
        service_requester: ["requests.view", "requests.create", "mosques.view"]
      };

      const permList = rolePermissionsMapping[input.roleId];
      if (!permList) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الدور ليس له صلاحيات افتراضية محددة بالنظام" });
      }

      // جلب جميع الصلاحيات من جدول الصلاحيات
      const allPermissions = await db.select({ id: permissions.id }).from(permissions);
      const allPermIds = allPermissions.map(p => p.id);

      let targetPermIds: string[] = [];

      if (permList === "*") {
        targetPermIds = allPermIds;
      } else if (Array.isArray(permList)) {
        targetPermIds = allPermIds.filter(pId =>
          permList.some((key: string) => pId === key || pId.startsWith(key + "."))
        );
      }

      // حذف الصلاحيات الحالية وتصفية حقل description بالدور
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));
      await db.update(roles).set({ description: null }).where(eq(roles.id, input.roleId));

      if (targetPermIds.length > 0) {
        await db.insert(rolePermissions).values(
          targetPermIds.map(pId => ({
            roleId: input.roleId,
            permissionId: pId
          }))
        );
      }

      await logAudit({
        actionType: "restore_default_permissions",
        targetUserId: ctx.user.id,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id,
        newValue: JSON.stringify({ roleId: input.roleId, permissionsCount: targetPermIds.length })
      });

      return { success: true };
    }),

  /**
   * حذف دور (الأدوار الافتراضية لا يمكن حذفها)
   */
  deleteRole: permissionProcedure("permissions.delete")
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // قائمة الأدوار المحمية تماماً
      const protectedRoleIds = ['super_admin', 'system_admin', 'service_requester'];
      if (protectedRoleIds.includes(input.roleId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن حذف الأدوار الأساسية للنظام (المدير العام، مدير النظام، طالب الخدمة)"
        });
      }

      // التحقق من أن الدور موجود وليس افتراضياً (isSystem)
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الدور غير موجود" });
      }
      
      if (role.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن حذف الأدوار الافتراضية للنظام"
        });
      }

      // التحقق مما إذا كان هناك مستخدمون نشطون مسند إليهم هذا الدور
      const [assignedUser] = await db
        .select({ id: userRoleAssignments.id })
        .from(userRoleAssignments)
        .innerJoin(users, eq(userRoleAssignments.userId, users.id))
        .where(
          and(
            eq(userRoleAssignments.roleId, input.roleId),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (assignedUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "لا يمكن حذف هذا الدور لأنه مرتبط بمستخدمين حاليين. يرجى إزالة الدور من جميع المستخدمين أولاً."
        });
      }

      // تنفيذ الحذف داخل عملية واحدة (Transaction) لضمان سلامة البيانات
      try {
        await db.transaction(async (tx) => {
          console.log(`[Permissions] Starting deletion of role: ${input.roleId}`);
          
          // 1. تنظيف مراجع سجلات التدقيق (Permissions Audit Log)
          const auditUpdateResult = await tx.update(permissionsAuditLog)
            .set({ targetRoleId: null })
            .where(eq(permissionsAuditLog.targetRoleId, input.roleId));
          console.log(`[Permissions] Audit log nullified:`, auditUpdateResult);

          // 2. حذف مراجع الصلاحيات (Role Permissions)
          const permsDeleteResult = await tx.delete(rolePermissions)
            .where(eq(rolePermissions.roleId, input.roleId));
          console.log(`[Permissions] Role permissions deleted:`, permsDeleteResult);

          // 3. حذف مراجع المستخدمين (User Roles) - احتياطاً رغم وجود cascade
          const userRolesDeleteResult = await tx.delete(userRoleAssignments)
            .where(eq(userRoleAssignments.roleId, input.roleId));
          console.log(`[Permissions] User role assignments deleted:`, userRolesDeleteResult);

          // 4. حذف الدور نفسه
          const roleDeleteResult = await tx.delete(roles)
            .where(eq(roles.id, input.roleId));
          console.log(`[Permissions] Role deleted successfully:`, roleDeleteResult);

          // 5. تسجيل الإجراء في سجل التدقيق الجديد
          await tx.insert(permissionsAuditLog).values({
            actionType: "delete_role",
            targetUserId: ctx.user.id,
            targetRoleId: null,
            performedBy: ctx.user.id,
            reason: "حذف دور مخصص (تم تنظيف المراجع برمجياً)",
            oldValue: JSON.stringify(role)
          });
        });
      } catch (error: any) {
        console.error(`[Permissions] Failed to delete role ${input.roleId}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `فشل حذف الدور: ${error.message || "خطأ في قاعدة البيانات"}`
        });
      }

      return { success: true };
    }),

  // ==================== إدارة صلاحيات المستخدمين ====================

  /**
   * عرض أدوار مستخدم
   */
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db
        .select({
          id: userRoleAssignments.id,
          roleId: userRoleAssignments.roleId,
          roleName: roles.nameAr,
          assignedAt: userRoleAssignments.assignedAt,
          expiresAt: userRoleAssignments.expiresAt
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(eq(userRoleAssignments.userId, input.userId));
    }),

  /**
   * عرض صلاحيات مستخدم الفردية
   */
  getUserDirectPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));
    }),

  /**
   * عرض الصلاحيات النهائية للمستخدم
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await calculateUserPermissions(input.userId);
    }),

  /**
   * عرض الصلاحيات الموروثة من جميع أدوار المستخدم (الدور الأساسي + الأدوار الإضافية)
   */
  getUserRolePermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. الحصول على الدور الأساسي للمستخدم من جدول المستخدمين
      const [userData] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      // 2. جمع صلاحيات جميع الأدوار المسندة للمستخدم (الدور الأساسي + الأدوار الإضافية)
      const userRolesData = await db
        .select({
          roleId: userRoleAssignments.roleId,
        })
        .from(userRoleAssignments)
        .where(
          and(
            eq(userRoleAssignments.userId, input.userId),
            sql`(${userRoleAssignments.expiresAt} IS NULL OR ${userRoleAssignments.expiresAt} > NOW())`
          )
        );

      const roleIds = userRolesData.map(r => r.roleId);
      const hasCustomRole = roleIds.some(r => r.startsWith("custom_role_"));
      if (userData?.role && !hasCustomRole && !roleIds.includes(userData.role)) {
        roleIds.push(userData.role);
      }

      if (roleIds.length === 0) return [];

      const permsSet = new Set<string>();

      // إذا كان المستخدم super_admin أو system_admin، نمنحه جميع الصلاحيات افتراضياً (باستثناء الصلاحيات المستبعدة)
      if (roleIds.includes('super_admin') || roleIds.includes('system_admin')) {
        const excludedAdminPerms = [
          'requests.manage_as_field_team',
          'requests.manage_as_quick_response',
          'requests.upload_final_report',
          'board_chairman',
          'receipt_vouchers.exception_approve',
          'progress_reports.exception_approve',
          'disbursements.exception_approve',
          'disbursement_orders.exception_approve',
        ];
        const allPerms = await db.select({ id: permissions.id }).from(permissions);
        allPerms.forEach(p => {
          if (p.id !== "appointments.view_own" && !excludedAdminPerms.includes(p.id)) {
            permsSet.add(p.id);
          }
        });
        Object.keys(PERMISSION_EXPANSION).forEach(k => {
          if (k !== "appointments.view_own" && !excludedAdminPerms.includes(k)) {
            permsSet.add(k);
          }
        });
        Object.values(PERMISSION_EXPANSION).forEach(subs => subs.forEach(s => {
          if (!excludedAdminPerms.includes(s)) {
            permsSet.add(s);
          }
        }));
      }

      // إسناد صلاحيات تلقائية للأدوار الأساسية
      if (roleIds.includes("service_requester")) {
        permsSet.add("requests.create");
        permsSet.add("requests.view");
      }

      if (roleIds.includes("board_chairman")) {
        permsSet.add("board_chairman");
      }

      if (roleIds.includes("board_member")) {
        permsSet.add("board_member");
      }

      // جلب صلاحيات من جدول rolePermissions
      const rolePerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(inArray(rolePermissions.roleId, roleIds));
      
      rolePerms.forEach(rp => permsSet.add(rp.permissionId));

      // جلب صلاحيات من حقل description في جدول roles (للأدوار المخصصة)
      const rolesData = await db
        .select({ id: roles.id, description: roles.description })
        .from(roles)
        .where(inArray(roles.id, roleIds));

      for (const role of rolesData) {
        if (role.description) {
          try {
            const parsed = JSON.parse(role.description);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => permsSet.add(p));
            }
          } catch {
            // Ignore
          }
        }
      }

      // توسيع الصلاحيات البسيطة
      const permsArray = Array.from(permsSet);
      const excludedAdminPerms = [
        'requests.manage_as_field_team',
        'requests.manage_as_quick_response',
        'requests.upload_final_report',
        'board_chairman',
        'receipt_vouchers.exception_approve',
        'progress_reports.exception_approve',
        'disbursements.exception_approve',
        'disbursement_orders.exception_approve',
      ];
      for (const perm of permsArray) {
        const expanded = PERMISSION_EXPANSION[perm];
        if (expanded) {
          expanded.forEach(sub => {
            if (!excludedAdminPerms.includes(sub)) {
              permsSet.add(sub);
            }
          });
        }
      }



      return Array.from(permsSet);
    }),

  /**
   * إسناد دور لمستخدم
   */
  assignRole: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      roleId: z.string(),
      expiresAt: z.date().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ (يجب أن يكون مدير نظام أو مدير عام)
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإسناد الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // منع إضافة أدوار إضافية للمدير العام (لديه كل الصلاحيات أصلاً)
      const [targetUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (targetUser?.role === 'super_admin') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إضافة أدوار إضافية للمدير العام" });
      }

      await db.insert(userRoleAssignments).values({
        userId: input.userId,
        roleId: input.roleId,
        assignedBy: ctx.user.id,
        expiresAt: input.expiresAt
      });

      await logAudit({
        actionType: "assign_role",
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id
      });

      return { success: true };
    }),

  /**
   * إزالة دور من مستخدم
   */
  removeRole: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      roleId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإزالة الأدوار" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(userRoleAssignments).where(
        and(
          eq(userRoleAssignments.userId, input.userId),
          eq(userRoleAssignments.roleId, input.roleId)
        )
      );

      await logAudit({
        actionType: "remove_role",
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        performedBy: ctx.user.id
      });

      return { success: true };
    }),

  /**
   * تعيين الصلاحيات الفردية للمستخدم بالكامل (تزامن الأوفررايد)
   */
  setUserDirectPermissions: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      permissions: z.array(z.object({
        permissionId: z.string(),
        granted: z.boolean(),
        reason: z.string().optional()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل الصلاحيات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });



      await ensureRequestsPermissionsExist(db);
      await ensureAllCustomPermissionsExist(db);

      // التأكد من وجود كافة المعرفات في جدول الصلاحيات قبل الربط لتفادي أخطاء المفاتيح الأجنبية
      if (input.permissions.length > 0) {
        const permIds = input.permissions.map(p => p.permissionId);
        const existingPerms = await db.select({ id: permissions.id }).from(permissions)
          .where(inArray(permissions.id, permIds));
        const existingSet = new Set(existingPerms.map((p: any) => p.id));

        const validModules = new Set(
          (await db.select({ id: modules.id }).from(modules)).map((m: any) => m.id)
        );

        for (const p of input.permissions) {
          if (!existingSet.has(p.permissionId)) {
            const parts = p.permissionId.split(".");
            const rawMod = parts[0] || "general";
            let modId = rawMod;

            if (["disbursement_orders", "receipt_vouchers", "financial_reports", "progress_reports", "pending_reports"].includes(rawMod)) {
              modId = (rawMod === "financial_reports" || rawMod === "progress_reports" || rawMod === "pending_reports") ? "reports" : "disbursements";
            } else if (rawMod.startsWith("board")) {
              modId = "board";
            }

            if (!validModules.has(modId)) {
              modId = "general";
            }

            await db.insert(permissions).values({
              id: p.permissionId,
              moduleId: modId,
              action: parts[1] || "manage",
              nameAr: p.permissionId,
              nameEn: p.permissionId
            }).catch(() => {});
            existingSet.add(p.permissionId);
          }
        }
      }

      await db.transaction(async (tx) => {
        // 1. حذف جميع الصلاحيات الفردية الحالية للمستخدم
        await tx.delete(userPermissions).where(eq(userPermissions.userId, input.userId));

        // 2. إدخال الصلاحيات الفردية الجديدة إذا وُجدت
        if (input.permissions.length > 0) {
          const valuesToInsert = input.permissions.map(p => ({
            userId: input.userId,
            permissionId: p.permissionId,
            granted: p.granted,
            grantedBy: ctx.user.id,
            reason: p.reason || "تخصيص صلاحيات المستخدم المباشرة"
          }));
          await tx.insert(userPermissions).values(valuesToInsert);
        }

        // 3. تسجيل الإجراء في سجل التدقيق
        try {
          await tx.insert(permissionsAuditLog).values({
            actionType: "sync_user_permissions",
            targetUserId: input.userId,
            performedBy: ctx.user.id,
            reason: "تحديث الصلاحيات الفردية المخصصة للمستخدم بالكامل",
            newValue: JSON.stringify(input.permissions)
          });
        } catch (auditErr) {
          console.warn("[Permissions] Failed to write audit log for sync_user_permissions:", auditErr);
        }
      });

      return { success: true };
    }),

  /**
   * منح صلاحية فردية لمستخدم
   */
  grantPermission: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      permissionId: z.string(),
      reason: z.string(),
      expiresAt: z.date().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل الصلاحيات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(userPermissions).values({
        userId: input.userId,
        permissionId: input.permissionId,
        granted: true,
        grantedBy: ctx.user.id,
        reason: input.reason,
        expiresAt: input.expiresAt
      });

      await logAudit({
        actionType: "grant_permission",
        targetUserId: input.userId,
        permissionId: input.permissionId,
        performedBy: ctx.user.id,
        reason: input.reason
      });

      return { success: true };
    }),

  /**
   * سحب صلاحية من مستخدم
   */
  revokePermission: permissionProcedure("users.edit")
    .input(z.object({
      userId: z.number(),
      permissionId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من صلاحية المنفذ
      if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'system_admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لسحب الصلاحيات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(userPermissions).values({
        userId: input.userId,
        permissionId: input.permissionId,
        granted: false,
        grantedBy: ctx.user.id,
        reason: input.reason
      });

      await logAudit({
        actionType: "revoke_permission",
        targetUserId: input.userId,
        permissionId: input.permissionId,
        performedBy: ctx.user.id,
        reason: input.reason
      });

      return { success: true };
    }),

  /**
   * عرض سجل التدقيق
   */
  getAuditLog: permissionProcedure("permissions.view")
    .input(z.object({
      targetUserId: z.number().optional(),
      limit: z.number().default(50)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let query = db.select().from(permissionsAuditLog);

      if (input.targetUserId) {
        query = query.where(eq(permissionsAuditLog.targetUserId, input.targetUserId)) as any;
      }

      return await query.limit(input.limit).orderBy(sql`${permissionsAuditLog.createdAt} DESC`);
    }),
});
