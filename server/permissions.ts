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
  staff_management: [
    "permissions.view", "permissions.create", "permissions.edit", "permissions.delete",
    "users.view", "users.edit", "users.create", "users.delete",
  ],
  mosques: ["mosques.view", "mosques.create", "mosques.edit", "mosques.delete", "mosques.approve"],
  mosques_map: ["mosque_map.view"],
  requests: ["requests.view", "requests.create", "requests.edit", "requests.delete", "requests.view_details"],
  "requests.view": ["requests.view"],
  "requests.create": ["requests.create"],
  "requests.view_details": ["requests.view", "requests.edit", "requests.delete", "requests.view_details"],
  appointments_calendar: ["field_visits.view", "appointments.view"],
  projects: ["projects.view", "projects.view_details"],
  "projects.view": ["projects.view"],
  "projects.view_details": ["projects.view", "projects.view_details"],
  service_requester_accounts: ["users.view", "users.edit"],
  suppliers: [
    "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.delete", 
    "suppliers.approve", "suppliers.reject", "suppliers.suspend"
  ],
  quotations: ["quotations.view", "quotations.create", "quotations.edit", "quotations.approve"],
  financial_approval: ["financial.view", "financial.approve", "financial.reject"],
  contracts: ["contracts.view", "contracts.create", "contracts.edit", "contracts.delete", "contracts.approve"],
  disbursement_requests: ["disbursements.view", "disbursements.create", "disbursements.edit", "disbursements.approve"],
  disbursement_orders: ["disbursements.view", "disbursements.create", "disbursements.approve"],
  progress_reports: ["reports.view", "reports.create"],
  financial_report: ["reports.view"],
  settings_center: ["settings.view", "settings.edit"],
  programs_services: ["settings.view", "settings.edit"],
  corporate_comm: ["requests.view", "reports.view", "settings.view"],
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

  "financial_approval.view": ["financial.view"],
  "financial_approval.approve": ["financial.approve"],

  "quotations.view": ["quotations.view"],
  "quotations.add": ["quotations.create"],
  "quotations.approve": ["quotations.approve"],

  "contracts.view": ["contracts.view"],
  "contracts.create": ["contracts.create"],
  "contracts.template_add": ["contracts.create"],
  "contracts.template_edit": ["contracts.edit"],
  "contracts.template_delete": ["contracts.delete"],
  "contracts.clause_add": ["contracts.create"],

  "disbursement_orders.view": ["disbursement_orders.view_details"],
  "disbursement_orders.approve": ["financial.approve"],
  "disbursement_orders.reject": ["financial.approve"],
  "disbursement_orders.view_details": ["disbursement_orders.view_details"],

  financial_reports: ["financial_reports.view"],
  "financial_reports.view": ["financial_reports.view"],
  "financial_reports.export": ["financial_reports.export"],
  "financial_reports.analytics": ["financial_reports.analytics"],

  "progress_reports.view": ["progress_reports.view"],
  "progress_reports.add": ["progress_reports.add"],
  "progress_reports.edit": ["progress_reports.edit"],
  "progress_reports.approve": ["progress_reports.approve"],
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
    // نقوم بذلك فقط في المرة الأولى (إذا كانت الصلاحيات غير موجودة مسبقاً) لتجنب الكتابة فوق اختيارات المستخدمين لاحقاً
    if (isFirstTime) {
      const defaultMappings: Record<string, string[]> = {
        projects_office: ["requests.view", "requests.create", "requests.view_details"],
        field_team: ["requests.view", "requests.view_details"],
        quick_response: ["requests.view", "requests.view_details"],
        financial_manager: ["requests.view", "requests.view_details"],
        project_manager: ["requests.view", "requests.create", "requests.view_details"],
        corporate_comm: ["requests.view", "requests.view_details"],
      };

      for (const [roleId, permIds] of Object.entries(defaultMappings)) {
        const [roleExists] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
        if (!roleExists) continue;

        const existingRolePerms = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, roleId),
            inArray(rolePermissions.permissionId, ["requests.view", "requests.create", "requests.view_details"])
          ));

        if (existingRolePerms.length === 0) {
          const valuesToInsert = permIds.map(permId => ({
            roleId,
            permissionId: permId
          }));
          await db.insert(rolePermissions).values(valuesToInsert);
          console.log(`Migrated role ${roleId} with permissions: ${permIds.join(", ")}`);
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
}

