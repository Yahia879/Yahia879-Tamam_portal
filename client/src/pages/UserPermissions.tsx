import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { formatErrorMessage } from "../lib/utils";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Shield, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  LayoutDashboard, 
  Handshake, 
  Palette, 
  FileText,
  AlertCircle,
  AlertTriangle,
  MapPin,
  CalendarDays,
  ClipboardList,
  User,
  Users,
  Receipt,
  CheckSquare,
  Wallet,
  Banknote,
  FileBarChart,
  BarChart3,
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
  RotateCcw,
  X,
  Plus,
  Bell,
  Info,
  ChevronDown,
  FileSpreadsheet,
  LifeBuoy,
  PenLine,
  SlidersHorizontal,
  HeartHandshake,
  ShieldAlert,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  Sparkles,
  Send,
  Landmark,
  Gift,
  MessageSquareQuote,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import DashboardLayout from "../components/DashboardLayout";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";

const getRoleLabelAr = (role: string) => {
  const rolesAr: Record<string, string> = {
    "super_admin": "مدير عام النظام",
    "system_admin": "مدير نظام",
    "general_manager": "المدير التنفيذي",
    "executive_director": "المدير التنفيذي",
    "project_manager": "مدير مشاريع",
    "financial_manager": "المدير المالي",
    "financial": "موظف مالي",
    "projects_office": "مكتب المشاريع",
    "field_team": "فريق ميداني",
    "quick_response": "استجابة سريعة",
    "corporate_comm": "الاتصال المؤسسي",
    "service_requester": "طالب خدمة",
    "board_chairman": "رئيس مجلس الإدارة",
    "board_member": "عضو مجلس الإدارة",
    "procurement_officer": "مسؤول المشتريات",
  };
  return rolesAr[role] || role;
};

