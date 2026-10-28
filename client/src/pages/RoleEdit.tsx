import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { formatErrorMessage } from "../lib/utils";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Shield, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  LayoutDashboard, 
  Handshake, 
  Palette, 
  Star,
  FileText,
  AlertCircle,
  AlertTriangle,
  MapPin,
  CalendarDays,
  ClipboardList,
  Users,
  Receipt,
  CheckSquare,
  Wallet,
  Banknote,
  FileBarChart,
  LayoutGrid,
  Zap,
  Map,
  Calendar,
  ClipboardCheck,
  Building2,
  FileSignature,
  Settings,
  Briefcase,
  Layers,
  Tag,
  Save,
  Bell,
  FileSpreadsheet,
  LifeBuoy,
  PenLine,
  SlidersHorizontal,
  HeartHandshake,
  BarChart3,
  ShieldAlert,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  Sparkles,
  Send,
  Landmark,
  CreditCard,
  Gift,
  MessageSquareQuote,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

// ==================== الهيكل التفصيلي للصلاحيات الموحد ====================
// مأخوذ من superAdminGroups في RolePermissions.tsx لتوحيد الواجهات بالكامل
const superAdminGroups = [
  {
    title: "الرئيسية",
    modules: [
      { id: "information_dashboard", nameAr: "لوحة المعلومات", icon: LayoutDashboard, perms: ["view"] },
      {
        id: "board_leadership",
        nameAr: "مجلس الإدارة والقيادة العليا",
        icon: Shield,
        perms: ["board_chairman", "board_member", "remind"]
      }
    ]
  },
  {
    title: "المساجد والطلبات",
    modules: [
      { id: "mosques", nameAr: "المساجد", icon: Building2, perms: ["view", "create", "edit", "delete", "approve"] },
      { id: "mosque_map", nameAr: "خريطة المساجد", icon: Map, perms: ["view"] },
      { id: "requests", nameAr: "الطلبات", icon: Zap, perms: ["view", "create", "view_details", "add_review_note", "transfer_to_beneficiary", "manage_as_field_team", "manage_as_quick_response", "upload_final_report", "create_quick_request"] },
      { id: "sedana_requests", nameAr: "طلبات سدانة", icon: Sparkles, perms: ["view", "desk_review", "manage"] },
      { id: "escalation", nameAr: "التصعيد الإداري", icon: AlertTriangle, perms: ["view"] },
      { id: "pending_reports", nameAr: "تقارير الطلبات", icon: FileText, perms: ["view", "intervene"] },
      { id: "appointments", nameAr: "تقويم المواعيد", icon: Calendar, perms: ["view_all", "view_own"] },
      { id: "beneficiary_evaluations", nameAr: "رضا المستفيدين", icon: HeartHandshake, perms: ["view", "evaluations_log", "dispatch_log", "contacts", "reply", "hide"] },
    ]
  },
  {
    title: "الهندسة والمشاريع",
    modules: [
      { id: "projects", nameAr: "المشاريع", icon: LayoutGrid, perms: ["view", "view_details", "create_multi_mosque", "assign_as_manager", "financials", "edit_support_and_fees", "add_receipt_voucher"] },
      { id: "progress_reports", nameAr: "تقارير الإنجاز", icon: ClipboardCheck, perms: ["view", "add", "edit", "approve", "revoke_approval", "exception_approve"] },
      { id: "progress_invoices", nameAr: "المستخلصات", icon: FileSpreadsheet, perms: ["view", "add", "edit", "approve", "revoke_approval", "exception_approve"] },
      { id: "project_reports", nameAr: "تقارير المشاريع", icon: FileText, perms: ["view", "create"] },
      { id: "reports", nameAr: "التقارير الفنية", icon: FileBarChart, perms: ["view_stats", "export_data"] },
    ]
  },
  {
    title: "المشتريات والمالية",
    modules: [
      { id: "suppliers", nameAr: "الموردون", icon: Users, perms: ["view", "view_details", "add", "edit", "approve", "suspend"] },
      { id: "boq", nameAr: "إعداد جداول الكميات", icon: FileSpreadsheet, perms: ["view", "add", "edit", "delete", "import", "export"] },
      { id: "quotations", nameAr: "عروض الأسعار", icon: Receipt, perms: ["view", "view_sedana", "add", "approve"] },
      { 
        id: "financial_approval", 
        nameAr: "قسم الاعتمادات", 
        icon: CheckSquare, 
        perms: [
          "progress_invoices",
          "disbursement_requests", 
          "disbursement_orders", 
          "custody_requests", 
          "receipt_vouchers", 
          "contracts", 
          "purchase_orders", 
          "progress_reports"
        ] 
      },
      { id: "contracts", nameAr: "العقود", icon: FileSignature, perms: ["view", "create", "approve", "edit_approved", "template_add", "template_edit", "template_delete", "clause_add"] },
      { id: "disbursements", nameAr: "طلبات الصرف", icon: Wallet, perms: ["view", "add", "edit", "delete", "approve", "create_custom", "create_from_fund", "exception_approve"] },
      { id: "receipt_vouchers", nameAr: "سندات القبض", icon: Receipt, perms: ["view", "add", "edit", "exception_approve"] },
      { id: "fund", nameAr: "الصندوق", icon: Landmark, perms: ["view", "transfer"] },
      { id: "disbursement_orders", nameAr: "أوامر الصرف", icon: Banknote, perms: ["view", "create_direct", "exception_approve", "remind", "cancel_executed"] },
      { id: "financial_reports", nameAr: "التقرير المالي", icon: FileBarChart, perms: ["view", "export"] },
      { id: "custody_requests", nameAr: "العهدة المالية", icon: Wallet, perms: ["view", "create"] },
    ]
  },
  {
    title: "إدارة المخزون",
    modules: [
      { id: "sedana_quotations", nameAr: "عروض أسعار سدانة", icon: Receipt, perms: ["export_pdf", "add", "recommend", "approve"] },
      { id: "orders_and_letters", nameAr: "مالية سدانة", icon: ShoppingBag, perms: ["disbursement_orders", "csr_letters", "purchase_orders"] },
      { id: "purchase_orders", nameAr: "أوامر الشراء", icon: ShoppingCart, perms: ["view", "add", "create_disbursement"] },
      { id: "csr_letters", nameAr: "المسؤولية المجتمعية", icon: HeartHandshake, perms: ["view", "add"] },
      { id: "sedana_warehouse", nameAr: "المستودع الافتراضي", icon: Boxes, perms: ["view", "inward", "outbound"] },
    ]
  },
  {
    title: "الدعم الفني",
    modules: [
      { id: "technical_support", nameAr: "الدعم الفني", icon: LifeBuoy, perms: ["view", "create"] }
    ]
  },
  {
    title: "إدارة المستخدمين",
    modules: [
      { id: "staff_users", nameAr: "إدارة المستخدمين", icon: Users, perms: ["view", "add", "edit", "customize", "suspend", "activate", "delete"] },
      { id: "staff_roles", nameAr: "الأدوار والصلاحيات", icon: Shield, perms: ["view", "customize", "suspend"] },
      { id: "staff_custom_roles", nameAr: "الأدوار المخصصة", icon: Briefcase, perms: ["view", "add", "edit", "delete"] },
    ]
  },
  {
    title: "إدارة المستفيدين",
    modules: [
      { id: "requester_accounts", nameAr: "حسابات طالبي الخدمة", icon: Users, perms: ["view", "view_details", "create", "approve", "suspend"] },
      { id: "requester_exceptions", nameAr: "طلبات الاستثناء", icon: FileText, perms: ["view", "approve", "reject"] },
      { id: "requester_donations", nameAr: "طلبات التبرعات", icon: Gift, perms: ["view", "review", "approve", "send_email", "send_whatsapp"] },
      { id: "requester_inquiries", nameAr: "الاستفسارات العامة", icon: MessageSquareQuote, perms: ["view", "review", "mark_reviewed", "send_email", "send_whatsapp"] },
      { id: "requester_sedana", nameAr: "طلبات برنامج سدانة", icon: Sparkles, perms: ["view", "review", "send_email", "send_whatsapp"] },
    ]
  },
  {
    title: "إعدادات الجمعية",
    modules: [
      { 
        id: "settings_org_basic", 
        nameAr: "معلومات الجمعية الأساسية", 
        icon: Building2, 
        perms: [
          "edit_basic", 
          "edit_supervision", 
          "edit_officials",
        ] 
      },
      { 
        id: "settings_org_signers", 
        nameAr: "مفوضو التوقيع", 
        icon: Users, 
        perms: [
          "signers_view",
          "signers_add",
          "signers_edit",
          "signers_set_default",
          "signers_delete",
        ] 
      },
      { 
        id: "settings_org_banks", 
        nameAr: "البيانات البنكية", 
        icon: CreditCard, 
        perms: [
          "edit_banks",
        ] 
      },
      { 
        id: "settings_org_contracts", 
        nameAr: "إعدادات العقود", 
        icon: FileText, 
        perms: [
          "edit_contracts",
        ] 
      },
    ]
  },
  {
    title: "تخصيص الإشعارات",
    modules: [
      { 
        id: "staff_notifications_by_role", 
        nameAr: "تخصيص حسب الأدوار", 
        icon: Shield, 
        perms: [
          "by_role", 
          "by_department",
          "edit_message_formats"
        ] 
      },
      { 
        id: "staff_notifications_by_person", 
        nameAr: "تخصيص حسب الأشخاص", 
        icon: Users, 
        perms: [
          "by_person"
        ] 
      },
      { 
        id: "staff_notifications_beneficiary", 
        nameAr: "إشعارات المستفيد", 
        icon: HeartHandshake, 
        perms: [
          "beneficiary",
          "beneficiary_message_formats"
        ] 
      },
    ]
  },
  {
    title: "تخصيص النماذج",
    modules: [
      { 
        id: "forms_customization_dashboard", 
        nameAr: "تخصيص لوحة المعلومات", 
        icon: LayoutDashboard, 
        perms: [
          "dashboard_global", 
          "dashboard_role", 
          "dashboard_user"
        ] 
      },
      { 
        id: "forms_customization_evaluation", 
        nameAr: "تخصيص استمارة تقييم رضا المستفيد", 
        icon: Star, 
        perms: [
          "evaluation_view",
          "evaluation_add_field", 
          "evaluation_delete",
          "evaluation_duplicate", 
          "evaluation_placeholder", 
          "evaluation_description", 
          "evaluation_change_type", 
          "evaluation_required", 
          "evaluation_toggle_active", 
          "evaluation_reorder"
        ] 
      },
      { 
        id: "forms_customization_services", 
        nameAr: "تخصيص نماذج طلبات الخدمات", 
        icon: FileText, 
        perms: [
          "services_view",
          "services_add_field", 
          "services_delete",
          "services_duplicate", 
          "services_placeholder", 
          "services_description", 
          "services_change_type", 
          "services_required", 
          "services_toggle_active", 
          "services_reorder"
        ] 
      },
      { 
        id: "forms_customization_registration", 
        nameAr: "تخصيص نماذج التسجيل والتبرع", 
        icon: HeartHandshake, 
        perms: [
          "registration_view",
          "registration_add_field", 
          "registration_delete",
          "registration_duplicate", 
          "registration_placeholder", 
          "registration_description", 
          "registration_change_type", 
          "registration_required", 
          "registration_toggle_active", 
          "registration_reorder"
        ] 
      },
    ]
  },
  {
    title: "الإعدادات",
    modules: [
      { 
        id: "settings_branding", 
        nameAr: "الهوية البصرية", 
        icon: Palette, 
        perms: [
          "view",
          "edit_colors",
          "upload_logos",
          "delete_logos"
        ] 
      },
      { 
        id: "settings_categories", 
        nameAr: "إدارة التصنيفات", 
        icon: Tag, 
        perms: [
          "view",
          "add",
          "edit",
          "delete",
          "reorder"
        ] 
      },
      { 
        id: "services", 
        nameAr: "البرامج والخدمات", 
        icon: LayoutGrid, 
        perms: [
          "view",
          "add",
          "edit",
          "delete",
          "toggle_status",
          "reorder"
        ] 
      },
      { 
        id: "settings_escalation", 
        nameAr: "تعيين وقت التأخير ومدد المراحل", 
        icon: ShieldAlert, 
        perms: [
          "view",
          "edit_durations",
          "edit_beneficiary_sla"
        ] 
      },
      { 
        id: "notification_center", 
        nameAr: "مركز الإشعارات", 
        icon: Send, 
        perms: [
          "view",
          "direct_send_staff",
          "direct_send_beneficiary"
        ] 
      },
    ]
  },
  {
    title: "التوقيع",
    modules: [
      {
        id: "signing",
        nameAr: "صلاحيات التوقيع",
        icon: PenLine,
        perms: ["disbursements_sign", "disbursement_orders_sign", "final_reports_sign", "progress_reports_sign"]
      }
    ]
  }
];

