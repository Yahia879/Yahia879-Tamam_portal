/* ============================================================================== */
/* سكريبت إضافة صلاحيات المواسم (Mawasim) - بوابة تمام                             */
/* ============================================================================== */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. إضافة وحدة المواسم في جدول modules إن لم تكن موجودة
INSERT INTO `modules` (`id`, `name_ar`, `name_en`, `icon`, `display_order`, `is_active`)
VALUES ('mawasim', 'مواسم', 'Seasons', 'Clock', 15, 1)
ON DUPLICATE KEY UPDATE 
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `icon` = VALUES(`icon`),
  `is_active` = VALUES(`is_active`);

-- 2. إدراج صلاحيات المواسم في جدول permissions
INSERT INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`, `description`) VALUES
('mawasim.view', 'mawasim', 'view', 'عرض مواسم', 'View Seasons', 'عرض صفحة المواسم وقائمة المواسم والطلبات الموسمية المرتبطة'),
('mawasim.manage', 'mawasim', 'manage', 'إدارة إعدادات المواسم', 'Manage Season Settings', 'إضافة وتعديل مواسم وإدارة إعداداتها')
ON DUPLICATE KEY UPDATE 
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `description` = VALUES(`description`);

-- 3. منح الصلاحيات تلقائياً للأدوار الإدارية (مدير النظام)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.name_en IN ('System Admin', 'Super Admin')
  AND p.id IN ('mawasim.view', 'mawasim.manage')
ON DUPLICATE KEY UPDATE `permission_id` = VALUES(`permission_id`);

SET FOREIGN_KEY_CHECKS = 1;
