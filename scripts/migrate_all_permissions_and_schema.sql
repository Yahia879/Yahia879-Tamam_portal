-- ==============================================================================
-- سكربت تحديث قاعدة البيانات وترحيل الصلاحيات للأدوار والمستخدمين
-- متوافق مع: تمام - بوابة منارة
-- المقارنة تمت بين Commit: 95ec3f02e576e7d4871f69af69812b8f9a8ee899 والكود الحالي
-- وفحص قاعدة البيانات: tamamgatemanarah_portal (74).sql
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- القسم 1: تعديلات هيكل الجداول (Schema DDL)
-- إضافة أعمدة التوقيع الرقمي وحفظ المستندات (IF NOT EXISTS تمنع أي أخطاء تكرار)
-- ------------------------------------------------------------------------------

-- 1. جدول طلبات المساجد (mosque_requests)
ALTER TABLE `mosque_requests`
  ADD COLUMN IF NOT EXISTS `signatureName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureDepartment` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureUrl` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `showSignatureInDocuments` TINYINT(1) NOT NULL DEFAULT 1;

-- 2. جدول العقود المطورة (contracts_enhanced)
ALTER TABLE `contracts_enhanced`
  ADD COLUMN IF NOT EXISTS `firstPartySignatoryName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `firstPartySignatoryTitle` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `firstPartySignatureUrl` TEXT DEFAULT NULL;

-- 3. جدول أوامر الصرف (disbursement_orders)
ALTER TABLE `disbursement_orders`
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureName` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureDepartment` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureUrl` TEXT DEFAULT NULL;

-- 4. جدول طلبات الصرف (disbursement_requests)
ALTER TABLE `disbursement_requests`
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureName` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureDepartment` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureUrl` TEXT DEFAULT NULL;

-- 5. جدول سندات القبض (receipt_vouchers)
ALTER TABLE `receipt_vouchers`
  ADD COLUMN IF NOT EXISTS `signatureName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureDepartment` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureUrl` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `showSignatureInDocuments` TINYINT(1) NOT NULL DEFAULT 1;


-- ------------------------------------------------------------------------------
-- القسم 2: تسجيل الصلاحيات الجديدة في جدول `permissions`
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`, `description`) VALUES
-- قسم العقود
('contracts.edit', 'contracts', 'edit', 'تعديل بيانات العقد', 'Edit Contract', 'إمكانية تعديل بيانات العقود غير المعتمدة'),
('contracts.export', 'contracts', 'export', 'تصدير وطباعة العقود', 'Export & Print Contracts', 'تصدير وطباعة العقود في المعاينة'),

-- قسم قوالب العقود
('contracts.template_view', 'contracts', 'template_view', 'عرض قوالب العقود', 'View Contract Templates', 'استعراض قسم قوالب العقود'),
('contracts.preamble_add', 'contracts', 'preamble_add', 'إضافة تمهيد', 'Add Preamble', 'إضافة تمهيد لقوالب العقود'),
('contracts.preamble_edit', 'contracts', 'preamble_edit', 'تعديل التمهيد', 'Edit Preamble', 'تعديل التمهيد في قوالب العقود'),
('contracts.clause_edit', 'contracts', 'clause_edit', 'تعديل بنود القالب', 'Edit Template Clauses', 'تعديل بنود قالب العقد'),
('contracts.clause_delete', 'contracts', 'clause_delete', 'حذف بنود القالب', 'Delete Template Clauses', 'حذف بنود قالب العقد'),

-- قسم طلبات الصرف
('disbursements.create_project_linked', 'disbursements', 'create_project_linked', 'إنشاء طلب صرف مرتبط بتقرير انجاز أو مستخلص معتمد', 'Create Project Linked Disbursement', 'إنشاء طلب صرف مرتبط بتقرير إنجاز أو مستخلص'),
('disbursements.create_donation', 'disbursements', 'create_donation', 'إنشاء طلب صرف لفرصة تبرع', 'Create Donation Disbursement', 'إنشاء طلب صرف لفرصة تبرع'),
('disbursements.create_tamam_platform', 'disbursements', 'create_tamam_platform', 'إنشاء طلب صرف مرتبط بالمنصة السابقة', 'Create Tamam Platform Disbursement', 'إنشاء طلب صرف مرتبط بالمنصة السابقة'),
('disbursements.export', 'disbursements', 'export', 'تصدير بيانات طلبات الصرف', 'Export Disbursements', 'تصدير بيانات طلبات الصرف إلى ملف Excel'),