const getDescriptiveLabel = (moduleId: string, action: string) => {
  const mapping: Record<string, Record<string, string>> = {
    information_dashboard: {
      view: "عرض لوحة المعلومات",
    },
    analytics_hub: {
      custom: "اللوحة المخصصة",
      kpi: "مؤشرات الأداء العامة (KPI)",
      technical: "التقارير الإحصائية والفنية",
      financial_report: "التقرير المالي الشامل",
      financial_dash: "لوحة التحكم المالية",
      board: "تحليلات الإدارة العليا",
      beneficiary: "رضا المستفيدين",
      operations: "تقارير العمليات والمعاينات",
      project_reports: "مركز تقارير المشاريع",
      progress: "تقارير ونسب الإنجاز"
    },
    board_leadership: {
      board_chairman: "عرض مركز الاعتماد المالي",
      board_member: "عرض لوحة عضو مجلس الإدارة",
      remind: "إرسال تذكير بالاعتماد",
    },
    pending_reports: {
      view: "عرض التقارير",
      intervene: "تدخل لرفع التقرير"
    },
    signing: {
      disbursements_sign: "توقيع طلبات الصرف",
      disbursement_orders_sign: "توقيع أوامر الصرف",
      final_reports_sign: "توقيع التقارير الختامية",
      progress_reports_sign: "توقيع تقارير الإنجاز",
    },
    mosques: {
      view: "عرض المساجد",
      create: "إضافة مسجد",
      add: "إضافة مسجد",
      edit: "تعديل المسجد",
      update: "تعديل المسجد",
      delete: "حذف المسجد",
      approve: "الاعتمادات (رفض أو اعتماد المسجد)"
    },
    requests: {
      view: "عرض كافة الطلبات",
      create: "إضافة طلب",
      view_details: "عرض تفاصيل الطلب وإدارته",
      add_review_note: "إضافة ملاحظة في مراجعة الطلب والمرفقات",
      transfer_to_beneficiary: "تحويل الطلب لمستفيد",
      manage_as_field_team: "ادارة الطلبات كفريق ميداني",
      manage_as_quick_response: "ادارة الطلبات كفريق استجابة سريعة",
      upload_final_report: "رفع التقرير الختامي",
      create_quick_request: "إنشاء طلب سريع"
    },
    escalation: {
      view: "عرض قسم التصعيد الإداري"
    },
    beneficiary_evaluations: {
      view: "عرض إحصائيات رضا المستفيدين",
      evaluations_log: "سجل استبيانات التقييم",
      dispatch_log: "سجل الإرسال",
      contacts: "المستفيدين المعتمدين والاستفسارات",
      reply: "إضافة رد على التقييم",
      hide: "إخفاء وإظهار التقييمات",
    },

    projects: {
      view: "عرض المشاريع",
      view_details: "عرض تفاصيل المشروع وادارته",
      create_multi_mosque: "إضافة مشروع لعدة مساجد",
      assign_as_manager: "تعيين كمدير للمشاريع",
      financials: "مالية المشاريع",
      edit_support_and_fees: "تعديل بيانات الداعمين والأجور الإدارية",
      add_receipt_voucher: "إضافة سند صرف",
    },
    boq: {
      view: "عرض جداول الكميات",
      add: "إضافة بند جديد",
      edit: "تعديل بنود",
      delete: "حذف بنود",
      import: "استيراد جدول الكميات من Excel",
      export: "تصدير وتحميل جدول الكميات"
    },
    requesters: {
      view: "عرض قسم إدارة المستفيدين",
      create: "إضافة مستفيد",
      approve: "الاعتمادات (رفض أو اعتماد الحساب)",
      edit: "تعديل بيانات الحساب",
      delete: "حذف الحساب",
      suspend: "تعليق حساب مستخدم"
    },
    suppliers: {
      view: "عرض قائمة الموردين",
      view_details: "عرض تفاصيل المورد",
      add: "إضافة مورد",
      approve: "الاعتمادات (اعتماد أو رفض مورد)",
      edit: "تعديل بيانات الموردين",
      delete: "حذف مورد",
      suspend: "إيقاف المورد وإعادة تفعيله"
    },
    quotations: {
      view: "عرض قائمة عروض الأسعار",
      view_sedana: "عرض عروض أسعار سدانة",
      add: "إضافة عرض سعر",
      approve: "الاعتمادات (اعتماد أو رفض طلب صرف)"
    },
    financial_approval: {
      progress_invoices: "عرض المستخلصات بانتظار الاعتماد",
      disbursement_requests: "عرض طلبات الصرف بانتظار الاعتماد",
      disbursement_orders: "عرض أوامر الصرف بانتظار الاعتماد",
      custody_requests: "عرض العهد المالية بانتظار الاعتماد",
      receipt_vouchers: "عرض سندات القبض بانتظار الاعتماد",
      contracts: "عرض العقود بانتظار الاعتماد",
      purchase_orders: "عرض أوامر الشراء بانتظار الاعتماد",
      progress_reports: "عرض تقارير الإنجاز بانتظار الاعتماد",
    },
    contracts: {
      view: "عرض العقود وقالب العقود",
      create: "إنشاء عقود",
      approve: "اعتماد العقود",
      edit_approved: "تعديل العقود المعتمدة",
      template_add: "إضافة قالب للعقود",
      template_edit: "تعديل قالب العقد",
      template_delete: "حذف قالب العقد",
      clause_add: "إضافة بند للعقد"
    },
    orders_and_letters: {
      disbursement_orders: "أوامر الصرف",
      csr_letters: "الخطاب المجتمعي",
      purchase_orders: "أوامر الشراء",
    },
    purchase_orders: {
      view: "عرض أوامر الشراء",
      add: "إنشاء أمر شراء جديد",
      create_disbursement: "إنشاء أمر صرف لأمر الشراء",
    },
    csr_letters: {
      view: "عرض خطابات المسؤولية المجتمعية",
      add: "إنشاء خطاب مسؤولية مجتمعية جديد",
    },
    custody_requests: {
      view: "عرض قسم العهدة المالية",
      create: "طلب عهدة مالية جديدة",
    },
    sedana_quotations: {
      view: "عرض عروض أسعار سدانة",
      export_pdf: "تصدير ملف pdf للبنود",
      add: "اضافة عروض الاسعار",
      recommend: "التوصية",
      approve: "اعتماد عروض الاسعار",
    },
    sedana_warehouse: {
      view: "عرض المستودع الافتراضي",
      inward: "تسجيل أمر إدخال بالمستودع",
      outbound: "إنشاء أمر إخراج ومسوغ صرف",
    },
    sedana_requests: {
      view: "عرض طلبات سدانة",
      desk_review: "مراجعة الطلب مكتبيا",
      manage: "ادارة طلب سدانة",
    },
    disbursements: {
      view: "عرض طلبات الصرف",
      add: "إنشاء طلب صرف",
      edit: "تعديل طلب الصرف",
      delete: "حذف طلب صرف",
      approve: "اعتماد طلبات الصرف",
      create_custom: "انشاء طلبات صرف مخصصة",
      create_from_fund: "إضافة طلب صرف من صندوق الجمعية",
      exception_approve: "استثناء اعتماد مُعد الطلب",
    },
    fund: {
      view: "عرض إحصائيات وسجلات الصندوق",
      transfer: "تحويل فائض من المشروع إلى الصندوق",
    },
    receipt_vouchers: {
      view: "عرض سندات القبض",
      add: "تسجيل سند قبض جديد",
      edit: "تعديل سند القبض",
      exception_approve: "استثناء اعتماد السند",
    },
    disbursement_orders: {
      view: "عرض أوامر الصرف",
      view_details: "عرض تفاصيل أوامر الصرف",
      create_direct: "انشاء امر صرف مخصص",
      exception_approve: "استثناء اعتماد مُعد الأمر",
      remind: "إرسال تذكير بالاعتماد",
      cancel_executed: "الغاء اعتماد أوامر الصرف المنفذة",
    },
    progress_reports: {
      view: "عرض تقارير الإنجاز",
      add: "إضافة تقرير إنجاز",
      edit: "تعديل التقرير",
      approve: "اعتماد تقارير الإنجاز",
      revoke_approval: "إلغاء الاعتماد",
      exception_approve: "استثناء اعتماد مدير المشروع",
    },
    progress_invoices: {
      view: "عرض المستخلصات",
      add: "إضافة مستخلص",
      edit: "تعديل المستخلص",
      approve: "اعتماد المستخلصات",
      revoke_approval: "إلغاء الاعتماد",
      exception_approve: "استثناء اعتماد مدير المشروع",
    },
    project_reports: {
      view: "عرض تقارير المشاريع",
      create: "إنشاء تقارير مشاريع"
    },
    financial_reports: {
      view: "عرض تقرير المالية والإحصائيات",
      export: "تصدير البيانات"
    },
    reports: {
      view_stats: "عرض احصائيات الطلبات",
      export_data: "تصدير البيانات"
    },
    staff_users: {
      view: "عرض قائمة المستخدمين",
      add: "إضافة موظف جديد",
      edit: "تعديل البيانات",
      customize: "تخصيص الصلاحيات",
      suspend: "إيقاف الحساب",
      activate: "تنشيط الحساب",
      delete: "حذف"
    },
    staff_roles: {
      view: "عرض الأدوار والصلاحيات",
      customize: "تخصيص الدور",
      suspend: "إيقاف الدور"
    },
    staff_custom_roles: {
      view: "عرض الأدوار المخصصة",
      add: "إضافة دور",
      edit: "تعديل الدور",
      delete: "حذف الدور"
    },
    requester_accounts: {
      view: "عرض حسابات طالبي الخدمة",
      view_details: "عرض تفاصيل الحساب",
      create: "إضافة مستفيد",
      approve: "اعتماد الحساب",
      suspend: "إيقاف الحساب"
    },
    requester_exceptions: {
      view: "عرض طلبات الاستثناء",
      approve: "قبول طلب الاستثناء",
      reject: "رفض طلب الاستثناء"
    },
    requester_donations: {
      view: "عرض طلبات التبرعات",
      review: "مراجعة الطلب",
      approve: "اعتماد الطلب",
      send_email: "إرسال Email",
      send_whatsapp: "إرسال WhatsApp",
    },
    requester_inquiries: {
      view: "عرض الاستفسارات العامة",
      review: "مراجعة",
      mark_reviewed: "تمت المراجعة",
      send_email: "إرسال Email",
      send_whatsapp: "إرسال WhatsApp",
    },
    requester_sedana: {
      view: "عرض طلبات برنامج سدانة",
      review: "اتخاذ إجراء واعتماد الطلب",
      send_email: "إرسال Email",
      send_whatsapp: "إرسال WhatsApp",
    },
    staff_notifications: {
      view: "استعراض إعدادات وقوالب الإشعارات",
      by_role: "تخصيص الإشعارات حسب الدور",
      by_department: "تخصيص الإشعارات حسب القسم",
      edit_message_formats: "تعديل صياغة رسائل الإشعارات",
      by_person: "تخصيص الإشعارات حسب الشخص",
      beneficiary: "تخصيص إشعارات المستفيد",
      beneficiary_message_formats: "تعديل صياغة رسائل المستفيد",
      edit: "تعديل تخصيص الإشعارات"
    },
    staff_notifications_by_role: {
      by_role: "تخصيص الإشعارات حسب الدور",
      by_department: "تخصيص الإشعارات حسب القسم",
      edit_message_formats: "تعديل صياغة رسائل الإشعارات",
    },
    staff_notifications_by_person: {
      by_person: "تخصيص الإشعارات حسب الشخص",
    },
    staff_notifications_beneficiary: {
      beneficiary: "تخصيص إشعارات المستفيد",
      beneficiary_message_formats: "تعديل صياغة رسائل المستفيد",
    },
    notification_center: {
      view: "عرض واستعراض مركز الإشعارات (سجل الإرسال)",
      direct_send_staff: "إرسال إشعار مباشر لمسؤول",
      direct_send_beneficiary: "إرسال إشعار مباشر لمستفيد",
      direct_send: "إرسال إشعار مباشر وفوري",
      send_logs: "استعراض سجل وحالات إرسال الإشعارات"
    },
    roles: {
      view: "عرض قائمة الأدوار",
      create: "إنشاء دور جديد",
      edit: "تعديل صلاحيات الدور",
      delete: "حذف دور"
    },
    logs: {
      view: "عرض سجل العمليات",
      export: "تصدير سجل العمليات"
    },
    settings_org: {
      view: "عرض إعدادات الجمعية",
      edit_basic: "تعديل معلومات الجمعية الأساسية",
      edit_supervision: "تعديل جهات الإشراف",
      edit_officials: "تعديل أسماء المسؤولين",
      signers_view: "عرض قائمة مفوضي التوقيع",
      signers_add: "إضافة مفوض توقيع جديد",
      signers_edit: "تعديل بيانات المفوض والتوقيع الرقمي",
      signers_set_default: "تعيين مفوض التوقيع كافتراضي",
      signers_delete: "حذف مفوض التوقيع",
      edit_banks: "تعديل البيانات والحسابات البنكية",
      edit_contracts: "تعديل إعدادات وصياغة العقود الرسمية",
      edit_signers: "تعديل المفوضين بالتوقيع"
    },
    settings_org_basic: {
      edit_basic: "تعديل معلومات الجمعية الأساسية",
      edit_supervision: "تعديل جهات الإشراف",
      edit_officials: "تعديل أسماء المسؤولين",
    },
    settings_org_signers: {
      signers_view: "عرض قائمة مفوضي التوقيع",
      signers_add: "إضافة مفوض توقيع جديد",
      signers_edit: "تعديل بيانات المفوض والتوقيع الرقمي",
      signers_set_default: "تعيين مفوض التوقيع كافتراضي",
      signers_delete: "حذف مفوض التوقيع",
    },
    settings_org_banks: {
      edit_banks: "تعديل البيانات والحسابات البنكية",
    },
    settings_org_contracts: {
      edit_contracts: "تعديل إعدادات وصياغة العقود الرسمية",
    },
    settings_branding: {
      view: "عرض إعدادات الهوية والشعارات",
      edit_colors: "تعديل وحفظ الألوان والمظهر العام",
      upload_logos: "رفع وتحديث الشعارات والختم الرسمي",
      delete_logos: "حذف الشعارات والأختام المرفوعة",
      edit: "تعديل الهوية البصرية للمنصة"
    },
    settings_contracts: {
      view: "عرض قوالب العقود",
      edit: "تعديل قوالب العقود"
    },
    settings_categories: {
      view: "عرض وتصفح التصنيفات",
      add: "إضافة تصنيف جديد",
      edit: "تعديل مسميات وبيانات التصنيف",
      reorder: "إعادة ترتيب وتسلسل التصنيفات",
      delete: "حذف التصنيفات"
    },
    services: {
      view: "عرض واستعراض البرامج والخدمات",
      add: "إضافة برنامج أو خدمة جديدة",
      edit: "تعديل مواصفات وبيانات البرامج",
      toggle_status: "تفعيل أو تعطيل حالة البرامج",
      reorder: "إعادة ترتيب وتسلسل البرامج",
      delete: "حذف البرامج والخدمات"
    },
    forms_customization: {
      view: "عرض وتصفح النماذج والحقول",
      dashboard_global: "تخصيص الصفحة للجميع",
      dashboard_role: "تخصيص الصفحة حسب الدور",
      dashboard_user: "تخصيص الصفحة حسب المستخدم",
      evaluation_add_field: "إضافة حقل جديد",
      evaluation_duplicate: "تكرار حقل",
      evaluation_placeholder: "إضافة وتعديل نص التلميح",
      evaluation_description: "إضافة وتعديل الوصف الإرشادي",
      evaluation_change_type: "تغيير نوع الحقل",
      evaluation_required: "تحديد الحقل كإجباري أو اختياري",
      evaluation_toggle_active: "تفعيل أو تعطيل الحقل",
      evaluation_reorder: "تبديل أماكن وترتيب الحقول",
      services_add_field: "إضافة حقل جديد",
      services_duplicate: "تكرار حقل",
      services_placeholder: "إضافة وتعديل نص التلميح",
      services_description: "إضافة وتعديل الوصف الإرشادي",
      services_change_type: "تغيير نوع الحقل",
      services_required: "تحديد الحقل كإجباري أو اختياري",
      services_toggle_active: "تفعيل أو تعطيل الحقل",
      services_reorder: "تبديل أماكن وترتيب الحقول",
      registration_add_field: "إضافة حقل جديد",
      registration_duplicate: "تكرار حقل",
      registration_placeholder: "إضافة وتعديل نص التلميح",
      registration_description: "إضافة وتعديل الوصف الإرشادي",
      registration_change_type: "تغيير نوع الحقل",
      registration_required: "تحديد الحقل كإجباري أو اختياري",
      registration_toggle_active: "تفعيل أو تعطيل الحقل",
      registration_reorder: "تبديل أماكن وترتيب الحقول",
      evaluation: "تخصيص استمارة تقييم رضا المستفيد",
      services: "تخصيص نماذج طلبات الخدمات",
      registration: "تخصيص نماذج التسجيل والتبرع",
    },
    forms_customization_dashboard: {
      dashboard_global: "تخصيص الصفحة للجميع",
      dashboard_role: "تخصيص الصفحة حسب الدور",
      dashboard_user: "تخصيص الصفحة حسب المستخدم",
    },
    forms_customization_evaluation: {
      evaluation_view: "عرض فقط",
      evaluation_add_field: "إضافة حقل جديد",
      evaluation_delete: "حذف حقل",
      evaluation_duplicate: "تكرار حقل",
      evaluation_placeholder: "إضافة وتعديل نص التلميح",
      evaluation_description: "إضافة وتعديل الوصف الإرشادي",
      evaluation_change_type: "تغيير نوع الحقل",
      evaluation_required: "تحديد الحقل كإجباري أو اختياري",
      evaluation_toggle_active: "تفعيل أو تعطيل الحقل",
      evaluation_reorder: "تبديل أماكن وترتيب الحقول",
    },
    forms_customization_services: {
      services_view: "عرض فقط",
      services_add_field: "إضافة حقل جديد",
      services_delete: "حذف حقل",
      services_duplicate: "تكرار حقل",
      services_placeholder: "إضافة وتعديل نص التلميح",
      services_description: "إضافة وتعديل الوصف الإرشادي",
      services_change_type: "تغيير نوع الحقل",
      services_required: "تحديد الحقل كإجباري أو اختياري",
      services_toggle_active: "تفعيل أو تعطيل الحقل",
      services_reorder: "تبديل أماكن وترتيب الحقول",
    },
    forms_customization_registration: {
      registration_view: "عرض فقط",
      registration_add_field: "إضافة حقل جديد",
      registration_delete: "حذف حقل",
      registration_duplicate: "تكرار حقل",
      registration_placeholder: "إضافة وتعديل نص التلميح",
      registration_description: "إضافة وتعديل الوصف الإرشادي",
      registration_change_type: "تغيير نوع الحقل",
      registration_required: "تحديد الحقل كإجباري أو اختياري",
      registration_toggle_active: "تفعيل أو تعطيل الحقل",
      registration_reorder: "تبديل أماكن وترتيب الحقول",
    },
    settings_escalation: {
      view: "عرض مدد المراحل وأوقات التأخير",
      edit_durations: "تعديل مدد المراحل الرئيسية",
      edit_beneficiary_sla: "تعديل مهلة تجاوب وقبول المستفيد",
      save: "حفظ وتطبيق إعدادات التأخير",
      edit: "تعديل إعدادات أوقات التأخير"
    },
    mosque_map: {
      view: "عرض الخريطة التفاعلية"
    },
    appointments: {
      view: "عرض تقويم المواعيد",
      view_all: "عرض كافة مواعيد المنشأة",
      view_own: "عرض المواعيد الخاصة بي",
      add: "إضافة موعد جديد",
      edit: "تعديل موعد",
      delete: "حذف موعد"
    },
    technical_support: {
      view: "عرض التذاكر",
      create: "إرسال التذاكر"
    }
  };

  return mapping[moduleId]?.[action] || action;
};

