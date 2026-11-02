-- ==============================================================================
-- سكربت تحديث الصلاحيات وإسنادها للأدوار المقابلة في قاعدة البيانات
-- بناءً على فحص: tamamgatemanarah_portal (73).sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- الخطوة 1: التأكد من تسجيل الوحدات (modules) في جدول modules
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `modules` (`id`, `name_ar`, `name_en`, `description`, `display_order`, `is_active`) VALUES
('information_dashboard', 'الشاشة الرقمية', 'Information Dashboard', 'وحدة عرض الشاشة الرقمية واللوحة المعلوماتية', 1, 1),
('settings', 'مركز الإعدادات', 'Settings Center', 'إعدادات الجمعية والهوية والخدمات والنماذج', 12, 1),
('orders_and_letters', 'مالية سدانة', 'Sedana Finance', 'أوامر وخطابات مالية سدانة', 13, 1),
('purchase_orders', 'أوامر الشراء', 'Purchase Orders', 'إدارة أوامر الشراء للمخزون', 14, 1),
('csr_letters', 'المسؤولية المجتمعية', 'CSR Letters', 'خطابات المسؤولية المجتمعية', 15, 1),
('sedana_warehouse', 'المستودع الافتراضي', 'Virtual Warehouse', 'حركات المستودع والإدخال والإخراج', 16, 1),
('sedana_quotations', 'عروض أسعار سدانة', 'Sedana Quotations', 'عروض أسعار سدانة والترسيات', 17, 1);

