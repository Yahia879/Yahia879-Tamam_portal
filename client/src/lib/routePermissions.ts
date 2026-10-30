import { isDashboardViewerUser } from "./dashboardViewer";

/**
 * خريطة صلاحيات المسارات (Route-Permission Map)
 * 
 * تربط كل مسار محمي بالصلاحية المطلوبة للوصول إليه.
 * يتم استخدام هذه الخريطة في PermissionRouteGuard لمنع الوصول غير المصرح.
 * 
 * المفاتيح هي "معرّفات الصلاحيات البسيطة" (نفسها المستخدمة في RoleEdit وDashboardLayout).
 * يتم التحقق منها مقابل مصفوفة permissions[] المُحقنة في الجلسة أو مقابل الصلاحيات الموسعة.
 * 
 * الأدوار الأساسية (Base Roles) لها صلاحيات محددة مسبقاً.
 * الأدوار المخصصة (Custom Roles) تأخذ صلاحياتها من checkboxes عند إنشائها.
 */

// ─────────────────────────────────────────
// الأدوار الأساسية ← الصلاحيات المرتبطة بها
// ─────────────────────────────────────────
// هذه الخريطة تحدد الصلاحيات المتاحة لكل دور أساسي (غير مخصص)
// تُستخدم عندما لا يملك المستخدم دوراً مخصصاً
export const BASE_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"], // كل الصلاحيات
  system_admin: ["*"], // كل الصلاحيات

  general_manager: [
    "dashboard", "mosques", "mosques_map", "requests", "escalation", "appointments_calendar",
    "projects", "service_requester_accounts", "suppliers", "quotations", "financial_approval",
    "contracts", "disbursement_requests", "disbursement_orders", "receipt_vouchers",
    "progress_reports", "progress_invoices", "financial_report", "reports", "staff_management", "settings_center", "custody_requests",
  ],

  executive_director: [
    "dashboard", "mosques", "mosques_map", "requests", "escalation", "appointments_calendar",
    "projects", "service_requester_accounts", "suppliers", "quotations", "financial_approval",
    "contracts", "disbursement_requests", "disbursement_orders", "receipt_vouchers",
    "progress_reports", "progress_invoices", "financial_report", "reports", "staff_management", "settings_center", "custody_requests",
    "sedana_quotations", "sedana_quotations.view",
  ],

  projects_office: [
    "dashboard", "mosques", "mosques_map", "requests", "escalation", "appointments_calendar",
    "projects", "service_requester_accounts",
    "suppliers", "quotations", "financial_approval", "contracts",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers",
    "progress_reports", "progress_invoices", "financial_report", "reports", "custody_requests",
  ],

  field_team: [
    "dashboard", "requests", "appointments_calendar", "custody_requests",
  ],

  quick_response: [
    "dashboard", "requests", "custody_requests",
  ],

  financial: [
    "dashboard", "suppliers", "quotations", "financial_approval",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers", "financial_report",
    "contracts", "custody_requests",
  ],

  financial_manager: [
    "dashboard", "suppliers", "quotations", "financial_approval",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers", "financial_report",
    "contracts", "requests", "custody_requests",
  ],

  project_manager: [
    "dashboard", "projects", "progress_reports", "progress_invoices", "requests", "contracts", "disbursement_requests", "receipt_vouchers", "custody_requests",
  ],

  corporate_comm: [
    "dashboard", "requests", "settings_center", "custody_requests",
  ],

  board_chairman: [
    "dashboard", "board_chairman", "mosques", "mosques_map", "requests", "appointments_calendar",
    "projects", "service_requester_accounts", "suppliers", "quotations", "financial_approval",
    "contracts", "receipt_vouchers",
    "progress_reports", "progress_invoices", "financial_report", "reports", "custody_requests",
  ],

  board_member: [
    "dashboard", "board_member", "financial_report", "reports", "mosques", "requests", "projects", "custody_requests",
  ],

  service_requester: [], // طالب الخدمة لا يملك صلاحيات إدارية

  procurement_officer: [
    "quotations", "quotations.view", "quotations.add", "sedana_quotations", "sedana_quotations.view", "custody_requests",
  ],

  dashboard_viewer: [
    "information_dashboard", "information_dashboard.view",
  ],
};

// ─────────────────────────────────────────
// خريطة المسارات ← الصلاحيات المطلوبة
// ─────────────────────────────────────────
export interface RoutePermission {
  /** الصلاحية المطلوبة (أحد معرّفات الصلاحيات البسيطة) */
  requiredPermission: string;
  /** إذا كان true، تتطلب وجود أي صلاحية من القائمة (OR) بدلاً من كلها (AND) */
  anyOf?: string[];
}

/**
 * خريطة المسارات إلى الصلاحيات
 * 
 * القيمة يمكن أن تكون:
 * - string: صلاحية واحدة مطلوبة
 * - string[]: يجب أن يملك أي صلاحية منها (OR logic)
 * 
 * المسارات غير الموجودة هنا تعتبر عامة أو محمية فقط بالتسجيل (لا تحتاج صلاحية إضافية).
 */
