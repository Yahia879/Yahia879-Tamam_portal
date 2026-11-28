import { Suspense, lazy, useEffect, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useSearch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DocumentTitleProvider } from "./contexts/DocumentTitleContext";

// الصفحات العامة الأولية (تحميل مباشر لتسريع عرض نقطة الدخول)
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Unauthorized from "./pages/Unauthorized";

const Register = lazy(() => import("./pages/Register"));

// لوحات التحكم
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InformationDashboard = lazy(() => import("./pages/InformationDashboard"));
const BoardDashboard = lazy(() => import("./pages/BoardDashboard"));
const RequesterDashboard = lazy(() => import("./pages/RequesterDashboard"));
const MawasimStaff = lazy(() => import("./pages/MawasimStaff"));
const MawasimWorkOrderPrint = lazy(() => import("./pages/MawasimWorkOrderPrint"));
const MawasimPortal = lazy(() => import("./pages/MawasimPortal"));
const SeasonalRequestCreate = lazy(() => import("./pages/SeasonalRequestCreate"));
const RequesterEvaluations = lazy(() => import("./pages/RequesterEvaluations"));
const RequesterApprovals = lazy(() => import("./pages/RequesterApprovals"));
const RequesterApprovalDetails = lazy(() => import("./pages/RequesterApprovalDetails"));

// صفحات المساجد
const Mosques = lazy(() => import("./pages/Mosques"));
const MosqueDetails = lazy(() => import("./pages/MosqueDetails"));
const MosqueForm = lazy(() => import("./pages/MosqueForm"));
const MosquesMap = lazy(() => import("./pages/MosquesMap"));
const MyMosques = lazy(() => import("./pages/MyMosques"));
const RequesterMosqueForm = lazy(() => import("./pages/RequesterMosqueForm"));
const RequesterMosqueDetails = lazy(() => import("./pages/RequesterMosqueDetails"));

const EditImam = lazy(() => import("./pages/EditImam"));

