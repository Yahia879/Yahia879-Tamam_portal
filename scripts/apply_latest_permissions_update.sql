/* ============================================================================== */
/* سكريبت تحديث قاعدة البيانات وترحيل الصلاحيات المفصلة الجديدة                   */
/* متوافق مع: بوابة منارة (تمام) - MySQL & MariaDB                                 */
/* ============================================================================== */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* ------------------------------------------------------------------------------ */
/* 1. إضافة الوحدة الجديدة في جدول modules                                          */
/* ------------------------------------------------------------------------------ */
INSERT INTO `modules` (`id`, `name_ar`, `name_en`, `icon`, `display_order`, `is_active`)
VALUES ('board_analytics', 'لوحة الإدارة العليا', 'Executive Management Dashboard', 'BarChart3', 1, 1)
ON DUPLICATE KEY UPDATE 
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `icon` = VALUES(`icon`),
  `is_active` = VALUES(`is_active`);

/* ------------------------------------------------------------------------------ */
/* 2. إدراج الصلاحيات التفصيلية الـ 18 الجديدة في جدول permissions                 */
/* ------------------------------------------------------------------------------ */
INSERT INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`, `description`) VALUES
('information_dashboard.digital_screen', 'information_dashboard', 'digital_screen', 'الشاشة الرقمية', 'Digital Screen Tab', 'عرض تبويب الشاشة الرقمية والمؤشرات الإحصائية المباشرة'),
('information_dashboard.mosques', 'information_dashboard', 'mosques', 'المساجد والتغطية', 'Mosques & Coverage Tab', 'عرض تبويب المساجد والتغطية الميدانية'),
('information_dashboard.requests', 'information_dashboard', 'requests', 'الطلبات والبرامج', 'Requests & Programs Tab', 'عرض تبويب الطلبات والبرامج ومراحل المعالجة'),
('information_dashboard.procurement', 'information_dashboard', 'procurement', 'المشاريع والعقود', 'Procurement & Contracts Tab', 'عرض تبويب المشاريع والعقود وشبكة الموردين'),
('information_dashboard.financial', 'information_dashboard', 'financial', 'المالية والصرف', 'Financial & Disbursement Tab', 'عرض تبويب المالية وأوامر الصرف والتدفقات'),

('board_analytics.mosques', 'board_analytics', 'mosques', 'إحصائيات المساجد', 'Mosque Statistics', 'عرض إحصائيات المساجد ومؤشرات التغطية في لوحة الإدارة العليا'),
('board_analytics.requests', 'board_analytics', 'requests', 'إحصائيات الطلبات', 'Request Statistics', 'عرض إحصائيات الطلبات والبرامج في لوحة الإدارة العليا'),
('board_analytics.procurement', 'board_analytics', 'procurement', 'المشتريات والعقود', 'Procurement and Contracts', 'عرض إحصائيات العقود والمشاريع في لوحة الإدارة العليا'),
('board_analytics.financials', 'board_analytics', 'financials', 'المالية والصرف', 'Finance and Disbursement', 'عرض المؤشرات المالية والتدفقات في لوحة الإدارة العليا'),

('board_leadership.bank_transfers', 'board', 'bank_transfers', 'عرض قائمة أوامر الصرف المعتمدة للتحويل البنكي', 'View Approved Bank Transfer Orders', 'عرض قائمة أوامر الصرف المعتمدة للتحويل البنكي في لوحة القيادة العليا'),
('board_leadership.bank_transfers_view_order', 'board', 'bank_transfers_view_order', 'عرض أمر الصرف المعتمد', 'View Approved Disbursement Order', 'استعراض تفاصيل أمر الصرف المعتمد'),
('board_leadership.bank_transfers_view_order_report', 'board', 'bank_transfers_view_order_report', 'عرض تقرير أمر الصرف', 'View Disbursement Order Report', 'عرض وطباعة تقرير أمر الصرف المعتمد'),
('board_leadership.bank_transfers_view_request', 'board', 'bank_transfers_view_request', 'عرض تقرير طلب الصرف المعتمد', 'View Approved Disbursement Request', 'عرض وطباعة تقرير طلب الصرف المعتمد'),
('board_leadership.bank_transfers_notes', 'board', 'bank_transfers_notes', 'إضافة ومتابعة الملاحظات', 'Add and Follow Notes', 'إضافة ومتابعة الملاحظات على أمر الصرف'),
('board_leadership.bank_transfers_view_justification', 'board', 'bank_transfers_view_justification', 'عرض مبررات الإلغاء والرفض', 'View Cancellation or Rejection Reason', 'استعراض أسباب الإلغاء أو الرفض'),
('board_leadership.bank_transfers_approve', 'board', 'bank_transfers_approve', 'الاعتماد من صاحب الصلاحية', 'Approve as Authority', 'اعتماد أمر الصرف للتحويل البنكي من صاحب الصلاحية'),
('board_leadership.bank_transfers_reject', 'board', 'bank_transfers_reject', 'رفض الطلب', 'Reject Request', 'رفض أمر الصرف من صاحب الصلاحية'),

('progress_reports.view_revoke_reason', 'reports', 'view_revoke_reason', 'عرض سبب إلغاء الاعتماد', 'View Approval Revocation Reason', 'عرض وتتبع سبب إلغاء اعتماد تقرير الإنجاز')
ON DUPLICATE KEY UPDATE 
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `description` = VALUES(`description`);

/* ------------------------------------------------------------------------------ */
/* 3. إسناد الصلاحيات التفصيلية للأدوار في جدول role_permissions                   */
/* ------------------------------------------------------------------------------ */

/* أ. إسناد تبويبات لوحة المعلومات لمن كان لديه الصلاحية العامة السابقة */
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p.id
FROM `role_permissions` rp
CROSS JOIN (
  SELECT 'information_dashboard.digital_screen' AS id UNION ALL
  SELECT 'information_dashboard.mosques' UNION ALL
  SELECT 'information_dashboard.requests' UNION ALL
  SELECT 'information_dashboard.procurement' UNION ALL
  SELECT 'information_dashboard.financial'
) p
WHERE rp.permission_id IN ('information_dashboard.view', 'information_dashboard')
   OR rp.role_id IN ('dashboard_viewer', 'super_admin', 'system_admin');

/* ب. إسناد صلاحيات لوحة الإدارة العليا لمن كان لديه عضوية المجلس أو رئاسته */
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p.id
FROM `role_permissions` rp
CROSS JOIN (
  SELECT 'board_analytics.mosques' AS id UNION ALL
  SELECT 'board_analytics.requests' UNION ALL
  SELECT 'board_analytics.procurement' UNION ALL
  SELECT 'board_analytics.financials'
) p
WHERE rp.permission_id IN ('board_member', 'board_chairman')
   OR rp.role_id IN ('board_member', 'board_chairman', 'super_admin', 'system_admin');

/* ج. إسناد صلاحيات التحويل البنكي لمن كان لديه صلاحية رئيس المجلس */
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, p.id
FROM `role_permissions` rp
CROSS JOIN (
  SELECT 'board_leadership.bank_transfers' AS id UNION ALL
  SELECT 'board_leadership.bank_transfers_view_order' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_order_report' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_request' UNION ALL
  SELECT 'board_leadership.bank_transfers_notes' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_justification' UNION ALL
  SELECT 'board_leadership.bank_transfers_approve' UNION ALL
  SELECT 'board_leadership.bank_transfers_reject'
) p
WHERE rp.permission_id = 'board_chairman'
   OR rp.role_id IN ('board_chairman', 'super_admin', 'system_admin');

/* د. إسناد صلاحية عرض سبب إلغاء الاعتماد لمن كان لديه اعتماد أو إلغاء تقارير الإنجاز */
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT DISTINCT rp.role_id, 'progress_reports.view_revoke_reason'
FROM `role_permissions` rp
WHERE rp.permission_id IN ('progress_reports.revoke_approval', 'progress_reports.approve')
   OR rp.role_id IN ('super_admin', 'system_admin');

/* هـ. إسناد صلاحيات المستخلصات والمشاريع للأدوار الإدارية العليا */
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN (
  SELECT 'progress_invoices.view' AS id UNION ALL
  SELECT 'progress_invoices.add' UNION ALL
  SELECT 'progress_invoices.edit' UNION ALL
  SELECT 'progress_invoices.approve' UNION ALL
  SELECT 'progress_invoices.revoke_approval' UNION ALL
  SELECT 'progress_invoices.exception_approve' UNION ALL
  SELECT 'projects.assign_as_manager'
) p
WHERE r.id IN ('super_admin', 'system_admin');

/* ------------------------------------------------------------------------------ */
/* 4. إسناد الصلاحيات التفصيلية للمستخدمين الأفراد في جدول user_permissions         */
/* ------------------------------------------------------------------------------ */

/* أ. ترقية صلاحيات لوحة المعلومات للمستخدمين الذين كانت لديهم الصلاحية السابقة */
INSERT INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`)
SELECT up.user_id, p.id, 1, COALESCE(up.granted_by, 1), 'ترقية تلقائية من صلاحية لوحة المعلومات السابقة'
FROM `user_permissions` up
CROSS JOIN (
  SELECT 'information_dashboard.digital_screen' AS id UNION ALL
  SELECT 'information_dashboard.mosques' UNION ALL
  SELECT 'information_dashboard.requests' UNION ALL
  SELECT 'information_dashboard.procurement' UNION ALL
  SELECT 'information_dashboard.financial'
) p
WHERE up.permission_id IN ('information_dashboard.view', 'information_dashboard')
  AND up.granted = 1
  AND NOT EXISTS (
    SELECT 1 FROM `user_permissions` dup 
    WHERE dup.user_id = up.user_id AND dup.permission_id = p.id
  );