export const ROUTE_PERMISSION_MAP: Record<string, string | string[]> = {
  // ── لوحة التحكم للمجلس ──
  "/board-dashboard": ["board_chairman", "board_member", "board_chairman_view"],
  "/board-executive": ["board_chairman", "board_chairman_view"],
  "/board-analytics": "board_member",
  "/information-dashboard": ["information_dashboard", "information_dashboard.view"],

  // ── لوحة التحكم ──
  "/dashboard": ["dashboard", "dashboard.view", "mosques", "requests", "projects", "suppliers", "staff_management", "settings_center"],

  // ── المساجد ──
  "/mosques": "mosques",
  "/mosques/map": "mosques_map",
  "/mosques/new": "mosques",
  // /mosques/:id و /mosques/:id/edit تُعالج بنمط regex

  // ── الطلبات ──
  "/requests": ["requests.view", "sedana_requests.view", "sedana_requests.manage"],
  "/requests/new": "requests.create",
  "/requests/quick-create": ["requests.create_quick_request", "requests.manage_as_quick_response"],
  "/field-visits": "requests.view",
  "/field-visits/calendar": "appointments_calendar",
  "/escalation": ["escalation", "escalation.view"],
  "/admin-escalation": ["escalation", "escalation.view"],

  // ── المشاريع ──
  "/projects": ["projects.view", "projects.view_details", "projects.create_multi_mosque", "projects.financials", "projects.edit_support_and_fees", "projects.add_receipt_voucher"],
  "/projects/new": ["projects.create_multi_mosque", "projects.create", "projects"],
  "/project-management": ["projects.view", "projects.view_details"],

  // ── إدارة المستخدمين ──
  "/staff": "staff_management",
  "/users": "staff_management",
  "/roles": "staff_management",
  "/job-positions": "staff_management",
  "/requester-approvals": ["staff_management", "requester_accounts.view", "requester_exceptions.view", "requester_donations.view", "requester_inquiries.view", "requester_sedana.view"],
  "/notifications/customization": [
    "staff_notifications.by_role",
    "staff_notifications.by_department",
    "staff_notifications.edit_message_formats",
    "staff_notifications.by_person",
    "staff_notifications.beneficiary",
    "staff_notifications.beneficiary_message_formats"
  ],
  "/notification-customization": [
    "staff_notifications.by_role",
    "staff_notifications.by_department",
    "staff_notifications.edit_message_formats",
    "staff_notifications.by_person",
    "staff_notifications.beneficiary",
    "staff_notifications.beneficiary_message_formats"
  ],
  "/notifications/center": [
    "notification_center",
    "notification_center.view",
    "notification_center.direct_send",
    "notification_center.send_logs",
    "notification_center.direct_send_staff",
    "notification_center.direct_send_beneficiary"
  ],
  "/notification-center": [
    "notification_center",
    "notification_center.view",
    "notification_center.direct_send",
    "notification_center.send_logs",
    "notification_center.direct_send_staff",
    "notification_center.direct_send_beneficiary"
  ],

  // ── الموردون ──
  "/suppliers": "suppliers",
  "/suppliers/new": "suppliers.add",

  // ── عروض الأسعار ──
  "/quotations": "quotations",
  "/sedana-quotations": "sedana_quotations.view",

  // ── الاعتمادات ──
  "/financial-approval": [
    "financial_approval.progress_invoices",
    "financial_approval.disbursement_requests",
    "financial_approval.disbursement_orders",
    "financial_approval.custody_requests",
    "financial_approval.receipt_vouchers",
    "financial_approval.contracts",
    "financial_approval.purchase_orders",
    "financial_approval.progress_reports",
  ],
  "/boq": ["boq.view", "boq", "boq.add", "boq.edit", "boq.delete", "boq.import", "boq.export", "quotations", "requests.view_details", "requests.view"],
  "/boq-preparations": ["boq.view", "boq", "boq.add", "boq.edit", "boq.delete", "boq.import", "boq.export", "quotations", "requests.view_details", "requests.view"],

  // ── مالية سدانة (أوامر الشراء والخطاب المجتمعي وأوامر الصرف) ──
  "/orders-and-letters": [
    "orders_and_letters.disbursement_orders",
    "orders_and_letters.csr_letters",
    "orders_and_letters.purchase_orders",
  ],
  "/financial-officer": [
    "orders_and_letters.disbursement_orders",
    "orders_and_letters.csr_letters",
    "orders_and_letters.purchase_orders",
  ],
  "/financial-tasks": [
    "orders_and_letters.disbursement_orders",
    "orders_and_letters.csr_letters",
    "orders_and_letters.purchase_orders",
  ],
  "/contracts": "contracts",
  "/contracts/new": "contracts",
  "/purchase-orders": ["purchase_orders.view", "purchase_orders", "orders_and_letters.purchase_orders"],
  "/purchase-orders/new": ["purchase_orders.add", "purchase_orders", "orders_and_letters.create", "orders_and_letters.purchase_orders"],
  "/csr-letters": ["csr_letters.view", "csr_letters", "orders_and_letters.csr_letters"],
  "/csr-letters/new": ["csr_letters.add", "csr_letters", "orders_and_letters.create", "orders_and_letters.csr_letters"],
  "/sedana-warehouse": ["sedana_warehouse.view", "sedana_warehouse"],
  "/sedana-warehouse/inward/new": ["sedana_warehouse.inward", "sedana_warehouse"],
  "/sedana-warehouse/outbound/new": ["sedana_warehouse.outbound", "sedana_warehouse"],
  "/sedana-execution": ["sedana_warehouse.view", "sedana_warehouse"],

  // ── طلبات وأوامر الصرف وسندات القبض والعهد المالية ──
  "/financial-dashboard": ["disbursement_requests", "financial_report"],
  "/disbursements": "disbursement_requests",
  "/disbursement-requests": "disbursement_requests",
  "/disbursement-orders": "disbursement_orders",
  "/disbursement-orders/new-direct": [
    "disbursement_orders",
    "disbursement_orders.create_direct",
    "orders_and_letters.disbursement_orders_create_direct",
    "orders_and_letters"
  ],
  "/fund": ["fund.view", "fund.transfer"],
  "/fund/movements": ["fund.view", "fund.transfer"],
  "/fund/transfers/new": ["fund.transfer"],
  "/receipt-vouchers": ["receipt_vouchers", "receipt_vouchers.view", "receipt_vouchers.add", "receipt_vouchers.edit", "receipt_vouchers.exception_approve"],
  "/receipt-vouchers/new": ["receipt_vouchers", "receipt_vouchers.add", "receipt_vouchers.edit"],
  "/custody-requests": ["custody_requests", "custody_requests.view", "custody_requests.create"],
  "/custody-requests/new": ["custody_requests.create"],

  // ── تقارير الإنجاز والمشاريع والمستخلصات ──
  "/progress-reports": ["progress_reports", "progress_reports.view"],
  "/progress-invoices": ["progress_invoices", "progress_invoices.view"],
  "/milestones/new": ["projects", "contracts", "progress_reports", "progress_invoices", "projects.view_details"],
  "/project-reports": ["project_reports", "project_reports.view", "project_reports.create", "progress_reports", "progress_reports.view", "reports.view"],
  "/project-reports/new": ["project_reports.create", "project_reports", "progress_reports.add", "progress_reports"],
  "/project-reports/semi-monthly": ["project_reports.create", "project_reports", "progress_reports.add", "progress_reports"],
  "/project-reports/monthly": ["project_reports.create", "project_reports", "progress_reports.add", "progress_reports"],
  "/project-reports/quarterly": ["project_reports.create", "project_reports", "progress_reports.add", "progress_reports"],
  "/project-reports/visit": ["project_reports.create", "project_reports", "progress_reports.add", "progress_reports"],

  // ── الاستلامات ──
  "/handovers": ["projects", "contracts"],
  "/final-report/new": ["projects", "requests.view_details", "requests.upload_final_report", "pending_reports.intervene"],

  // ── مؤشرات الأداء ──
  "/kpi-dashboard": ["projects", "requests.view_details"],

  // ── التقارير ──
  "/reports": ["reports.view_stats", "reports.export_data"],
  "/pending-reports": ["pending_reports.view"],
  "/beneficiary-satisfaction": [
    "beneficiary_evaluations.view",
    "beneficiary_evaluations.evaluations_log",
    "beneficiary_evaluations.dispatch_log",
    "beneficiary_evaluations.contacts",
  ],
  "/financial-report": "financial_report",

  // ── الإعدادات ──
  "/settings": [
    "settings_center",
    "settings_org.view",
    "settings_org.edit_basic",
    "settings_org.edit_supervision",
    "settings_org.edit_officials",
    "settings_org.edit_signers",
    "settings_org.signers_view",
    "settings_org.signers_add",
    "settings_org.signers_edit",
    "settings_org.signers_set_default",
    "settings_org.signers_delete",
    "settings_org.edit_banks",
    "settings_org.edit_contracts",
    "settings_branding.view",
    "settings_branding.edit",
    "settings_branding.edit_colors",
    "settings_branding.upload_logos",
    "settings_branding.delete_logos",
    "settings_contracts.view",
    "settings_contracts.edit",
    "settings_categories.view",
    "settings_categories.add",
    "settings_categories.edit",
    "settings_categories.delete",
    "settings_categories.reorder",
    "services.view",
    "services.add",
    "services.edit",
    "services.delete",
    "services.toggle_status",
    "services.reorder",
    "forms_customization.view",
    "forms_customization.evaluation",
    "forms_customization.services",
    "forms_customization.registration",
    "forms_customization.analytics",
    "settings_escalation.view",
    "settings_escalation.edit_durations",
    "settings_escalation.edit_beneficiary_sla",
    "settings_escalation.save",
    "staff_notifications.view",
    "notification_center.view",
    "settings.stages_view",
    "settings.actions_view"
  ],
  "/branding": [
    "settings_branding.view",
    "settings_branding.edit",
    "settings_branding.edit_colors",
    "settings_branding.upload_logos",
    "settings_branding.delete_logos"
  ],
  "/organization-settings": [
    "settings_org.view",
    "settings_org.edit_basic",
    "settings_org.edit_supervision",
    "settings_org.edit_officials",
    "settings_org.signers_view",
    "settings_org.signers_add",
    "settings_org.signers_edit",
    "settings_org.signers_set_default",
    "settings_org.signers_delete",
    "settings_org.edit_banks",
    "settings_org.edit_contracts"
  ],
  "/stage-settings": ["settings_center", "settings.stages_view"],
  "/action-settings": ["settings_center", "settings.actions_view"],
  "/categories": [
    "settings_categories.view",
    "settings_categories.add",
    "settings_categories.edit",
    "settings_categories.delete",
    "settings_categories.reorder"
  ],
  "/contract-templates": ["settings_center", "settings_contracts.view", "contracts"],
  "/program-customization": [
    "services.view",
    "services.add",
    "services.edit",
    "services.delete",
    "services.toggle_status",
    "services.reorder"
  ],
  "/forms-customization": [
    "forms_customization.view",
    "forms_customization.evaluation",
    "forms_customization.services",
    "forms_customization.registration",
    "forms_customization.analytics",
    "settings_center"
  ],
  "/forms-customization/evaluation": "forms_customization.evaluation",
  "/forms-customization/services": ["forms_customization.services", "forms_customization.services_view", "forms_customization.services_add", "forms_customization.services_edit", "forms_customization.services_delete"],
  "/forms-customization/registration": ["forms_customization.registration", "settings_center"],
  "/forms-customization/analytics": ["forms_customization.analytics", "forms_customization.evaluation", "forms_customization.services", "forms_customization.registration", "settings_center"],
  "/forms-customization/option-2": "forms_customization.services",
  "/forms-customization/escalation": [
    "escalation",
    "escalation.view",
    "settings_escalation",
    "settings_escalation.view",
    "settings_escalation.edit_durations",
    "settings_escalation.edit_beneficiary_sla",
    "settings_escalation.save",
    "forms_customization.services",
    "forms_customization.registration",
    "settings_center"
  ],
  "/partners": "settings_center",
  "/support": ["Create_Ticket", "View_Tickets"],
};