export default function UserPermissions() {
  const [, params] = useRoute("/users/:id/permissions");
  const [, setLocation] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;
  const { user: currentUser } = useAuth();
  const canCustomize = usePermission("staff_users.customize") || ["super_admin", "system_admin"].includes(currentUser?.role || "");

  const utils = trpc.useUtils();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // جلب بيانات المستخدم الأساسية
  const { data: userData, isLoading: userDataLoading } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  // جلب أدوار المستخدم (لمعرفة الدور المخصص النشط)
  const { data: userRoles, isLoading: userRolesLoading } = trpc.permissions.getUserRoles.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // تحديد الدور الفعال للمستخدم (مخصص أو أساسي)
  const activeRoleId = userRoles && userRoles.length > 0
    ? userRoles[0].roleId
    : userData?.role;
  
  const roleNameAr = userRoles && userRoles.length > 0
    ? userRoles[0].roleName
    : (userData?.role ? getRoleLabelAr(userData.role) : "");

  // جلب الصلاحيات الافتراضية المورثة من جميع أدوار المستخدم
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = trpc.permissions.getUserRolePermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الصلاحيات النهائية (المدمجة) الممنوحة فعلياً للمستخدم
  const { data: finalPermissions, isLoading: finalPermissionsLoading, refetch: refetchFinal } = trpc.permissions.getUserPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الصلاحيات الفردية (الاستثناءات المباشرة)
  const { data: directPermissions, isLoading: directPermissionsLoading, refetch: refetchDirect } = trpc.permissions.getUserDirectPermissions.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // جلب الهيكل الهرمي للوحدات والصلاحيات المتوفرة في النظام
  const { data: structure, isLoading: structureLoading } = trpc.permissions.getStructure.useQuery();

  const isLoading = userDataLoading || 
                    userRolesLoading || 
                    rolePermissionsLoading || 
                    finalPermissionsLoading || 
                    directPermissionsLoading || 
                    structureLoading;

  useEffect(() => {
    if (directPermissions && structure) {
      const initialOverrides: Record<string, boolean> = {};
      const renderedPermIds = new Set(structure.flatMap(g => g.permissions).map(p => p.id));
      directPermissions.forEach(p => {
        if (renderedPermIds.has(p.permissionId)) {
          initialOverrides[p.permissionId] = p.granted;
        }
      });
      setOverrides(initialOverrides);
    }
  }, [directPermissions, structure]);

  // التحقق من حالة الصلاحية المحددة (مدمجة)
  const isChecked = (permissionId: string) => {
    if (permissionId in overrides) {
      return overrides[permissionId];
    }
    return rolePermissions?.includes(permissionId) || false;
  };

  // الحصول على نوع حالة الاستثناء لبطاقة التلوين
  const getOverrideState = (permissionId: string) => {
    if (permissionId in overrides) {
      return overrides[permissionId] ? "granted" : "revoked";
    }
    return "inherited";
  };

  const hasChanges = useMemo(() => {
    if (!directPermissions) return false;
    // مقارنة التعديلات الحالية بالصلاحيات المباشرة المسجلة في الـ DB
    const currentOverridesEntries = Object.entries(overrides);
    if (currentOverridesEntries.length !== directPermissions.length) return true;
    
    return !directPermissions.every(p => overrides[p.permissionId] === p.granted);
  }, [overrides, directPermissions]);

  // معالجة النقر وتغيير الخيارات
  const handleTogglePermission = (permId: string) => {

    // منع تفعيل أي صلاحية فرعية للمساجد إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("mosques.") && permId !== "mosques.view") {
      if (!isChecked("mosques.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المساجد' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للموردين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("suppliers.") && permId !== "suppliers.view") {
      if (!isChecked("suppliers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة الموردين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لجداول الكميات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("boq.") && permId !== "boq.view") {
      if (!isChecked("boq.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض جداول الكميات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لعروض الأسعار إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("quotations.") && permId !== "quotations.view") {
      if (!isChecked("quotations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة عروض الأسعار' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخدمين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_users.") && permId !== "staff_users.view") {
      if (!isChecked("staff_users.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قائمة المستخدمين' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار والصلاحيات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_roles.") && permId !== "staff_roles.view") {
      if (!isChecked("staff_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار والصلاحيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للأدوار المخصصة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("staff_custom_roles.") && permId !== "staff_custom_roles.view") {
      if (!isChecked("staff_custom_roles.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الأدوار المخصصة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للخدمات والبرامج إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("services.") && permId !== "services.view") {
      if (!isChecked("services.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض البرامج' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للطلبات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requests.") && permId !== "requests.view" && permId !== "requests.sign_final_report") {
      if (!isChecked("requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض كافة الطلبات' أولاً");
        return;
      }
    }

     // منع تفعيل أي صلاحية فرعية للمشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("projects.") && permId !== "projects.view") {
      if (!isChecked("projects.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل مالية المشاريع إلا بعد تفعيل صلاحيتي الصندوق
    if (permId === "projects.financials") {
      if (!isChecked("projects.financials") && (!isChecked("fund.view") || !isChecked("fund.transfer"))) {
        toast.warning("يجب تفعيل صلاحيتي الصندوق ('عرض إحصائيات وسجلات الصندوق' و'تحويل فائض من المشروع إلى الصندوق') أولاً");
        return;
      }
    }

    // منع تفعيل صلاحيات الداعمين وسندات الصرف/القبض إذا كانت مالية المشاريع معطلة
    if (permId === "projects.edit_support_and_fees" || permId === "projects.add_receipt_voucher") {
      if (!isChecked("projects.financials")) {
        toast.warning("يجب تفعيل صلاحية 'مالية المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتقارير الإنجاز إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("progress_reports.") && permId !== "progress_reports.view") {
      if (!isChecked("progress_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقارير الإنجاز' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للمستخلصات إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("progress_invoices.") && permId !== "progress_invoices.view") {
      if (!isChecked("progress_invoices.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض المستخلصات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتقارير المشاريع إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("project_reports.") && permId !== "project_reports.view") {
      if (!isChecked("project_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقارير المشاريع' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("financial_reports.") && permId !== "financial_reports.view") {
      if (!isChecked("financial_reports.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض تقرير المالية والإحصائيات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للعقود إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("contracts.") && permId !== "contracts.view") {
      if (!isChecked("contracts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض العقود وقالب العقود' أولاً");
        return;
      }
    }





    // منع تفعيل أي صلاحية فرعية لطلبات سدانة إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("sedana_requests.") && permId !== "sedana_requests.view") {
      if (!isChecked("sedana_requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات سدانة' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للتقارير إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("reports.") && permId !== "reports.view_stats") {
      if (!isChecked("reports.view_stats")) {
        toast.warning("يجب تفعيل صلاحية 'عرض احصائيات الطلبات' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لتبويبات المستفيدين إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("requester_accounts.") && permId !== "requester_accounts.view") {
      if (!isChecked("requester_accounts.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض حسابات طالبي الخدمة' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_exceptions.") && permId !== "requester_exceptions.view") {
      if (!isChecked("requester_exceptions.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الاستثناء' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_donations.") && permId !== "requester_donations.view") {
      if (!isChecked("requester_donations.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات التبرعات' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_inquiries.") && permId !== "requester_inquiries.view") {
      if (!isChecked("requester_inquiries.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض الاستفسارات العامة' أولاً");
        return;
      }
    }
    if (permId.startsWith("requester_sedana.") && permId !== "requester_sedana.view") {
      if (!isChecked("requester_sedana.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات برنامج سدانة' أولاً");
        return;
      }
    }


    // منع تفعيل صلاحية إنشاء طلبات صرف مخصصة إلا إذا كانت صلاحية العرض مفعلة
    if (permId === "disbursements.create_custom") {
      if (!isChecked("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }


    // منع تفعيل أي صلاحية في قسم طلبات الصرف إلا إذا كانت صلاحية العرض مفعلة
    if (permId.startsWith("disbursements.") && permId !== "disbursements.view" && permId !== "disbursements.sign") {
      if (!isChecked("disbursements.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض طلبات الصرف' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لأوامر الصرف إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("disbursement_orders.") && permId !== "disbursement_orders.view" && permId !== "disbursement_orders.sign") {
      if (!isChecked("disbursement_orders.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض أوامر الصرف' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية لسندات القبض إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("receipt_vouchers.") && permId !== "receipt_vouchers.view") {
      if (!isChecked("receipt_vouchers.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض سندات القبض' أولاً");
        return;
      }
    }

    // منع تفعيل أي صلاحية فرعية للعهدة المالية إذا كانت صلاحية العرض معطلة
    if (permId.startsWith("custody_requests.") && permId !== "custody_requests.view") {
      if (!isChecked("custody_requests.view")) {
        toast.warning("يجب تفعيل صلاحية 'عرض قسم العهدة المالية' أولاً");
        return;
      }
    }

    // منع تفعيل صلاحية إرسال التذكير لمركز الاعتماد المالي إذا كان عرض مركز الاعتماد معطلاً
    if (permId === "board_leadership.remind") {
      if (!isChecked("board_chairman")) {
        toast.warning("يجب تفعيل صلاحية 'عرض مركز الاعتماد المالي' أولاً");
        return;
      }
    }








    const defaultState = rolePermissions?.includes(permId) || false;
    const currentState = isChecked(permId);
    const newState = !currentState;

    setOverrides(prev => {
      let updated = { ...prev };
      
      if (newState === defaultState) {
        delete updated[permId];
      } else {
        updated[permId] = newState;
      }

      if (newState) {
        if (permId === "appointments.view_all") {
          const defaultOwn = rolePermissions?.includes("appointments.view_own") || false;
          if (defaultOwn) {
            updated["appointments.view_own"] = false;
          } else {
            delete updated["appointments.view_own"];
          }
        } else if (permId === "appointments.view_own") {
          const defaultAll = rolePermissions?.includes("appointments.view_all") || false;
          if (defaultAll) {
            updated["appointments.view_all"] = false;
          } else {
            delete updated["appointments.view_all"];
          }
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
            "requester_inquiries.delete",
            "requester_sedana.view",
            "requester_sedana.review",
          ];
          cascadePerms.forEach(pId => {
            const defVal = rolePermissions?.includes(pId) || false;
            if (defVal) {
              delete updated[pId];
            } else {
              updated[pId] = true;
            }
          });
          toast.info("تم منح كافة صلاحيات قسمي 'الطلبات' و'إدارة المستفيدين' تلقائياً مع تفعيل التصعيد الإداري", {
            duration: 4500,
          });
        } else if (permId === "purchase_orders.create_disbursement" || permId === "csr_letters.create_disbursement") {
          ["disbursement_orders.view", "disbursement_orders.create_direct"].forEach(targetId => {
            const defVal = rolePermissions?.includes(targetId) || false;
            if (defVal) {
              delete updated[targetId];
            } else {
              updated[targetId] = true;
            }
          });
        } else if (permId.startsWith("purchase_orders.") && permId !== "purchase_orders.view") {
          const defVal = rolePermissions?.includes("purchase_orders.view") || false;
          if (defVal) {
            delete updated["purchase_orders.view"];
          } else {
            updated["purchase_orders.view"] = true;
          }
        } else if (permId.startsWith("csr_letters.") && permId !== "csr_letters.view") {
          const defVal = rolePermissions?.includes("csr_letters.view") || false;
          if (defVal) {
            delete updated["csr_letters.view"];
          } else {
            updated["csr_letters.view"] = true;
          }
        } else if (permId.startsWith("sedana_quotations.") && permId !== "sedana_quotations.view") {
          const defVal = rolePermissions?.includes("sedana_quotations.view") || false;
          if (defVal) {
            delete updated["sedana_quotations.view"];
          } else {
            updated["sedana_quotations.view"] = true;
          }
        } else if (permId.startsWith("sedana_warehouse.") && permId !== "sedana_warehouse.view") {
          const defVal = rolePermissions?.includes("sedana_warehouse.view") || false;
          if (defVal) {
            delete updated["sedana_warehouse.view"];
          } else {
            updated["sedana_warehouse.view"] = true;
          }
        } else if (permId.startsWith("requester_accounts.") && permId !== "requester_accounts.view") {
          const defVal = rolePermissions?.includes("requester_accounts.view") || false;
          if (defVal) {
            delete updated["requester_accounts.view"];
          } else {
            updated["requester_accounts.view"] = true;
          }
        } else if (permId.startsWith("requester_exceptions.") && permId !== "requester_exceptions.view") {
          const defVal = rolePermissions?.includes("requester_exceptions.view") || false;
          if (defVal) {
            delete updated["requester_exceptions.view"];
          } else {
            updated["requester_exceptions.view"] = true;
          }
        } else if (permId.startsWith("requester_donations.") && permId !== "requester_donations.view") {
          const defVal = rolePermissions?.includes("requester_donations.view") || false;
          if (defVal) {
            delete updated["requester_donations.view"];
          } else {
            updated["requester_donations.view"] = true;
          }
        } else if (permId.startsWith("requester_inquiries.") && permId !== "requester_inquiries.view") {
          const defVal = rolePermissions?.includes("requester_inquiries.view") || false;
          if (defVal) {
            delete updated["requester_inquiries.view"];
          } else {
            updated["requester_inquiries.view"] = true;
          }
        } else if (permId.startsWith("requester_sedana.") && permId !== "requester_sedana.view") {
          const defVal = rolePermissions?.includes("requester_sedana.view") || false;
          if (defVal) {
            delete updated["requester_sedana.view"];
          } else {
            updated["requester_sedana.view"] = true;
          }
        }
      }

      // شلال الإلغاءات (Cascading Revokes)
      if (!newState) {
        const cascadeRevoke = (prefix: string) => {
          const allModulePerms = structure?.flatMap(g => g.permissions).filter(p => p.id.startsWith(prefix)) || [];
          allModulePerms.forEach(p => {
            if (p.id !== permId) {
              const defVal = rolePermissions?.includes(p.id) || false;
              if (defVal) {
                updated[p.id] = false;
              } else {
                delete updated[p.id];
              }
            }
          });
        };

        if (permId === "mosques.view") cascadeRevoke("mosques.");
        if (permId === "suppliers.view") cascadeRevoke("suppliers.");
        if (permId === "boq.view") cascadeRevoke("boq.");
        if (permId === "quotations.view") cascadeRevoke("quotations.");
        if (permId === "staff_users.view") cascadeRevoke("staff_users.");
        if (permId === "staff_roles.view") cascadeRevoke("staff_roles.");
        if (permId === "staff_custom_roles.view") cascadeRevoke("staff_custom_roles.");
        if (permId === "services.view") cascadeRevoke("services.");
        if (permId === "requests.view") {
          // cascade لكل صلاحيات الطلبات ما عدا توقيع التقرير الختامي (انتقلت لقسم التوقيع)
          const allRequestPerms = structure?.flatMap(g => g.permissions).filter(p => p.id.startsWith("requests.") && p.id !== "requests.view" && p.id !== "requests.sign_final_report") || [];
          allRequestPerms.forEach(p => {
            const defVal = rolePermissions?.includes(p.id) || false;
            if (defVal) { updated[p.id] = false; } else { delete updated[p.id]; }
          });
        }
        if (permId === "projects.view") cascadeRevoke("projects.");
        if (permId === "projects.financials") {
          ["projects.edit_support_and_fees", "projects.add_receipt_voucher"].forEach(pId => {
            const defVal = rolePermissions?.includes(pId) || false;
            if (defVal) { updated[pId] = false; } else { delete updated[pId]; }
          });
        }
        if (permId === "progress_reports.view") cascadeRevoke("progress_reports.");
        if (permId === "progress_invoices.view") cascadeRevoke("progress_invoices.");
        if (permId === "project_reports.view") cascadeRevoke("project_reports.");
        if (permId === "requester_accounts.view") cascadeRevoke("requester_accounts.");
        if (permId === "requester_exceptions.view") cascadeRevoke("requester_exceptions.");
        if (permId === "requester_donations.view") cascadeRevoke("requester_donations.");
        if (permId === "requester_inquiries.view") cascadeRevoke("requester_inquiries.");
        if (permId === "requester_sedana.view") cascadeRevoke("requester_sedana.");
        if (permId === "financial_reports.view") cascadeRevoke("financial_reports.");
        if (permId === "reports.view_stats") cascadeRevoke("reports.");
        if (permId === "disbursements.view") {
          cascadeRevoke("disbursements.");
        }
        if (permId === "disbursement_orders.view") {
          cascadeRevoke("disbursement_orders.");
        }
        if (permId === "receipt_vouchers.view") {
          cascadeRevoke("receipt_vouchers.");
        }
        if (permId === "custody_requests.view") {
          cascadeRevoke("custody_requests.");
        }
        if (permId === "purchase_orders.view") {
          cascadeRevoke("purchase_orders.");
        }
        if (permId === "csr_letters.view") {
          cascadeRevoke("csr_letters.");
        }
        if (permId === "sedana_warehouse.view") {
          cascadeRevoke("sedana_warehouse.");
        }
        if (permId === "sedana_requests.view") {
          cascadeRevoke("sedana_requests.");
        }
        if (permId === "sedana_quotations.view") {
          cascadeRevoke("sedana_quotations.");
        }
        if (permId === "contracts.view") {
          cascadeRevoke("contracts.");
        }
        if (permId === "fund.view") {
          cascadeRevoke("fund.");
        }
        if (permId.startsWith("sedana_quotations.")) {
          const allSedanaKeys = ["sedana_quotations.export_pdf", "sedana_quotations.add", "sedana_quotations.recommend", "sedana_quotations.approve"];
          const hasRemaining = allSedanaKeys.some(k => k !== permId && isChecked(k));
          if (!hasRemaining) {
            const defVal = rolePermissions?.includes("sedana_quotations.view") || false;
            if (defVal) {
              updated["sedana_quotations.view"] = false;
            } else {
              delete updated["sedana_quotations.view"];
            }
          }
        }
        if (permId === "board_chairman") {
          const defVal = rolePermissions?.includes("board_leadership.remind") || false;
          if (defVal) {
            updated["board_leadership.remind"] = false;
          } else {
            delete updated["board_leadership.remind"];
          }
        }


      }

      return updated;
    });
  };

  // تحديد وتفعيل الكل لوحدة برمجية معينة
  const handleToggleModuleAll = (modulePerms: any[]) => {
    const permIds = modulePerms.map(p => p.id);
    const allSelected = permIds.every(id => isChecked(id));
    
    setOverrides(prev => {
      let updated = { ...prev };
      
      if (allSelected) {
        permIds.forEach(id => {
          const defVal = rolePermissions?.includes(id) || false;
          if (defVal) {
            updated[id] = false;
          } else {
            delete updated[id];
          }
        });
      } else {
        permIds.forEach(id => {
          if (id === "appointments.view_own" && permIds.includes("appointments.view_all")) {
            return;
          }
          const defVal = rolePermissions?.includes(id) || false;
          if (defVal) {
            delete updated[id];
          } else {
            updated[id] = true;
          }
        });

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
            "requester_inquiries.delete",
            "requester_sedana.view",
            "requester_sedana.review",
          ];
          cascadePerms.forEach(pId => {
            const defVal = rolePermissions?.includes(pId) || false;
            if (defVal) {
              delete updated[pId];
            } else {
              updated[pId] = true;
            }
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
            const defVal = rolePermissions?.includes(targetId) || false;
            if (defVal) {
              delete updated[targetId];
            } else {
              updated[targetId] = true;
            }
          });
        }
      }
      return updated;
    });
  };

  // إدارة الأدوار المخصصة للمستخدم
  const { data: allRoles } = trpc.permissions.getRoles.useQuery();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const assignRoleMutation = trpc.permissions.assignRole.useMutation({
    onSuccess: () => {
      toast.success("تم إسناد الدور للمستخدم بنجاح");
      utils.permissions.getUserRoles.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
      setSelectedRoleId("");
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error, "فشل إسناد الدور، يرجى المحاولة مرة أخرى بعد قليل"));
    }
  });

  const removeRoleMutation = trpc.permissions.removeRole.useMutation({
    onSuccess: () => {
      toast.success("تم إزالة الدور من المستخدم بنجاح");
      utils.permissions.getUserRoles.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error, "فشل إزالة الدور، يرجى المحاولة مرة أخرى بعد قليل"));
    }
  });

  const handleAssignRole = () => {
    if (!selectedRoleId) return;
    assignRoleMutation.mutate({
      userId: userId!,
      roleId: selectedRoleId
    });
  };

  const handleRemoveRole = (roleId: string) => {
    if (confirm("هل أنت متأكد من إزالة هذا الدور من المستخدم؟")) {
      removeRoleMutation.mutate({
        userId: userId!,
        roleId
      });
    }
  };

  const assignableRoles = allRoles?.filter(role => {
    const isPrimary = role.id === userData?.role;
    const isAssigned = userRoles?.some(ur => ur.roleId === role.id);
    return !isPrimary && !isAssigned && role.isActive;
  }) || [];

  // حفظ الصلاحيات الفردية
  const syncMutation = trpc.permissions.setUserDirectPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث صلاحيات المستخدم الفردية بنجاح");
      refetchFinal();
      refetchDirect();
      utils.permissions.getUserPermissions.invalidate({ userId: userId! });
      utils.permissions.getUserRolePermissions.invalidate({ userId: userId! });
      utils.auth.me.invalidate();
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error, "فشل تحديث الصلاحيات، يرجى المحاولة مرة أخرى بعد قليل"));
    }
  });

  const handleSaveChanges = () => {
    const payload = Object.entries(overrides).map(([permissionId, granted]) => ({
      permissionId,
      granted,
      reason: "تخصيص صلاحيات المستخدم المباشرة"
    }));

    syncMutation.mutate({
      userId: userId!,
      permissions: payload
    });
  };

  // إعادة تعيين لخيارات الدور
  const handleResetToDefault = () => {
    if (confirm("هل أنت متأكد من إلغاء كافة الاستثناءات المباشرة والعودة لخيارات الدور الافتراضية؟")) {
      setOverrides({});
    }
  };

  // مسمى الصلاحيات المهنية (نفس المخرجات المعتمدة لصفحة تخصيص الدور)
  const getDescriptiveLabel = (moduleId: string, action: string) => {
    const mapping: Record<string, Record<string, string>> = {
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
        view: "عرض قائمة المساجد",
        create: "إضافة مسجد جديد",
        edit: "تعديل بيانات مسجد",
        delete: "حذف مسجد",
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
        create_quick_request: "إنشاء طلب سريع",
      },
      escalation: {
        view: "عرض قسم التصعيد الإداري",
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
        review: "مراجعة وتحديث حالة الاستفسار",
        delete: "حذف الاستفسار"
      },
      requester_sedana: {
        view: "عرض طلبات برنامج سدانة",
        review: "اتخاذ إجراء واعتماد الطلب"
      },
      staff_users: {
        view: "عرض قائمة المستخدمين",
        add: "إضافة موظف جديد",
        edit: "تعديل البيانات",
        customize: "تخصيص الصلاحيات",
        suspend: "إيقاف الحساب",
        activate: "تنشيط الحساب",
        delete: "حذف الحساب"
      },
      suppliers: {
        view: "عرض قائمة الموردين",
        view_details: "عرض تفاصيل المورد",
        add: "إضافة مورد",
        edit: "تعديل بيانات الموردين",
        approve: "الاعتمادات (اعتماد أو رفض مورد)",
        suspend: "إيقاف المورد وإعادة تفعيله"
      },
      quotations: {
        view: "عرض قائمة عروض الأسعار",
        view_sedana: "عرض عروض أسعار سدانة",
        add: "إضافة عرض سعر",
        approve: "الاعتمادات (اعتماد عروض الأسعار)"
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
        export: "تصدير البيانات",
      },
      reports: {
        view_stats: "عرض احصائيات الطلبات",
        export_data: "تصدير البيانات"
      },
      staff_roles: {
        view: "عرض الأدوار والصلاحيات",
        customize: "تخصيص صلاحيات الدور الأساسي",
        suspend: "إيقاف الدور الأساسي"
      },
      staff_custom_roles: {
        view: "عرض الأدوار المخصصة",
        add: "إضافة دور مخصص جديد",
        edit: "تعديل الدور المخصص",
        delete: "حذف الدور المخصص"
      },
      staff_notifications: {
        by_role: "تخصيص الإشعارات حسب الدور",
        edit_message_formats: "تعديل صيغ الرسائل",
        by_person: "تخصيص حسب الأشخاص",
        beneficiary: "إشعارات المستفيد",
        edit: "تعديل تخصيص الإشعارات"
      },
      notification_center: {
        direct_send: "إرسال إشعار مباشر",
        send_logs: "سجل إرسال الإشعارات",
        view: "عرض مركز الإشعارات"
      },
      settings_org: {
        view: "عرض إعدادات الجمعية",
        edit_basic: "تعديل معلومات الجمعية الأساسية",
        edit_signers: "تعديل المفوضين بالتوقيع",
        edit_banks: "تعديل الحسابات البنكية المعتمدة",
        edit_contracts: "تعديل إعدادات وصياغة العقود"
      },
      settings_branding: {
        edit: "تعديل الهوية البصرية وشعارات البوابة"
      },
      settings_categories: {
        view: "عرض وتحديث تصنيفات الخدمات",
        add: "إضافة تصنيف جديد للخدمات",
        edit: "تعديل وحفظ تصنيف الخدمات",
        delete: "حذف تصنيف الخدمات"
      },
      services: {
        view: "عرض قائمة البرامج والخدمات",
        add: "إضافة برنامج أو خدمة جديدة",
        edit: "تعديل مواصفات البرامج والخدمات",
        delete: "حذف برنامج أو خدمة"
      },
      forms_customization: {
        evaluation: "تخصيص استمارة التقييم",
        services: "تخصيص نماذج طلبات الخدمات",
        registration: "تخصيص نماذج التسجيل والتبرع",
        analytics: "لوحة الإحصائيات المخصصة"
      },
      settings_escalation: {
        view: "تعيين وقت التأخير ومدد المراحل",
      },
      mosque_map: {
        view: "عرض الخريطة الجغرافية للمساجد"
      },
      appointments: {
        view: "عرض تقويم المواعيد والزيارات",
        view_all: "عرض كافة المواعيد والزيارات للمنشأة",
        view_own: "عرض زياراتي الميدانية الخاصة بي فقط"
      },
      boq: {
        view: "عرض جداول الكميات",
        add: "إضافة بند جديد",
        edit: "تعديل بنود",
        delete: "حذف بنود",
        import: "استيراد جدول الكميات من Excel",
        export: "تصدير وتحميل جدول الكميات"
      },
      technical_support: {
        view: "عرض التذاكر",
        create: "إرسال التذاكر"
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
        progress: "تقارير ونسب الإنجاز"
      }
    };
    return mapping[moduleId]?.[action] || action;
  };

  // هيكل الصلاحيات الكامل (Categorized) - مطابق تماماً للـ superAdminGroups في RolePermissions.tsx
  const permissionsGroups = [
    {
      title: "المساجد والطلبات",
      modules: [
        { id: "mosques", nameAr: "المساجد", icon: Building2, perms: ["view", "create", "edit", "delete", "approve"] },
        { id: "mosque_map", nameAr: "خريطة المساجد", icon: Map, perms: ["view"] },
        { 
          id: "requests", 
          nameAr: "الطلبات", 
          icon: Zap, 
          perms: ["view", "create", "view_details", "add_review_note", "transfer_to_beneficiary", "manage_as_field_team", "manage_as_quick_response", "upload_final_report", "create_quick_request"]
        },
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
        { id: "requester_inquiries", nameAr: "الاستفسارات العامة", icon: MessageSquareQuote, perms: ["view", "review", "delete"] },
        { id: "requester_sedana", nameAr: "طلبات برنامج سدانة", icon: Sparkles, perms: ["view", "review"] },
      ]
    },
    {
      title: "الإعدادات",
      modules: [
        { 
          id: "settings_org", 
          nameAr: "إعدادات الجمعية", 
          icon: Building2, 
          perms: ["view", "edit_basic", "edit_signers", "edit_banks", "edit_contracts"] 
        },
        { id: "settings_branding", nameAr: "الهوية البصرية", icon: Palette, perms: ["edit"] },
        { id: "settings_categories", nameAr: "إدارة التصنيفات", icon: Tag, perms: ["view", "add", "edit", "delete"] },
        { id: "services", nameAr: "البرامج والخدمات", icon: LayoutGrid, perms: ["view", "add", "edit", "delete"] },
        { id: "forms_customization", nameAr: "تخصيص النماذج", icon: SlidersHorizontal, perms: ["evaluation", "services", "registration", "analytics"] },
        { id: "settings_escalation", nameAr: "تعيين وقت التأخير ومدد المراحل", icon: ShieldAlert, perms: ["view"] },
        { id: "staff_notifications", nameAr: "تخصيص الإشعارات", icon: Bell, perms: ["by_role", "edit_message_formats", "by_person", "beneficiary"] },
        { id: "notification_center", nameAr: "مركز الإشعارات", icon: Send, perms: ["direct_send", "send_logs"] },
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
    },
    {
      title: "مجلس الإدارة والقيادة العليا",
      modules: [
        {
          id: "board_leadership",
          nameAr: "مجلس الإدارة والقيادة العليا",
          icon: Shield,
          perms: ["board_chairman", "board_member", "remind"]
        }
      ]
    }
  ];

  if (!userId) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-bold text-destructive">خطأ في معرف المستخدم</h2>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/users")}>العودة لقائمة المستخدمين</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!canCustomize) {
    return (
      <DashboardLayout>
        <div className="container py-20 text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive">عذراً، لا تملك صلاحية لتخصيص صلاحيات المستخدمين</h2>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/users")}>العودة لقائمة المستخدمين</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-24 flex flex-col items-center justify-center min-h-[500px]">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
            <Shield className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse text-lg">جاري تحميل صلاحيات المستخدم...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl mx-auto" dir="rtl text-right">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8 sm:mb-10 text-right">
          <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation(`/users/${userId}`)} 
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowRight className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
            </Button>
            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                تخصيص صلاحيات المستخدم
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {userData?.name}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-semibold">
                  {userRoles && userRoles.length > 0 ? "الدور المخصص:" : "الدور الأساسي:"}
                </span>
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-[10px] sm:text-xs px-2 py-0.5">
                  {roleNameAr}
                </Badge>
                {userRoles && userRoles.length > 1 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-semibold">الأدوار الإضافية:</span>
                    {userRoles.slice(1).map((ur) => (
                      <Badge key={ur.id} variant="secondary" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-medium text-[10px] sm:text-xs px-2 py-0.5">
                        {ur.roleName}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 sm:gap-3 w-full lg:w-auto">
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse w-full lg:w-auto text-left lg:text-right mb-1 lg:mb-0">
                توجد تغييرات غير محفوظة *
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              disabled={Object.keys(overrides).length === 0 || syncMutation.isPending}
              className="w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-5 font-semibold text-slate-600 dark:text-slate-300 gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800 h-10 sm:h-11 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين الافتراضي
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={syncMutation.isPending || !hasChanges}
              className={`w-full sm:w-auto text-xs sm:text-sm px-5 sm:px-6 font-bold rounded-xl shadow-md h-10 sm:h-11 transition-all ${
                hasChanges 
                  ? "gradient-primary text-white scale-102 hover:scale-105" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              }`}
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </div>
        </div>


        {/* Informative Tip */}
        <div className="border border-primary/10 bg-primary/5 rounded-2xl p-5 mb-10 flex items-start gap-4 text-right">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold mb-1">
              تخصيص الصلاحيات للشخص
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تظهر الصلاحيات موروثة من الدور تلقائياً. يمكنك النقر على أي صلاحية لمنحها كصلاحية استثنائية مباشرة للمستخدم (باللون الأخضر) أو حجبها تماماً عنه (باللون الأحمر)، ثم النقر على حفظ التغييرات.
            </p>
          </div>
        </div>

        {/* Grouped Rendering */}
        <div className="space-y-12 text-right">
          {permissionsGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-8 rounded-full bg-primary shrink-0" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{group.title}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {group.modules.map((module) => {
                  const Icon = module.icon || Shield;
                  const modulePerms = module.perms.map(p => {
                    let id = `${module.id}.${p}`;
                    if (module.id === "technical_support") {
                      id = p === "view" ? "View_Tickets" : "Create_Ticket";
                    }
                    if (module.id === "board_leadership") {
                      const boardIds: Record<string, string> = {
                        board_chairman: "board_chairman",
                        board_member: "board_member",
                        remind: "board_leadership.remind",
                      };
                      id = boardIds[p] || id;
                    }
                    if (module.id === "signing") {
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
                      nameAr: getDescriptiveLabel(module.id, p)
                    };
                  });

                  const activePerms = modulePerms.filter((p) => isChecked(p.id));
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
                                  {modulePerms.every((p) => isChecked(p.id)) ? "إلغاء تحديد الكل" : "تحديد الكل"}
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
                          {modulePerms.map((perm) => {
                            const isPermChecked = isChecked(perm.id);
                            const overrideState = getOverrideState(perm.id);

                            const isDisabled = 
                              (perm.id.startsWith("custody_requests.") && perm.id !== "custody_requests.view" && !isChecked("custody_requests.view")) ||
                              (perm.id.startsWith("receipt_vouchers.") && perm.id !== "receipt_vouchers.view" && !isChecked("receipt_vouchers.view")) ||
                              (perm.id.startsWith("contracts.") && perm.id !== "contracts.view" && !isChecked("contracts.view")) ||
                              (perm.id.startsWith("disbursement_orders.") && perm.id !== "disbursement_orders.view" && !isChecked("disbursement_orders.view")) ||
                              (perm.id === "board_leadership.remind" && !isChecked("board_chairman")) ||
                              (perm.id.startsWith("mosques.") && perm.id !== "mosques.view" && !isChecked("mosques.view")) ||
                              (perm.id.startsWith("suppliers.") && perm.id !== "suppliers.view" && !isChecked("suppliers.view")) ||
                              (perm.id.startsWith("boq.") && perm.id !== "boq.view" && !isChecked("boq.view")) ||
                              (perm.id.startsWith("quotations.") && perm.id !== "quotations.view" && !isChecked("quotations.view")) ||
                              (perm.id.startsWith("staff_users.") && perm.id !== "staff_users.view" && !isChecked("staff_users.view")) ||
                              (perm.id.startsWith("staff_roles.") && perm.id !== "staff_roles.view" && !isChecked("staff_roles.view")) ||
                              (perm.id.startsWith("staff_custom_roles.") && perm.id !== "staff_custom_roles.view" && !isChecked("staff_custom_roles.view")) ||
                              (perm.id.startsWith("services.") && perm.id !== "services.view" && !isChecked("services.view")) ||
                              (perm.id.startsWith("requests.") && perm.id !== "requests.view" && perm.id !== "requests.sign_final_report" && !isChecked("requests.view")) ||
                              (perm.id.startsWith("projects.") && perm.id !== "projects.view" && !isChecked("projects.view")) ||
                              (perm.id === "projects.financials" && (!isChecked("fund.view") || !isChecked("fund.transfer")) && !isChecked("projects.financials")) ||
                              ((perm.id === "projects.edit_support_and_fees" || perm.id === "projects.add_receipt_voucher") && !isChecked("projects.financials")) ||
                              (perm.id.startsWith("progress_reports.") && perm.id !== "progress_reports.view" && !isChecked("progress_reports.view")) ||
                              (perm.id.startsWith("progress_invoices.") && perm.id !== "progress_invoices.view" && !isChecked("progress_invoices.view")) ||
                              (perm.id.startsWith("project_reports.") && perm.id !== "project_reports.view" && !isChecked("project_reports.view")) ||
                              (perm.id.startsWith("requester_accounts.") && perm.id !== "requester_accounts.view" && !isChecked("requester_accounts.view")) ||
                              (perm.id.startsWith("requester_exceptions.") && perm.id !== "requester_exceptions.view" && !isChecked("requester_exceptions.view")) ||
                              (perm.id.startsWith("requester_donations.") && perm.id !== "requester_donations.view" && !isChecked("requester_donations.view")) ||
                              (perm.id.startsWith("requester_inquiries.") && perm.id !== "requester_inquiries.view" && !isChecked("requester_inquiries.view")) ||
                              (perm.id.startsWith("requester_sedana.") && perm.id !== "requester_sedana.view" && !isChecked("requester_sedana.view")) ||
                              (perm.id.startsWith("reports.") && perm.id !== "reports.view_stats" && !isChecked("reports.view_stats")) ||
                              (perm.id.startsWith("beneficiary_evaluations.") && perm.id !== "beneficiary_evaluations.view" && !isChecked("beneficiary_evaluations.view"));

                            // تحديد نمط البطاقة بناءً على نوع حالة الصلاحية (موروثة، ممنوحة، مسحوبة)
                            let cardClass = "border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-pointer";
                            let badgeElement = null;

                            if (isDisabled) {
                              cardClass = "border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none opacity-50";
                            } else if (overrideState === "granted") {
                              cardClass = "border-green-200 bg-green-50/40 dark:bg-green-950/10 dark:border-green-900/30 text-green-950 dark:text-green-400 hover:bg-green-50/60 cursor-pointer";
                              badgeElement = <Badge variant="outline" className="text-[9px] bg-green-100 text-green-800 border-green-200 font-semibold py-0 shrink-0">منح خاص</Badge>;
                            } else if (overrideState === "revoked") {
                              cardClass = "border-red-200 bg-red-50/40 dark:bg-red-950/10 dark:border-red-900/30 text-red-950 dark:text-red-400 hover:bg-red-50/60 cursor-pointer";
                              badgeElement = <Badge variant="outline" className="text-[9px] bg-red-100 text-red-800 border-red-200 font-semibold py-0 shrink-0">حجب خاص</Badge>;
                            } else if (rolePermissions?.includes(perm.id)) {
                              badgeElement = <span className="text-[10px] text-slate-400 shrink-0">موروثة</span>;
                            }

                            return (
                              <div 
                                key={perm.id} 
                                onClick={() => !isDisabled && handleTogglePermission(perm.id)}
                                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all select-none text-right ${cardClass}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                                    isDisabled
                                      ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                                      : isPermChecked
                                        ? overrideState === "granted"
                                          ? "bg-green-600 border-green-600 text-white"
                                          : "bg-primary border-primary text-white"
                                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                  }`}>
                                    {isPermChecked && (
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold leading-snug">{perm.nameAr}</span>
                                </div>
                                {badgeElement}
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
            variant="outline"
            onClick={() => setLocation(`/users/${userId}`)}
            className="rounded-xl h-11 px-6 font-semibold"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={syncMutation.isPending || !hasChanges}
            className={`px-8 font-bold rounded-xl shadow-md h-11 transition-all ${
              hasChanges 
                ? "gradient-primary text-white scale-105 hover:scale-108" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
            }`}
          >
            {syncMutation.isPending ? "جاري حفظ التغييرات..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