/* ب. إسناد صلاحيات لوحة الإدارة العليا لمن لديهم صلاحية عضوية المجلس */
INSERT INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`)
SELECT DISTINCT up.user_id, p.id, 1, COALESCE(up.granted_by, 1), 'إسناد صلاحيات لوحة الإدارة العليا بناء على عضوية المجلس'
FROM `user_permissions` up
CROSS JOIN (
  SELECT 'board_analytics.mosques' AS id UNION ALL
  SELECT 'board_analytics.requests' UNION ALL
  SELECT 'board_analytics.procurement' UNION ALL
  SELECT 'board_analytics.financials'
) p
WHERE up.permission_id IN ('board_member', 'board_chairman')
  AND up.granted = 1
  AND NOT EXISTS (
    SELECT 1 FROM `user_permissions` dup 
    WHERE dup.user_id = up.user_id AND dup.permission_id = p.id
  );

/* ج. إسناد صلاحيات التحويل البنكي لمن لديهم صلاحية رئيس المجلس المباشرة */
INSERT INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`)
SELECT DISTINCT up.user_id, p.id, 1, COALESCE(up.granted_by, 1), 'إسناد صلاحيات التحويل البنكي والاعتماد المالي المفصلة'
FROM `user_permissions` up
CROSS JOIN (
  SELECT 'board_leadership.bank_transfers' AS id UNION ALL
  SELECT 'board_leadership.bank_transfers_view_order' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_order_report' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_request' UNION ALL
  SELECT 'board_leadership.bank_transfers_notes' UNION ALL
  SELECT 'board_leadership.bank_transfers_view_justification' UNION ALL
  SELECT 'board_leadership.bank_transfers_approve' UNION ALL
  SELECT 'board_leadership.bank_transfers_reject'
) p
WHERE up.permission_id = 'board_chairman'
  AND up.granted = 1
  AND NOT EXISTS (
    SELECT 1 FROM `user_permissions` dup 
    WHERE dup.user_id = up.user_id AND dup.permission_id = p.id
  );