/**
 * أنماط المسارات الديناميكية (تتضمن بارامترات مثل :id)
 * تُستخدم للمطابقة بـ regex
 */
export const DYNAMIC_ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  permission: string | string[];
}> = [
  // مالية سدانة (أوامر الشراء والخطاب المجتمعي وأوامر الصرف)
  {
    pattern: /^\/orders-and-letters\/[^/]+$/,
    permission: [
      "orders_and_letters.disbursement_orders",
      "orders_and_letters.csr_letters",
      "orders_and_letters.purchase_orders",
    ],
  },

  // تخصيص نماذج الخدمات والتسجيل
  { pattern: /^\/forms-customization\/services\/[^/]+$/, permission: "forms_customization.services" },
  { pattern: /^\/forms-customization\/registration\/[^/]+$/, permission: ["forms_customization.registration", "settings_center"] },

  // المساجد
  { pattern: /^\/mosques\/\d+\/edit-imam$/, permission: "mosques" },
  { pattern: /^\/mosques\/\d+\/edit$/, permission: "mosques" },
  { pattern: /^\/mosques\/\d+$/, permission: "mosques" },

  // استبيان تقييم رضا المستفيد
  { pattern: /^\/requests\/\d+\/evaluation$/, permission: ["requests", "requests.view", "requests.view_details", "service_requester_only"] },
  { pattern: /^\/requester\/requests\/\d+\/evaluation$/, permission: ["requests", "requests.view", "requests.view_details", "service_requester_only"] },

  // الطلبات
  { pattern: /^\/requests\/\d+\/edit$/, permission: "requests.view_details" },
  { pattern: /^\/requests\/\d+\/field-inspection$/, permission: ["requests.view_details", "requests.manage_as_field_team", "pending_reports.intervene"] },
  { pattern: /^\/requests\/\d+\/quick-response$/, permission: ["requests.view_details", "requests.manage_as_quick_response", "pending_reports.intervene"] },
  { pattern: /^\/requests\/\d+\/assign-final-report$/, permission: "requests.view_details" },
  { pattern: /^\/requests\/\d+$/, permission: ["requests.view_details", "requests.manage_as_field_team", "requests.manage_as_quick_response", "requests.upload_final_report", "pending_reports.intervene", "sedana_requests.view", "sedana_requests.desk_review", "sedana_requests.manage"] },
  { pattern: /^\/requests\/\d+\/sedana-evaluation$/, permission: ["sedana_requests.desk_review", "sedana_requests.view", "sedana_requests.manage", "requests.view_details"] },
  { pattern: /^\/requester\/requests\/\d+\/sedana-evaluation$/, permission: ["sedana_requests.desk_review", "sedana_requests.view", "sedana_requests.manage", "requests.view_details"] },

  // الزيارات الميدانية
  { pattern: /^\/field-visits\/schedule\/\d+$/, permission: ["appointments_calendar", "requests.view_details"] },
  { pattern: /^\/field-visits\/report\/\d+$/, permission: ["requests.view_details", "requests.manage_as_field_team"] },

  // المشاريع
  { pattern: /^\/projects\/\d+$/, permission: ["projects.view_details", "projects.financials", "projects.edit_support_and_fees", "projects.add_receipt_voucher"] },
  { pattern: /^\/projects\/\d+\/(invoices|milestones)\/new$/, permission: ["projects.view_details", "projects", "progress_reports", "progress_invoices", "contracts"] },
  { pattern: /^\/milestones\/new\/\d+$/, permission: ["projects.view_details", "projects", "progress_reports", "progress_invoices", "contracts"] },

  // الموردون
  { pattern: /^\/suppliers\/\d+\/edit$/, permission: "suppliers.edit" },
  { pattern: /^\/suppliers\/\d+$/, permission: "suppliers.view_details" },

  // المستخدمين
  { pattern: /^\/users\/\d+\/edit$/, permission: ["staff_users.edit", "users.edit"] },
  { pattern: /^\/users\/\d+\/permissions$/, permission: ["staff_users.customize", "users.customize"] },
  { pattern: /^\/users\/\d+$/, permission: ["staff_users.view", "users.view", "staff_management"] },
  { pattern: /^\/requester-approvals\/\d+$/, permission: ["staff_management", "requester_accounts.view", "requester_exceptions.view", "requester_donations.view", "requester_inquiries.view", "requester_sedana.view"] },

  // الأدوار
  { pattern: /^\/staff\/roles\/[^/]+$/, permission: "staff_management" },
  { pattern: /^\/roles\/[^/]+\/edit$/, permission: "staff_management" },
  { pattern: /^\/roles\/[^/]+$/, permission: "staff_management" },

  // العقود
  { pattern: /^\/contracts\/new\/\d+$/, permission: "contracts" },
  { pattern: /^\/contracts\/new\/request\/\d+$/, permission: "contracts" },
  { pattern: /^\/contracts\/\d+\/preview$/, permission: "contracts" },
  { pattern: /^\/contracts\/\d+\/print$/, permission: "contracts" },
  { pattern: /^\/contracts\/\d+\/edit$/, permission: "contracts" },
  { pattern: /^\/contracts\/\d+$/, permission: "contracts" },

  // قوالب العقود
  { pattern: /^\/contract-templates\/\d+\/preview$/, permission: ["settings_center", "settings_contracts.view", "contracts"] },
  { pattern: /^\/contract-templates\/\d+\/print$/, permission: ["settings_center", "settings_contracts.view", "contracts"] },

  // BOQ
  {
    pattern: /^\/boq-preparations\/[^/]+$/,
    permission: [
      "boq.view",
      "boq",
      "boq.add",
      "boq.edit",
      "boq.delete",
      "boq.import",
      "boq.export",
      "quotations",
      "requests.view_details",
      "requests.view",
    ],
  },
  {
    pattern: /^\/boq\/[^/]+$/,
    permission: [
      "boq.view",
      "boq",
      "boq.add",
      "boq.edit",
      "boq.delete",
      "boq.import",
      "boq.export",
      "quotations",
      "requests.view_details",
      "requests.view",
    ],
  },
  { pattern: /^\/sedana-quotations\/[^/]+$/, permission: "sedana_quotations.view" },

  // طلبات الصرف
  { pattern: /^\/disbursements\/new$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new-linked$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new\/\d+$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new\/contract\/\d+$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/requests\/\d+\/edit$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/requests\/\d+\/print$/, permission: ["disbursement_requests", "disbursements.view", "board_chairman", "board_chairman_view", "board_leadership.board_chairman", "board_leadership.board_chairman_view"] },
  { pattern: /^\/payments\/edit\/[^/]+$/, permission: "disbursement_requests" },

  // أوامر الصرف
  { pattern: /^\/disbursement-orders\/new\/\d+$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursement-orders\/\d+\/print$/, permission: ["disbursement_orders", "disbursement_orders.view", "board_chairman", "board_chairman_view", "board_leadership.board_chairman", "board_leadership.board_chairman_view"] },
  { pattern: /^\/disbursement-orders\/\d+$/, permission: ["disbursement_orders", "disbursement_orders.view", "board_chairman", "board_chairman_view", "board_leadership.board_chairman", "board_leadership.board_chairman_view"] },
  { pattern: /^\/disbursements\/orders\/new\/\d+$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursements\/orders\/\d+\/print$/, permission: ["disbursement_orders", "disbursement_orders.view", "board_chairman", "board_chairman_view", "board_leadership.board_chairman", "board_leadership.board_chairman_view"] },

  // العهد المالية
  { pattern: /^\/custody-requests\/[^/]+$/, permission: ["custody_requests", "custody_requests.view"] },
  { pattern: /^\/custody-requests\/[^/]+\/print$/, permission: ["custody_requests", "custody_requests.view"] },

  // معاينة وطباعة أمر الشراء
  { pattern: /^\/requests\/\d+\/purchase-order$/, permission: ["purchase_orders.view", "purchase_orders", "orders_and_letters.view", "orders_and_letters.purchase_orders", "orders_and_letters"] },
  { pattern: /^\/requests\/\d+\/sedana-po$/, permission: ["purchase_orders.view", "purchase_orders", "orders_and_letters.view", "orders_and_letters.purchase_orders", "orders_and_letters"] },
  { pattern: /^\/requests\/\d+\/new-purchase-order$/, permission: ["purchase_orders.add", "purchase_orders", "orders_and_letters.create", "orders_and_letters.purchase_orders", "orders_and_letters"] },

  // خطابات المسؤولية المجتمعية
  { pattern: /^\/requests\/\d+\/csr-letter$/, permission: ["csr_letters.view", "csr_letters", "orders_and_letters.view", "orders_and_letters.csr_letters", "orders_and_letters"] },
  { pattern: /^\/requests\/\d+\/sedana-csr$/, permission: ["csr_letters.view", "csr_letters", "orders_and_letters.view", "orders_and_letters.csr_letters", "orders_and_letters"] },
  { pattern: /^\/requests\/\d+\/new-csr-letter$/, permission: ["csr_letters.add", "csr_letters", "orders_and_letters.create", "orders_and_letters.csr_letters", "orders_and_letters"] },

  // المستودع الافتراضي وتنفيذ سدانة
  { pattern: /^\/requests\/\d+\/sedana-execution$/, permission: ["sedana_warehouse.view", "sedana_warehouse"] },
  { pattern: /^\/requests\/\d+\/sedana-inward\/new$/, permission: ["sedana_warehouse.inward", "sedana_warehouse"] },
  { pattern: /^\/requests\/\d+\/sedana-outbound\/new$/, permission: ["sedana_warehouse.outbound", "sedana_warehouse"] },
  { pattern: /^\/requests\/\d+\/sedana-delivery$/, permission: ["sedana_warehouse.view", "sedana_warehouse"] },
  { pattern: /^\/requests\/\d+\/delivery-order$/, permission: ["sedana_warehouse.view", "sedana_warehouse"] },

  // التقارير الختامية
  { pattern: /^\/final-report\/\d+$/, permission: ["projects", "requests.view_details"] },

  // تقارير الإنجاز والمشاريع
  { pattern: /^\/receipt-vouchers\/\d+(\/print)?$/, permission: ["receipt_vouchers", "receipt_vouchers.view", "receipt_vouchers.edit", "receipt_vouchers.exception_approve"] },
  { 
    pattern: /^\/progress-reports\/\d+\/print$/, 
    permission: [
      "progress_reports", 
      "progress_reports.view", 
      "progress_invoices", 
      "progress_invoices.view", 
      "project_reports", 
      "project_reports.view", 
      "reports", 
      "reports.view",
      "disbursement_orders",
      "disbursement_orders.view",
      "disbursements",
      "disbursements.view",
      "financial_approval",
      "board_chairman",
      "board_chairman_view",
      "board_leadership.board_chairman_view",
      "board.board_chairman_view",
      "board_member",
      "projects",
      "projects.view"
    ] 
  },
  { pattern: /^\/project-reports\/.*$/, permission: ["project_reports", "project_reports.view", "project_reports.create", "progress_reports", "progress_reports.view", "reports.view"] },
];

