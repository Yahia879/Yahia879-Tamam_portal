-- ============================================================================
-- سكريبت SQL شامل ومباشر لتحديث بنية الجداول وإدراج الصلاحيات وإسنادها للأدوار
-- آمن تماماً ولا يؤثر على أي بيانات سابقة
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. تحديث جدول تقارير الإنجاز (progress_reports)
-- ----------------------------------------------------------------------------
ALTER TABLE `progress_reports` 
MODIFY COLUMN `status` ENUM('draft', 'submitted', 'pending', 'pending_executive', 'reviewed', 'approved', 'rejected', 'revoked') DEFAULT 'draft';

ALTER TABLE `progress_reports`
  ADD COLUMN IF NOT EXISTS `managerApprovedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `managerApprovedAt` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `approvedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `approvedAt` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `approvalNotes` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `rejectedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `rejectedAt` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `rejectionReason` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `isException` TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `exceptionApprovedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `creatorSignatureName` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `creatorSignatureDepartment` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `creatorSignatureUrl` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `approvedBySignatureName` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `approvedBySignatureDepartment` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `approvedBySignatureUrl` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `showCreatorSignature` TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `showExecutiveDirectorSignature` TINYINT(1) DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 2. تحديث جدول سندات القبض (receipt_vouchers)
-- ----------------------------------------------------------------------------
ALTER TABLE `receipt_vouchers`
  ADD COLUMN IF NOT EXISTS `isException` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `exceptionApprovedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `exceptionApprovedAt` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `exceptionReason` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `approvedBy` INT NULL,
  ADD COLUMN IF NOT EXISTS `approvedAt` DATETIME NULL;

-- ----------------------------------------------------------------------------
-- 3. التأكد من وجود الموديولات الأساسية
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `modules` (`id`, `name_ar`, `name_en`, `icon`, `display_order`, `is_active`) VALUES
('reports', 'التقارير والمتابعة', 'Reports & Monitoring', 'FileText', 8, 1),
('disbursements', 'الصرف والمالية', 'Disbursements & Financials', 'Coins', 7, 1),
('signing', 'التوقيعات والاعتمادات', 'Signatures & Approvals', 'FileSignature', 15, 1);

-- ----------------------------------------------------------------------------
-- 4. إدراج وتأكيد الصلاحيات المطلوبة في جدول permissions
-- ----------------------------------------------------------------------------
INSERT INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`) VALUES
('progress_reports.edit', 'reports', 'edit', 'تعديل التقرير', 'Edit Progress Report'),
('progress_reports.exception_approve', 'reports', 'exception_approve', 'استثناء اعتماد مدير المشروع', 'Exception Approve Progress Reports'),
('receipt_vouchers.exception_approve', 'disbursements', 'exception_approve', 'استثناء اعتماد السند', 'Exception Approve Receipt Voucher'),
('signing.progress_reports_sign', 'signing', 'sign', 'توقيع تقارير الإنجاز', 'Sign Progress Reports')
ON DUPLICATE KEY UPDATE `name_ar` = VALUES(`name_ar`), `name_en` = VALUES(`name_en`);

-- ----------------------------------------------------------------------------
-- 5. إسناد الصلاحيات للأدوار في جدول role_permissions
-- ----------------------------------------------------------------------------

-- صلاحية "تعديل التقرير" (progress_reports.edit)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'progress_reports.edit'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin', 'projects_office', 'general_manager');

-- صلاحيتي استثناء الاعتماد (progress_reports.exception_approve و receipt_vouchers.exception_approve)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'progress_reports.exception_approve'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'receipt_vouchers.exception_approve'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin');

-- صلاحية "توقيع تقارير الإنجاز" (signing.progress_reports_sign)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, 'signing.progress_reports_sign'
FROM `roles` r
WHERE r.`id` IN ('super_admin', 'system_admin', 'projects_office', 'project_manager', 'general_manager');