// صفحات الطلبات
const Requests = lazy(() => import("./pages/Requests"));
const RequestDetails = lazy(() => import("./pages/RequestDetailsNew"));
const SedanaEvaluationPage = lazy(() => import("./pages/SedanaEvaluationPage"));
const SedanaProcurementPage = lazy(() => import("./pages/SedanaProcurementPage"));
const SedanaCsrLetterPrint = lazy(() => import("./pages/SedanaCsrLetterPrint"));
const SedanaPurchaseOrderPrint = lazy(() => import("./pages/SedanaPurchaseOrderPrint"));
const SedanaExecutionPage = lazy(() => import("./pages/SedanaExecutionPage"));
const NewSedanaInwardOrderPage = lazy(() => import("./pages/NewSedanaInwardOrderPage"));
const NewSedanaOutboundOrderPage = lazy(() => import("./pages/NewSedanaOutboundOrderPage"));
const SedanaDeliveryOrderPrint = lazy(() => import("./pages/SedanaDeliveryOrderPrint"));
const SedanaBulkPurchasingPage = lazy(() => import("./pages/SedanaBulkPurchasingPage"));
const PurchaseOrdersList = lazy(() => import("./pages/PurchaseOrdersList"));
const CreatePurchaseOrderPage = lazy(() => import("./pages/CreatePurchaseOrderPage"));
const CsrLettersList = lazy(() => import("./pages/CsrLettersList"));
const CreateCsrLetterPage = lazy(() => import("./pages/CreateCsrLetterPage"));
const OrdersAndLettersReview = lazy(() => import("./pages/OrdersAndLettersReview"));
const RequestForm = lazy(() => import("./pages/RequestForm"));
const TrackRequest = lazy(() => import("./pages/TrackRequest"));
const MosqueServiceRequest = lazy(() => import("./pages/MosqueServiceRequest"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const DynamicServiceRequestForm = lazy(() =>
  import("./pages/DynamicServiceRequestForm").then((m) => ({
    default: m.DynamicServiceRequestForm,
  }))
);

// صفحات المستخدمين
const UsersManagement = lazy(() => import("./pages/UsersManagement"));
const UserDetails = lazy(() => import("./pages/UserDetails"));
const UserEdit = lazy(() => import("./pages/UserEdit"));

// صفحات المشاريع
const Projects = lazy(() => import("./pages/Projects"));
const ProjectManagement = lazy(() => import("./pages/ProjectManagement"));
const ProjectDetailsPage = lazy(() => import("./pages/ProjectDetailsPage"));
const NewMultiMosqueProjectPage = lazy(() => import("./pages/NewMultiMosqueProjectPage"));
const ProjectReportsHubPage = lazy(() => import("./pages/ProjectReportsHubPage"));
const NewProjectReportPage = lazy(() => import("./pages/NewProjectReportPage"));
const FollowUpReportPage = lazy(() => import("./pages/FollowUpReportPage"));
const ProjectReportPrintPage = lazy(() => import("./pages/ProjectReportPrintPage"));
const SemiMonthlyReportPage = lazy(() => import("./pages/SemiMonthlyReportPage"));
const MonthlyReportPage = lazy(() => import("./pages/MonthlyReportPage"));
const QuarterlyReportPage = lazy(() => import("./pages/QuarterlyReportPage"));
const VisitReportPage = lazy(() => import("./pages/VisitReportPage"));

// صفحات أخرى
const Partners = lazy(() => import("./pages/Partners"));
const Branding = lazy(() => import("./pages/Branding"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationCustomization = lazy(() => import("./pages/NotificationCustomization"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const RequestEvaluation = lazy(() => import("./pages/RequestEvaluation"));
const PublicEvaluation = lazy(() => import("./pages/PublicEvaluation"));
const BeneficiarySatisfaction = lazy(() => import("./pages/BeneficiarySatisfaction"));
const Reports = lazy(() => import("./pages/Reports"));
const PendingReports = lazy(() => import("./pages/PendingReports"));
const AnalyticsHub = lazy(() => import("./pages/AnalyticsHub"));

// صفحات الموردين والعقود والصرف
const SupplierRegistration = lazy(() => import("./pages/SupplierRegistration"));
const ModernSupplierRegistration = lazy(() => import("./pages/ModernSupplierRegistration"));
const SuppliersManagement = lazy(() => import("./pages/SuppliersManagement"));
const SupplierDetails = lazy(() => import("./pages/SupplierDetails"));
const AddSupplier = lazy(() => import("./pages/AddSupplier"));
const EditSupplier = lazy(() => import("./pages/EditSupplier"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const ContractForm = lazy(() => import("./pages/ContractForm"));
const ContractPreview = lazy(() => import("./pages/ContractPreview"));
const ContractPrint = lazy(() => import("./pages/ContractPrint"));
const FieldInspectionForm = lazy(() => import("./pages/FieldInspectionForm"));
const FieldVisitSchedule = lazy(() => import("./pages/FieldVisitSchedule"));
const FieldVisitsCalendar = lazy(() => import("./pages/FieldVisitsCalendar"));
const QuickResponseReportForm = lazy(() => import("./pages/QuickResponseReportForm"));
const QuickRequestCreate = lazy(() => import("./pages/QuickRequestCreate"));
const BOQ = lazy(() => import("./pages/BOQ"));
const Quotations = lazy(() => import("./pages/Quotations"));
const SedanaQuotations = lazy(() => import("./pages/SedanaQuotations"));
const FinancialApproval = lazy(() => import("./pages/FinancialApproval"));
const CategoriesManagement = lazy(() => import("./pages/CategoriesManagement"));
const ContractTemplates = lazy(() => import("./pages/ContractTemplates"));
const TemplatePreview = lazy(() => import("./pages/TemplatePreview"));
const TemplatePrint = lazy(() => import("./pages/TemplatePrint"));
const ContractsList = lazy(() => import("./pages/ContractsList"));
const DisbursementRequests = lazy(() => import("./pages/DisbursementRequests"));
const Handovers = lazy(() => import("./pages/Handovers"));
const FinalReportForm = lazy(() => import("./pages/FinalReportForm"));
const FinalReportView = lazy(() => import("./pages/FinalReportView"));
const AssignFinalReport = lazy(() => import("./pages/AssignFinalReport"));
const KPIDashboard = lazy(() => import("./pages/KPIDashboard"));
const NewDisbursementRequest = lazy(() => import("./pages/NewDisbursementRequest"));
const NewMilestoneRequest = lazy(() => import("./pages/NewMilestoneRequest"));
const EditMilestonePage = lazy(() => import("./pages/EditMilestonePage"));
const NewLinkedDisbursementRequest = lazy(() => import("./pages/NewLinkedDisbursementRequest"));
const EditLinkedDisbursementRequest = lazy(() => import("./pages/EditLinkedDisbursementRequest"));
const NewDisbursementOrder = lazy(() => import("./pages/NewDisbursementOrder"));
const NewDirectDisbursementOrder = lazy(() => import("./pages/NewDirectDisbursementOrder"));
const DisbursementOrderPrint = lazy(() => import("./pages/DisbursementOrderPrint"));
const DisbursementRequestPrint = lazy(() => import("./pages/DisbursementRequestPrint"));
const ReceiptVoucherPrint = lazy(() => import("./pages/ReceiptVoucherPrint"));
const ReceiptVouchers = lazy(() => import("./pages/ReceiptVouchers"));
const NewReceiptVoucherPage = lazy(() => import("./pages/NewReceiptVoucherPage"));
const FundPage = lazy(() => import("./pages/FundPage"));
const NewFundTransferPage = lazy(() => import("./pages/NewFundTransferPage"));
const CustodyRequests = lazy(() => import("./pages/CustodyRequests"));
const NewCustodyRequest = lazy(() => import("./pages/NewCustodyRequest"));
const CustodyRequestPrint = lazy(() => import("./pages/CustodyRequestPrint"));
const ProgressReports = lazy(() => import("./pages/ProgressReports"));
const ProgressReportPrint = lazy(() => import("./pages/ProgressReportPrint"));
const FieldVisitReportPrint = lazy(() => import("./pages/FieldVisitReportPrint"));
const QuickResponseReportPrint = lazy(() => import("./pages/QuickResponseReportPrint"));
const QuickRequestReportPrint = lazy(() => import("./pages/QuickRequestReportPrint"));
const DisbursementOrders = lazy(() => import("./pages/DisbursementOrders"));
const DisbursementOrderDetails = lazy(() => import("./pages/DisbursementOrderDetails"));
const EditPaymentPage = lazy(() => import("./pages/EditPaymentPage"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const FinancialReport = lazy(() => import("./pages/FinancialReport"));
const StageSettings = lazy(() => import("./pages/StageSettings"));
const ActionSettings = lazy(() => import("./pages/ActionSettings"));
const Escalation = lazy(() => import("./pages/Escalation"));
const Roles = lazy(() => import("./pages/Roles"));
const RoleEdit = lazy(() => import("./pages/RoleEdit"));
const RolePermissions = lazy(() => import("./pages/RolePermissions"));
const UserPermissions = lazy(() => import("./pages/UserPermissions"));
const PermissionsAuditLog = lazy(() => import("./pages/PermissionsAuditLog"));
const JobPositions = lazy(() => import("./pages/JobPositions"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const ProgramCustomization = lazy(() => import("./pages/ProgramCustomization"));
const FormsCustomization = lazy(() => import("./pages/FormsCustomization"));
const FormsCustomizationEvaluation = lazy(() => import("./pages/FormsCustomizationEvaluation"));
const FormsCustomizationServices = lazy(() => import("./pages/FormsCustomizationServices"));
const FormsCustomizationServiceDetail = lazy(() => import("./pages/FormsCustomizationServiceDetail"));
const FormsCustomizationRegistration = lazy(() => import("./pages/FormsCustomizationRegistration"));
const FormsCustomizationRegistrationDetail = lazy(() => import("./pages/FormsCustomizationRegistrationDetail"));
const FormsCustomizationDashboard = lazy(() => import("./pages/FormsCustomizationDashboard"));
const FormsCustomizationAnalytics = lazy(() => import("./pages/FormsCustomizationAnalytics"));
const FormsCustomizationOption2 = lazy(() => import("./pages/FormsCustomizationOption2"));
const FormsCustomizationEscalation = lazy(() => import("./pages/FormsCustomizationEscalation"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const DebugUser = lazy(() => import("./pages/DebugUser"));

import AdminGuard from "./components/AdminGuard";
import GuestGuard from "./components/GuestGuard";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRouteGuard from "./components/PermissionRouteGuard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { consumeSuspensionMessage } from "@/lib/authGuard";
import { toast } from "sonner";

function RouteFallback() {
  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="mt-3 text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

// مكوّن يطبّق ألوان الهوية البصرية على متغيرات CSS عند تحميل التطبيق
function BrandColorApplier() {
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  useEffect(() => {
    if (!orgSettings) return;
    const s = orgSettings as any;
    const root = document.documentElement;
    if (s.colorPrimary1) root.style.setProperty("--brand-primary-1", s.colorPrimary1);
    if (s.colorPrimary2) root.style.setProperty("--brand-primary-2", s.colorPrimary2);
    if (s.colorSecondary1) root.style.setProperty("--brand-secondary-1", s.colorSecondary1);
    if (s.colorSecondary2) root.style.setProperty("--brand-secondary-2", s.colorSecondary2);
    if (s.colorSecondary3) root.style.setProperty("--brand-secondary-3", s.colorSecondary3);
    if (s.colorSecondary4) root.style.setProperty("--brand-secondary-4", s.colorSecondary4);
    if (s.colorSecondary5) root.style.setProperty("--brand-secondary-5", s.colorSecondary5);
    // تطبيق اللون الرئيسي الأول على --sidebar-background
    if (s.colorPrimary1) root.style.setProperty("--sidebar-background", s.colorPrimary1);
  }, [orgSettings]);
  return null;
}

/**
 * مكوّن يعرض تنبيه الإيقاف عند وصول المستخدم بعد تعليق دوره.
 * يقرأ الرسالة من sessionStorage (مرة واحدة) ويعرضها كـ Toast.
 */
function SuspensionNotifier() {
  useEffect(() => {
    const msg = consumeSuspensionMessage();
    if (msg) {
      // تأخير بسيط لضمان أن Toaster جاهز للعرض
      setTimeout(() => {
        toast.error(msg, {
          duration: 8000,
          description: "تم تسجيل خروجك تلقائياً",
        });
      }, 300);
    }
  }, []);
  return null;
}

// مكون لحماية المسارات الإدارية
const AdminRoute = ({ component: Component }: { component: ComponentType<any> }) => (
  <AdminGuard>
    <Component />
  </AdminGuard>
);

// مكون لحماية مسارات الضيوف (يمنع المسجلين من الدخول لصفحات تسجيل الدخول)
const GuestRoute = ({ component: Component }: { component: ComponentType<any> }) => (
  <GuestGuard>
    <Component />
  </GuestGuard>
);

// مكون لحماية مسارات طالبي الخدمة
const RequesterRoute = ({ component: Component }: { component: ComponentType<any> }) => (
  <ProtectedRoute allowedRoles={["service_requester"]}>
    <Component />
  </ProtectedRoute>
);

// مكون وسيط لاختيار صفحة الطلبات المناسبة حسب دور المستخدم
const MyRequestsWrapper = () => {
  const { user } = useAuth();
  if (user?.role === "service_requester") return <MyRequests />;
  return <Requests initialAssignedToMe={true} />;
};

// مكون وسيط لاختيار صفحة تفاصيل المسجد المناسبة حسب دور المستخدم
const MosqueDetailsWrapper = () => {
  const { user } = useAuth();
  if (user?.role === "service_requester") return <RequesterMosqueDetails />;
  return <MosqueDetails />;
};

function Router() {
  return (
    <PermissionRouteGuard>
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      {/* صفحة 403 - غير مصرح */}
      <Route path="/403" component={Unauthorized} />
      
      {/* الصفحات العامة */}
      <Route path="/" component={LandingPage} />
      <Route path="/login">{() => <GuestRoute component={Login} />}</Route>
      <Route path="/admin/login">{() => <GuestRoute component={AdminLogin} />}</Route>
      <Route path="/register">{() => <GuestRoute component={Register} />}</Route>
      <Route path="/track" component={TrackRequest} />
      <Route path="/service-request" component={MosqueServiceRequest} />
      <Route path="/debug-user" component={DebugUser} />
      
      {/* لوحات التحكم */}
      <Route path="/dashboard">{() => <AdminRoute component={Dashboard} />}</Route>
      <Route path="/information-dashboard">{() => <AdminRoute component={InformationDashboard} />}</Route>
      <Route path="/dashboard/detailed">{() => <AdminRoute component={InformationDashboard} />}</Route>
      <Route path="/board-dashboard">{() => <AdminRoute component={BoardDashboard} />}</Route>
      <Route path="/board-executive">{() => <AdminRoute component={BoardDashboard} />}</Route>
      <Route path="/board-analytics">{() => <AdminRoute component={BoardDashboard} />}</Route>
      <Route path="/requester">{() => <RequesterRoute component={RequesterDashboard} />}</Route>
      <Route path="/requester/dashboard">{() => <RequesterRoute component={RequesterDashboard} />}</Route>
      <Route path="/requester/mawasim">{() => <RequesterRoute component={MawasimPortal} />}</Route>
      <Route path="/mawasim/requests/:seasonId/:requestId/print">{() => <ProtectedRoute><MawasimWorkOrderPrint /></ProtectedRoute>}</Route>
      <Route path="/mawasim">{() => <ProtectedRoute><MawasimStaff /></ProtectedRoute>}</Route>
      <Route path="/requester/evaluations">{() => <RequesterRoute component={RequesterEvaluations} />}</Route>
      <Route path="/my-requests">
        {() => (
          <ProtectedRoute allowedRoles={["service_requester", "field_team", "quick_response", "projects_office", "super_admin", "system_admin"]}>
            <MyRequestsWrapper />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* المساجد - الصفحات الإدارية وصفحات المستفيد */}
      <Route path="/mosques">{() => <AdminRoute component={Mosques} />}</Route>
      <Route path="/mosques/map">{() => <AdminRoute component={MosquesMap} />}</Route>
      <Route path="/mosques/new" component={MosqueForm} />
      <Route path="/requester/mosques/new">{() => <RequesterRoute component={RequesterMosqueForm} />}</Route>
      <Route path="/requester/mosques/:id">{() => <RequesterRoute component={RequesterMosqueDetails} />}</Route>
      <Route path="/mosques/:id" component={MosqueDetailsWrapper} />
      <Route path="/mosques/:id/edit" component={MosqueForm} />
      <Route path="/mosques/:id/edit-imam">{params => <AdminRoute component={() => <EditImam params={params} />} />}</Route>
      <Route path="/my-mosques">{() => <RequesterRoute component={MyMosques} />}</Route>
      
      {/* صفحة تقييم رضا المستفيد (مخصصة لطالب الخدمة أو عامة عبر الرابط) */}
      <Route path="/evaluation" component={PublicEvaluation} />
      <Route path="/requests/:requestId/evaluation" component={RequestEvaluation} />
      <Route path="/requester/requests/:requestId/evaluation" component={RequestEvaluation} />
      
      {/* الطلبات - الصفحات الإدارية */}
      <Route path="/requests">{() => <AdminRoute component={Requests} />}</Route>
      <Route path="/requests/new">{() => <AdminRoute component={RequestForm} />}</Route>
      <Route path="/requests/seasonal">{() => <AdminRoute component={SeasonalRequestCreate} />}</Route>
      <Route path="/requests/quick-create">{() => <AdminRoute component={QuickRequestCreate} />}</Route>
      <Route path="/requests/:id/edit">{() => <AdminRoute component={RequestForm} />}</Route>
      <Route path="/requests/:id" component={RequestDetails} />
      <Route path="/requests/:id/sedana-evaluation" component={SedanaEvaluationPage} />
      <Route path="/requester/requests/:id/sedana-evaluation" component={SedanaEvaluationPage} />
      <Route path="/requests/:id/procurement" component={SedanaProcurementPage} />
      <Route path="/requester/requests/:id/procurement" component={SedanaProcurementPage} />
      <Route path="/requests/:id/sedana-csr" component={SedanaCsrLetterPrint} />
      <Route path="/requests/:id/csr-letter" component={SedanaCsrLetterPrint} />
      <Route path="/requester/requests/:id/sedana-csr" component={SedanaCsrLetterPrint} />
      <Route path="/requester/requests/:id/csr-letter" component={SedanaCsrLetterPrint} />
      <Route path="/requests/:id/sedana-po" component={SedanaPurchaseOrderPrint} />
      <Route path="/requests/:id/purchase-order" component={SedanaPurchaseOrderPrint} />
      <Route path="/requester/requests/:id/sedana-po" component={SedanaPurchaseOrderPrint} />
      <Route path="/requester/requests/:id/purchase-order" component={SedanaPurchaseOrderPrint} />
      {/* المستودع الافتراضي والتنفيذ وأوامر التسليم لبرنامج سدانة */}
      <Route path="/sedana-warehouse">{() => <AdminRoute component={SedanaExecutionPage} />}</Route>
      <Route path="/sedana-execution">{() => <AdminRoute component={SedanaExecutionPage} />}</Route>
      <Route path="/requests/:id/sedana-execution" component={SedanaExecutionPage} />
      <Route path="/requester/requests/:id/sedana-execution" component={SedanaExecutionPage} />
      <Route path="/requests/:id/sedana-inward/new" component={NewSedanaInwardOrderPage} />
      <Route path="/requester/requests/:id/sedana-inward/new" component={NewSedanaInwardOrderPage} />
      <Route path="/sedana-warehouse/inward/new">{() => <AdminRoute component={NewSedanaInwardOrderPage} />}</Route>
      <Route path="/requests/:id/sedana-outbound/new" component={NewSedanaOutboundOrderPage} />
      <Route path="/requester/requests/:id/sedana-outbound/new" component={NewSedanaOutboundOrderPage} />
      <Route path="/sedana-warehouse/outbound/new">{() => <AdminRoute component={NewSedanaOutboundOrderPage} />}</Route>
      <Route path="/requests/:id/sedana-delivery" component={SedanaDeliveryOrderPrint} />
      <Route path="/requests/:id/delivery-order" component={SedanaDeliveryOrderPrint} />
      <Route path="/requester/requests/:id/sedana-delivery" component={SedanaDeliveryOrderPrint} />
      <Route path="/sedana-bulk-purchasing">{() => <AdminRoute component={SedanaBulkPurchasingPage} />}</Route>
      <Route path="/requests/:requestId/field-inspection">{() => <AdminRoute component={FieldInspectionForm} />}</Route>
      <Route path="/requests/:requestId/quick-response">{() => <AdminRoute component={QuickResponseReportForm} />}</Route>
      <Route path="/requests/:requestId/assign-final-report">{() => <AdminRoute component={AssignFinalReport} />}</Route>
      {/* طباعة تقارير الطلبات الرسمية A4 */}
      <Route path="/requests/:id/field-visit-report/print" component={FieldVisitReportPrint} />
      <Route path="/requests/:id/quick-response-report/print" component={QuickResponseReportPrint} />
      <Route path="/requests/:id/quick-request-report/print" component={QuickRequestReportPrint} />
      <Route path="/field-visit-reports/:id/print" component={FieldVisitReportPrint} />
      <Route path="/quick-response-reports/:id/print" component={QuickResponseReportPrint} />
      <Route path="/quick-request-reports/:id/print" component={QuickRequestReportPrint} />
      <Route path="/field-visits">{() => <AdminRoute component={() => <Requests initialStage="field_visit" />} />}</Route>
      <Route path="/field-visits/calendar">{() => <AdminRoute component={FieldVisitsCalendar} />}</Route>
      <Route path="/field-visits/schedule/:requestId">{() => <AdminRoute component={FieldVisitSchedule} />}</Route>
      <Route path="/field-visits/report/:requestId">{() => <AdminRoute component={FieldInspectionForm} />}</Route>
      <Route path="/requester/requests/:id">{() => <RequesterRoute component={RequestDetails} />}</Route>
      <Route path="/requester/requests/:requestId/evaluation" component={RequestEvaluation} />
      <Route path="/beneficiary-satisfaction">{() => <AdminRoute component={BeneficiarySatisfaction} />}</Route>
      
      {/* التصعيد الإداري ومتابعة التأخيرات */}
      <Route path="/escalation">{() => <AdminRoute component={Escalation} />}</Route>
      <Route path="/admin-escalation">{() => <AdminRoute component={Escalation} />}</Route>
      
      {/* النموذج الديناميكي - طلب خدمة موحد */}
      <Route path="/request-form-dynamic">{() => <DynamicServiceRequestForm />}</Route>      
      {/* إدارة المستخدمين (المستخدمين والأدوار) - واجهة موحدة */}
      <Route path="/staff">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/users">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/roles">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/job-positions">{() => <AdminRoute component={JobPositions} />}</Route>
      <Route path="/requester-approvals">{() => <AdminRoute component={RequesterApprovals} />}</Route>
      <Route path="/requester-approvals/:id">{params => <AdminRoute component={() => <RequesterApprovalDetails params={params} />} />}</Route>
      <Route path="/users/:id">{() => <AdminRoute component={UserDetails} />}</Route>
      <Route path="/users/:id/edit">{() => <AdminRoute component={UserEdit} />}</Route>
      
      {/* المشاريع - إدارية */}
      <Route path="/projects">{() => <AdminRoute component={Projects} />}</Route>
      <Route path="/projects/new">{() => <AdminRoute component={NewMultiMosqueProjectPage} />}</Route>
      <Route path="/projects/:id/invoices/new">{params => <AdminRoute component={() => <NewMilestoneRequest params={params} />} />}</Route>
      <Route path="/projects/:id/milestones/new">{params => <AdminRoute component={() => <NewMilestoneRequest params={params} />} />}</Route>
      <Route path="/projects/:id">{() => <AdminRoute component={ProjectDetailsPage} />}</Route>
      <Route path="/project/:id">{() => <AdminRoute component={ProjectDetailsPage} />}</Route>
      <Route path="/project-management">{() => <AdminRoute component={ProjectManagement} />}</Route>
      <Route path="/project-reports">{() => <AdminRoute component={ProjectReportsHubPage} />}</Route>
      <Route path="/project-reports/new">{() => <AdminRoute component={NewProjectReportPage} />}</Route>
      <Route path="/project-reports/:id/print">{() => <AdminRoute component={ProjectReportPrintPage} />}</Route>
      <Route path="/project-reports/:id/pdf">{() => <AdminRoute component={ProjectReportPrintPage} />}</Route>
      <Route path="/project-reports/follow-up">{() => <AdminRoute component={FollowUpReportPage} />}</Route>
      <Route path="/project-reports/semi-monthly">{() => <LegacyProjectReport component={SemiMonthlyReportPage} />}</Route>
      <Route path="/project-reports/monthly">{() => <LegacyProjectReport component={MonthlyReportPage} />}</Route>
      <Route path="/project-reports/quarterly">{() => <LegacyProjectReport component={QuarterlyReportPage} />}</Route>
      <Route path="/project-reports/visit">{() => <AdminRoute component={VisitReportPage} />}</Route>
      
      {/* صفحات أخرى - إدارية */}
      <Route path="/partners">{() => <AdminRoute component={Partners} />}</Route>
      <Route path="/branding">{() => <AdminRoute component={Branding} />}</Route>
      <Route path="/settings">{() => <AdminRoute component={Settings} />}</Route>
      <Route path="/profile" component={Profile} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/reports">{() => <AdminRoute component={Reports} />}</Route>
      <Route path="/pending-reports">{() => <AdminRoute component={PendingReports} />}</Route>
      <Route path="/analytics-hub">{() => <AdminRoute component={AnalyticsHub} />}</Route>
      <Route path="/statistics-hub">{() => <AdminRoute component={AnalyticsHub} />}</Route>
      
      {/* الموردين - إدارية */}
      <Route path="/supplier-registration" component={ModernSupplierRegistration} />
      <Route path="/supplier/join" component={ModernSupplierRegistration} />
      <Route path="/supplier/register" component={SupplierRegistration} />
      <Route path="/supplier/dashboard" component={RequesterDashboard} />
      <Route path="/suppliers">{() => <AdminRoute component={SuppliersManagement} />}</Route>
      <Route path="/suppliers/:id">{() => <AdminRoute component={SupplierDetails} />}</Route>
      <Route path="/suppliers/:id/edit">{() => <AdminRoute component={EditSupplier} />}</Route>
      <Route path="/suppliers/new">{() => <AdminRoute component={AddSupplier} />}</Route>
      <Route path="/organization-settings">{() => <AdminRoute component={OrganizationSettings} />}</Route>
      <Route path="/contracts">{() => <AdminRoute component={ContractsList} />}</Route>
      <Route path="/contracts/new">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/new/:projectId">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/new/request/:requestId">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/:id/edit">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/:id/preview">{() => <AdminRoute component={ContractPreview} />}</Route>
      <Route path="/contracts/:id/print">{() => <AdminRoute component={ContractPrint} />}</Route>
      <Route path="/contracts/:id">{() => <AdminRoute component={ContractPreview} />}</Route>
      <Route path="/contract-templates">{() => <AdminRoute component={ContractTemplates} />}</Route>
      <Route path="/contract-templates/:id/preview">{() => <AdminRoute component={TemplatePreview} />}</Route>
      <Route path="/contract-templates/:id/print">{() => <AdminRoute component={TemplatePrint} />}</Route>
      
      {/* أوامر الشراء والخطاب المجتمعي والمراجعة الموحدة */}
      <Route path="/orders-and-letters">{() => <AdminRoute component={OrdersAndLettersReview} />}</Route>
      <Route path="/orders-and-letters/:requestId">{() => <AdminRoute component={OrdersAndLettersReview} />}</Route>
      <Route path="/financial-officer">{() => <AdminRoute component={OrdersAndLettersReview} />}</Route>
      <Route path="/financial-tasks">{() => <AdminRoute component={OrdersAndLettersReview} />}</Route>
      <Route path="/purchase-orders/new">{() => <AdminRoute component={CreatePurchaseOrderPage} />}</Route>
      <Route path="/requests/:id/new-purchase-order">{() => <AdminRoute component={CreatePurchaseOrderPage} />}</Route>
      <Route path="/purchase-orders">{() => <AdminRoute component={PurchaseOrdersList} />}</Route>
      <Route path="/csr-letters/new">{() => <AdminRoute component={CreateCsrLetterPage} />}</Route>
      <Route path="/requests/:id/new-csr-letter">{() => <AdminRoute component={CreateCsrLetterPage} />}</Route>
      <Route path="/csr-letters">{() => <AdminRoute component={CsrLettersList} />}</Route>
      
      {/* التقييم المالي - إدارية */}
      <Route path="/boq">{() => <AdminRoute component={BOQ} />}</Route>
      <Route path="/boq-preparations">{() => <AdminRoute component={BOQ} />}</Route>
      <Route path="/boq-preparations/:requestId">{() => <AdminRoute component={BOQ} />}</Route>
      <Route path="/boq/:requestId">{() => <AdminRoute component={BOQ} />}</Route>
      <Route path="/quotations">{() => <AdminRoute component={Quotations} />}</Route>
      <Route path="/sedana-quotations">{() => <AdminRoute component={SedanaQuotations} />}</Route>
      <Route path="/sedana-quotations/:requestId">{() => <AdminRoute component={SedanaQuotations} />}</Route>
      <Route path="/financial-approval">{() => <AdminRoute component={FinancialApproval} />}</Route>
      
      {/* إدارة التصنيفات - إدارية */}
      <Route path="/categories">{() => <AdminRoute component={CategoriesManagement} />}</Route>
      
      {/* طلبات الصرف - إدارية */}
      <Route path="/financial-dashboard">{() => <Redirect to="/analytics-hub?tab=financial-dash" />}</Route>
      <Route path="/disbursements">{() => <AdminRoute component={DisbursementRequests} />}</Route>
      <Route path="/disbursement-requests">{() => <AdminRoute component={DisbursementRequests} />}</Route>
      <Route path="/disbursements/new">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/disbursements/new-linked">{() => <AdminRoute component={NewLinkedDisbursementRequest} />}</Route>
      <Route path="/disbursements/requests/:id/edit">{() => <AdminRoute component={EditLinkedDisbursementRequest} />}</Route>
      <Route path="/disbursements/new/:projectId">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/disbursements/new/contract/:contractId">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/payments/edit/:id">{() => <AdminRoute component={EditPaymentPage} />}</Route>
      <Route path="/milestones/new">{() => <AdminRoute component={NewMilestoneRequest} />}</Route>
      <Route path="/milestones/new/:projectId">{() => <AdminRoute component={NewMilestoneRequest} />}</Route>
      <Route path="/milestones/edit/:id">{() => <AdminRoute component={EditMilestonePage} />}</Route>
      
      {/* أوامر الصرف - إدارية */}
      <Route path="/disbursement-orders">{() => <AdminRoute component={DisbursementOrders} />}</Route>
      <Route path="/disbursement-orders/new-direct">{() => <AdminRoute component={NewDirectDisbursementOrder} />}</Route>
      <Route path="/disbursement-orders/new/:requestId">{() => <AdminRoute component={NewDisbursementOrder} />}</Route>
      <Route path="/disbursement-orders/:id/print">{() => <AdminRoute component={DisbursementOrderPrint} />}</Route>
      <Route path="/disbursement-orders/:id">{() => <AdminRoute component={DisbursementOrderDetails} />}</Route>
      <Route path="/disbursements/orders/new/:requestId">{() => <AdminRoute component={NewDisbursementOrder} />}</Route>
      <Route path="/disbursements/orders/:id/print">{() => <AdminRoute component={DisbursementOrderPrint} />}</Route>
      <Route path="/disbursements/requests/:id/print">{() => <AdminRoute component={DisbursementRequestPrint} />}</Route>
      <Route path="/disbursements/requests/:id">{() => <AdminRoute component={DisbursementRequestPrint} />}</Route>
      <Route path="/receipt-vouchers">{() => <AdminRoute component={ReceiptVouchers} />}</Route>
      <Route path="/fund/movements">{() => <AdminRoute component={FundPage} />}</Route>
      <Route path="/fund">{() => <AdminRoute component={FundPage} />}</Route>
      <Route path="/fund/transfers/new">{() => <AdminRoute component={NewFundTransferPage} />}</Route>
      <Route path="/receipt-vouchers/new">{() => <AdminRoute component={NewReceiptVoucherPage} />}</Route>
      <Route path="/receipt-vouchers/:id/print">{() => <AdminRoute component={ReceiptVoucherPrint} />}</Route>
      <Route path="/receipt-vouchers/:id">{() => <AdminRoute component={ReceiptVoucherPrint} />}</Route>
      
      {/* العهد المالية - طلبات صرف عهدة مالية */}
      <Route path="/custody-requests">{() => <AdminRoute component={CustodyRequests} />}</Route>
      <Route path="/custody-requests/new">{() => <AdminRoute component={NewCustodyRequest} />}</Route>
      <Route path="/custody-requests/:id/print">{() => <AdminRoute component={CustodyRequestPrint} />}</Route>
      <Route path="/custody-requests/:id">{() => <AdminRoute component={CustodyRequestPrint} />}</Route>
      
      {/* تقارير الإنجاز والمستخلصات - إدارية */}
      <Route path="/progress-reports">{() => <AdminRoute component={ProgressReports} />}</Route>
      <Route path="/progress-invoices">{() => <AdminRoute component={ProgressReports} />}</Route>
      <Route path="/progress-reports/:id/print">{() => <AdminRoute component={ProgressReportPrint} />}</Route>
      
      {/* الاستلامات - إدارية */}
      <Route path="/handovers">{() => <AdminRoute component={Handovers} />}</Route>
      <Route path="/final-report/new">{() => <AdminRoute component={FinalReportForm} />}</Route>
      <Route path="/final-report/:reportId" component={FinalReportView} />
      <Route path="/kpi-dashboard">{() => <Redirect to="/analytics-hub?tab=kpi" />}</Route>
      
      {/* التقرير المالي - إدارية */}
      <Route path="/financial-report">{() => <AdminRoute component={FinancialReport} />}</Route>
      <Route path="/financial-reports">{() => <AdminRoute component={FinancialReport} />}</Route>
      
      {/* إعدادات المراحل - إدارية */}
      <Route path="/stage-settings">{() => <AdminRoute component={StageSettings} />}</Route>
      <Route path="/action-settings">{() => <AdminRoute component={ActionSettings} />}</Route>
      
      {/* إدارة الأدوار والصلاحيات - إدارية */}
      <Route path="/staff/roles/:id">{() => <AdminRoute component={RolePermissions} />}</Route>
      <Route path="/roles/:id" component={RoleEdit} />
      <Route path="/roles/:id/edit" component={RoleEdit} />
      <Route path="/users/:id/permissions">{() => <AdminRoute component={UserPermissions} />}</Route>
      <Route path="/permissions-audit">{() => <AdminRoute component={PermissionsAuditLog} />}</Route>
      <Route path="/program-customization">{() => <AdminRoute component={ProgramCustomization} />}</Route>
      <Route path="/forms-customization">{() => <AdminRoute component={FormsCustomization} />}</Route>
      <Route path="/forms-customization/evaluation">{() => <AdminRoute component={FormsCustomizationEvaluation} />}</Route>
      <Route path="/forms-customization/services">{() => <AdminRoute component={FormsCustomizationServices} />}</Route>
      <Route path="/forms-customization/services/:serviceId">{() => <AdminRoute component={FormsCustomizationServiceDetail} />}</Route>
      <Route path="/forms-customization/registration">{() => <AdminRoute component={FormsCustomizationRegistration} />}</Route>
      <Route path="/forms-customization/registration/:formId">{() => <AdminRoute component={FormsCustomizationRegistrationDetail} />}</Route>
      <Route path="/forms-customization/dashboard">{() => <AdminRoute component={FormsCustomizationDashboard} />}</Route>
      <Route path="/forms-customization/analytics">{() => <AdminRoute component={FormsCustomizationAnalytics} />}</Route>
      <Route path="/forms-customization/option-2">{() => <AdminRoute component={FormsCustomizationOption2} />}</Route>
      <Route path="/forms-customization/escalation">{() => <AdminRoute component={FormsCustomizationEscalation} />}</Route>
      <Route path="/notifications/customization">{() => <AdminRoute component={NotificationCustomization} />}</Route>
      <Route path="/notifications/center">{() => <AdminRoute component={NotificationCenter} />}</Route>
      <Route path="/notification-center">{() => <AdminRoute component={NotificationCenter} />}</Route>
      <Route path="/support">
        {() => (
          <ProtectedRoute>
            <SupportTickets />
          </ProtectedRoute>
        )}
      </Route>

      {/* صفحة 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </PermissionRouteGuard>
  );
}

function LegacyProjectReport({ component }: { component: ComponentType<any> }) {
  const search = useSearch();
  return Number(new URLSearchParams(search).get("editId")) > 0
    ? <AdminRoute component={component} />
    : <Redirect to="/project-reports/follow-up" />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <BrandColorApplier />
          <SuspensionNotifier />
          <Toaster />
          <DocumentTitleProvider>
            <Router />
          </DocumentTitleProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