-- قسم سندات القبض
('receipt_vouchers.create_project', 'receipt_vouchers', 'create_project', 'تسجيل سند قبض مرتبط بمشروع موجود', 'Create Project Receipt Voucher', 'تسجيل سند قبض مرتبط بمشروع'),
('receipt_vouchers.create_restricted', 'receipt_vouchers', 'create_restricted', 'تسجيل سند قبض مقيد', 'Create Restricted Receipt Voucher', 'تسجيل سند قبض مقيد'),
('receipt_vouchers.create_unrestricted', 'receipt_vouchers', 'create_unrestricted', 'تسجيل سند قبض غير مقيد', 'Create Unrestricted Receipt Voucher', 'تسجيل سند قبض غير مقيد'),
('receipt_vouchers.print', 'receipt_vouchers', 'print', 'طباعة سند القبض', 'Print Receipt Voucher', 'طباعة سند القبض'),

-- قسم أوامر الصرف
('disbursement_orders.create_custom', 'disbursement_orders', 'create_custom', 'إنشاء أمر صرف مخصص', 'Create Custom Disbursement Order', 'إنشاء أمر صرف مخصص جديد'),
('disbursement_orders.export', 'disbursement_orders', 'export', 'تصدير أوامر الصرف', 'Export Disbursement Orders', 'تصدير أوامر الصرف إلى ملف Excel'),

-- قسم الصندوق
('fund.export', 'fund', 'export', 'عرض سجلات حركات الصندوق', 'Export Fund Movements', 'عرض واستخراج سجلات حركات الصندوق'),

-- قسم التقرير المالي
('financial_reports.projects', 'financial_reports', 'projects', 'عرض تقارير المشاريع', 'View Projects Report', 'عرض تقارير المشاريع المالية'),
('financial_reports.disbursements', 'financial_reports', 'disbursements', 'عرض تقارير طلبات الصرف', 'View Disbursements Report', 'عرض تقارير طلبات الصرف'),
('financial_reports.contracts', 'financial_reports', 'contracts', 'عرض تقارير العقود', 'View Contracts Report', 'عرض تقارير العقود'),
('financial_reports.disbursement_orders', 'financial_reports', 'disbursement_orders', 'عرض تقارير أوامر الصرف', 'View Disbursement Orders Report', 'عرض تقارير أوامر الصرف'),
('financial_reports.receipt_vouchers', 'financial_reports', 'receipt_vouchers', 'عرض تقارير سندات القبض', 'View Receipt Vouchers Report', 'عرض تقارير سندات القبض'),

-- قسم العهدة المالية
('custody_requests.request_exception', 'custody_requests', 'request_exception', 'طلب استثناء', 'Request Exception', 'طلب استثناء للعهدة المالية'),

-- قسم الاعتمادات
('financial_approval.view', 'financial_approval', 'view', 'عرض قسم الاعتمادات', 'View Financial Approval', 'عرض قسم الاعتمادات في القائمة الجانبية');


-- ------------------------------------------------------------------------------
-- القسم 3: إسناد الصلاحيات الجديدة للأدوار (Role Permissions)
-- مبني على الأدوار في قاعدة البيانات التي كانت تملك الصلاحيات الأساسية
-- ------------------------------------------------------------------------------

-- 1. الأدوار الإدارية العليا: super_admin و system_admin (جميع الصلاحيات الجديدة)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('super_admin', 'contracts.edit'),
('super_admin', 'contracts.export'),
('super_admin', 'contracts.template_view'),
('super_admin', 'contracts.preamble_add'),
('super_admin', 'contracts.preamble_edit'),
('super_admin', 'contracts.clause_edit'),
('super_admin', 'contracts.clause_delete'),
('super_admin', 'disbursements.create_project_linked'),
('super_admin', 'disbursements.create_donation'),
('super_admin', 'disbursements.create_tamam_platform'),
('super_admin', 'disbursements.export'),
('super_admin', 'receipt_vouchers.create_project'),
('super_admin', 'receipt_vouchers.create_restricted'),
('super_admin', 'receipt_vouchers.create_unrestricted'),
('super_admin', 'receipt_vouchers.print'),
('super_admin', 'disbursement_orders.create_custom'),
('super_admin', 'disbursement_orders.export'),
('super_admin', 'fund.export'),
('super_admin', 'financial_reports.projects'),
('super_admin', 'financial_reports.disbursements'),
('super_admin', 'financial_reports.contracts'),
('super_admin', 'financial_reports.disbursement_orders'),
('super_admin', 'financial_reports.receipt_vouchers'),
('super_admin', 'custody_requests.request_exception'),

