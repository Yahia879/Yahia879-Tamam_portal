import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function runOnDatabase(dbName: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 Running Full Schema Sync on [${dbName}]...`);
  console.log(`======================================================\n`);

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: dbName,
  });

  try {
    // SEED MODULES & PERMISSIONS
    console.log('--- Seeding Modules and Permissions ---');
    const defaultModules = [
      { id: 'boq', nameAr: 'إعداد جداول الكميات', nameEn: 'BOQ Preparation', icon: 'FileSpreadsheet', displayOrder: 10, isActive: 1 },
      { id: 'pending_reports', nameAr: 'تقارير الطلبات', nameEn: 'Request Reports', icon: 'FileText', displayOrder: 11, isActive: 1 },
      { id: 'technical_support', nameAr: 'الدعم الفني', nameEn: 'Technical Support', icon: 'LifeBuoy', displayOrder: 12, isActive: 1 },
    ];

    for (const m of defaultModules) {
      const [existing]: any = await connection.query(`SELECT id FROM modules WHERE id = ?`, [m.id]);
      if (existing.length === 0) {
        console.log(`➕ Inserting module: ${m.id}`);
        await connection.query(
          `INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [m.id, m.nameAr, m.nameEn, m.icon, m.displayOrder, m.isActive]
        );
      }
    }

    const customPerms = [
      { id: "Create_Ticket", moduleId: "technical_support", action: "create", nameAr: "إنشاء تذكرة دعم فني", nameEn: "Create Support Ticket" },
      { id: "View_Tickets", moduleId: "technical_support", action: "view", nameAr: "عرض تذاكر الدعم الفني", nameEn: "View Support Tickets" },
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
      { id: "projects.assign_as_manager", moduleId: "projects", action: "assign_as_manager", nameAr: "تعيين كمدير للمشاريع", nameEn: "Assign as Project Manager" },
      { id: "projects.financials", moduleId: "projects", action: "financials", nameAr: "مالية المشاريع", nameEn: "Project Financials" },
      { id: "disbursement_orders.create_direct", moduleId: "disbursements", action: "create_direct", nameAr: "انشاء امر صرف مخصص", nameEn: "Create Direct Disbursement Order" },
      { id: "receipt_vouchers.view", moduleId: "disbursements", action: "view", nameAr: "عرض سندات القبض", nameEn: "View Receipt Vouchers" },
      { id: "receipt_vouchers.edit", moduleId: "disbursements", action: "edit", nameAr: "تعديل سند القبض", nameEn: "Edit Receipt Voucher" },
      { id: "requests.create_quick_request", moduleId: "requests", action: "create_quick_request", nameAr: "إنشاء طلب سريع", nameEn: "Create Quick Request" },
    ];

    for (const p of customPerms) {
      const [existing]: any = await connection.query(`SELECT id FROM permissions WHERE id = ?`, [p.id]);
      if (existing.length === 0) {
        console.log(`➕ Inserting custom permission: ${p.id} (${p.nameAr})`);
        await connection.query(
          `INSERT INTO permissions (id, module_id, action, name_ar, name_en)
           VALUES (?, ?, ?, ?, ?)`,
          [p.id, p.moduleId, p.action, p.nameAr, p.nameEn]
        );
      } else {
        await connection.query(
          `UPDATE permissions SET name_ar = ?, name_en = ?, module_id = ?, action = ? WHERE id = ?`,
          [p.nameAr, p.nameEn, p.moduleId, p.action, p.id]
        );
      }
    }

    console.log(`\n🎉 [${dbName}] Synchronization completed successfully!`);
  } catch (error) {
    console.error(`❌ Migration Error on [${dbName}]:`, error);
  } finally {
    await connection.end();
  }
}

async function main() {
  await runOnDatabase('tamamgatemanarah_portal');
  await runOnDatabase('test_temam');
}

main().catch(console.error);
