import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// الصفحات العامة
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";

// لوحات التحكم
import Dashboard from "./pages/Dashboard";
import RequesterDashboard from "./pages/RequesterDashboard";
import RequesterApprovals from "./pages/RequesterApprovals";

// صفحات المساجد
import Mosques from "./pages/Mosques";
import MosqueDetails from "./pages/MosqueDetails";
import MosqueForm from "./pages/MosqueForm";
import MosquesMap from "./pages/MosquesMap";
import MyMosques from "./pages/MyMosques";
import RequesterMosqueForm from "./pages/RequesterMosqueForm";
import EditImam from "./pages/EditImam";

// صفحات الطلبات
import Requests from "./pages/Requests";
import RequestDetails from "./pages/RequestDetailsNew";
import RequestForm from "./pages/RequestForm";
import TrackRequest from "./pages/TrackRequest";
import MosqueServiceRequest from "./pages/MosqueServiceRequest";
import MyRequests from "./pages/MyRequests";
import { DynamicServiceRequestForm } from "./pages/DynamicServiceRequestForm";

// صفحات المستخدمين
import UsersManagement from "./pages/UsersManagement";
import UserDetails from "./pages/UserDetails";
import UserEdit from "./pages/UserEdit";

// صفحات المشاريع
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectManagement from "./pages/ProjectManagement";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";

// صفحات أخرى
import Partners from "./pages/Partners";
import Branding from "./pages/Branding";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";

// صفحات الموردين
import SupplierRegistration from "./pages/SupplierRegistration";
import SuppliersManagement from "./pages/SuppliersManagement";
import SupplierDetails from "./pages/SupplierDetails";
import AddSupplier from "./pages/AddSupplier";
import OrganizationSettings from "./pages/OrganizationSettings";
import ContractForm from "./pages/ContractForm";
import ContractPreview from "./pages/ContractPreview";
import FieldInspectionForm from "./pages/FieldInspectionForm";
import FieldVisitSchedule from "./pages/FieldVisitSchedule";
import FieldVisitsCalendar from "./pages/FieldVisitsCalendar";
import QuickResponseReportForm from "./pages/QuickResponseReportForm";
import BOQ from "./pages/BOQ";
import Quotations from "./pages/Quotations";
import FinancialApproval from "./pages/FinancialApproval";
import CategoriesManagement from "./pages/CategoriesManagement";
import ContractTemplates from "./pages/ContractTemplates";
import ContractsList from "./pages/ContractsList";
import DisbursementRequests from "./pages/DisbursementRequests";
import Handovers from "./pages/Handovers";
import FinalReportForm from "./pages/FinalReportForm";
import FinalReportView from "./pages/FinalReportView";
import KPIDashboard from "./pages/KPIDashboard";
import NewDisbursementRequest from "./pages/NewDisbursementRequest";
import NewLinkedDisbursementRequest from "./pages/NewLinkedDisbursementRequest";
import EditLinkedDisbursementRequest from "./pages/EditLinkedDisbursementRequest";
import NewDisbursementOrder from "./pages/NewDisbursementOrder";
import DisbursementOrderPrint from "./pages/DisbursementOrderPrint";
import DisbursementRequestPrint from "./pages/DisbursementRequestPrint";
import ProgressReports from "./pages/ProgressReports";
import ProgressReportPrint from "./pages/ProgressReportPrint";
import DisbursementOrders from "./pages/DisbursementOrders";
import DisbursementOrderDetails from "./pages/DisbursementOrderDetails";
import EditPaymentPage from "./pages/EditPaymentPage";
import FinancialDashboard from "./pages/FinancialDashboard";
import FinancialReport from "./pages/FinancialReport";
import StageSettings from "./pages/StageSettings";
import ActionSettings from "./pages/ActionSettings";
import Roles from "./pages/Roles";
import RoleEdit from "./pages/RoleEdit";
import RolePermissions from "./pages/RolePermissions";
import UserPermissions from "./pages/UserPermissions";
import PermissionsAuditLog from "./pages/PermissionsAuditLog";
import JobPositions from "./pages/JobPositions";
import StaffManagement from "./pages/StaffManagement";
import ProgramCustomization from "./pages/ProgramCustomization";
import AdminGuard from "./components/AdminGuard";
import GuestGuard from "./components/GuestGuard";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRouteGuard from "./components/PermissionRouteGuard";
import Unauthorized from "./pages/Unauthorized";
import DebugUser from "./pages/DebugUser";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { consumeSuspensionMessage } from "@/lib/authGuard";
import { toast } from "sonner";

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
const AdminRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AdminGuard>
    <Component />
  </AdminGuard>
);

