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
('mawasim.view', 'mawasim', 'view', 'عرض كافة المواسم', 'View All Seasons', 'عرض صفحة مواسم وكافة المواسم ومتابعة السعات'),
('mawasim.view_assigned', 'mawasim', 'view_assigned', 'عرض المواسم المسندة لك كمدير', 'View Assigned Seasons', 'عرض المواسم المسندة للمستخدم كمدير للموسم فقط'),
('mawasim.create', 'mawasim', 'create', 'إضافة موسم', 'Add Season', 'إضافة مواسم جديدة وفتح فترات التسجيل'),
('mawasim.manage', 'mawasim', 'manage', 'إعدادات الموسم', 'Season Settings', 'تعديل وضبط إعدادات وسعات خدمات المواسم'),
('mawasim.view_requests', 'mawasim', 'view_requests', 'عرض طلبات برنامج مواسم', 'View Mawasim Requests', 'عرض قسم طلبات الموسم وتفاصيلها وتصديرها'),
('mawasim.approve_requests', 'mawasim', 'approve_requests', 'اعتماد طلبات برنامج مواسم', 'Approve Mawasim Requests', 'مراجعة طلبات الموسم واعتماد الكميات أو الاعتذار عنها'),
('requests.create_seasonal_request', 'requests', 'create_seasonal_request', 'إنشاء طلب لبرنامج مواسم', 'Create Seasonal Request', 'إنشاء وتقديم طلبات برنامج مواسم من صفحة الطلبات')
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
  AND p.id IN ('mawasim.view', 'mawasim.view_assigned', 'mawasim.create', 'mawasim.manage', 'mawasim.view_requests', 'mawasim.approve_requests', 'requests.create_seasonal_request')
ON DUPLICATE KEY UPDATE `permission_id` = VALUES(`permission_id`);

SET FOREIGN_KEY_CHECKS = 1;