/**
 * مسارات مُعفاة من التحقق (عامة أو محمية فقط بالتسجيل)
 */
export const EXEMPT_ROUTES = new Set([
  "/",
  "/login",
  "/admin/login",
  "/register",
  "/track",
  "/service-request",
  "/debug-user",
  "/profile",
  "/notifications",
  "/404",
  "/403",
  "/supplier/register",
  "/supplier/dashboard",
  "/request-form-dynamic",
  "/evaluation",
]);

/**
 * مسارات طالب الخدمة فقط
 */
export const REQUESTER_ROUTES = new Set([
  "/requester",
  "/requester/dashboard",
  "/my-mosques",
  "/requester/mosques/new",
  "/my-requests",
]);

/**
 * تحديد الصلاحية المطلوبة لمسار معين
 */
export function getRequiredPermission(pathname: string): string | string[] | null {
  // المسارات المُعفاة
  if (EXEMPT_ROUTES.has(pathname)) return null;
  
  // مسارات طالب الخدمة
  if (REQUESTER_ROUTES.has(pathname)) return null;

  // السماح بمعاينة وطباعة قوالب العقود لأي مستخدم إداري مسجل
  if (/^\/contract-templates\/[^/]+\/preview$/.test(pathname) || /^\/contract-templates\/[^/]+\/print$/.test(pathname)) {
    return null;
  }

  // المسارات الثابتة
  if (ROUTE_PERMISSION_MAP[pathname]) {
    return ROUTE_PERMISSION_MAP[pathname];
  }

  // المسارات الديناميكية
  for (const { pattern, permission } of DYNAMIC_ROUTE_PERMISSIONS) {
    if (pattern.test(pathname)) {
      return permission;
    }
  }

  // مسار /requester/* prefixed routes
  if (pathname.startsWith("/requester/")) return null;

  // ── مسار غير محدد في الخريطة ──
  // لأسباب أمنية، أي مسار إداري غير مُعرّف صراحةً يتطلب صلاحية كاملة.
  // هذا يمنع الوصول غير المصرح عبر URL مباشر لأي صفحة جديدة لم يتم تعريفها بعد.
  // الصلاحية "__unknown_route__" لن تتطابق مع أي صلاحية فعلية = حظر تلقائي
  // ما عدا super_admin و system_admin اللذان لديهما "*"
  return "__unknown_route__";
}

