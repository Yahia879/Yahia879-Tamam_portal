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

  projects_office: [
    "mosques", "mosques_map", "requests", "appointments_calendar",
    "projects", "service_requester_accounts",
    "suppliers", "quotations", "financial_approval", "contracts",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers",
    "progress_reports", "financial_report", "reports",
  ],

  field_team: [
    "requests", "appointments_calendar",
  ],

  quick_response: [
    "requests",
  ],

  financial: [
    "suppliers", "quotations", "financial_approval",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers", "financial_report",
    "contracts",
  ],

  financial_manager: [
    "suppliers", "quotations", "financial_approval",
    "disbursement_requests", "disbursement_orders", "receipt_vouchers", "financial_report",
    "contracts", "requests",
  ],

  project_manager: [
    "projects", "progress_reports", "requests", "contracts", "disbursement_requests", "receipt_vouchers"
  ],

  corporate_comm: [
    "requests", "settings_center",
  ],

  board_chairman: [
    "board_chairman", "board_member", "mosques", "mosques_map", "requests", "appointments_calendar",
    "projects", "service_requester_accounts", "suppliers", "quotations", "financial_approval",
    "contracts", "disbursement_requests", "disbursement_orders", "receipt_vouchers",
    "progress_reports", "financial_report", "reports",
  ],

  board_member: [
    "board_member", "financial_report", "reports", "mosques", "requests", "projects",
  ],

  service_requester: [], // طالب الخدمة لا يملك صلاحيات إدارية
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
  "/board-analytics": ["board_member", "board_chairman", "board_chairman_view"],

  // ── لوحة التحكم ──
  "/dashboard": ["mosques", "requests", "projects", "suppliers", "staff_management", "settings_center"],

  // ── المساجد ──
  "/mosques": "mosques",
  "/mosques/map": "mosques_map",
  "/mosques/new": "mosques",
  // /mosques/:id و /mosques/:id/edit تُعالج بنمط regex

  // ── الطلبات ──
  "/requests": "requests.view",
  "/requests/new": "requests.create",
  "/requests/quick-create": ["requests.create_quick_request", "requests.manage_as_quick_response"],
  "/field-visits": "requests.view",
  "/field-visits/calendar": "appointments_calendar",

  // ── المشاريع ──
  "/projects": ["projects.view", "projects.view_details", "projects.financials"],
  "/project-management": ["projects.view", "projects.view_details"],

  // ── إدارة المستخدمين ──
  "/staff": "staff_management",
  "/users": "staff_management",
  "/roles": "staff_management",
  "/job-positions": "staff_management",
  "/requester-approvals": ["staff_management", "service_requester_accounts"],
  "/permissions-audit": "staff_management",
  "/notifications/customization": "staff_notifications.edit",

  // ── الموردون ──
  "/suppliers": "suppliers",
  "/suppliers/new": "suppliers.add",

  // ── عروض الأسعار ──
  "/quotations": "quotations",

  // ── الاعتماد المالي ──
  "/financial-approval": ["financial_approval.view", "financial_approval.approve"],
  "/boq-preparations": ["quotations", "requests.view_details", "requests.view", "boq", "boq.add", "boq.edit", "boq.delete"],

  // ── العقود ──
  "/contracts": "contracts",
  "/contracts/new": "contracts",

  // ── طلبات وأوامر الصرف وسندات القبض ──
  "/financial-dashboard": ["disbursement_requests", "financial_report"],
  "/disbursements": "disbursement_requests",
  "/disbursement-requests": "disbursement_requests",
  "/disbursement-orders": "disbursement_orders",
  "/disbursement-orders/new-direct": "disbursement_orders",
  "/receipt-vouchers": ["receipt_vouchers", "receipt_vouchers.view", "receipt_vouchers.edit"],
  "/receipt-vouchers/new": ["receipt_vouchers", "receipt_vouchers.edit"],

  // ── تقارير الإنجاز والمشاريع ──
  "/progress-reports": "progress_reports",
  "/project-reports": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],
  "/project-reports/new": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],
  "/project-reports/semi-monthly": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],
  "/project-reports/monthly": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],
  "/project-reports/quarterly": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],
  "/project-reports/visit": ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"],

  // ── الاستلامات ──
  "/handovers": ["projects", "contracts"],
  "/final-report/new": ["projects", "requests.view_details", "requests.upload_final_report", "pending_reports.intervene"],

  // ── مؤشرات الأداء ──
  "/kpi-dashboard": ["projects", "requests.view_details"],

  // ── التقارير ──
  "/reports": ["reports.view_stats", "reports.export_data", "reports.view", "progress_reports", "financial_report", "requests.view"],
  "/pending-reports": ["pending_reports.view"],
  "/financial-report": "financial_report",

  // ── الإعدادات ──
  "/settings": [
    "settings_center",
    "settings_org.view",
    "settings_org.edit_basic",
    "settings_org.edit_signers",
    "settings_org.edit_banks",
    "settings_org.edit_contracts",
    "settings_branding.edit",
    "settings_contracts.view",
    "settings_contracts.edit",
    "settings_categories.view",
    "settings_categories.add",
    "settings_categories.edit",
    "settings_categories.delete",
    "settings.stages_view",
    "settings.actions_view"
  ],
  "/branding": ["settings_center", "settings_branding.edit"],
  "/organization-settings": ["settings_center", "settings_org.view"],
  "/stage-settings": ["settings_center", "settings.stages_view"],
  "/action-settings": ["settings_center", "settings.actions_view"],
  "/categories": [
    "settings_center",
    "settings_categories.view",
    "settings_categories.add",
    "settings_categories.edit",
    "settings_categories.delete"
  ],
  "/contract-templates": ["settings_center", "settings_contracts.view", "contracts"],
  "/program-customization": "programs_services",
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
  // المساجد
  { pattern: /^\/mosques\/\d+\/edit-imam$/, permission: "mosques" },
  { pattern: /^\/mosques\/\d+\/edit$/, permission: "mosques" },
  { pattern: /^\/mosques\/\d+$/, permission: "mosques" },

  // استبيان تقييم رضا المستفيد (مخصص لطالب الخدمة)
  { pattern: /^\/requests\/\d+\/evaluation$/, permission: "service_requester_only" },
  { pattern: /^\/requester\/requests\/\d+\/evaluation$/, permission: "service_requester_only" },

  // الطلبات
  { pattern: /^\/requests\/\d+\/edit$/, permission: "requests.view_details" },
  { pattern: /^\/requests\/\d+\/field-inspection$/, permission: ["requests.view_details", "requests.manage_as_field_team", "pending_reports.intervene"] },
  { pattern: /^\/requests\/\d+\/quick-response$/, permission: ["requests.view_details", "requests.manage_as_quick_response", "pending_reports.intervene"] },
  { pattern: /^\/requests\/\d+\/assign-final-report$/, permission: "requests.view_details" },
  { pattern: /^\/requests\/\d+$/, permission: ["requests.view_details", "requests.manage_as_field_team", "requests.manage_as_quick_response", "requests.upload_final_report", "pending_reports.intervene"] },

  // الزيارات الميدانية
  { pattern: /^\/field-visits\/schedule\/\d+$/, permission: ["appointments_calendar", "requests.view_details"] },
  { pattern: /^\/field-visits\/report\/\d+$/, permission: ["requests.view_details", "requests.manage_as_field_team"] },

  // المشاريع
  { pattern: /^\/projects\/\d+$/, permission: ["projects.view_details", "projects.financials"] },

  // الموردون
  { pattern: /^\/suppliers\/\d+\/edit$/, permission: "suppliers.edit" },
  { pattern: /^\/suppliers\/\d+$/, permission: "suppliers.view_details" },

  // المستخدمين
  { pattern: /^\/users\/\d+\/edit$/, permission: "staff_management" },
  { pattern: /^\/users\/\d+\/permissions$/, permission: "staff_management" },
  { pattern: /^\/users\/\d+$/, permission: "staff_management" },
  { pattern: /^\/requester-approvals\/\d+$/, permission: ["staff_management", "service_requester_accounts"] },

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
  { pattern: /^\/boq\/\d+$/, permission: ["quotations", "requests.view_details", "boq", "boq.add", "boq.edit", "boq.delete"] },

  // طلبات الصرف
  { pattern: /^\/disbursements\/new$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new-linked$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new\/\d+$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/new\/contract\/\d+$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/requests\/\d+\/edit$/, permission: "disbursement_requests" },
  { pattern: /^\/disbursements\/requests\/\d+\/print$/, permission: "disbursement_requests" },
  { pattern: /^\/payments\/edit\/[^/]+$/, permission: "disbursement_requests" },

  // أوامر الصرف
  { pattern: /^\/disbursement-orders\/new\/\d+$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursement-orders\/\d+\/print$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursement-orders\/\d+$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursements\/orders\/new\/\d+$/, permission: "disbursement_orders" },
  { pattern: /^\/disbursements\/orders\/\d+\/print$/, permission: "disbursement_orders" },

  // التقارير الختامية
  { pattern: /^\/final-report\/\d+$/, permission: ["projects", "requests.view_details"] },

  // تقارير الإنجاز والمشاريع
  { pattern: /^\/receipt-vouchers\/\d+(\/print)?$/, permission: ["receipt_vouchers", "receipt_vouchers.view", "receipt_vouchers.edit"] },
  { pattern: /^\/progress-reports\/\d+\/print$/, permission: "progress_reports" },
  { pattern: /^\/project-reports\/.*$/, permission: ["projects", "projects.view", "projects.view_details", "progress_reports", "reports"] },
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
  // super_admin و system_admin لهما كل الصلاحيات دائماً إلا إذا سُحبت صلاحية معينة صراحةً
  if (userRole === "super_admin" || userRole === "system_admin") {
    if (userPermissions.includes("*") || userPermissions.length === 0) return true;
    const required = getRequiredPermission(pathname);
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

  // السماح بالوصول لصفحة تقييم رضا المستفيد لطالب الخدمة وللمدراء فقط
  if (/^\/requests\/\d+\/evaluation$/.test(pathname) || /^\/requester\/requests\/\d+\/evaluation$/.test(pathname)) {
    return userRole === "service_requester" || userRole === "super_admin" || userRole === "system_admin";
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
export function getUserHomeRoute(user: any): string {
  if (!user) return "/login";
  if (user.role === "service_requester") return "/requester";
  if (["super_admin", "system_admin", "board_chairman", "board_member"].includes(user.role)) return "/dashboard";

  const userPerms: string[] = user.permissions ?? [];
  const isBaseRole = ["super_admin", "system_admin", "board_chairman", "board_member", "general_manager", "executive_director", "projects_office", "field_team", "quick_response", "financial", "financial_manager", "project_manager", "corporate_comm", "service_requester"].includes(user.role);
  const hasCustom = !!user.customRole || !isBaseRole;

  // 1. التحقق من المسار الافتراضي المخصص للدور أولاً
  const roleDefaultRoutes: Record<string, string> = {
    projects_office: "/mosques",
    field_team: "/field-visits",
    quick_response: "/requests",
    financial: "/suppliers",
    financial_manager: "/suppliers",
    project_manager: "/projects",
    corporate_comm: "/reports",
  };

  const defaultRoute = roleDefaultRoutes[user.role];
  if (defaultRoute && hasRouteAccess(defaultRoute, user.role, userPerms, hasCustom)) {
    return defaultRoute;
  }

  // 2. التحقق من بقية المسارات حسب الأولوية
  const fallbackPaths = [
    "/mosques",
    "/requests",
    "/projects",
    "/suppliers",
    "/staff",
    "/settings",
    "/field-visits",
    "/program-customization",
    "/field-visits/calendar",
    "/quotations",
    "/financial-approval",
    "/contracts",
    "/disbursements",
    "/disbursement-orders",
    "/progress-reports",
    "/financial-report",
    "/partners",
  ];

  for (const path of fallbackPaths) {
    if (hasRouteAccess(path, user.role, userPerms, hasCustom)) {
      return path;
    }
  }

  // 3. الملاذ الأخير هو الملف الشخصي العام
  return "/profile";
}