/* د. إسناد صلاحية عرض سبب إلغاء الاعتماد لمن يملك اعتماد تقارير الإنجاز */
INSERT INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`)
SELECT DISTINCT up.user_id, 'progress_reports.view_revoke_reason', 1, COALESCE(up.granted_by, 1), 'إسناد صلاحية عرض سبب إلغاء الاعتماد'
FROM `user_permissions` up
WHERE up.permission_id IN ('progress_reports.approve', 'progress_reports.revoke_approval')
  AND up.granted = 1
  AND NOT EXISTS (
    SELECT 1 FROM `user_permissions` dup 
    WHERE dup.user_id = up.user_id AND dup.permission_id = 'progress_reports.view_revoke_reason'
  );

/* ------------------------------------------------------------------------------ */
/* 5. تحديث حقل وصف الدور roles.description لظهور التفعيل في واجهة المستخدم        */
/* ------------------------------------------------------------------------------ */

UPDATE `roles`
SET `description` = '["board_member","board_chairman","board_analytics.mosques","board_analytics.requests","board_analytics.procurement","board_analytics.financials","board_leadership.bank_transfers","board_leadership.bank_transfers_view_order","board_leadership.bank_transfers_view_order_report","board_leadership.bank_transfers_view_request","board_leadership.bank_transfers_notes","board_leadership.bank_transfers_view_justification","board_leadership.bank_transfers_approve","board_leadership.bank_transfers_reject"]'
WHERE `id` = 'board_chairman';

UPDATE `roles`
SET `description` = '["board_member","board_chairman","board_analytics.mosques","board_analytics.requests","board_analytics.procurement","board_analytics.financials"]'
WHERE `id` = 'board_member';

UPDATE `roles`
SET `description` = REPLACE(`description`, ']"', ',"progress_reports.view_revoke_reason"]"')
WHERE `id` IN ('executive_director', 'general_manager', 'custom_role_1781420621086')
  AND `description` LIKE '%progress_reports.approve%'
  AND `description` NOT LIKE '%progress_reports.view_revoke_reason%';

SET FOREIGN_KEY_CHECKS = 1;