/**
 * دالة للتأكد من وجود جميع الصلاحيات المخصصة الأخرى في قاعدة البيانات لتجنب أخطاء المفاتيح الأجنبية
 */
async function ensureAllCustomPermissionsExist(db: any) {
  try {
    const customPerms = [
      { id: "mosque_map.view", moduleId: "mosques", action: "view", nameAr: "عرض خريطة المساجد", nameEn: "View Mosque Map" },
      { id: "requests.view_details", moduleId: "requests", action: "view_details", nameAr: "عرض تفاصيل الطلب وإدارته", nameEn: "View Request Details" },
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
      { id: "disbursements.add", moduleId: "disbursements", action: "add", nameAr: "إنشاء طلب صرف", nameEn: "Create Disbursement" },
      { id: "disbursement_orders.view", moduleId: "disbursements", action: "view", nameAr: "عرض أوامر الصرف", nameEn: "View Disbursement Orders" },
      { id: "disbursement_orders.approve", moduleId: "disbursements", action: "approve", nameAr: "اعتماد أوامر الصرف", nameEn: "Approve Disbursement Orders" },
      { id: "disbursement_orders.reject", moduleId: "disbursements", action: "reject", nameAr: "رفض أوامر الصرف", nameEn: "Reject Disbursement Orders" },
      { id: "progress_reports.view", moduleId: "reports", action: "view", nameAr: "عرض تقارير الإنجاز", nameEn: "View Progress Reports" },
      { id: "progress_reports.add", moduleId: "reports", action: "add", nameAr: "إضافة تقرير إنجاز", nameEn: "Add Progress Report" },
      { id: "progress_reports.edit", moduleId: "reports", action: "edit", nameAr: "تعديل التقرير", nameEn: "Edit Progress Report" },
      { id: "progress_reports.approve", moduleId: "reports", action: "approve", nameAr: "اعتماد تقارير المتابعة", nameEn: "Approve Progress Reports" },
      { id: "financial_reports.view", moduleId: "reports", action: "view", nameAr: "عرض التقارير المالية", nameEn: "View Financial Reports" },
      { id: "financial_reports.export", moduleId: "reports", action: "export", nameAr: "تصدير البيانات المالية", nameEn: "Export Financial Reports" },
      { id: "financial_reports.analytics", moduleId: "reports", action: "analytics", nameAr: "تحليل مؤشرات الأداء", nameEn: "Analyze Financial Performance" },
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
    const allPerms = await db.select({ id: permissions.id }).from(permissions);
    // يحصلان أيضاً على جميع الصلاحيات الموسعة
    const expandedSet = new Set(allPerms.map(p => p.id));
    Object.keys(PERMISSION_EXPANSION).forEach(k => expandedSet.add(k));
    Object.values(PERMISSION_EXPANSION).forEach(subs => subs.forEach(s => expandedSet.add(s)));
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
    const allAvailablePerms = await db.select({ id: permissions.id }).from(permissions);
    allAvailablePerms.forEach(p => allPermissions.add(p.id));
  }

  // توسيع الصلاحيات البسيطة إلى صلاحيات دقيقة لجميع الصلاحيات المجمعة
  const permissionsToExpand = Array.from(allPermissions);
  for (const perm of permissionsToExpand) {
    const expanded = PERMISSION_EXPANSION[perm];
    if (expanded) {
      expanded.forEach(sub => allPermissions.add(sub));
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
  }
  if (allPermissions.has("disbursement_orders.view")) {
    allPermissions.add("disbursement_orders.view_details");
  }
  if (allPermissions.has("mosque_map.view")) {
    allPermissions.add("mosque_map");
    allPermissions.add("mosques_map");
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
  }
  if (allPermissions.has("users.view") || allPermissions.has("requesters.view") || allPermissions.has("requesters.approve")) {
    allPermissions.add("requesters");
    allPermissions.add("service_requester_accounts");
  }
  // Mapping granular database permissions back to UI keys for compatibility
  if (allPermissions.has("users.view")) {
    allPermissions.add("staff_users.view");
  }
  if (allPermissions.has("permissions.view")) {
    allPermissions.add("staff_roles.view");
    allPermissions.add("staff_custom_roles.view");
  }

  if (
    allPermissions.has("users.view") ||
    allPermissions.has("staff_users.view") ||
    allPermissions.has("staff_roles.view") ||
    allPermissions.has("staff_custom_roles.view")
  ) {
    allPermissions.add("staff");
    allPermissions.add("staff_management");
  }
  if (allPermissions.has("suppliers.view") || allPermissions.has("suppliers.view_details") || allPermissions.has("suppliers.add") || allPermissions.has("suppliers.approve")) {
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
    allPermissions.has("disbursements.edit") ||
    allPermissions.has("disbursements.delete") ||
    allPermissions.has("disbursements.approve")
  ) {
    allPermissions.add("disbursements");
    allPermissions.add("disbursement_requests");
  }
  if (
    allPermissions.has("disbursement_orders.view") ||
    allPermissions.has("disbursement_orders.approve") ||
    allPermissions.has("disbursement_orders.reject") ||
    allPermissions.has("disbursement_orders.view_details")
  ) {
    allPermissions.add("disbursement_orders");
  }
  if (
    allPermissions.has("reports.view") ||
    allPermissions.has("progress_reports.view") ||
    allPermissions.has("progress_reports.add") ||
    allPermissions.has("progress_reports.edit") ||
    allPermissions.has("progress_reports.approve")
  ) {
    allPermissions.add("progress_reports");
  }
  if (
    allPermissions.has("reports.view") ||
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
        projects_office: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits"],
        field_team: ["mosques.view", "requests.view", "requests.edit", "requests.view_details", "field_visits"],
        quick_response: ["requests.view", "requests.view_details", "field_visits.view", "reports.create"],
        financial: ["financial", "quotations", "disbursements", "suppliers.view"],
        financial_manager: ["financial", "quotations", "disbursements", "suppliers", "reports.view"],
        project_manager: ["projects.view", "projects.edit", "reports", "disbursements.view", "disbursements.create", "disbursements.edit", "contracts.view", "contracts.create", "contracts.edit", "suppliers.view", "handovers"],
        corporate_comm: ["requests.view", "requests.view_details", "reports.view", "settings.view", "analytics.view"],
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

      // إذا كان المستخدم super_admin أو system_admin، نمنحه جميع الصلاحيات افتراضياً
      if (roleIds.includes('super_admin') || roleIds.includes('system_admin')) {
        const allPerms = await db.select({ id: permissions.id }).from(permissions);
        allPerms.forEach(p => permsSet.add(p.id));
        Object.keys(PERMISSION_EXPANSION).forEach(k => permsSet.add(k));
        Object.values(PERMISSION_EXPANSION).forEach(subs => subs.forEach(s => permsSet.add(s)));
      }

      // إسناد صلاحيات تلقائية للأدوار الأساسية
      if (roleIds.includes("service_requester")) {
        permsSet.add("requests.create");
        permsSet.add("requests.view");
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
      for (const perm of permsArray) {
        const expanded = PERMISSION_EXPANSION[perm];
        if (expanded) {
          expanded.forEach(sub => permsSet.add(sub));
        }
      }

      // Mapping granular database permissions back to UI keys for compatibility
      if (permsSet.has("users.view")) {
        permsSet.add("staff_users.view");
      }
      if (permsSet.has("permissions.view")) {
        permsSet.add("staff_roles.view");
        permsSet.add("staff_custom_roles.view");
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
        await tx.insert(permissionsAuditLog).values({
          actionType: "sync_user_permissions",
          targetUserId: input.userId,
          performedBy: ctx.user.id,
          reason: "تحديث الصلاحيات الفردية المخصصة للمستخدم بالكامل",
          newValue: JSON.stringify(input.permissions)
        });
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
