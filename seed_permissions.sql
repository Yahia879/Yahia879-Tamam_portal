-- ============================================================================
-- سكريبت SQL مخصص لإدراج الصلاحيات الجديدة وإسنادها للأدوار المطلوبة
-- آمن تماماً ولا يؤثر على أي بيانات سابقة (يستخدم INSERT IGNORE)
-- ============================================================================

-- 1. التأكد من وجود الموديولات الأساسية
INSERT IGNORE INTO `modules` (`id`, `name_ar`, `name_en`, `icon`, `display_order`, `is_active`) VALUES
('reports', 'التقارير والمتابعة', 'Reports & Monitoring', 'FileText', 8, 1),
('disbursements', 'الصرف والمالية', 'Disbursements & Financials', 'Coins', 7, 1),
('signing', 'التوقيعات والاعتمادات', 'Signatures & Approvals', 'FileSignature', 15, 1);

-- 2. إدراج وتأكيد الصلاحيات المطلوبة في جدول permissions
INSERT INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`) VALUES
('progress_reports.edit', 'reports', 'edit', 'تعديل التقرير', 'Edit Progress Report'),
('progress_reports.exception_approve', 'reports', 'exception_approve', 'استثناء اعتماد مدير المشروع', 'Exception Approve Progress Reports'),
('receipt_vouchers.exception_approve', 'disbursements', 'exception_approve', 'استثناء اعتماد السند', 'Exception Approve Receipt Voucher'),
('signing.progress_reports_sign', 'signing', 'sign', 'توقيع تقارير الإنجاز', 'Sign Progress Reports')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `name_en` = VALUES(`name_en`);

-- 3. إسناد صلاحية "تعديل التقرير" (progress_reports.edit)
-- للأدوار: super_admin, system_admin, projects_office, general_manager
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'progress_reports.edit'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin', 'projects_office', 'general_manager');

-- 4. إسناد صلاحيتي استثناء الاعتماد:
-- "استثناء اعتماد مدير المشروع" (progress_reports.exception_approve)
-- و "استثناء اعتماد السند" (receipt_vouchers.exception_approve)
-- للأدوار: super_admin, system_admin
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'progress_reports.exception_approve'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'receipt_vouchers.exception_approve'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin');

-- 5. إسناد صلاحية "توقيع تقارير الإنجاز" (signing.progress_reports_sign)
-- للأدوار: super_admin, system_admin, projects_office, project_manager, general_manager
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'signing.progress_reports_sign'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin', 'projects_office', 'project_manager', 'general_manager');
