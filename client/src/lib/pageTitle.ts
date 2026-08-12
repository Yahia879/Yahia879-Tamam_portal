/**
 * دالة جلب عنوان الصفحة باللغة العربية بناءً على المسار الحالي (location)
 */
export function getPageTitle(pathname: string): string {
  // 1. التطابقات الدقيقة للمسارات
  const exactTitles: Record<string, string> = {
    "/": "",
    "/dashboard": "لوحة التحكم",
    "/requester": "لوحة المستفيد",
    "/requester/dashboard": "لوحة المستفيد",
    "/my-requests": "طلباتي",
    "/my-mosques": "مساجدي",
    "/mosques": "المساجد",
    "/mosques/map": "خريطة المساجد",
    "/mosques/new": "إضافة مسجد",
    "/requester/mosques/new": "تسجيل مسجد",
    "/requests": "الطلبات",
    "/requests/new": "طلب جديد",
    "/requests/quick-create": "إنشاء طلب سريع",
    "/field-visits": "الزيارات الميدانية",
    "/field-visits/calendar": "تقويم المواعيد",
    "/request-form-dynamic": "نموذج طلب خدمة",
    "/projects": "المشاريع",
    "/project-management": "إدارة المشاريع",
    "/project-reports": "تقارير المشاريع",
    "/project-reports/new": "تقرير مشروع جديد",
    "/project-reports/semi-monthly": "التقارير النصف شهرية",
    "/project-reports/monthly": "التقارير الشهرية",
    "/project-reports/quarterly": "التقارير الربع سنوية",
    "/project-reports/visit": "تقارير الزيارات",
    "/suppliers": "الموردون",
    "/suppliers/new": "إضافة مورد",
    "/supplier/register": "تسجيل مورد",
    "/supplier/dashboard": "لوحة المورد",
    "/boq-preparations": "إعداد جداول الكميات",
    "/quotations": "عروض الأسعار",
    "/financial-approval": "الاعتماد المالي",
    "/contracts": "العقود",
    "/contracts/new": "إضافة عقد جديد",
    "/contract-templates": "نماذج العقود",
    "/categories": "إدارة التصنيفات",
    "/disbursements": "طلبات الصرف",
    "/disbursement-requests": "طلبات الصرف",
    "/disbursements/new": "طلب صرف جديد",
    "/disbursement-orders": "أوامر الصرف",
    "/disbursement-orders/new": "أمر صرف جديد",
    "/receipt-vouchers": "سندات القبض",
    "/progress-reports": "تقارير الإنجاز",
    "/financial-dashboard": "اللوحة المالية",
    "/financial-report": "التقرير المالي",
    "/partners": "الشركاء",
    "/branding": "الهوية البصرية",
    "/settings": "مركز الإعدادات",
    "/organization-settings": "إعدادات المنظمة",
    "/staff": "إدارة المستخدمين",
    "/users": "إدارة المستخدمين",
    "/roles": "الأدوار والصلاحيات",
    "/job-positions": "المسميات الوظيفية",
    "/user-permissions": "صلاحيات المستخدمين",
    "/permissions-audit-log": "سجل التغييرات",
    "/requester-approvals": "إدارة المستفيدين",
    "/handovers": "محاضر الاستلام",
    "/kpi-dashboard": "مؤشرات الأداء",
    "/stage-settings": "إعدادات المراحل",
    "/action-settings": "إعدادات الإجراءات",
    "/program-customization": "تخصيص البرنامج",
    "/notification-customization": "تخصيص الإشعارات",
    "/profile": "الملف الشخصي",
    "/notifications": "الإشعارات",
    "/support": "الدعم الفني",
    "/reports": "التقارير الفنية",
    "/pending-reports": "تقارير الطلبات",
    "/login": "تسجيل الدخول",
    "/admin/login": "تسجيل دخول الإدارة",
    "/register": "إنشاء حساب",
    "/track": "تتبع الطلب",
    "/service-request": "تقديم طلب خدمة",
    "/403": "غير مصرح",
  };

  if (exactTitles[pathname] !== undefined) {
    return exactTitles[pathname];
  }

  // 2. التطابقات الجزئية للمسارات الديناميكية (مثل /mosques/123)
  if (pathname.startsWith("/mosques/") && pathname.endsWith("/edit")) return "تعديل بيانات المسجد";
  if (pathname.startsWith("/mosques/") && pathname.endsWith("/edit-imam")) return "تعديل بيانات الإمام";
  if (pathname.startsWith("/mosques/")) return "تفاصيل المسجد";

  if (pathname.startsWith("/requests/") && pathname.endsWith("/edit")) return "تعديل الطلب";
  if (pathname.startsWith("/requests/") && pathname.includes("/field-inspection")) return "المعاينة الميدانية";
  if (pathname.startsWith("/requests/") && pathname.includes("/quick-response")) return "تقرير الاستجابة السريعة";
  if (pathname.startsWith("/requests/") && pathname.includes("/assign-final-report")) return "إسناد التقرير النهائي";
  if (pathname.startsWith("/requests/")) return "تفاصيل الطلب";
  if (pathname.startsWith("/requester/requests/")) return "تفاصيل الطلب";

  if (pathname.startsWith("/projects/")) return "تفاصيل المشروع";
  if (pathname.startsWith("/project-reports/")) return "تقارير المشاريع";

  if (pathname.startsWith("/suppliers/") && pathname.endsWith("/edit")) return "تعديل بيانات المورد";
  if (pathname.startsWith("/suppliers/")) return "تفاصيل المورد";

  if (pathname.startsWith("/users/") && pathname.endsWith("/edit")) return "تعديل بيانات المستخدم";
  if (pathname.startsWith("/users/")) return "تفاصيل المستخدم";

  if (pathname.startsWith("/contracts/") && pathname.includes("/preview")) return "معاينة العقد";
  if (pathname.startsWith("/contracts/") && pathname.includes("/print")) return "طباعة العقد";
  if (pathname.startsWith("/contracts/")) return "تفاصيل العقد";

  if (pathname.startsWith("/disbursement-orders/")) return "تفاصيل أمر الصرف";
  if (pathname.startsWith("/disbursements/")) return "تفاصيل طلب الصرف";

  if (pathname.startsWith("/field-visits/")) return "الزيارات الميدانية";
  if (pathname.startsWith("/requester-approvals/")) return "تفاصيل المستفيد";

  return "";
}

/**
 * تنسيق عنوان التبويب النهائي: "اسم الصفحة - عنوان تبويب المتصفح"
 */
export function formatDocumentTitle(pageTitle: string, metaTitle?: string | null): string {
  const baseTitle = metaTitle && metaTitle.trim() ? metaTitle.trim() : "بوابة تمام للعناية بالمساجد";
  if (!pageTitle || pageTitle.trim() === "") {
    return baseTitle;
  }
  return `${pageTitle} - ${baseTitle}`;
}