-- ------------------------------------------------------------------------------
-- الخطوة 2: إدراج كافة الصلاحيات الجديدة والمفصلة في جدول permissions
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `permissions` (`id`, `module_id`, `action`, `name_ar`, `name_en`, `description`) VALUES
('staff_notifications.view', 'permissions', 'view', 'استعراض إعدادات وقوالب الإشعارات', 'View Notification Settings', 'استعراض إعدادات وقوالب الإشعارات'),
('staff_notifications.by_department', 'permissions', 'by_department', 'تخصيص الإشعارات حسب القسم', 'Customize Notifications by Department', 'تخصيص الإشعارات حسب القسم'),
('staff_notifications.beneficiary_message_formats', 'permissions', 'beneficiary_message_formats', 'تعديل صياغة رسائل المستفيد', 'Edit Beneficiary Message Formats', 'تعديل صياغة رسائل المستفيد'),
('notification_center.direct_send_staff', 'permissions', 'direct_send_staff', 'إرسال إشعار مباشر لمسؤول', 'Send Direct Notification to Staff', 'إرسال إشعار مباشر لمسؤول'),
('notification_center.direct_send_beneficiary', 'permissions', 'direct_send_beneficiary', 'إرسال إشعار مباشر لمستفيد', 'Send Direct Notification to Beneficiary', 'إرسال إشعار مباشر لمستفيد'),
('settings_org.edit_supervision', 'settings', 'edit_supervision', 'تعديل جهات الإشراف', 'Edit Supervision Authorities', 'تعديل جهات الإشراف'),
('settings_org.edit_officials', 'settings', 'edit_officials', 'تعديل أسماء المسؤولين', 'Edit Organization Officials', 'تعديل أسماء المسؤولين'),
('settings_org.signers_view', 'settings', 'signers_view', 'عرض قائمة مفوضي التوقيع', 'View Org Signatories', 'عرض قائمة مفوضي التوقيع'),
('settings_org.signers_add', 'settings', 'signers_add', 'إضافة مفوض توقيع جديد', 'Add Org Signatory', 'إضافة مفوض توقيع جديد'),
('settings_org.signers_edit', 'settings', 'signers_edit', 'تعديل بيانات المفوض والتوقيع الرقمي', 'Edit Org Signatory', 'تعديل بيانات المفوض والتوقيع الرقمي'),
('settings_org.signers_set_default', 'settings', 'signers_set_default', 'تعيين مفوض التوقيع كافتراضي', 'Set Default Org Signatory', 'تعيين مفوض التوقيع كافتراضي'),
('settings_org.signers_delete', 'settings', 'signers_delete', 'حذف مفوض التوقيع', 'Delete Org Signatory', 'حذف مفوض التوقيع'),
('settings_branding.view', 'settings', 'view', 'عرض إعدادات الهوية والشعارات', 'View Branding Settings', 'عرض إعدادات الهوية والشعارات'),
('settings_branding.edit_colors', 'settings', 'edit_colors', 'تعديل وحفظ الألوان والمظهر العام', 'Edit Branding Colors & Theme', 'تعديل وحفظ الألوان والمظهر العام'),
('settings_branding.upload_logos', 'settings', 'upload_logos', 'رفع وتحديث الشعارات والختم الرسمي', 'Upload Logos & Stamp', 'رفع وتحديث الشعارات والختم الرسمي'),
('settings_branding.delete_logos', 'settings', 'delete_logos', 'حذف وإزالة الشعارات والأختام المرفوعة', 'Delete Uploaded Logos', 'حذف وإزالة الشعارات والأختام المرفوعة'),
('settings_categories.reorder', 'settings', 'reorder', 'إعادة ترتيب وتسلسل التصنيفات', 'Reorder Categories', 'إعادة ترتيب وتسلسل التصنيفات'),
('services.toggle_status', 'settings', 'toggle_status', 'تفعيل أو تعطيل حالة البرامج والخدمات', 'Toggle Service Status', 'تفعيل أو تعطيل حالة البرامج والخدمات'),
('services.reorder', 'settings', 'reorder', 'إعادة ترتيب وتسلسل البرامج والخدمات', 'Reorder Services', 'إعادة ترتيب وتسلسل البرامج والخدمات'),
('forms_customization.view', 'settings', 'view', 'عرض وتصفح النماذج والحقول المخصصة', 'View Custom Forms', 'عرض وتصفح النماذج والحقول المخصصة'),
('forms_customization.dashboard_global', 'settings', 'dashboard_global', 'تخصيص الصفحة للجميع', 'Customize Dashboard for All', 'تخصيص الصفحة للجميع'),
('forms_customization.dashboard_role', 'settings', 'dashboard_role', 'تخصيص الصفحة حسب الدور', 'Customize Dashboard by Role', 'تخصيص الصفحة حسب الدور'),
('forms_customization.dashboard_user', 'settings', 'dashboard_user', 'تخصيص الصفحة حسب المستخدم', 'Customize Dashboard by User', 'تخصيص الصفحة حسب المستخدم'),
('forms_customization.evaluation_view', 'settings', 'evaluation_view', 'عرض استمارة التقييم فقط', 'View Evaluation Form Only', 'عرض استمارة التقييم فقط'),
('forms_customization.evaluation_add_field', 'settings', 'evaluation_add_field', 'إضافة حقل جديد', 'Evaluation Add Field', 'إضافة حقل جديد'),
('forms_customization.evaluation_delete', 'settings', 'evaluation_delete', 'حذف حقل', 'Evaluation Delete Field', 'حذف حقل'),
('forms_customization.evaluation_duplicate', 'settings', 'evaluation_duplicate', 'تكرار حقل', 'Evaluation Duplicate Field', 'تكرار حقل'),
('forms_customization.evaluation_placeholder', 'settings', 'evaluation_placeholder', 'إضافة وتعديل نص التلميح', 'Evaluation Placeholder', 'إضافة وتعديل نص التلميح'),
('forms_customization.evaluation_description', 'settings', 'evaluation_description', 'إضافة وتعديل الوصف الإرشادي', 'Evaluation Description', 'إضافة وتعديل الوصف الإرشادي'),
('forms_customization.evaluation_change_type', 'settings', 'evaluation_change_type', 'تغيير نوع الحقل', 'Evaluation Change Type', 'تغيير نوع الحقل'),
('forms_customization.evaluation_required', 'settings', 'evaluation_required', 'تحديد الحقل كإجباري أو اختياري', 'Evaluation Required', 'تحديد الحقل كإجباري أو اختياري'),
('forms_customization.evaluation_toggle_active', 'settings', 'evaluation_toggle_active', 'تفعيل أو تعطيل الحقل', 'Evaluation Toggle Active', 'تفعيل أو تعطيل الحقل'),
('forms_customization.evaluation_reorder', 'settings', 'evaluation_reorder', 'تبديل أماكن وترتيب الحقول', 'Evaluation Reorder Fields', 'تبديل أماكن وترتيب الحقول'),
('forms_customization.services_view', 'settings', 'services_view', 'عرض نماذج طلبات الخدمات فقط', 'View Service Request Forms Only', 'عرض نماذج طلبات الخدمات فقط'),
('forms_customization.services_add_field', 'settings', 'services_add_field', 'إضافة حقل جديد', 'Services Add Field', 'إضافة حقل جديد'),
('forms_customization.services_delete', 'settings', 'services_delete', 'حذف حقل', 'Services Delete Field', 'حذف حقل'),
('forms_customization.services_duplicate', 'settings', 'services_duplicate', 'تكرار حقل', 'Services Duplicate Field', 'تكرار حقل'),
('forms_customization.services_placeholder', 'settings', 'services_placeholder', 'إضافة وتعديل نص التلميح', 'Services Placeholder', 'إضافة وتعديل نص التلميح'),
('forms_customization.services_description', 'settings', 'services_description', 'إضافة وتعديل الوصف الإرشادي', 'Services Description', 'إضافة وتعديل الوصف الإرشادي'),
('forms_customization.services_change_type', 'settings', 'services_change_type', 'تغيير نوع الحقل', 'Services Change Type', 'تغيير نوع الحقل'),
('forms_customization.services_required', 'settings', 'services_required', 'تحديد الحقل كإجباري أو اختياري', 'Services Required', 'تحديد الحقل كإجباري أو اختياري'),
('forms_customization.services_toggle_active', 'settings', 'services_toggle_active', 'تفعيل أو تعطيل الحقل', 'Services Toggle Active', 'تفعيل أو تعطيل الحقل'),
('forms_customization.services_reorder', 'settings', 'services_reorder', 'تبديل أماكن وترتيب الحقول', 'Services Reorder Fields', 'تبديل أماكن وترتيب الحقول'),
('forms_customization.registration_view', 'settings', 'registration_view', 'عرض نماذج التسجيل والتبرع فقط', 'View Registration Forms Only', 'عرض نماذج التسجيل والتبرع فقط'),
('forms_customization.registration_add_field', 'settings', 'registration_add_field', 'إضافة حقل جديد', 'Registration Add Field', 'إضافة حقل جديد'),
('forms_customization.registration_delete', 'settings', 'registration_delete', 'حذف حقل', 'Registration Delete Field', 'حذف حقل'),
('forms_customization.registration_duplicate', 'settings', 'registration_duplicate', 'تكرار حقل', 'Registration Duplicate Field', 'تكرار حقل'),
('forms_customization.registration_placeholder', 'settings', 'registration_placeholder', 'إضافة وتعديل نص التلميح', 'Registration Placeholder', 'إضافة وتعديل نص التلميح'),
('forms_customization.registration_description', 'settings', 'registration_description', 'إضافة وتعديل الوصف الإرشادي', 'Registration Description', 'إضافة وتعديل الوصف الإرشادي'),
('forms_customization.registration_change_type', 'settings', 'registration_change_type', 'تغيير نوع الحقل', 'Registration Change Type', 'تغيير نوع الحقل'),
('forms_customization.registration_required', 'settings', 'registration_required', 'تحديد الحقل كإجباري أو اختياري', 'Registration Required', 'تحديد الحقل كإجباري أو اختياري'),
('forms_customization.registration_toggle_active', 'settings', 'registration_toggle_active', 'تفعيل أو تعطيل الحقل', 'Registration Toggle Active', 'تفعيل أو تعطيل الحقل'),
('forms_customization.registration_reorder', 'settings', 'registration_reorder', 'تبديل أماكن وترتيب الحقول', 'Registration Reorder Fields', 'تبديل أماكن وترتيب الحقول'),
('forms_customization.services_add', 'settings', 'services_add', 'إضافة حقول لنماذج الخدمات', 'Add Service Request Form Fields', 'إضافة حقول لنماذج الخدمات'),
('forms_customization.services_edit', 'settings', 'services_edit', 'تعديل حقول نماذج الخدمات', 'Edit Service Request Form Fields', 'تعديل حقول نماذج الخدمات'),
('forms_customization.analytics', 'settings', 'analytics', 'لوحة تحليلات وإحصائيات النماذج', 'Forms Custom Analytics', 'لوحة تحليلات وإحصائيات النماذج'),
('settings_escalation.edit_durations', 'settings', 'edit_durations', 'تعديل مدد المراحل الرئيسية', 'Edit Main Stage Durations', 'تعديل مدد المراحل الرئيسية'),
('settings_escalation.edit_beneficiary_sla', 'settings', 'edit_beneficiary_sla', 'تعديل مهلة تجاوب وقبول المستفيد', 'Edit Beneficiary Acceptance SLA', 'تعديل مهلة تجاوب وقبول المستفيد'),
('orders_and_letters.csr_letters_add', 'orders_and_letters', 'csr_letters_add', 'إنشاء خطاب مجتمعي جديد', 'Create Community Letter', 'إنشاء خطاب مجتمعي جديد'),
('orders_and_letters.purchase_orders_add', 'orders_and_letters', 'purchase_orders_add', 'إنشاء أمر شراء جديد', 'Create Purchase Order', 'إنشاء أمر شراء جديد'),
('orders_and_letters.purchase_orders_create_disbursement', 'orders_and_letters', 'purchase_orders_create_disbursement', 'إنشاء أمر صرف لأمر الشراء', 'Create Disbursement for Purchase Order', 'إنشاء أمر صرف لأمر الشراء');