('system_admin', 'contracts.edit'),
('system_admin', 'contracts.export'),
('system_admin', 'contracts.template_view'),
('system_admin', 'contracts.preamble_add'),
('system_admin', 'contracts.preamble_edit'),
('system_admin', 'contracts.clause_edit'),
('system_admin', 'contracts.clause_delete'),
('system_admin', 'disbursements.create_project_linked'),
('system_admin', 'disbursements.create_donation'),
('system_admin', 'disbursements.create_tamam_platform'),
('system_admin', 'disbursements.export'),
('system_admin', 'receipt_vouchers.create_project'),
('system_admin', 'receipt_vouchers.create_restricted'),
('system_admin', 'receipt_vouchers.create_unrestricted'),
('system_admin', 'receipt_vouchers.print'),
('system_admin', 'disbursement_orders.create_custom'),
('system_admin', 'disbursement_orders.export'),
('system_admin', 'fund.export'),
('system_admin', 'financial_reports.projects'),
('system_admin', 'financial_reports.disbursements'),
('system_admin', 'financial_reports.contracts'),
('system_admin', 'financial_reports.disbursement_orders'),
('system_admin', 'financial_reports.receipt_vouchers'),
('system_admin', 'custody_requests.request_exception');

-- 2. دور المسؤول المالي (financial)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('financial', 'contracts.edit'),
('financial', 'contracts.export'),
('financial', 'contracts.template_view'),
('financial', 'contracts.preamble_add'),
('financial', 'contracts.preamble_edit'),
('financial', 'contracts.clause_edit'),
('financial', 'contracts.clause_delete'),
('financial', 'disbursements.create_project_linked'),
('financial', 'disbursements.create_donation'),
('financial', 'disbursements.create_tamam_platform'),
('financial', 'disbursements.export'),
('financial', 'receipt_vouchers.create_project'),
('financial', 'receipt_vouchers.create_restricted'),
('financial', 'receipt_vouchers.create_unrestricted'),
('financial', 'receipt_vouchers.print'),
('financial', 'disbursement_orders.create_custom'),
('financial', 'disbursement_orders.export'),
('financial', 'fund.export'),
('financial', 'financial_reports.projects'),
('financial', 'financial_reports.disbursements'),
('financial', 'financial_reports.contracts'),
('financial', 'financial_reports.disbursement_orders'),
('financial', 'financial_reports.receipt_vouchers'),
('financial', 'custody_requests.request_exception');

-- 3. دور المدير المالي (financial_manager)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('financial_manager', 'disbursements.create_project_linked'),
('financial_manager', 'disbursements.create_donation'),
('financial_manager', 'disbursements.create_tamam_platform'),
('financial_manager', 'disbursements.export'),
('financial_manager', 'receipt_vouchers.create_project'),
('financial_manager', 'receipt_vouchers.create_restricted'),
('financial_manager', 'receipt_vouchers.create_unrestricted'),
('financial_manager', 'receipt_vouchers.print'),
('financial_manager', 'disbursement_orders.export'),
('financial_manager', 'financial_reports.projects'),
('financial_manager', 'financial_reports.disbursements'),
('financial_manager', 'financial_reports.contracts'),
('financial_manager', 'financial_reports.disbursement_orders'),
('financial_manager', 'financial_reports.receipt_vouchers'),
('financial_manager', 'custody_requests.request_exception');

-- 4. دور مكتب المشاريع (projects_office)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('projects_office', 'contracts.export'),
('projects_office', 'contracts.template_view'),
('projects_office', 'contracts.preamble_add'),
('projects_office', 'contracts.preamble_edit'),
('projects_office', 'contracts.clause_edit'),
('projects_office', 'contracts.clause_delete'),
('projects_office', 'disbursements.create_project_linked'),
('projects_office', 'disbursements.create_donation'),
('projects_office', 'disbursements.create_tamam_platform'),
('projects_office', 'disbursements.export'),
('projects_office', 'receipt_vouchers.create_project'),
('projects_office', 'receipt_vouchers.create_restricted'),
('projects_office', 'receipt_vouchers.create_unrestricted'),
('projects_office', 'receipt_vouchers.print'),
('projects_office', 'financial_reports.projects'),
('projects_office', 'financial_reports.disbursements'),
('projects_office', 'financial_reports.contracts'),
('projects_office', 'financial_reports.disbursement_orders'),
('projects_office', 'financial_reports.receipt_vouchers');

-- 5. دور مدير المشروع (project_manager)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('project_manager', 'contracts.edit'),
('project_manager', 'contracts.export'),
('project_manager', 'contracts.template_view'),
('project_manager', 'contracts.preamble_add'),
('project_manager', 'contracts.preamble_edit'),
('project_manager', 'contracts.clause_edit'),
('project_manager', 'contracts.clause_delete'),
('project_manager', 'custody_requests.request_exception');

-- 6. دور المدير التنفيذي (executive_director)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('executive_director', 'contracts.export'),
('executive_director', 'receipt_vouchers.print'),
('executive_director', 'custody_requests.request_exception');

