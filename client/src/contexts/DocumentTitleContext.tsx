import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface DocumentTitleContextType {
  setCustomTitle: (title: string | null) => void;
  siteTitle: string;
}

const DocumentTitleContext = createContext<DocumentTitleContextType | undefined>(undefined);

// جدول مطابقة المسارات مع أسماء الصفحات بالعربية
const ROUTE_TITLE_MAP: { pattern: RegExp; title: string }[] = [
  // الصفحة الرئيسية
  { pattern: /^\/$/, title: "" }, // المسار الرئيسي يقتصر على اسم الموقع فقط

  // المصادقة والحسابات
  { pattern: /^\/login\/?$/, title: "تسجيل الدخول" },
  { pattern: /^\/admin\/login\/?$/, title: "تسجيل دخول المشرفين" },
  { pattern: /^\/register\/?$/, title: "إنشاء حساب جديد" },
  { pattern: /^\/profile\/?$/, title: "الملف الشخصي" },
  { pattern: /^\/notifications\/?$/, title: "الإشعارات" },
  { pattern: /^\/notifications\/customization\/?$/, title: "تخصيص الإشعارات" },
  { pattern: /^\/support\/?$/, title: "الدعم الفني" },
  { pattern: /^\/403\/?$/, title: "غير مصرح" },
  { pattern: /^\/404\/?$/, title: "الصفحة غير موجودة" },
  { pattern: /^\/debug-user\/?$/, title: "فحص المستخدم" },

  // لوحات التحكم
  { pattern: /^\/dashboard\/?$/, title: "الرئيسية" },
  { pattern: /^\/board-executive\/?$/, title: "مركز الاعتماد المالي" },
  { pattern: /^\/board-analytics\/?$/, title: "لوحة الإدارة العليا" },
  { pattern: /^\/board-dashboard\/?$/, title: "لوحة مجلس الإدارة" },
  { pattern: /^\/requester\/?$/, title: "لوحة تحكم طالب الخدمة" },
  { pattern: /^\/requester\/dashboard\/?$/, title: "لوحة تحكم طالب الخدمة" },
  { pattern: /^\/supplier\/dashboard\/?$/, title: "لوحة تحكم المورد" },
  { pattern: /^\/financial-dashboard\/?$/, title: "لوحة المؤشرات المالية" },
  { pattern: /^\/kpi-dashboard\/?$/, title: "مؤشرات الأداء" },

  // المساجد
  { pattern: /^\/mosques\/?$/, title: "المساجد" },
  { pattern: /^\/mosques\/map\/?$/, title: "خريطة المساجد" },
  { pattern: /^\/mosques\/new\/?$/, title: "إضافة مسجد جديد" },
  { pattern: /^\/requester\/mosques\/new\/?$/, title: "إضافة مسجد" },
  { pattern: /^\/my-mosques\/?$/, title: "مساجدي" },
  { pattern: /^\/mosques\/[^/]+\/edit-imam\/?$/, title: "تعديل بيانات الإمام" },
  { pattern: /^\/mosques\/[^/]+\/edit\/?$/, title: "تعديل بيانات المسجد" },
  { pattern: /^\/mosques\/[^/]+\/?$/, title: "تفاصيل المسجد" },

  // الطلبات
  { pattern: /^\/track\/?$/, title: "متابعة الطلب" },
  { pattern: /^\/service-request\/?$/, title: "طلب خدمة" },
  { pattern: /^\/request-form-dynamic\/?$/, title: "نموذج طلب خدمة" },
  { pattern: /^\/my-requests\/?$/, title: "طلباتي" },
  { pattern: /^\/requests\/?$/, title: "الطلبات" },
  { pattern: /^\/requests\/new\/?$/, title: "طلب جديد" },
  { pattern: /^\/requests\/quick-create\/?$/, title: "إنشاء طلب سريع" },
  { pattern: /^\/requests\/[^/]+\/edit\/?$/, title: "تعديل الطلب" },
  { pattern: /^\/requests\/[^/]+\/evaluation\/?$/, title: "تقييم الطلب" },
  { pattern: /^\/requester\/requests\/[^/]+\/evaluation\/?$/, title: "تقييم الطلب" },
  { pattern: /^\/requests\/[^/]+\/field-inspection\/?$/, title: "تقرير المعاينة الميدانية" },
  { pattern: /^\/requests\/[^/]+\/quick-response\/?$/, title: "تقرير الاستجابة السريعة" },
  { pattern: /^\/requests\/[^/]+\/assign-final-report\/?$/, title: "إسناد التقرير النهائي" },
  { pattern: /^\/requester\/requests\/[^/]+\/?$/, title: "تفاصيل الطلب" },
  { pattern: /^\/requests\/[^/]+\/?$/, title: "تفاصيل الطلب" },

  // الزيارات الميدانية
  { pattern: /^\/field-visits\/?$/, title: "الزيارات الميدانية" },
  { pattern: /^\/field-visits\/calendar\/?$/, title: "تقويم المواعيد" },
  { pattern: /^\/field-visits\/schedule\/[^/]+\/?$/, title: "جدولة زيارة ميدانية" },
  { pattern: /^\/field-visits\/report\/[^/]+\/?$/, title: "تقرير الزيارة الميدانية" },

  // المشاريع والتقارير
  { pattern: /^\/projects\/?$/, title: "المشاريع" },
  { pattern: /^\/projects\/new\/?$/, title: "إضافة مشروع جديد" },
  { pattern: /^\/projects\/[^/]+\/?$/, title: "تفاصيل المشروع" },
  { pattern: /^\/project-management\/?$/, title: "إدارة المشاريع" },
  { pattern: /^\/project-reports\/?$/, title: "تقارير المشاريع" },
  { pattern: /^\/project-reports\/new\/?$/, title: "تقرير مشروع جديد" },
  { pattern: /^\/project-reports\/[^/]+\/print\/?$/, title: "طباعة تقرير المشروع" },
  { pattern: /^\/project-reports\/[^/]+\/pdf\/?$/, title: "تصدير تقرير المشروع" },
  { pattern: /^\/project-reports\/semi-monthly\/?$/, title: "التقرير نصف الشهري" },
  { pattern: /^\/project-reports\/monthly\/?$/, title: "التقرير الشهري" },
  { pattern: /^\/project-reports\/quarterly\/?$/, title: "التقرير الربع سنوي" },
  { pattern: /^\/project-reports\/visit\/?$/, title: "تقرير زيارة مشروع" },
  { pattern: /^\/reports\/?$/, title: "التقارير الفنية" },
  { pattern: /^\/pending-reports\/?$/, title: "تقارير الطلبات" },
  { pattern: /^\/final-report\/new\/?$/, title: "تقرير ختامي جديد" },
  { pattern: /^\/final-report\/[^/]+\/?$/, title: "التقرير الختامي" },
  { pattern: /^\/progress-reports\/?$/, title: "تقارير الإنجاز" },
  { pattern: /^\/progress-reports\/[^/]+\/print\/?$/, title: "طباعة تقرير الإنجاز" },

  // الموردين والعقود
  { pattern: /^\/supplier\/register\/?$/, title: "تسجيل مورد جديد" },
  { pattern: /^\/suppliers\/?$/, title: "الموردون" },
  { pattern: /^\/suppliers\/new\/?$/, title: "إضافة مورد جديد" },
  { pattern: /^\/suppliers\/[^/]+\/edit\/?$/, title: "تعديل بيانات المورد" },
  { pattern: /^\/suppliers\/[^/]+\/?$/, title: "بيانات المورد" },
  { pattern: /^\/contracts\/?$/, title: "العقود" },
  { pattern: /^\/contracts\/new\/?$/, title: "عقد جديد" },
  { pattern: /^\/contracts\/new\/[^/]+\/?$/, title: "عقد جديد" },
  { pattern: /^\/contracts\/new\/request\/[^/]+\/?$/, title: "عقد جديد لطلب" },
  { pattern: /^\/contracts\/[^/]+\/edit\/?$/, title: "تعديل العقد" },
  { pattern: /^\/contracts\/[^/]+\/preview\/?$/, title: "معاينة العقد" },
  { pattern: /^\/contracts\/[^/]+\/print\/?$/, title: "طباعة العقد" },
  { pattern: /^\/contracts\/[^/]+\/?$/, title: "تفاصيل العقد" },
  { pattern: /^\/contract-templates\/?$/, title: "نماذج العقود" },
  { pattern: /^\/contract-templates\/[^/]+\/preview\/?$/, title: "معاينة نموذج العقد" },
  { pattern: /^\/contract-templates\/[^/]+\/print\/?$/, title: "طباعة نموذج العقد" },

  // الشؤون المالية وجداول الكميات
  { pattern: /^\/boq-preparations\/?$/, title: "إعداد جداول الكميات" },
  { pattern: /^\/boq\/[^/]+\/?$/, title: "جدول الكميات" },
  { pattern: /^\/quotations\/?$/, title: "عروض الأسعار" },
  { pattern: /^\/financial-approval\/?$/, title: "الاعتماد المالي" },
  { pattern: /^\/financial-report\/?$/, title: "التقرير المالي" },
  { pattern: /^\/categories\/?$/, title: "إدارة التصنيفات" },

  // طلبات الصرف وأوامر الصرف وسندات القبض
  { pattern: /^\/disbursements\/?$/, title: "طلبات الصرف" },
  { pattern: /^\/disbursement-requests\/?$/, title: "طلبات الصرف" },
  { pattern: /^\/disbursements\/new\/?$/, title: "طلب صرف جديد" },
  { pattern: /^\/disbursements\/new-linked\/?$/, title: "طلب صرف مرتبط" },
  { pattern: /^\/disbursements\/requests\/[^/]+\/edit\/?$/, title: "تعديل طلب الصرف" },
  { pattern: /^\/disbursements\/new\/[^/]+\/?$/, title: "طلب صرف لمشروع" },
  { pattern: /^\/disbursements\/new\/contract\/[^/]+\/?$/, title: "طلب صرف لعقد" },
  { pattern: /^\/disbursements\/requests\/[^/]+\/print\/?$/, title: "طباعة طلب الصرف" },
  { pattern: /^\/disbursements\/requests\/[^/]+\/?$/, title: "تفاصيل طلب الصرف" },
  { pattern: /^\/payments\/edit\/[^/]+\/?$/, title: "تعديل الدفعة" },

  { pattern: /^\/disbursement-orders\/?$/, title: "أوامر الصرف" },
  { pattern: /^\/disbursement-orders\/new-direct\/?$/, title: "أمر صرف مباشر" },
  { pattern: /^\/disbursement-orders\/new\/[^/]+\/?$/, title: "أمر صرف جديد" },
  { pattern: /^\/disbursement-orders\/[^/]+\/print\/?$/, title: "طباعة أمر الصرف" },
  { pattern: /^\/disbursement-orders\/[^/]+$/, title: "تفاصيل أمر الصرف" },
  { pattern: /^\/disbursements\/orders\/new\/[^/]+\/?$/, title: "أمر صرف جديد" },
  { pattern: /^\/disbursements\/orders\/[^/]+\/print\/?$/, title: "طباعة أمر الصرف" },

  { pattern: /^\/receipt-vouchers\/?$/, title: "سندات القبض" },
  { pattern: /^\/receipt-vouchers\/[^/]+\/print\/?$/, title: "طباعة سند القبض" },
  { pattern: /^\/receipt-vouchers\/[^/]+\/?$/, title: "تفاصيل سند القبض" },
  { pattern: /^\/handovers\/?$/, title: "محاضر الاستلام" },

  // المستخدمين والصلاحيات
  { pattern: /^\/staff\/?$/, title: "إدارة المستخدمين والأدوار" },
  { pattern: /^\/users\/?$/, title: "إدارة المستخدمين" },
  { pattern: /^\/roles\/?$/, title: "إدارة الأدوار" },
  { pattern: /^\/job-positions\/?$/, title: "المسميات الوظيفية" },
  { pattern: /^\/requester-approvals\/?$/, title: "اعتمادات طالبي الخدمة" },
  { pattern: /^\/requester-approvals\/[^/]+\/?$/, title: "تفاصيل اعتماد طالب الخدمة" },
  { pattern: /^\/staff\/roles\/[^/]+\/?$/, title: "صلاحيات الدور" },
  { pattern: /^\/roles\/[^/]+\/edit\/?$/, title: "تعديل الدور" },
  { pattern: /^\/roles\/[^/]+\/?$/, title: "تعديل الدور" },
  { pattern: /^\/users\/[^/]+\/permissions\/?$/, title: "صلاحيات المستخدم" },
  { pattern: /^\/users\/[^/]+\/edit\/?$/, title: "تعديل بيانات المستخدم" },
  { pattern: /^\/users\/[^/]+\/?$/, title: "تفاصيل المستخدم" },
  { pattern: /^\/permissions-audit\/?$/, title: "سجل تدقيق الصلاحيات" },

  // إعدادات النظام والهوية
  { pattern: /^\/organization-settings\/?$/, title: "إعدادات الجمعية" },
  { pattern: /^\/branding\/?$/, title: "الهوية البصرية" },
  { pattern: /^\/settings\/?$/, title: "الإعدادات العامة" },
  { pattern: /^\/stage-settings\/?$/, title: "إعدادات المراحل" },
  { pattern: /^\/action-settings\/?$/, title: "إعدادات الإجراءات" },
  { pattern: /^\/program-customization\/?$/, title: "تخصيص البرامج والمشاريع" },
  { pattern: /^\/forms-customization\/?$/, title: "تخصيص النماذج" },
  { pattern: /^\/forms-customization\/evaluation\/?$/, title: "تخصيص استمارة تقييم رضا المستفيد" },
  { pattern: /^\/forms-customization\/services\/?$/, title: "تخصيص نماذج طلبات الخدمات" },
  { pattern: /^\/forms-customization\/services\/[^/]+\/?$/, title: "تخصيص نموذج الخدمة" },
  { pattern: /^\/forms-customization\/option-2\/?$/, title: "الخيار الثاني (تخصيص النماذج)" },
  { pattern: /^\/partners\/?$/, title: "الشركاء" },
];

