import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import crypto from "crypto";
import { STAGE_ACTION_CONFIG } from "./shared/stageActionConfig.ts";

dotenv.config();

// دالة تشفير كلمة المرور (PBKDF2)
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seed() {
  console.log("🚀 بدء حقن البيانات الإنتاجية...");

  try {
    // 1. الأدوار (10 أدوار)
    console.log("👥 حقن الأدوار (10 أدوار)...");
    const rolesData = [
      { id: "super_admin", nameAr: "المدير العام", nameEn: "Super Admin", isSystem: true },
      { id: "system_admin", nameAr: "مدير نظام", nameEn: "System Admin", isSystem: true },
      { id: "financial_manager", nameAr: "المدير المالي", nameEn: "Financial Manager", isSystem: true },
      { id: "projects_office", nameAr: "مكتب المشاريع", nameEn: "Projects Office", isSystem: true },
      { id: "field_team", nameAr: "الفريق الميداني", nameEn: "Field Team", isSystem: true },
      { id: "quick_response", nameAr: "فريق الاستجابة السريعة", nameEn: "Quick Response Team", isSystem: true },
      { id: "financial", nameAr: "الإدارة المالية", nameEn: "Financial Management", isSystem: true },
      { id: "project_manager", nameAr: "مدير المشروع", nameEn: "Project Manager", isSystem: true },
      { id: "corporate_comm", nameAr: "الاتصال المؤسسي", nameEn: "Corporate Communications", isSystem: true },
      { id: "service_requester", nameAr: "طالب الخدمة", nameEn: "Service Requester", isSystem: true },
    ];

    for (const r of rolesData) {
      await db.insert(schema.roles).values(r).onDuplicateKeyUpdate({
        set: { nameAr: r.nameAr, nameEn: r.nameEn, isSystem: true }
      });
    }

    // 2. الوحدات (Modules)
    console.log("📦 حقن الوحدات...");
    const modulesData = [
      { id: "requests", nameAr: "الطلبات", nameEn: "Requests", icon: "FileText", displayOrder: 1 },
      { id: "mosques", nameAr: "المساجد", nameEn: "Mosques", icon: "Building2", displayOrder: 2 },
      { id: "projects", nameAr: "المشاريع", nameEn: "Projects", icon: "FolderKanban", displayOrder: 3 },
      { id: "users", nameAr: "المستخدمين", nameEn: "Users", icon: "Users", displayOrder: 4 },
      { id: "permissions", nameAr: "الصلاحيات", nameEn: "Permissions", icon: "Shield", displayOrder: 5 },
      { id: "financial", nameAr: "التقييم والاعتماد المالي", nameEn: "Financial Eval", icon: "DollarSign", displayOrder: 6 },
      { id: "contracts", nameAr: "العقود", nameEn: "Contracts", icon: "FileSignature", displayOrder: 7 },
      { id: "disbursements", nameAr: "الصرف المالي", nameEn: "Disbursements", icon: "Wallet", displayOrder: 8 },
      { id: "suppliers", nameAr: "الموردين", nameEn: "Suppliers", icon: "Truck", displayOrder: 9 },
      { id: "reports", nameAr: "التقارير", nameEn: "Reports", icon: "BarChart", displayOrder: 10 },
      { id: "handovers", nameAr: "الاستلامات", nameEn: "Handovers", icon: "ClipboardCheck", displayOrder: 11 },
      { id: "settings", nameAr: "الإعدادات", nameEn: "Settings", icon: "Settings", displayOrder: 12 },
      { id: "field_visits", nameAr: "الزيارات الميدانية", nameEn: "Field Visits", icon: "MapPin", displayOrder: 13 },
      { id: "quotations", nameAr: "عروض الأسعار", nameEn: "Quotations", icon: "FileSpreadsheet", displayOrder: 14 },
      { id: "analytics", nameAr: "التحليلات", nameEn: "Analytics", icon: "PieChart", displayOrder: 15 },
    ];

    for (const m of modulesData) {
      await db.insert(schema.modules).values(m).onDuplicateKeyUpdate({
        set: { nameAr: m.nameAr, nameEn: m.nameEn, icon: m.icon, displayOrder: m.displayOrder }
      });
    }

    // 3. الصلاحيات (Permissions)
    console.log("🔐 حقن الصلاحيات...");
    const perms = [];
    modulesData.forEach(m => {
      ['view', 'create', 'edit', 'delete', 'approve'].forEach(action => {
        perms.push({
          id: `${m.id}.${action}`,
          moduleId: m.id,
          action,
          nameAr: `${action === 'view' ? 'عرض' : action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : 'اعتماد'} ${m.nameAr}`,
          nameEn: `${action} ${m.nameEn}`
        });
      });
    });

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
      { id: "financial_reports.view", moduleId: "reports", action: "view", nameAr: "عرض تقرير المالية والإحصائيات", nameEn: "View Financial Reports" },
      { id: "financial_reports.export", moduleId: "reports", action: "export", nameAr: "تصدير البيانات", nameEn: "Export Financial Reports" },
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
    perms.push(...customPerms);

    for (const p of perms) {
      await db.insert(schema.permissions).values(p).onDuplicateKeyUpdate({
        set: { nameAr: p.nameAr, nameEn: p.nameEn, moduleId: p.moduleId, action: p.action }
      });
    }

    // 4. حقن صلاحيات الأدوار (Role Permissions)
    console.log("🔗 ربط الصلاحيات بالأدوار...");
    const rolePermissionsMapping = {
      super_admin: "*", // كل الصلاحيات
      system_admin: "*", // كل الصلاحيات
      projects_office: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits", "financial_reports"],
      field_team: ["mosques.view", "requests.view", "requests.view_details", "requests.edit", "field_visits"],
      quick_response: ["requests.view", "requests.view_details", "field_visits.view", "reports.create"],
      financial: ["financial", "quotations", "disbursements", "suppliers.view", "financial_reports", "requests.view", "requests.view_details"],
      financial_manager: ["financial", "quotations", "disbursements", "suppliers", "reports.view", "financial_reports", "requests.view", "requests.view_details"],
      project_manager: ["projects.view", "projects.view_details", "projects.edit", "reports", "disbursements.view", "disbursements.create", "disbursements.edit", "contracts.view", "contracts.create", "contracts.edit", "suppliers.view", "handovers", "requests.view", "requests.create", "requests.view_details"],
      corporate_comm: ["requests.view", "requests.view_details", "reports.view", "settings.view", "analytics.view"],
      service_requester: ["requests.view", "requests.create", "mosques.view"]
    };

    // جلب كل الصلاحيات المتاحة
    const allPermissions = await db.select().from(schema.permissions);
    const allPermIds = allPermissions.map(p => p.id);

    const rolePermsToInsert = [];

    for (const [roleId, permList] of Object.entries(rolePermissionsMapping)) {
      if (permList === "*") {
        allPermIds.forEach(pId => {
          rolePermsToInsert.push({ roleId, permissionId: pId });
        });
      } else {
        // البحث عن الصلاحيات الدقيقة التي تبدأ بالمفاتيح المذكورة
        allPermIds.forEach(pId => {
          const match = permList.some(key => pId === key || pId.startsWith(key + "."));
          if (match) {
            rolePermsToInsert.push({ roleId, permissionId: pId });
          }
        });
      }
    }

    // تقسيم البيانات لمجموعات لتجنب حدود الاستعلام الكبيرة
    const chunkSize = 100;
    for (let i = 0; i < rolePermsToInsert.length; i += chunkSize) {
      const chunk = rolePermsToInsert.slice(i, i + chunkSize);
      await db.insert(schema.rolePermissions).values(chunk).onDuplicateKeyUpdate({
        set: { roleId: sql`role_id` } // تحديث وهمي للحفاظ على الصلاحية
      });
    }

    // 4.5 حقن إعدادات الإجراءات (Action Settings)
    console.log("⚙️ حقن إعدادات الإجراءات...");
    const actionsToInsert = [];
    
    STAGE_ACTION_CONFIG.forEach(stageConfig => {
      stageConfig.actions.forEach((action, index) => {
        actionsToInsert.push({
          actionCode: action.key,
          actionLabel: action.label,
          actionDescription: action.description,
          parentStage: stageConfig.stage,
          order: index + 1,
          route: action.route || null,
          requiredRoles: action.requiredRoles,
          prerequisiteAction: action.prerequisite || null,
          nextAction: action.nextAction || null,
          relationWithNext: action.relation || "after",
          isActive: true,
          icon: null,
          color: null,
        });
      });
    });

    for (const a of actionsToInsert) {
      await db.insert(schema.actionSettings).values(a).onDuplicateKeyUpdate({
        set: {
          actionLabel: a.actionLabel,
          actionDescription: a.actionDescription,
          parentStage: a.parentStage,
          order: a.order,
          route: a.route,
          requiredRoles: a.requiredRoles,
          prerequisiteAction: a.prerequisiteAction,
          nextAction: a.nextAction,
          relationWithNext: a.relationWithNext,
          isActive: a.isActive
        }
      });
    }

    // 5. إعدادات الجمعية الافتراضية
    console.log("🏢 حقن إعدادات الجمعية...");
    const orgSettings = {
      organizationName: "جمعية تمام للعناية بالمساجد",
      organizationNameShort: "تمام",
      licenseNumber: "1234",
      administrativeSupervisor: "وزارة الموارد البشرية والتنمية الاجتماعية",
      technicalSupervisor: "وزارة الشؤون الإسلامية والدعوة والإرشاد",
      boardChairmanName: "فهد بن محمد",
      executiveDirectorName: "أحمد بن علي",
      city: "أبها",
      phone: "920000000",
      email: "info@tamam.sa",
      website: "https://tamam.sa",
      colorPrimary1: "#09707e",
      colorPrimary2: "#0891b2",
    };

    await db.insert(schema.organizationSettings).values(orgSettings).onDuplicateKeyUpdate({
      set: orgSettings
    });

    // 5. مفوض التوقيع
    console.log("✍️ حقن مفوض التوقيع...");
    const signatory = {
      name: "أحمد بن علي",
      title: "المدير التنفيذي",
      isDefault: true,
      isActive: true
    };
    await db.insert(schema.signatories).values(signatory).onDuplicateKeyUpdate({
      set: signatory
    });

    // 6. البنوك، تصنيفات جداول الكميات، المدن ووحدات القياس
    console.log("🏙️ حقن البنوك والتصنيفات والمدن والوحدات في جدول categories...");
    
    const banksList = [
      { name: "Al Ahli Bank", nameAr: "البنك الأهلي السعودي", type: "bank", isActive: true },
      { name: "Al Rajhi Bank", nameAr: "مصرف الراجحي", type: "bank", isActive: true },
      { name: "Riyad Bank", nameAr: "بنك الرياض", type: "bank", isActive: true },
      { name: "Banque Saudi Fransi", nameAr: "البنك السعودي الفرنسي", type: "bank", isActive: true },
      { name: "SABB", nameAr: "البنك السعودي البريطاني (ساب)", type: "bank", isActive: true },
      { name: "Bank Albilad", nameAr: "بنك البلاد", type: "bank", isActive: true },
      { name: "Bank AlJazira", nameAr: "بنك الجزيرة", type: "bank", isActive: true },
      { name: "Arab National Bank", nameAr: "البنك العربي الوطني", type: "bank", isActive: true },
      { name: "Alinma Bank", nameAr: "بنك الإنماء", type: "bank", isActive: true },
      { name: "Alinma Bank (Masraf)", nameAr: "مصرف الإنماء", type: "bank", isActive: true },
      { name: "Gulf International Bank", nameAr: "بنك الخليج الدولي", type: "bank", isActive: true },
      { name: "The Saudi Investment Bank", nameAr: "بنك الاستثمار السعودي", type: "bank", isActive: true }
    ];

    const boqCategoriesList = [
      { name: "Construction Works", nameAr: "أعمال إنشائية", type: "boq_category", isActive: true },
      { name: "Electrical Works", nameAr: "أعمال كهربائية", type: "boq_category", isActive: true },
      { name: "Plumbing Works", nameAr: "أعمال سباكة", type: "boq_category", isActive: true },
      { name: "HVAC", nameAr: "تكييف وتبريد", type: "boq_category", isActive: true },
      { name: "Finishing Works", nameAr: "تشطيبات", type: "boq_category", isActive: true },
      { name: "Carpentry Works", nameAr: "نجارة", type: "boq_category", isActive: true },
      { name: "Painting Works", nameAr: "دهانات", type: "boq_category", isActive: true },
      { name: "Flooring Works", nameAr: "أرضيات", type: "boq_category", isActive: true }
    ];

    const citiesList = [
      { name: "Abha", nameAr: "أبها", type: "city", isActive: true },
      { name: "Khamis Mushait", nameAr: "خميس مشيط", type: "city", isActive: true },
      { name: "Riyadh", nameAr: "الرياض", type: "city", isActive: true },
      { name: "Jeddah", nameAr: "جدة", type: "city", isActive: true },
      { name: "Makkah", nameAr: "مكة المكرمة", type: "city", isActive: true },
      { name: "Madinah", nameAr: "المدينة المنورة", type: "city", isActive: true },
      { name: "Dammam", nameAr: "الدمام", type: "city", isActive: true },
      { name: "Khobar", nameAr: "الخبر", type: "city", isActive: true },
      { name: "Jubail", nameAr: "الجبيل", type: "city", isActive: true },
      { name: "Hofuf", nameAr: "الهفوف", type: "city", isActive: true },
      { name: "Taif", nameAr: "الطائف", type: "city", isActive: true },
      { name: "Tabuk", nameAr: "تبوك", type: "city", isActive: true },
      { name: "Buraydah", nameAr: "بريدة", type: "city", isActive: true },
      { name: "Hail", nameAr: "حائل", type: "city", isActive: true },
      { name: "Najran", nameAr: "نجران", type: "city", isActive: true },
      { name: "Jazan", nameAr: "جازان", type: "city", isActive: true },
      { name: "Al Bahah", nameAr: "الباحة", type: "city", isActive: true },
      { name: "Arar", nameAr: "عرعر", type: "city", isActive: true },
      { name: "Al Jouf", nameAr: "الجوف", type: "city", isActive: true },
      { name: "Yanbu", nameAr: "ينبع", type: "city", isActive: true }
    ];

    const unitsList = [
      { name: "Meter", nameAr: "متر", type: "boq_unit", isActive: true },
      { name: "Square Meter", nameAr: "متر مربع", type: "boq_unit", isActive: true },
      { name: "Cubic Meter", nameAr: "متر مكعب", type: "boq_unit", isActive: true },
      { name: "Kilogram", nameAr: "كيلوغرام", type: "boq_unit", isActive: true },
      { name: "Ton", nameAr: "طن", type: "boq_unit", isActive: true },
      { name: "Piece", nameAr: "حبة", type: "boq_unit", isActive: true },
      { name: "Set", nameAr: "طقم", type: "boq_unit", isActive: true },
      { name: "Liter", nameAr: "لتر", type: "boq_unit", isActive: true },
      { name: "Lump Sum", nameAr: "مقطوعية", type: "boq_unit", isActive: true },
      { name: "Box", nameAr: "كرتون", type: "boq_unit", isActive: true }
    ];

    const allCategoriesList = [...banksList, ...boqCategoriesList, ...citiesList, ...unitsList];

    for (const cat of allCategoriesList) {
      await db.insert(schema.categories).values(cat).onDuplicateKeyUpdate({
        set: { nameAr: cat.nameAr, isActive: true }
      });
    }

    // 7. قوالب العقود
    console.log("📜 حقن قوالب العقود...");
    const templates = [
      { 
        name: "Supervision Contract", 
        nameAr: "عقد إشراف هندسي", 
        type: "supervision", 
        isActive: true, 
        isDefault: true, 
        isSystem: true,
        description: "القالب الافتراضي لعقود الإشراف الهندسي",
        headerTemplate: "نموذج عقد إشراف هندسي - جمعية تمام",
        introTemplate: "إنه في يوم {{contract_date}} الموافق {{contract_date_hijri}} بمدينة {{mosque_city}}، تم الاتفاق بين كل من:\n\nالطرف الأول: {{organization_name}}، ويمثلها في التوقيع {{signatory_name}} بصفته {{signatory_title}}.\n\nالطرف الثاني: {{second_party_name}}، سجل تجاري رقم {{second_party_cr}}، ويمثلها {{second_party_representative}}.",
        footerTemplate: "بوابة تمام للعناية بالمساجد - عقد إشراف هندسي",
        signatureTemplate: "توقيع الطرف الأول: ....................\nتوقيع الطرف الثاني: ...................."
      },
      { name: "Construction Contract", nameAr: "عقد مقاولات إنشائية", type: "construction", isActive: true, isDefault: true, isSystem: true },
      { name: "Supply Contract", nameAr: "عقد توريد", type: "supply", isActive: true, isDefault: true, isSystem: true },
      { name: "Maintenance Contract", nameAr: "عقد صيانة", type: "maintenance", isActive: true, isDefault: true, isSystem: true },
      { name: "Consulting Contract", nameAr: "عقد استشارات", type: "consulting", isActive: true, isDefault: true, isSystem: true }
    ];

    for (const t of templates) {
      await db.insert(schema.contractTemplates).values(t).onDuplicateKeyUpdate({
        set: { 
          isActive: true, 
          isDefault: true, 
          isSystem: true,
          description: t.description || null,
          headerTemplate: t.headerTemplate || null,
          introTemplate: t.introTemplate || null,
          footerTemplate: t.footerTemplate || null,
          signatureTemplate: t.signatureTemplate || null
        }
      });

      // جلب ID القالب المحقون
      const [insertedTemplate] = await db.select().from(schema.contractTemplates).where(sql`${schema.contractTemplates.type} = ${t.type}`).limit(1);
      const templateId = insertedTemplate.id;

      if (t.type === 'supervision') {
        console.log("📝 حقن بنود عقد الإشراف...");
        const supervisionClauses = [
          {
            templateId,
            title: "Article 1",
            titleAr: "المادة الأولى: التزامات الطرف الأول",
            content: "1. تزويد الطرف الثاني بجميع البيانات والمستندات المتعلقة بالمشروع.\n2. دفع قيمة الخدمات المتفق عليها وفقًا للشروط الزمنية المحددة.\n3. إصدار الدفعات حسب مراحل الإنجاز.",
            category: "obligations_first_party",
            orderIndex: 1,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 2",
            titleAr: "المادة الثانية: التزامات الطرف الثاني",
            content: "1. إصدار التراخيص المطلوبة.\n2. اعتماد كافة المخططات من كل الجهات ذات العلاقة.\n3. تقديم الدراسات الفنية والمخططات المطلوبة وفقًا للمعايير الهندسية.\n4. الالتزام بتسليم الأعمال ضمن الجدول الزمني المحدد.\n5. استخراج التراخيص في نطاق المنطقة.\n6. إجراء التعديلات المطلوبة خلال مدة زمنية محددة.\n7. المحافظة على سرية المعلومات والبيانات المقدمة.\n8. الالتزام بمعايير الجودة والسلامة.",
            category: "obligations_second_party",
            orderIndex: 2,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 3",
            titleAr: "المادة الثالثة: مدة العقد",
            content: "مدة العقد هي {{duration}} {{duration_unit}} تبدأ من تاريخ توقيع هذا العقد.",
            category: "duration",
            orderIndex: 3,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 4",
            titleAr: "المادة الرابعة: قيمة العقد والدفعات",
            content: "القيمة الإجمالية لهذا العقد هي {{contract_amount}} ريال سعودي ({{contract_amount_text}})، تُصرف كدفعات مالية حسب جدول الدفعات المعتمد.",
            category: "financial",
            orderIndex: 4,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 5",
            titleAr: "المادة الخامسة: تعديل العقد",
            content: "1. لا يجوز تعديل أي بند من بنود هذا العقد إلا بموافقة الطرفين كتابياً على التعديل.\n2. يتم إضافة أي بنود إضافية لهذا العقد لملاحق العقد بعد التوقيع عليها من الطرفين.\n3. يشار في الملاحق التي تتبع التوقيع على هذا العقد إلى هذا العقد لإيضاح العمل المنفذ وإثباته.",
            category: "modifications",
            orderIndex: 5,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 6",
            titleAr: "المادة السادسة: الإشعارات والمراسلات",
            content: "1. تتم الإشعارات والمراسلات بين الطرفين كتابياً بواسطة البريد الرسمي أو التسليم باليد بوجود تأكيد خطي على الاستلام أو عبر البريد الإلكتروني أو الفاكس مع تأكيد الاستلام على العناوين المحددة في صدر هذا العقد.\n2. تُعد الإشعارات والمراسلات المرسلة عبر الطرق المحددة صحيحة ومنتجة لكافة آثارها.\n3. في حال قام أحد الطرفين بتغيير عنوانه فيلزم إشعار الطرف الآخر رسمياً بعنوانه الجديد ويكون العنوان الجديد والموضح من الطرف المعني هو العنوان الصحيح وكذلك ضابط الاتصال.",
            category: "notifications",
            orderIndex: 6,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 7",
            titleAr: "المادة السابعة: أحكام عامة",
            content: "1. يتم البدء بالعمل بهذا العقد بموجب التوقيع عليه من قبل الطرفين.\n2. يلتزم الطرف الثاني بتنفيذ الأعمال المطلوبة منه وفق الأصول المتبعة وبأفضل جودة وخلال الفترة الزمنية المحددة بالعقد.\n3. تخضع هذه الاتفاقية لموافقة الطرفين كتابياً في جميع أعمالها والتزامهما بالعمل ضمن بنودها أو الملاحق الموافق عليها خطياً.",
            category: "general",
            orderIndex: 7,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 8",
            titleAr: "المادة الثامنة: سرية المعلومات",
            content: "يتعهد الطرفان بالحفاظ على سرية المعلومات التي تتوفر لديهما بسبب تطبيق هذه الاتفاقية سواءً كانت شفوية أو مكتوبة ولا يجوز إفشاء هذه الأسرار لأي طرف ثالث إلا بعد الحصول على موافقة خطية مسبقة من الطرف الآخر.",
            category: "confidentiality",
            orderIndex: 8,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 9",
            titleAr: "المادة التاسعة: حقوق الملكية الفكرية",
            content: "يلتزم الطرفين بمراعاة حقوق الملكية الفكرية والأدبية الخاصة أو المملوكة للطرف الآخر وعدم التعدي عليها، كما لا تعطي هذه الاتفاقية أياً من الطرفين أي حقوق تجاه حقوق الملكية الفكرية المملوكة للطرف الآخر.",
            category: "intellectual_property",
            orderIndex: 9,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 10",
            titleAr: "المادة العاشرة: حل المنازعات",
            content: "1. في حال حدوث أي خلاف بين الطرفين حول تفسير أو تنفيذ أي بند من بنود هذه الاتفاقية أو ملحقاتها يتم حله بالطرق الودية، فإن تعذر ذلك فيكون الاختصاص للجهات الرسمية وفقاً لأحكام القانون والنظام السعودي.\n2. تخضع هذه الاتفاقية للأنظمة المعمول بها في المملكة العربية السعودية، وفي حالة نشوء أي نزاع بين الطرفين حول أحكام هذه الاتفاقية يعملان على حلّه ودياً، وإذا تعذر ذلك فيعالج النزاع وفقاً للمحكمة المختصة مكانياً وولائياً.",
            category: "disputes",
            orderIndex: 10,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 11",
            titleAr: "المادة الحادية عشر: نُسخ الاتفاقية",
            content: "حررت هذه الاتفاقية من نسختين ويُسلم كل طرف نسخة للعمل بموجبها، وتوثيقاً لما تقدم فقد جرى التوقيع على هذه الاتفاقية في التاريخ المبين في مقدمتها.",
            category: "copies",
            orderIndex: 11,
            isRequired: true,
            isEditable: false
          }
        ];

        for (const clause of supervisionClauses) {
          await db.insert(schema.contractClauses).values(clause).onDuplicateKeyUpdate({
            set: { 
              content: clause.content, 
              titleAr: clause.titleAr, 
              category: clause.category,
              orderIndex: clause.orderIndex,
              isRequired: clause.isRequired,
              isEditable: clause.isEditable
            }
          });
        }
      }
    }

    // 8. البرامج الأساسية (Programs)
    console.log("🛠️ حقن البرامج الأساسية (9 برامج)...");
    const programsData = [
      {
        id: "bunyan",
        name: "بنيان",
        description: "بناء مساجد جديدة",
        color: "bg-blue-600",
        icon: "Building2",
        requiresMosque: false,
        isActive: true,
      },
      {
        id: "daaem",
        name: "دعائم",
        description: "استكمال المساجد المتعثرة",
        color: "bg-purple-600",
        icon: "Hammer",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "enaya",
        name: "عناية",
        description: "الصيانة والترميم",
        color: "bg-green-600",
        icon: "Wrench",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "emdad",
        name: "إمداد",
        description: "توفير تجهيزات المساجد",
        color: "bg-orange-600",
        icon: "Package",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "ethraa",
        name: "إثراء",
        description: "سداد فواتير الخدمات",
        color: "bg-red-600",
        icon: "Receipt",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "sedana",
        name: "سدانة",
        description: "خدمات التشغيل والنظافة",
        color: "bg-cyan-600",
        icon: "Sparkles",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "taqa",
        name: "طاقة",
        description: "الطاقة الشمسية",
        color: "bg-amber-500",
        icon: "Sun",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "miyah",
        name: "مياه",
        description: "أنظمة المياه",
        color: "bg-sky-600",
        icon: "Droplets",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "suqya",
        name: "سقيا",
        description: "توفير ماء الشرب",
        color: "bg-teal-600",
        icon: "GlassWater",
        requiresMosque: true,
        isActive: true,
      },
    ];

    for (const p of programsData) {
      await db.insert(schema.programs).values(p).onDuplicateKeyUpdate({
        set: {
          name: p.name,
          description: p.description,
          color: p.color,
          icon: p.icon,
          requiresMosque: p.requiresMosque,
          isActive: p.isActive,
        },
      });
    }

    // 9. حساب المدير الافتراضي (Admin)
    console.log("🔑 إنشاء حساب المدير الافتراضي...");
    const adminEmail = "admin@tamam.sa";
    const adminPassword = "Admin@123456";
    const salt = generateSalt();
    const passwordHash = `${salt}:${hashPassword(adminPassword, salt)}`;

    const adminUser = {
      email: adminEmail,
      passwordHash: passwordHash,
      name: "مدير النظام",
      role: "super_admin",
      status: "active",
      loginMethod: "local"
    };

    await db.insert(schema.users).values(adminUser).onDuplicateKeyUpdate({
      set: { passwordHash: passwordHash, role: "super_admin", status: "active" }
    });

    console.log("\n✅ تمت عملية حقن البيانات بنجاح!");
    console.log("-----------------------------------");
    console.log(`📧 البريد الإلكتروني: ${adminEmail}`);
    console.log(`🔑 كلمة المرور: ${adminPassword}`);
    console.log("-----------------------------------");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن البيانات:", error);
  } finally {
    await connection.end();
  }
}

seed();