export default function RoleEdit() {
  const [match, params] = useRoute("/roles/:id/:action?");
  const [, setLocation] = useLocation();
  const roleId = params?.id;
  const isNew = roleId === "new";

  const [nameAr, setNameAr] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // جلب بيانات الدور (الاسم والصلاحيات)
  const { data: roleData, isLoading: roleLoading } = trpc.permissions.getRole.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const { data: rolePermissions, isLoading: permsLoading } = trpc.permissions.getRolePermissions.useQuery(
    { roleId: roleId! },
    { enabled: !isNew && !!roleId }
  );

  const utils = trpc.useUtils();

  useEffect(() => {
    if (roleData) {
      setNameAr(roleData.nameAr);
    }
  }, [roleData]);

  useEffect(() => {
    if (rolePermissions) {
      setSelectedPerms(rolePermissions);
    }
  }, [rolePermissions]);

  const createRoleMutation = trpc.permissions.createRole.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدور بنجاح");
      utils.permissions.getRoles.invalidate();
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
      setLocation("/staff?tab=custom-roles");
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "فشل إنشاء الدور، يرجى المحاولة مرة أخرى بعد قليل"));
    },
  });

  const updateRoleMutation = trpc.permissions.updateRole.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدور بنجاح");
      utils.permissions.getRoles.invalidate();
      utils.permissions.getUserPermissions.invalidate();
      utils.permissions.getUserRolePermissions.invalidate();
      utils.auth.me.invalidate();
      setLocation("/staff?tab=custom-roles");
    },
    onError: (error) => {
      toast.error(formatErrorMessage(error, "فشل تحديث الدور، يرجى المحاولة مرة أخرى بعد قليل"));
    },
  });

  const handleSaveChanges = () => {
    if (!nameAr.trim()) {
      toast.error("يرجى إدخال اسم الدور المخصص");
      return;
    }

    let finalPerms = selectedPerms;

    if (finalPerms.length === 0) {
      toast.error("يرجى تحديد صلاحية واحدة على الأقل");
      return;
    }

    if (isNew) {
      const id = `custom_role_${Date.now()}`;
      createRoleMutation.mutate({
        id,
        nameAr: nameAr.trim(),
        nameEn: nameAr.trim(),
        description: JSON.stringify(finalPerms),
        permissions: finalPerms,
      });
    } else if (roleId) {
      updateRoleMutation.mutate({
        roleId,
        nameAr: nameAr.trim(),
        permissions: finalPerms,
      });
    }
  };

  const handleTogglePermission = (permId: string) => {

    // منع تفعيل أي صلاحية فرعية للمساجد إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("mosques.") && permId !== "mosques.view") {
      if (!selectedPerms.includes("mosques.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المساجد' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للموردين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("suppliers.") && permId !== "suppliers.view") {
      if (!selectedPerms.includes("suppliers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة الموردين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لجداول الكميات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("boq.") && permId !== "boq.view") {
      if (!selectedPerms.includes("boq.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض جداول الكميات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لعروض الأسعار إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("quotations.") && permId !== "quotations.view") {
      if (!selectedPerms.includes("quotations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة عروض الأسعار' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخدمين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_users.") && permId !== "staff_users.view") {
      if (!selectedPerms.includes("staff_users.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة المستخدمين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار والصلاحيات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_roles.") && permId !== "staff_roles.view") {
      if (!selectedPerms.includes("staff_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار والصلاحيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار المخصصة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_custom_roles.") && permId !== "staff_custom_roles.view") {
      if (!selectedPerms.includes("staff_custom_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار المخصصة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للخدمات والبرامج إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("services.") && permId !== "services.view") {
      if (!selectedPerms.includes("services.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض البرامج' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للطلبات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requests.") && permId !== "requests.view" && permId !== "requests.sign_final_report") {
      if (!selectedPerms.includes("requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض كافة الطلبات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("projects.") && permId !== "projects.view") {
      if (!selectedPerms.includes("projects.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل مالية المشاريع إلا بعد تفعيل صلاحيتي الصندوق
    if (permId === "projects.financials") {
      if (!selectedPerms.includes("projects.financials") && (!selectedPerms.includes("fund.view") || !selectedPerms.includes("fund.transfer"))) {
        toast.warning("يجب تفعيل صلاحيتي الصندوق ('عرض إحصائيات وسجلات الصندوق' و'تحويل فائض من المشروع إلى الصندوق') أولاً");
        return;
      }
    }

    // منع تفعيل صلاحيات الداعمين وسندات الصرف/القبض إذا كانت مالية المشاريع معطلة
    if (permId === "projects.edit_support_and_fees" || permId === "projects.add_receipt_voucher") {
      if (!selectedPerms.includes("projects.financials")) {
        toast.warning("يجب تفعيل صلاحية 'مالية المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتقارير الإنجاز إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("progress_reports.") && permId !== "progress_reports.view") {
      if (!selectedPerms.includes("progress_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقارير الإنجاز' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخلصات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("progress_invoices.") && permId !== "progress_invoices.view") {
      if (!selectedPerms.includes("progress_invoices.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المستخلصات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتقارير المشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("project_reports.") && permId !== "project_reports.view") {
      if (!selectedPerms.includes("project_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقارير المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("financial_reports.") && permId !== "financial_reports.view") {
      if (!selectedPerms.includes("financial_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقرير المالية والإحصائيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للعقود إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("contracts.") && permId !== "contracts.view") {
      if (!selectedPerms.includes("contracts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض العقود وقالب العقود' أولاً");
        return;
      }
    }






    // منع تفعيل أي صلاحية فرعية لطلبات سدانة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("sedana_requests.") && permId !== "sedana_requests.view") {
      if (!selectedPerms.includes("sedana_requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات سدانة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("reports.") && permId !== "reports.view_stats") {
      if (!selectedPerms.includes("reports.view_stats")) {
        toast.warning("يجب تفعيل صلاحية 'عرض احصائيات الطلبات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتبويبات المستفيدين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requester_accounts.") && permId !== "requester_accounts.view") {
      if (!selectedPerms.includes("requester_accounts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض حسابات طالبي الخدمة' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_exceptions.") && permId !== "requester_exceptions.view") {
      if (!selectedPerms.includes("requester_exceptions.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الاستثناء' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_donations.") && permId !== "requester_donations.view") {
      if (!selectedPerms.includes("requester_donations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات التبرعات' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_inquiries.") && permId !== "requester_inquiries.view") {
      if (!selectedPerms.includes("requester_inquiries.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الاستفسارات العامة' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_sedana.") && permId !== "requester_sedana.view") {
      if (!selectedPerms.includes("requester_sedana.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات برنامج سدانة' أولاً");
        return;
      }
    }


    // منع تفعيل صلاحية إضافة طلبات الصرف المخصصة إلا إذا كانت صلاحية العرض مفعلة
    if (permId === "disbursements.create_custom") {
      if (!selectedPerms.includes("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }


    // منع تفعيل أي صلاحية في قسم طلبات الصرف إلا إذا كانت صلاحية العرض مفعلة
    if (permId.startsWith("disbursements.") && permId !== "disbursements.view" && permId !== "disbursements.sign") {
      if (!selectedPerms.includes("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لأوامر الصرف إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("disbursement_orders.") && permId !== "disbursement_orders.view" && permId !== "disbursement_orders.sign") {
      if (!selectedPerms.includes("disbursement_orders.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض أوامر الصرف' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لسندات القبض إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("receipt_vouchers.") && permId !== "receipt_vouchers.view") {
      if (!selectedPerms.includes("receipt_vouchers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض سندات القبض' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للعهدة المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("custody_requests.") && permId !== "custody_requests.view") {
      if (!selectedPerms.includes("custody_requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قسم العهدة المالية' أولاً");
        return;
      }
    }

    // منع تفعيل صلاحية إرسال التذكير لمركز الاعتماد المالي إذا كان عرض مركز الاعتماد معطلاً
    if (permId === "board_leadership.remind") {
      if (!selectedPerms.includes("board_chairman")) {
        toast.warning("يجب تفعيل صلاحية 'عرض مركز الاعتماد المالي' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لمفوضي التوقيع إذا كانت صلاحية عرض القائمة معطلة
    if (permId.startsWith("settings_org.signers_") && permId !== "settings_org.signers_view") {
      if (!selectedPerms.includes("settings_org.signers_view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة مفوضي التوقيع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للهوية البصرية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("settings_branding.") && permId !== "settings_branding.view") {
      if (!selectedPerms.includes("settings_branding.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض إعدادات الهوية والشعارات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لإدارة التصنيفات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("settings_categories.") && permId !== "settings_categories.view") {
      if (!selectedPerms.includes("settings_categories.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض وتصفح التصنيفات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لمدد المراحل وأوقات التأخير إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("settings_escalation.") && permId !== "settings_escalation.view") {
      if (!selectedPerms.includes("settings_escalation.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض مدد المراحل وأوقات التأخير' أولاً");
        return;
      }
    }





    setSelectedPerms(prev => {
      const isAlreadySelected = prev.includes(permId);
      
      if (isAlreadySelected) {
        let next = prev.filter(id => id !== permId);
        if (permId === "mosques.view") {
          next = next.filter(id => !id.startsWith("mosques."));
        }
        if (permId === "suppliers.view") {
          next = next.filter(id => !id.startsWith("suppliers."));
        }
        if (permId === "boq.view") {
          next = next.filter(id => !id.startsWith("boq."));
        }
        if (permId === "quotations.view") {
          next = next.filter(id => !id.startsWith("quotations."));
        }
        if (permId === "staff_users.view") {
          next = next.filter(id => !id.startsWith("staff_users."));
        }
        if (permId === "staff_roles.view") {
          next = next.filter(id => !id.startsWith("staff_roles."));
        }
        if (permId === "staff_custom_roles.view") {
          next = next.filter(id => !id.startsWith("staff_custom_roles."));
        }
        if (permId === "services.view") {
          next = next.filter(id => !id.startsWith("services."));
        }
        if (permId === "requests.view") {
          // cascade لكل صلاحيات الطلبات ما عدا توقيع التقرير الختامي (انتقلت لقسم التوقيع)
          next = next.filter(id => !id.startsWith("requests.") || id === "requests.sign_final_report");
        }
        if (permId === "projects.view") {
          next = next.filter(id => !id.startsWith("projects."));
        }
        if (permId === "projects.financials") {
          next = next.filter(id => id !== "projects.edit_support_and_fees" && id !== "projects.add_receipt_voucher");
        }
        if (permId === "progress_reports.view") {
          next = next.filter(id => !id.startsWith("progress_reports."));
        }
        if (permId === "progress_invoices.view") {
          next = next.filter(id => !id.startsWith("progress_invoices."));
        }
        if (permId === "project_reports.view") {
          next = next.filter(id => !id.startsWith("project_reports."));
        }
        if (permId === "requester_accounts.view") {
          next = next.filter(id => !id.startsWith("requester_accounts."));
        }
        if (permId === "requester_exceptions.view") {
          next = next.filter(id => !id.startsWith("requester_exceptions."));
        }
        if (permId === "requester_donations.view") {
          next = next.filter(id => !id.startsWith("requester_donations."));
        }
        if (permId === "requester_inquiries.view") {
          next = next.filter(id => !id.startsWith("requester_inquiries."));
        }
        if (permId === "requester_sedana.view") {
          next = next.filter(id => !id.startsWith("requester_sedana."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض تقرير المالية والإحصائيات'، نقوم تلقائياً بإلغاء تفعيل تصدير البيانات المالية
        if (permId === "financial_reports.view") {
          next = next.filter(id => !id.startsWith("financial_reports."));
        }
        if (permId === "reports.view_stats") {
          next = next.filter(id => !id.startsWith("reports."));
        }
        // عند إلغاء تفعيل صلاحية 'عرض طلبات الصرف'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات طلبات الصرف الأخرى
        if (permId === "disbursements.view") {
          next = next.filter(id => !id.startsWith("disbursements."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض العقود وقالب العقود'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات العقود الأخرى
        if (permId === "contracts.view") {
          next = next.filter(id => !id.startsWith("contracts."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض إحصائيات وسجلات الصندوق'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات الصندوق الأخرى
        if (permId === "fund.view") {
          next = next.filter(id => !id.startsWith("fund."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض أوامر الصرف'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات أوامر الصرف الأخرى
        if (permId === "disbursement_orders.view") {
          next = next.filter(id => !id.startsWith("disbursement_orders."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض سندات القبض'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات سندات القبض الأخرى
        if (permId === "receipt_vouchers.view") {
          next = next.filter(id => !id.startsWith("receipt_vouchers."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض قسم العهدة المالية'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات العهدة المالية الأخرى
        if (permId === "custody_requests.view") {
          next = next.filter(id => !id.startsWith("custody_requests."));
        }


        // عند إلغاء تفعيل صلاحية 'عرض أوامر الشراء'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات أوامر الشراء الأخرى
        if (permId === "purchase_orders.view") {
          next = next.filter(id => !id.startsWith("purchase_orders."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض خطابات المسؤولية المجتمعية'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات المسؤولية المجتمعية الأخرى
        if (permId === "csr_letters.view") {
          next = next.filter(id => !id.startsWith("csr_letters."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض المستودع الافتراضي'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات المستودع الأخرى
        if (permId === "sedana_warehouse.view") {
          next = next.filter(id => !id.startsWith("sedana_warehouse."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض طلبات سدانة'، نقوم تلقائياً بإلغاء تفعيل كافة صلاحيات طلبات سدانة الأخرى
        if (permId === "sedana_requests.view") {
          next = next.filter(id => !id.startsWith("sedana_requests."));
        }

        // عند إلغاء تفعيل صلاحية 'عرض مركز الاعتماد المالي'، نقوم تلقائياً بإلغاء تفعيل إرسال التذكير
        if (permId === "board_chairman") {
          next = next.filter(id => id !== "board_leadership.remind");
        }

        // عند إلغاء تفعيل صلاحية عرض إعدادات الجمعية
        if (permId === "settings_org.view") {
          next = next.filter(id => !id.startsWith("settings_org."));
        }
        // عند إلغاء تفعيل صلاحية عرض قائمة مفوضي التوقيع
        if (permId === "settings_org.signers_view") {
          next = next.filter(id => !id.startsWith("settings_org.signers_"));
        }
        // عند إلغاء تفعيل صلاحية عرض الهوية والشعارات
        if (permId === "settings_branding.view") {
          next = next.filter(id => !id.startsWith("settings_branding."));
        }
        // عند إلغاء تفعيل صلاحية عرض التصنيفات
        if (permId === "settings_categories.view") {
          next = next.filter(id => !id.startsWith("settings_categories."));
        }
        // عند إلغاء تفعيل صلاحية عرض النماذج والحقول
        if (permId === "forms_customization.view") {
          next = next.filter(id => !id.startsWith("forms_customization."));
        }
        if (permId.startsWith("forms_customization.")) {
          const remainingFormsCustom = next.filter(id => 
            id.startsWith("forms_customization.") && id !== "forms_customization.view" && id !== "forms_customization"
          );
          if (remainingFormsCustom.length === 0) {
            next = next.filter(id => !id.startsWith("forms_customization"));
          }
        }
        // عند إلغاء تفعيل صلاحية عرض مدد المراحل وأوقات التأخير
        if (permId === "settings_escalation.view") {
          next = next.filter(id => !id.startsWith("settings_escalation."));
        }
        // عند إلغاء تفعيل صلاحية عرض إعدادات الإشعارات
        if (permId === "staff_notifications.view") {
          next = next.filter(id => !id.startsWith("staff_notifications."));
        }
        if (permId.startsWith("staff_notifications.")) {
          const remainingStaffNotifs = next.filter(id => 
            id.startsWith("staff_notifications.") && id !== "staff_notifications.view" && id !== "staff_notifications" && id !== "staff_notifications.edit"
          );
          if (remainingStaffNotifs.length === 0) {
            next = next.filter(id => !id.startsWith("staff_notifications"));
          }
        }
        // عند إلغاء تفعيل صلاحية في مركز الإشعارات
        if (permId.startsWith("notification_center.")) {
          const remainingNotifCenter = next.filter(id => 
            id.startsWith("notification_center.") && id !== "notification_center"
          );
          if (remainingNotifCenter.length === 0) {
            next = next.filter(id => !id.startsWith("notification_center"));
          }
        }


        return next;
      } else {
        let next = [...prev, permId];
        if (permId.startsWith("staff_notifications.") && !next.includes("staff_notifications.view")) {
          next.push("staff_notifications.view");
        }
        if (permId.startsWith("forms_customization.") && !next.includes("forms_customization.view")) {
          next.push("forms_customization.view");
        }
        if (permId === "appointments.view_all") {
          next = next.filter(id => id !== "appointments.view_own");
        } else if (permId === "appointments.view_own") {
          next = next.filter(id => id !== "appointments.view_all");
        } else if (permId === "escalation.view" || permId === "escalation") {
          const cascadePerms = [
            "requests.view",
            "requests.create",
            "requests.view_details",
            "requests.add_review_note",
            "requests.manage_as_field_team",
            "requests.manage_as_quick_response",
            "requests.upload_final_report",
            "requests.create_quick_request",
            "requester_accounts.view",
            "requester_accounts.view_details",
            "requester_accounts.create",
            "requester_accounts.approve",
            "requester_accounts.suspend",
            "requester_exceptions.view",
            "requester_exceptions.approve",
            "requester_exceptions.reject",
            "requester_donations.view",
            "requester_donations.review",
            "requester_donations.approve",
            "requester_donations.send_email",
            "requester_donations.send_whatsapp",
            "requester_inquiries.view",
            "requester_inquiries.review",
            "requester_inquiries.mark_reviewed",
            "requester_inquiries.send_email",
            "requester_inquiries.send_whatsapp",
            "requester_sedana.view",
            "requester_sedana.review",
            "requester_sedana.send_email",
            "requester_sedana.send_whatsapp",
          ];
          cascadePerms.forEach(pId => {
            if (!next.includes(pId)) next.push(pId);
          });
          toast.info("تم منح كافة صلاحيات قسمي 'الطلبات' و'إدارة المستفيدين' تلقائياً مع تفعيل التصعيد الإداري", {
            duration: 4500,
          });
        }
        if (permId.startsWith("purchase_orders.") && permId !== "purchase_orders.view") {
          if (!next.includes("purchase_orders.view")) {
            next.push("purchase_orders.view");
          }
        }
        if (permId.startsWith("csr_letters.") && permId !== "csr_letters.view") {
          if (!next.includes("csr_letters.view")) {
            next.push("csr_letters.view");
          }
        }
        if (permId.startsWith("sedana_warehouse.") && permId !== "sedana_warehouse.view") {
          if (!next.includes("sedana_warehouse.view")) {
            next.push("sedana_warehouse.view");
          }
        }
        if (permId === "purchase_orders.create_disbursement") {
          ["disbursement_orders.view", "disbursement_orders.create_direct"].forEach(targetId => {
            if (!next.includes(targetId)) {
              next.push(targetId);
            }
          });
        }
        return next;
      }
    });
  };

  const handleToggleModuleAll = (modulePerms: any[]) => {
    const permIds = modulePerms.map(p => p.id);
    const allSelected = permIds.every(id => selectedPerms.includes(id));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(id => !permIds.includes(id)));
    } else {
      setSelectedPerms(prev => {
        let added = permIds.filter(id => !prev.includes(id));
        if (added.includes("appointments.view_all") && added.includes("appointments.view_own")) {
          added = added.filter(id => id !== "appointments.view_own");
        }
        let next = [...prev, ...added];
        if (added.includes("appointments.view_all")) {
          next = next.filter(id => id !== "appointments.view_own");
        } else if (added.includes("appointments.view_own")) {
          next = next.filter(id => id !== "appointments.view_all");
        }
        if (permIds.includes("escalation.view") || permIds.includes("escalation")) {
          const cascadePerms = [
            "requests.view",
            "requests.create",
            "requests.view_details",
            "requests.add_review_note",
            "requests.manage_as_field_team",
            "requests.manage_as_quick_response",
            "requests.upload_final_report",
            "requests.create_quick_request",
            "requester_accounts.view",
            "requester_accounts.view_details",
            "requester_accounts.create",
            "requester_accounts.approve",
            "requester_accounts.suspend",
            "requester_exceptions.view",
            "requester_exceptions.approve",
            "requester_exceptions.reject",
            "requester_donations.view",
            "requester_donations.review",
            "requester_donations.approve",
            "requester_donations.send_email",
            "requester_donations.send_whatsapp",
            "requester_inquiries.view",
            "requester_inquiries.review",
            "requester_inquiries.mark_reviewed",
            "requester_inquiries.send_email",
            "requester_inquiries.send_whatsapp",
            "requester_sedana.view",
            "requester_sedana.review",
            "requester_sedana.send_email",
            "requester_sedana.send_whatsapp",
          ];
          cascadePerms.forEach(pId => {
            if (!next.includes(pId)) next.push(pId);
          });
          toast.info("تم منح كافة صلاحيات قسمي 'الطلبات' و'إدارة المستفيدين' تلقائياً مع تفعيل التصعيد الإداري", {
            duration: 4500,
          });
        }
        if (
          permIds.includes("purchase_orders.create_disbursement") ||
          permIds.includes("csr_letters.create_disbursement")
        ) {
          ["disbursement_orders.view", "disbursement_orders.create_direct"].forEach(targetId => {
            if (!next.includes(targetId)) {
              next.push(targetId);
            }
          });
        }
        return next;
      });
    }
  };

  const isPermissionGranted = (permId: string) => {
    return selectedPerms.includes(permId);
  };

  const universalDisplayGroups = useMemo(() => {
    return superAdminGroups.map(group => ({
      title: group.title,
      modules: group.modules.map(m => ({
        id: m.id,
        nameAr: m.nameAr,
        icon: m.icon,
        permissions: m.perms.map(p => {
          let id = `${m.id}.${p}`;
          if (m.id.startsWith("settings_org")) {
            id = `settings_org.${p}`;
          }
          if (m.id.startsWith("staff_notifications")) {
            id = `staff_notifications.${p}`;
          }
          if (m.id.startsWith("forms_customization")) {
            id = `forms_customization.${p}`;
          }
          if (m.id === "board_leadership") {
            const boardIds: Record<string, string> = {
              board_chairman: "board_chairman",
              board_member: "board_member",
              remind: "board_leadership.remind",
            };
            id = boardIds[p] || id;
          }
          if (m.id === "technical_support") {
            id = p === "view" ? "View_Tickets" : "Create_Ticket";
          }
          // Signing module: use explicit full permission IDs
          if (m.id === "signing") {
            const signingIds: Record<string, string> = {
              disbursements_sign: "disbursements.sign",
              disbursement_orders_sign: "disbursement_orders.sign",
              final_reports_sign: "final_reports.sign",
              progress_reports_sign: "progress_reports.sign",
            };
            id = signingIds[p] || id;
          }
          return {
            id,
            nameAr: getDescriptiveLabel(m.id, p),
          };
        })
      }))
    }));
  }, []);

  const isLoading = (!isNew && roleLoading) || (!isNew && permsLoading);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات الدور والصلاحيات...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/staff")} 
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowRight className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
            </Button>
            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {isNew ? "إنشاء دور مخصص جديد" : "تعديل الدور المخصص"}
              </h1>
              <p className="text-muted-foreground font-medium text-sm sm:text-base md:text-lg truncate">
                {isNew ? "قم بتعيين الصلاحيات التفصيلية للدور الجديد" : nameAr}
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info Card */}
        <Card className="border-slate-200/60 dark:border-slate-800 shadow-md mb-8 rounded-2xl">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
            <CardTitle className="text-xl font-bold">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-right">
            <div>
              <Label htmlFor="nameAr" className="pb-2 block font-semibold text-slate-700 dark:text-slate-300">اسم الدور المخصص *</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                placeholder="مثال: منسق المشاريع والمتابعة"
                className="text-lg py-5 px-4 rounded-xl border-slate-200 focus-visible:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Tip */}
        <div className="border rounded-2xl p-5 mb-10 flex items-start gap-4 shadow-sm bg-primary/5 border-primary/10">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="text-right">
            <p className="font-semibold mb-1">
              تخصيص الصلاحيات التفصيلية
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تتيح لك هذه الصفحة إسناد صلاحيات تفصيلية ودقيقة لهذا الدور المخصص. اختر الصلاحيات المطلوبة من الأقسام التالية ثم انقر على حفظ التغييرات.
            </p>
          </div>
        </div>

        {/* Grouped Rendering */}
        <div className="space-y-12">
          {universalDisplayGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
              {group.title && (
                <div className="flex items-center gap-3 px-2 text-right">
                  <div className="w-1.5 h-8 rounded-full bg-primary shrink-0" />
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{group.title}</h2>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {group.modules.map((module) => {
                  const Icon = (module as any).icon || Shield;
                  const modulePerms = module.permissions || [];
                  const activePerms = modulePerms.filter((p: any) => selectedPerms.includes(p.id));
                  const grantedCount = activePerms.length; 

                  return (
                    <Card key={module.id} className="overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/40">
                      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" dir="rtl">
                          <div className="flex items-center gap-3 sm:gap-4 text-right">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg sm:text-xl font-bold truncate">{module.nameAr}</CardTitle>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0">
                            {modulePerms.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleModuleAll(modulePerms);
                                }}
                                className="text-[11px] sm:text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg font-bold py-1 h-auto"
                              >
                                {modulePerms.every((p: any) => selectedPerms.includes(p.id)) ? "إلغاء تحديد الكل" : "تحديد الكل"}
                              </Button>
                            )}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-xl font-bold text-xs sm:text-sm">
                              <span>{grantedCount}</span>
                              <span className="opacity-50">/</span>
                              <span>{modulePerms.length}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                          {modulePerms.map((perm: any) => {
                            const isChecked = isPermissionGranted(perm.id);
                            const isDisabled = 
                              (perm.id.startsWith("custody_requests.") && perm.id !== "custody_requests.view" && !selectedPerms.includes("custody_requests.view")) ||
                              (perm.id.startsWith("receipt_vouchers.") && perm.id !== "receipt_vouchers.view" && !selectedPerms.includes("receipt_vouchers.view")) ||
                              (perm.id.startsWith("contracts.") && perm.id !== "contracts.view" && !selectedPerms.includes("contracts.view")) ||
                              (perm.id.startsWith("disbursement_orders.") && perm.id !== "disbursement_orders.view" && !selectedPerms.includes("disbursement_orders.view")) ||
                              (perm.id === "board_leadership.remind" && !selectedPerms.includes("board_chairman")) ||
                              (perm.id.startsWith("mosques.") && perm.id !== "mosques.view" && !selectedPerms.includes("mosques.view")) ||
                              (perm.id.startsWith("suppliers.") && perm.id !== "suppliers.view" && !selectedPerms.includes("suppliers.view")) ||
                              (perm.id.startsWith("boq.") && perm.id !== "boq.view" && !selectedPerms.includes("boq.view")) ||
                              (perm.id.startsWith("quotations.") && perm.id !== "quotations.view" && !selectedPerms.includes("quotations.view")) ||
                              (perm.id.startsWith("staff_users.") && perm.id !== "staff_users.view" && !selectedPerms.includes("staff_users.view")) ||
                              (perm.id.startsWith("staff_roles.") && perm.id !== "staff_roles.view" && !selectedPerms.includes("staff_roles.view")) ||
                              (perm.id.startsWith("staff_custom_roles.") && perm.id !== "staff_custom_roles.view" && !selectedPerms.includes("staff_custom_roles.view")) ||
                              (perm.id.startsWith("services.") && perm.id !== "services.view" && !selectedPerms.includes("services.view")) ||
                              (perm.id.startsWith("requests.") && perm.id !== "requests.view" && perm.id !== "requests.sign_final_report" && !selectedPerms.includes("requests.view")) ||
                              (perm.id.startsWith("projects.") && perm.id !== "projects.view" && !selectedPerms.includes("projects.view")) ||
                              (perm.id === "projects.financials" && (!selectedPerms.includes("fund.view") || !selectedPerms.includes("fund.transfer")) && !selectedPerms.includes("projects.financials")) ||
                              ((perm.id === "projects.edit_support_and_fees" || perm.id === "projects.add_receipt_voucher") && !selectedPerms.includes("projects.financials")) ||
                              (perm.id.startsWith("progress_reports.") && perm.id !== "progress_reports.view" && !selectedPerms.includes("progress_reports.view")) ||
                              (perm.id.startsWith("progress_invoices.") && perm.id !== "progress_invoices.view" && !selectedPerms.includes("progress_invoices.view")) ||
                              (perm.id.startsWith("project_reports.") && perm.id !== "project_reports.view" && !selectedPerms.includes("project_reports.view")) ||
                              (perm.id.startsWith("requester_accounts.") && perm.id !== "requester_accounts.view" && !selectedPerms.includes("requester_accounts.view")) ||
                              (perm.id.startsWith("requester_exceptions.") && perm.id !== "requester_exceptions.view" && !selectedPerms.includes("requester_exceptions.view")) ||
                              (perm.id.startsWith("requester_donations.") && perm.id !== "requester_donations.view" && !selectedPerms.includes("requester_donations.view")) ||
                              (perm.id.startsWith("requester_inquiries.") && perm.id !== "requester_inquiries.view" && !selectedPerms.includes("requester_inquiries.view")) ||
                              (perm.id.startsWith("requester_sedana.") && perm.id !== "requester_sedana.view" && !selectedPerms.includes("requester_sedana.view")) ||
                              (perm.id.startsWith("reports.") && perm.id !== "reports.view_stats" && !selectedPerms.includes("reports.view_stats")) ||
                              (perm.id.startsWith("beneficiary_evaluations.") && perm.id !== "beneficiary_evaluations.view" && !selectedPerms.includes("beneficiary_evaluations.view")) ||
                              (perm.id.startsWith("settings_org.signers_") && perm.id !== "settings_org.signers_view" && !selectedPerms.includes("settings_org.signers_view")) ||
                              (perm.id.startsWith("settings_branding.") && perm.id !== "settings_branding.view" && !selectedPerms.includes("settings_branding.view")) ||
                              (perm.id.startsWith("settings_categories.") && perm.id !== "settings_categories.view" && !selectedPerms.includes("settings_categories.view")) ||
                              (perm.id.startsWith("settings_escalation.") && perm.id !== "settings_escalation.view" && !selectedPerms.includes("settings_escalation.view"));
                            return (
                              <div 
                                key={perm.id} 
                                onClick={() => !isDisabled && handleTogglePermission(perm.id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all select-none text-right ${
                                  isDisabled
                                    ? "border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none opacity-50"
                                    : isChecked 
                                      ? "border-green-200 bg-green-50/40 dark:bg-green-900/10 dark:border-green-900/20 text-green-950 dark:text-green-400 hover:bg-green-50/60 cursor-pointer" 
                                      : "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-pointer"
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                                  isDisabled
                                    ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                                    : isChecked
                                      ? "bg-green-600 border-green-600 text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                }`}>
                                  {isChecked && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold select-none leading-snug">{perm.nameAr}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-12 mb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/staff?tab=custom-roles")}
            className="px-6 rounded-xl h-11 font-semibold"
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
            className="px-8 font-bold rounded-xl shadow-md h-11 transition-all gradient-primary text-white scale-105 hover:scale-108"
          >
            {createRoleMutation.isPending || updateRoleMutation.isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              isNew ? "إنشاء الدور" : "حفظ التغييرات"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