export function getRouteTitle(path: string): string {
  const cleanPath = path.split("?")[0].split("#")[0] || "/";
  for (const item of ROUTE_TITLE_MAP) {
    if (item.pattern.test(cleanPath)) {
      return item.title;
    }
  }
  return "";
}

export function DocumentTitleProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // قراءة الاسم المخزن مؤقتاً في localStorage لمنع أي وميض أو تأخير عند تحميل الصفحة
  const [cachedSiteTitle, setCachedSiteTitle] = useState<string>(() => {
    try {
      return localStorage.getItem("app_meta_title") || "بوابة تمام للعناية بالمساجد";
    } catch {
      return "بوابة تمام للعناية بالمساجد";
    }
  });

  // حساب اسم الموقع من عنوان تبويب المتصفح المدخل في الإعدادات، أو اسم الجمعية
  const siteTitle = useMemo(() => {
    if (orgSettings?.metaTitle && orgSettings.metaTitle.trim()) {
      return orgSettings.metaTitle.trim();
    }
    if (orgSettings?.organizationName && orgSettings.organizationName.trim()) {
      return orgSettings.organizationName.trim();
    }
    return cachedSiteTitle || "بوابة تمام للعناية بالمساجد";
  }, [orgSettings?.metaTitle, orgSettings?.organizationName, cachedSiteTitle]);

  // حفظ اسم الموقع المحدث في localStorage للمستقبل
  useEffect(() => {
    if (siteTitle && siteTitle.trim()) {
      try {
        localStorage.setItem("app_meta_title", siteTitle.trim());
      } catch {}
      setCachedSiteTitle(siteTitle.trim());
    }
  }, [siteTitle]);

  // إعادة تعيين العنوان المخصص عند تغير المسار
  useEffect(() => {
    setCustomTitle(null);
  }, [location]);

  // تحديث document.title عند تغير المسار أو اسم الموقع أو العنوان المخصص
  useEffect(() => {
    const cleanLocation = location.split("?")[0].split("#")[0] || "/";

    if (cleanLocation === "/") {
      // في الصفحة الرئيسية فقط يظهر اسم الموقع المكتوب في "عنوان تبويب المتصفح"
      document.title = siteTitle;
    } else {
      // في صفحات الموقع الأخرى يظهر: اسم الصفحة - اسم الموقع
      const pageName = customTitle || getRouteTitle(cleanLocation);
      if (pageName && pageName.trim()) {
        document.title = `${pageName.trim()} - ${siteTitle}`;
      } else {
        document.title = siteTitle;
      }
    }
  }, [location, siteTitle, customTitle]);

  return (
    <DocumentTitleContext.Provider value={{ setCustomTitle, siteTitle }}>
      {children}
    </DocumentTitleContext.Provider>
  );
}

/**
 * خطاف لتخصيص عنوان الصفحة بشكل ديناميكي من داخل أي مكوّن صفحة
 * مثال: useDocumentTitle("مسجد الهدى") -> "مسجد الهدى - [اسم الموقع]"
 */
export function useDocumentTitle(dynamicTitle?: string | null) {
  const context = useContext(DocumentTitleContext);
  useEffect(() => {
    if (!context || !dynamicTitle) return;
    context.setCustomTitle(dynamicTitle);
    return () => {
      context.setCustomTitle(null);
    };
  }, [context, dynamicTitle]);
  return context;
}