/**
 * التحقق مما إذا كان المستخدم يملك صلاحية الوصول لمسار معين
 */
export function hasRouteAccess(
  pathname: string,
  userRole: string,
  userPermissions: string[],
  hasCustomRole: boolean,
): boolean {
  if ((pathname === "/dashboard" || pathname === "/dashboard/") && userRole === "dashboard_viewer") {
    return false;
  }
  // مسار مالية سدانة متاح لمن يملك إحدى صلاحيات مالية سدانة الثلاث
  const isOrdersAndLettersRoute =
    pathname === "/orders-and-letters" ||
    pathname.startsWith("/orders-and-letters/") ||
    pathname === "/financial-officer" ||
    pathname === "/financial-tasks";
  if (isOrdersAndLettersRoute) {
    return (
      userPermissions.includes("orders_and_letters.disbursement_orders") ||
      userPermissions.includes("orders_and_letters.csr_letters") ||
      userPermissions.includes("orders_and_letters.purchase_orders") ||
      userPermissions.some(p => p.startsWith("orders_and_letters."))
    );
  }

  // السماح للإدارة المالية بمعاينة وطباعة خطابات المسؤولية المجتمعية وأوامر الشراء
  if (userRole === "financial" && /^\/requests\/\d+\/(csr-letter|sedana-csr|purchase-order|sedana-po)$/.test(pathname)) {
    return true;
  }

  // الصندوق: متاح دائماً للإدارة المالية (متوافق مع الخادم والقائمة الجانبية)
  if ((pathname === "/fund" || pathname.startsWith("/fund/")) && ["financial", "financial_manager"].includes(userRole)) {
    return true;
  }

  // super_admin و system_admin لهما كل الصلاحيات دائماً إلا إذا سُحبت صلاحية معينة صراحةً
  // ولكن لمسارات وصلاحيات إدارة المخزون، يجب التحقق الصارم من الصلاحية الفعلية
  if (userRole === "super_admin" || userRole === "system_admin") {
    const required = getRequiredPermission(pathname);
    const isInventoryPerm = (p: string) => (
      p.startsWith("sedana_quotations") ||
      p.startsWith("orders_and_letters") ||
      p.startsWith("purchase_orders") ||
      p.startsWith("csr_letters") ||
      p.startsWith("sedana_warehouse")
    );
    const isInventoryRoute = (
      pathname === "/sedana-quotations" || pathname.startsWith("/sedana-quotations/") ||
      pathname === "/orders-and-letters" || pathname.startsWith("/orders-and-letters/") ||
      pathname === "/purchase-orders" || pathname.startsWith("/purchase-orders/") ||
      pathname === "/csr-letters" || pathname.startsWith("/csr-letters/") ||
      pathname === "/sedana-warehouse" || pathname.startsWith("/sedana-warehouse/") ||
      pathname === "/sedana-execution" || pathname.startsWith("/sedana-execution/") ||
      /^\/requests\/\d+\/(sedana-po|sedana-csr|sedana-execution|sedana-inward|sedana-outbound|sedana-delivery|delivery-order)/.test(pathname) ||
      (Array.isArray(required) ? required.some(p => isInventoryPerm(p)) : (typeof required === "string" && isInventoryPerm(required)))
    );

    if (isInventoryRoute) {
      if (required !== null && required !== "__unknown_route__") {
        if (Array.isArray(required)) {
          if (required.every(p => !userPermissions.includes(p))) return false;
        } else {
          if (!userPermissions.includes(required)) return false;
        }
      }
      return true;
    }

    if (userPermissions.includes("*") || userPermissions.length === 0) return true;
    if (required !== null && required !== "__unknown_route__") {
      if (Array.isArray(required)) {
        if (required.every(p => !userPermissions.includes(p))) return false;
      } else {
        if (!userPermissions.includes(required)) return false;
      }
    }
    return true;
  }

  // السماح بالوصول لصفحة التقرير الختامي لأي مستخدم مسجل
  if (/^\/final-report\/\d+$/.test(pathname)) return true;

  // السماح بالوصول لصفحة طباعة/معاينة تقرير الإنجاز لأي مستخدم داخلي غير طالب الخدمة
  if (/^\/progress-reports\/\d+\/print$/.test(pathname)) {
    return userRole !== "service_requester";
  }

  // السماح بالوصول لصفحة استبيان التقييم العامة أو الخاصة بالطلبات للجميع
  if (pathname === "/evaluation" || pathname.startsWith("/evaluation?") || /^\/requests\/\d+\/evaluation$/.test(pathname) || /^\/requester\/requests\/\d+\/evaluation$/.test(pathname)) {
    return true;
  }

  // السماح بالوصول للصفحة الرئيسية لجميع الموظفين والمستخدمين الإداريين (غير طالبي الخدمة)
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return userRole !== "service_requester";
  }

  // مسار إنشاء عهدة جديدة: يتطلب صراحة صلاحية إنشاء عهدة أو صلاحيات الإدارة العليا
  if (pathname === "/custody-requests/new") {
    if (userRole === "service_requester") return false;
    return (
      userRole === "super_admin" ||
      userRole === "system_admin" ||
      userRole === "executive_director" ||
      userPermissions.includes("*") ||
      userPermissions.includes("custody_requests.create")
    );
  }

  // مسارات العهدة المالية الأخرى: متاحة لمن تم تفعيل قسم العهدة له
  const isCustodyRoute =
    pathname === "/custody-requests" ||
    pathname.startsWith("/custody-requests/");
  if (isCustodyRoute) {
    if (userRole === "service_requester") return false;
    return (
      userRole === "super_admin" ||
      userRole === "system_admin" ||
      userPermissions.includes("*") ||
      userPermissions.includes("custody_requests") ||
      userPermissions.includes("custody_requests.view") ||
      userPermissions.includes("custody_requests.create")
    );
  }

  const required = getRequiredPermission(pathname);

  // لا توجد قيود صلاحية خاصة على هذا المسار (معفى أو مسار طالب خدمة)
  if (required === null) return true;

  // ─── الأدوار غير القابلة للتخصيص (طالب الخدمة) ───
  if (userRole === "service_requester") {
    const basePerms = BASE_ROLE_PERMISSIONS[userRole] || [];
    if (Array.isArray(required)) {
      return required.some(p => basePerms.includes(p));
    }
    return basePerms.includes(required);
  }

  // ─── الأدوار القابلة للتخصيص (الأدوار الأساسية المخصصة والأدوار المبتكرة) ───
  // نتحقق من الصلاحيات الفعلية المحسوبة من قاعدة البيانات
  if (userPermissions.includes("*")) return true;

  if (Array.isArray(required)) {
    // OR logic: يجب أن يملك أي صلاحية منها
    return required.some(p => userPermissions.includes(p));
  }
  return userPermissions.includes(required);
}