-- إسناد صلاحيات: المدير العام (Super Admin) (`super_admin`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('super_admin', 'staff_notifications.view'),
('super_admin', 'staff_notifications.by_department'),
('super_admin', 'staff_notifications.beneficiary_message_formats'),
('super_admin', 'notification_center.direct_send_staff'),
('super_admin', 'notification_center.direct_send_beneficiary'),
('super_admin', 'settings_org.edit_supervision'),
('super_admin', 'settings_org.edit_officials'),
('super_admin', 'settings_org.signers_view'),
('super_admin', 'settings_org.signers_add'),
('super_admin', 'settings_org.signers_edit'),
('super_admin', 'settings_org.signers_set_default'),
('super_admin', 'settings_org.signers_delete'),
('super_admin', 'settings_branding.view'),
('super_admin', 'settings_branding.edit_colors'),
('super_admin', 'settings_branding.upload_logos'),
('super_admin', 'settings_branding.delete_logos'),
('super_admin', 'settings_categories.reorder'),
('super_admin', 'services.toggle_status'),
('super_admin', 'services.reorder'),
('super_admin', 'forms_customization.view'),
('super_admin', 'forms_customization.dashboard_global'),
('super_admin', 'forms_customization.dashboard_role'),
('super_admin', 'forms_customization.dashboard_user'),
('super_admin', 'forms_customization.evaluation_view'),
('super_admin', 'forms_customization.evaluation_add_field'),
('super_admin', 'forms_customization.evaluation_delete'),
('super_admin', 'forms_customization.evaluation_duplicate'),
('super_admin', 'forms_customization.evaluation_placeholder'),
('super_admin', 'forms_customization.evaluation_description'),
('super_admin', 'forms_customization.evaluation_change_type'),
('super_admin', 'forms_customization.evaluation_required'),
('super_admin', 'forms_customization.evaluation_toggle_active'),
('super_admin', 'forms_customization.evaluation_reorder'),
('super_admin', 'forms_customization.services_view'),
('super_admin', 'forms_customization.services_add_field'),
('super_admin', 'forms_customization.services_delete'),
('super_admin', 'forms_customization.services_duplicate'),
('super_admin', 'forms_customization.services_placeholder'),
('super_admin', 'forms_customization.services_description'),
('super_admin', 'forms_customization.services_change_type'),
('super_admin', 'forms_customization.services_required'),
('super_admin', 'forms_customization.services_toggle_active'),
('super_admin', 'forms_customization.services_reorder'),
('super_admin', 'forms_customization.registration_view'),
('super_admin', 'forms_customization.registration_add_field'),
('super_admin', 'forms_customization.registration_delete'),
('super_admin', 'forms_customization.registration_duplicate'),
('super_admin', 'forms_customization.registration_placeholder'),
('super_admin', 'forms_customization.registration_description'),
('super_admin', 'forms_customization.registration_change_type'),
('super_admin', 'forms_customization.registration_required'),
('super_admin', 'forms_customization.registration_toggle_active'),
('super_admin', 'forms_customization.registration_reorder'),
('super_admin', 'forms_customization.services_add'),
('super_admin', 'forms_customization.services_edit'),
('super_admin', 'forms_customization.analytics'),
('super_admin', 'settings_escalation.edit_durations'),
('super_admin', 'settings_escalation.edit_beneficiary_sla'),
('super_admin', 'orders_and_letters.csr_letters_add'),
('super_admin', 'orders_and_letters.purchase_orders_add'),
('super_admin', 'orders_and_letters.purchase_orders_create_disbursement');

-- إسناد صلاحيات: مدير النظام (System Admin) (`system_admin`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('system_admin', 'staff_notifications.view'),
('system_admin', 'staff_notifications.by_department'),
('system_admin', 'staff_notifications.beneficiary_message_formats'),
('system_admin', 'notification_center.direct_send_staff'),
('system_admin', 'notification_center.direct_send_beneficiary'),
('system_admin', 'settings_org.edit_supervision'),
('system_admin', 'settings_org.edit_officials'),
('system_admin', 'settings_org.signers_view'),
('system_admin', 'settings_org.signers_add'),
('system_admin', 'settings_org.signers_edit'),
('system_admin', 'settings_org.signers_set_default'),
('system_admin', 'settings_org.signers_delete'),
('system_admin', 'settings_branding.view'),
('system_admin', 'settings_branding.edit_colors'),
('system_admin', 'settings_branding.upload_logos'),
('system_admin', 'settings_branding.delete_logos'),
('system_admin', 'settings_categories.reorder'),
('system_admin', 'services.toggle_status'),
('system_admin', 'services.reorder'),
('system_admin', 'forms_customization.view'),
('system_admin', 'forms_customization.dashboard_global'),
('system_admin', 'forms_customization.dashboard_role'),
('system_admin', 'forms_customization.dashboard_user'),
('system_admin', 'forms_customization.evaluation_view'),
('system_admin', 'forms_customization.evaluation_add_field'),
('system_admin', 'forms_customization.evaluation_delete'),
('system_admin', 'forms_customization.evaluation_duplicate'),
('system_admin', 'forms_customization.evaluation_placeholder'),
('system_admin', 'forms_customization.evaluation_description'),
('system_admin', 'forms_customization.evaluation_change_type'),
('system_admin', 'forms_customization.evaluation_required'),
('system_admin', 'forms_customization.evaluation_toggle_active'),
('system_admin', 'forms_customization.evaluation_reorder'),
('system_admin', 'forms_customization.services_view'),
('system_admin', 'forms_customization.services_add_field'),
('system_admin', 'forms_customization.services_delete'),
('system_admin', 'forms_customization.services_duplicate'),
('system_admin', 'forms_customization.services_placeholder'),
('system_admin', 'forms_customization.services_description'),
('system_admin', 'forms_customization.services_change_type'),
('system_admin', 'forms_customization.services_required'),
('system_admin', 'forms_customization.services_toggle_active'),
('system_admin', 'forms_customization.services_reorder'),
('system_admin', 'forms_customization.registration_view'),
('system_admin', 'forms_customization.registration_add_field'),
('system_admin', 'forms_customization.registration_delete'),
('system_admin', 'forms_customization.registration_duplicate'),
('system_admin', 'forms_customization.registration_placeholder'),
('system_admin', 'forms_customization.registration_description'),
('system_admin', 'forms_customization.registration_change_type'),
('system_admin', 'forms_customization.registration_required'),
('system_admin', 'forms_customization.registration_toggle_active'),
('system_admin', 'forms_customization.registration_reorder'),
('system_admin', 'forms_customization.services_add'),
('system_admin', 'forms_customization.services_edit'),
('system_admin', 'forms_customization.analytics'),
('system_admin', 'settings_escalation.edit_durations'),
('system_admin', 'settings_escalation.edit_beneficiary_sla');

-- إسناد صلاحيات: الإدارة المالية (Financial) (`financial`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('financial', 'orders_and_letters.csr_letters_add'),
('financial', 'orders_and_letters.purchase_orders_add'),
('financial', 'orders_and_letters.purchase_orders_create_disbursement'),
('financial', 'disbursement_orders.view'),
('financial', 'disbursement_orders.create_direct');

-- إسناد صلاحيات: مسؤول المشتريات (Procurement Officer) (`procurement_officer`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('procurement_officer', 'purchase_orders.view'),
('procurement_officer', 'purchase_orders.add'),
('procurement_officer', 'purchase_orders.export'),
('procurement_officer', 'sedana_warehouse.view'),
('procurement_officer', 'sedana_warehouse.inward'),
('procurement_officer', 'orders_and_letters.purchase_orders'),
('procurement_officer', 'orders_and_letters.purchase_orders_add');

-- إسناد صلاحيات: المدير التنفيذي (Executive Director) (`executive_director`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('executive_director', 'purchase_orders.view'),
('executive_director', 'purchase_orders.approve'),
('executive_director', 'csr_letters.view'),
('executive_director', 'csr_letters.approve'),
('executive_director', 'settings_escalation.edit_durations'),
('executive_director', 'settings_escalation.edit_beneficiary_sla');

-- إسناد صلاحيات: الاتصال المؤسسي (Corporate Communication) (`corporate_comm`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('corporate_comm', 'settings_branding.view'),
('corporate_comm', 'settings_branding.edit_colors'),
('corporate_comm', 'settings_branding.upload_logos'),
('corporate_comm', 'csr_letters.view'),
('corporate_comm', 'csr_letters.add'),
('corporate_comm', 'csr_letters.export'),
('corporate_comm', 'orders_and_letters.csr_letters'),
('corporate_comm', 'orders_and_letters.csr_letters_add');

-- إسناد صلاحيات: المدير العام / الإدارة العامة (General Manager) (`general_manager`)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
('general_manager', 'settings_escalation.edit_durations'),
('general_manager', 'settings_escalation.edit_beneficiary_sla'),
('general_manager', 'notification_center.direct_send_staff'),
('general_manager', 'notification_center.direct_send_beneficiary');


-- ------------------------------------------------------------------------------
-- الخطوة 4 (اختيارية): إسناد الصلاحيات للمستخدمين الذين يملكون تخصيصاً فردياً مباشراً (user_permissions)
-- ------------------------------------------------------------------------------

-- المستخدم رقم 33 (م. عبدالوهاب ناجي - مكتب المشاريع) الذي كان يملك صلاحيات استثنائية لأوامر الشراء والمسؤولية والمستودع:
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(33, 'settings_categories.reorder', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW()),
(33, 'orders_and_letters.purchase_orders', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW()),
(33, 'orders_and_letters.purchase_orders_add', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW()),
(33, 'orders_and_letters.purchase_orders_create_disbursement', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW()),
(33, 'orders_and_letters.csr_letters', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW()),
(33, 'orders_and_letters.csr_letters_add', 1, 1, 'ترقية وتفصيل صلاحيات مركز الإعدادات والمخزون', NOW());

-- المستخدم رقم 40 (المدير التنفيذي) الذي كان يملك تخصيصاً فردياً لأوامر الشراء:
INSERT IGNORE INTO `user_permissions` (`user_id`, `permission_id`, `granted`, `granted_by`, `reason`, `created_at`) VALUES
(40, 'orders_and_letters.purchase_orders', 1, 1, 'ترقية وتفصيل صلاحيات أوامر الشراء', NOW()),
(40, 'orders_and_letters.purchase_orders_add', 1, 1, 'ترقية وتفصيل صلاحيات أوامر الشراء', NOW());
