-- =========================================================================
-- ملف Seed لإسناد الصلاحيات الجديدة للأدوار المستهدفة على السيرفر
-- متوافق مع كافة إصدارات MySQL و MariaDB
--
-- الصلاحيات:
--   1. projects.create_multi_mosque (إضافة مشروع لعدة مساجد)
--   2. project_reports.view (عرض تقارير المشاريع)
--   3. project_reports.create (إنشاء تقارير مشاريع)
--
-- الأدوار المستهدفة:
--   - super_admin (المدير العام)
--   - system_admin (مدير نظام)
--   - projects_office (مكتب المشاريع)
-- =========================================================================

START TRANSACTION;

-- 1. التأكد من وجود موديولي 'projects' و 'reports' في جدول modules
INSERT INTO `modules` (`id`, `name_ar`, `name_en`, `description`, `icon`, `display_order`, `is_active`)
VALUES 
  ('projects', 'المشاريع', 'Projects', 'إدارة ومتابعة المشاريع', 'FolderKanban', 2, 1),
  ('reports', 'التقارير', 'Reports', 'إدارة وعرض التقارير', 'BarChart3', 5, 1)
ON DUPLICATE KEY UPDATE 
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `is_active` = 1;

-- 2. إدراج/تحديث الصلاحيات الثلاث في جدول permissions
INSERT INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`, `description`)
VALUES 
  (
    'projects.create_multi_mosque', 
    'projects', 
    'create_multi_mosque', 
    'إضافة مشروع لعدة مساجد', 
    'Create Multi-Mosque Project', 
    'صلاحية إنشاء مشروع واحد مخصص لأكثر من مسجد في نفس الوقت'
  ),
  (
    'project_reports.view', 
    'reports', 
    'view', 
    'عرض تقارير المشاريع', 
    'View Project Reports', 
    'صلاحية عرض مركز تقارير المشاريع والإحصائيات والاطلاع على التقارير وطباعتها'
  ),
  (
    'project_reports.create', 
    'reports', 
    'create', 
    'إنشاء تقارير مشاريع', 
    'Create Project Reports', 
    'صلاحية إنشاء تقارير جديدة وتعديلها وإكمال المسودات وتغيير حالة تقارير المشاريع'
  )
ON DUPLICATE KEY UPDATE 
  `module_id` = VALUES(`module_id`),
  `action` = VALUES(`action`),
  `name_ar` = VALUES(`name_ar`),
  `name_en` = VALUES(`name_en`),
  `description` = VALUES(`description`);

-- 3. إسناد الصلاحيات للأدوار المستهدفة في جدول role_permissions (بدون تكرار أو حذف بيانات سابقة)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
VALUES
  -- super_admin
  ('super_admin', 'projects.create_multi_mosque'),
  ('super_admin', 'project_reports.view'),
  ('super_admin', 'project_reports.create'),
  
  -- system_admin
  ('system_admin', 'projects.create_multi_mosque'),
  ('system_admin', 'project_reports.view'),
  ('system_admin', 'project_reports.create'),
  
  -- projects_office
  ('projects_office', 'projects.create_multi_mosque'),
  ('projects_office', 'project_reports.view'),
  ('projects_office', 'project_reports.create')
ON DUPLICATE KEY UPDATE 
  `permission_id` = VALUES(`permission_id`);

COMMIT;