/**
 * تحديد الصفحة الرئيسية المناسبة للمستخدم بناءً على دوره وصلاحياته المتاحة فعلياً
 */
export function getInformationDashboardReturnRoute(user: any, permissions: string[], sidebarPaths: string[]): string | null {
  if (!user) return null;
  if (!isDashboardViewerUser(user)) return "/dashboard";

  return sidebarPaths.find(path =>
    path !== "/dashboard" &&
    path !== "/information-dashboard" &&
    hasRouteAccess(path, "dashboard_viewer", permissions, !!user.customRole)
  ) ?? null;
}

export function getUserHomeRoute(user: any): string {
  if (!user) return "/login";
  if (isDashboardViewerUser(user)) return "/information-dashboard";
  if (user.role === "service_requester") return "/requester";

  const userPerms: string[] = (user as any)?.permissions ?? [];
  const isBaseRole = [
    "super_admin", "system_admin", "board_chairman", "board_member",
    "general_manager", "executive_director", "projects_office", "field_team",
    "quick_response", "financial", "financial_manager", "project_manager",
    "corporate_comm", "service_requester", "procurement_officer", "dashboard_viewer"
  ].includes(user.role);
  const hasCustom = !!(user as any)?.customRole || !isBaseRole;

  const canAccess = (path: string) => hasRouteAccess(path, user.role, userPerms, hasCustom);

  const hasDashboard = userPerms.includes("dashboard") || userPerms.includes("dashboard.view") || userPerms.includes("*");

  // 1. أدوار مجلس الإدارة
  if (user.role === "board_chairman" || user.role === "board_member") {
    if (canAccess("/board-dashboard")) return "/board-dashboard";
    if (canAccess("/board-executive")) return "/board-executive";
    if (canAccess("/board-analytics")) return "/board-analytics";
  }

  // 2. مسؤول المشتريات (سواء دور أساسي أو مخصص)
  const isProcurement =
    user.role === "procurement_officer" ||
    (user as any)?.customRole?.nameAr === "مسؤول المشتريات" ||
    ((user as any)?.customRole?.nameEn || "").toLowerCase() === "procurement officer";

  if (isProcurement) {
    if (hasDashboard) return "/dashboard";
    if (canAccess("/quotations")) return "/quotations";
    if (canAccess("/sedana-quotations")) return "/sedana-quotations";
    if (canAccess("/custody-requests")) return "/custody-requests";
    if (canAccess("/contracts")) return "/contracts";
    if (canAccess("/purchase-orders")) return "/purchase-orders";
    if (canAccess("/orders-and-letters")) return "/orders-and-letters";
    if (canAccess("/csr-letters")) return "/csr-letters";
    if (canAccess("/receipt-vouchers")) return "/receipt-vouchers";
  }

  // 2.5 مستخدم لوحة المعلومات
  if (user.role === "dashboard_viewer" || userPerms.includes("information_dashboard") || userPerms.includes("information_dashboard.view")) {
    return "/information-dashboard";
  }

  // 3. لوحة التحكم العامة (الافتراضية لمعظم الموظفين والمدراء)
  if (canAccess("/dashboard")) {
    return "/dashboard";
  }

  // 4. في حال لم تكن لوحة التحكم متاحة للمستخدم (أو تم حجبها أو تخصيص الصلاحيات):
  // نبحث ديناميكياً عن أول مسار متاح له من قائمة الصفحات النظامية
  const candidateRoutes = [
    "/quotations",
    "/sedana-quotations",
    "/custody-requests",
    "/projects",
    "/requests",
    "/mosques",
    "/suppliers",
    "/contracts",
    "/purchase-orders",
    "/orders-and-letters",
    "/csr-letters",
    "/receipt-vouchers",
    "/financial-approval",
    "/disbursements",
    "/reports",
    "/staff",
    "/profile"
  ];

  for (const route of candidateRoutes) {
    if (canAccess(route)) {
      return route;
    }
  }

  // الملاذ الأخير
  return "/profile";
}