-- 7. دور المدير العام (general_manager)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('general_manager', 'contracts.export'),
('general_manager', 'receipt_vouchers.print');

-- 8. أدوار الفرق الميدانية والاستجابة السريعة (field_team, quick_response)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('field_team', 'custody_requests.request_exception'),
('quick_response', 'custody_requests.request_exception');

-- 9. الأدوار المخصصة (custom_role_1781420621086)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('custom_role_1781420621086', 'contracts.export'),
('custom_role_1781420621086', 'financial_approval.view');


-- ------------------------------------------------------------------------------
-- القسم 4: إسناد الصلاحيات للمستخدمين ذوي التخصيص الفردي المباشر (User Permissions)
-- مأخوذة بدقة من جدول user_permissions في النسخة الاحتياطية (74)
-- ------------------------------------------------------------------------------

-- المستخدم 1 (Super Admin):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(1, 'receipt_vouchers.print', 1, 1, 'ترقية وتفصيل صلاحيات سندات القبض', NOW());

-- المستخدم 3 (م. عبدالكريم المحيميد):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(3, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW()),
(3, 'fund.export', 1, 1, 'ترقية وتفصيل صلاحيات الصندوق', NOW());

-- المستخدمون 4 و 5 و 7 (معتمدو وموقعو العقود):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(4, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW()),
(5, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW()),
(7, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW());

-- المستخدم 21 (العهدة والصرف):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(21, 'custody_requests.request_exception', 1, 1, 'ترقية وتفصيل صلاحيات العهدة المالية', NOW());

-- المستخدم 26 (سندات القبض والعقود):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(26, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW()),
(26, 'receipt_vouchers.print', 1, 1, 'ترقية وتفصيل صلاحيات سندات القبض', NOW());

-- المستخدم 33 (م. عبدالوهاب ناجي - مكتب المشاريع، قوالب العقود، طلبات الصرف):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(33, 'contracts.template_view', 1, 1, 'ترقية وتفصيل صلاحيات قوالب العقود', NOW()),
(33, 'contracts.preamble_add', 1, 1, 'ترقية وتفصيل صلاحيات قوالب العقود', NOW()),
(33, 'contracts.preamble_edit', 1, 1, 'ترقية وتفصيل صلاحيات قوالب العقود', NOW()),
(33, 'contracts.clause_edit', 1, 1, 'ترقية وتفصيل صلاحيات قوالب العقود', NOW()),
(33, 'contracts.clause_delete', 1, 1, 'ترقية وتفصيل صلاحيات قوالب العقود', NOW()),
(33, 'disbursements.create_project_linked', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(33, 'disbursements.create_donation', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(33, 'disbursements.create_tamam_platform', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(33, 'disbursements.export', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW());

-- المستخدم 40 (المدير التنفيذي - أوامر الصرف، سندات القبض، التقرير المالي، الصندوق، العهدة):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(40, 'contracts.export', 1, 1, 'ترقية وتفصيل صلاحيات العقود', NOW()),
(40, 'disbursement_orders.create_custom', 1, 1, 'ترقية وتفصيل صلاحيات أوامر الصرف', NOW()),
(40, 'disbursements.create_project_linked', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(40, 'disbursements.create_donation', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(40, 'disbursements.create_tamam_platform', 1, 1, 'ترقية وتفصيل صلاحيات طلبات الصرف', NOW()),
(40, 'receipt_vouchers.print', 1, 1, 'ترقية وتفصيل صلاحيات سندات القبض', NOW()),
(40, 'fund.export', 1, 1, 'ترقية وتفصيل صلاحيات الصندوق', NOW()),
(40, 'financial_approval.view', 1, 1, 'ترقية وتفصيل صلاحيات قسم الاعتمادات', NOW()),
(40, 'financial_reports.projects', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(40, 'financial_reports.disbursements', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(40, 'financial_reports.contracts', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(40, 'financial_reports.disbursement_orders', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(40, 'financial_reports.receipt_vouchers', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(40, 'custody_requests.request_exception', 1, 1, 'ترقية وتفصيل صلاحيات العهدة المالية', NOW());

-- المستخدم 44:
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(44, 'receipt_vouchers.print', 1, 1, 'ترقية وتفصيل صلاحيات سندات القبض', NOW());

-- المستخدم 62 (تبويبات التقرير المالي):
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(62, 'financial_reports.projects', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(62, 'financial_reports.disbursements', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(62, 'financial_reports.contracts', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(62, 'financial_reports.disbursement_orders', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW()),
(62, 'financial_reports.receipt_vouchers', 1, 1, 'ترقية وتفصيل صلاحيات التقرير المالي', NOW());

SET FOREIGN_KEY_CHECKS = 1;