// مكون لحماية مسارات الضيوف (يمنع المسجلين من الدخول لصفحات تسجيل الدخول)
const GuestRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <GuestGuard>
    <Component />
  </GuestGuard>
);

// مكون لحماية مسارات طالبي الخدمة
const RequesterRoute = ({ component: Component }: { component: React.ComponentType }) => (
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

function Router() {
  return (
    <PermissionRouteGuard>
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
      <Route path="/requester">{() => <RequesterRoute component={RequesterDashboard} />}</Route>
      <Route path="/requester/dashboard">{() => <RequesterRoute component={RequesterDashboard} />}</Route>
      <Route path="/my-requests">
        {() => (
          <ProtectedRoute allowedRoles={["service_requester", "field_team", "quick_response", "projects_office", "super_admin", "system_admin"]}>
            <MyRequestsWrapper />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* المساجد - الصفحات الإدارية */}
      <Route path="/mosques">{() => <AdminRoute component={Mosques} />}</Route>
      <Route path="/mosques/map">{() => <AdminRoute component={MosquesMap} />}</Route>
      <Route path="/mosques/new" component={MosqueForm} />
      <Route path="/requester/mosques/new">{() => <RequesterRoute component={RequesterMosqueForm} />}</Route>
      <Route path="/mosques/:id" component={MosqueDetails} />
      <Route path="/mosques/:id/edit" component={MosqueForm} />
      <Route path="/mosques/:id/edit-imam">{params => <AdminRoute component={() => <EditImam params={params} />} />}</Route>
      <Route path="/my-mosques">{() => <RequesterRoute component={MyMosques} />}</Route>
      
      {/* الطلبات - الصفحات الإدارية */}
      <Route path="/requests">{() => <AdminRoute component={Requests} />}</Route>
      <Route path="/requests/new">{() => <AdminRoute component={RequestForm} />}</Route>
      <Route path="/requests/:id" component={RequestDetails} />
      <Route path="/requests/:id/edit">{() => <AdminRoute component={RequestForm} />}</Route>
      <Route path="/requests/:requestId/field-inspection">{() => <AdminRoute component={FieldInspectionForm} />}</Route>
      <Route path="/requests/:requestId/quick-response">{() => <AdminRoute component={QuickResponseReportForm} />}</Route>
      <Route path="/field-visits">{() => <AdminRoute component={() => <Requests initialStage="field_visit" />} />}</Route>
      <Route path="/field-visits/calendar">{() => <AdminRoute component={FieldVisitsCalendar} />}</Route>
      <Route path="/field-visits/schedule/:requestId">{() => <AdminRoute component={FieldVisitSchedule} />}</Route>
      <Route path="/field-visits/report/:requestId">{() => <AdminRoute component={FieldInspectionForm} />}</Route>
      <Route path="/requester/requests/:id">{() => <RequesterRoute component={RequestDetails} />}</Route>
      
      {/* النموذج الديناميكي - طلب خدمة موحد */}
      <Route path="/request-form-dynamic" component={DynamicServiceRequestForm} />      
      {/* إدارة المستخدمين (المستخدمين والأدوار) - واجهة موحدة */}
      <Route path="/staff">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/users">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/roles">{() => <AdminRoute component={StaffManagement} />}</Route>
      <Route path="/job-positions">{() => <AdminRoute component={JobPositions} />}</Route>
      <Route path="/requester-approvals">{() => <AdminRoute component={RequesterApprovals} />}</Route>
      <Route path="/users/:id">{() => <AdminRoute component={UserDetails} />}</Route>
      <Route path="/users/:id/edit">{() => <AdminRoute component={UserEdit} />}</Route>
      
      {/* المشاريع - إدارية */}
      <Route path="/projects">{() => <AdminRoute component={Projects} />}</Route>
      <Route path="/projects/:id">{() => <AdminRoute component={ProjectDetailsPage} />}</Route>
      <Route path="/project-management">{() => <AdminRoute component={ProjectManagement} />}</Route>
      
      {/* صفحات أخرى - إدارية */}
      <Route path="/partners">{() => <AdminRoute component={Partners} />}</Route>
      <Route path="/branding">{() => <AdminRoute component={Branding} />}</Route>
      <Route path="/settings">{() => <AdminRoute component={Settings} />}</Route>
      <Route path="/profile" component={Profile} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/reports">{() => <AdminRoute component={Reports} />}</Route>
      
      {/* الموردين - إدارية */}
      <Route path="/supplier/register" component={SupplierRegistration} />
      <Route path="/supplier/dashboard" component={RequesterDashboard} />
      <Route path="/suppliers">{() => <AdminRoute component={SuppliersManagement} />}</Route>
      <Route path="/suppliers/:id">{() => <AdminRoute component={SupplierDetails} />}</Route>
      <Route path="/suppliers/new">{() => <AdminRoute component={AddSupplier} />}</Route>
      <Route path="/organization-settings">{() => <AdminRoute component={OrganizationSettings} />}</Route>
      <Route path="/contracts">{() => <AdminRoute component={ContractsList} />}</Route>
      <Route path="/contracts/new">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/new/:projectId">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/new/request/:requestId">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/:id/edit">{() => <AdminRoute component={ContractForm} />}</Route>
      <Route path="/contracts/:id/preview">{() => <AdminRoute component={ContractPreview} />}</Route>
      <Route path="/contracts/:id">{() => <AdminRoute component={ContractPreview} />}</Route>
      <Route path="/contract-templates">{() => <AdminRoute component={ContractTemplates} />}</Route>
      
      {/* التقييم المالي - إدارية */}
      <Route path="/boq/:requestId">{() => <AdminRoute component={BOQ} />}</Route>
      <Route path="/quotations">{() => <AdminRoute component={Quotations} />}</Route>
      <Route path="/financial-approval">{() => <AdminRoute component={FinancialApproval} />}</Route>
      
      {/* إدارة التصنيفات - إدارية */}
      <Route path="/categories">{() => <AdminRoute component={CategoriesManagement} />}</Route>
      
      {/* طلبات الصرف - إدارية */}
      <Route path="/financial-dashboard">{() => <AdminRoute component={FinancialDashboard} />}</Route>
      <Route path="/disbursements">{() => <AdminRoute component={DisbursementRequests} />}</Route>
      <Route path="/disbursement-requests">{() => <AdminRoute component={DisbursementRequests} />}</Route>
      <Route path="/disbursements/new">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/disbursements/new-linked">{() => <AdminRoute component={NewLinkedDisbursementRequest} />}</Route>
      <Route path="/disbursements/requests/:id/edit">{() => <AdminRoute component={EditLinkedDisbursementRequest} />}</Route>
      <Route path="/disbursements/new/:projectId">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/disbursements/new/contract/:contractId">{() => <AdminRoute component={NewDisbursementRequest} />}</Route>
      <Route path="/payments/edit/:id">{() => <AdminRoute component={EditPaymentPage} />}</Route>
      
      {/* أوامر الصرف - إدارية */}
      <Route path="/disbursement-orders">{() => <AdminRoute component={DisbursementOrders} />}</Route>
      <Route path="/disbursement-orders/new/:requestId">{() => <AdminRoute component={NewDisbursementOrder} />}</Route>
      <Route path="/disbursement-orders/:id/print">{() => <AdminRoute component={DisbursementOrderPrint} />}</Route>
      <Route path="/disbursement-orders/:id">{() => <AdminRoute component={DisbursementOrderDetails} />}</Route>
      <Route path="/disbursements/orders/new/:requestId">{() => <AdminRoute component={NewDisbursementOrder} />}</Route>
      <Route path="/disbursements/orders/:id/print">{() => <AdminRoute component={DisbursementOrderPrint} />}</Route>
      <Route path="/disbursements/requests/:id/print">{() => <AdminRoute component={DisbursementRequestPrint} />}</Route>
      
      {/* تقارير الإنجاز - إدارية */}
      <Route path="/progress-reports">{() => <AdminRoute component={ProgressReports} />}</Route>
      <Route path="/progress-reports/:id/print">{() => <AdminRoute component={ProgressReportPrint} />}</Route>
      
      {/* الاستلامات - إدارية */}
      <Route path="/handovers">{() => <AdminRoute component={Handovers} />}</Route>
      <Route path="/final-report/new">{() => <AdminRoute component={FinalReportForm} />}</Route>
      <Route path="/final-report/:reportId" component={FinalReportView} />
      <Route path="/kpi-dashboard">{() => <AdminRoute component={KPIDashboard} />}</Route>
      
      {/* التقرير المالي - إدارية */}
      <Route path="/financial-report">{() => <AdminRoute component={FinancialReport} />}</Route>
      
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
      
      {/* صفحة 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </PermissionRouteGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <BrandColorApplier />
          <SuspensionNotifier />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
