import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { mosquesRouter } from "./routers/mosques";
import { requestsRouter } from "./routers/requests";
import { notificationsRouter } from "./routers/notifications";
import { storageRouter } from "./routers/storage";
import { projectsRouter } from "./routers/projects";
import { suppliersRouter } from "./routers/suppliers";
import { contractsRouter } from "./routers/contracts";
import { categoriesRouter } from "./routers/categories";
import { organizationRouter } from "./routers/organization";
import { disbursementsRouter } from "./routers/disbursements";
import { progressReportsRouter } from "./routers/progressReports";
import { handoversRouter } from "./routers/handovers";
import { stageSettingsRouter } from "./routers/stageSettings";
import { actionsRouter } from "./actions";
import { permissionsRouter } from "./permissions";
import { usersRouter } from "./routers/users";
import { fieldVisitsRouter } from "./routers/fieldVisits";
import { finalReportsRouter } from "./routers/finalReports";
import { analyticsRouter } from "./routers/analytics";
import { jobPositionsRouter } from "./routers/jobPositions";
import { programsRouter } from "./routers/programs";
import { supportTicketsRouter } from "./routers/supportTickets";
import { boardRouter } from "./routers/board";
import { formsRouter } from "./routers/forms";
import { publicSubmissionsRouter } from "./routers/publicSubmissions";
import { calendarRouter } from "./routers/calendar";
import { escalationRouter } from "./routers/escalation";

export const appRouter = router({
  system: systemRouter,

  // التقويم الموحد والأحداث المخصصة
  calendar: calendarRouter,

  // التبرعات والاستفسارات العامة
  publicSubmissions: publicSubmissionsRouter,

  // تخصيص النماذج والاستمارات
  forms: formsRouter,

  // اللوحة القيادية للمجلس
  board: boardRouter,

  // نظام المصادقة
  auth: authRouter,

  // إدارة البرامج
  programs: programsRouter,

  // الدعم الفني
  supportTickets: supportTicketsRouter,

  // إدارة المساجد
  mosques: mosquesRouter,
  
  // إدارة الطلبات
  requests: requestsRouter,
  
  // نظام الإشعارات
  notifications: notificationsRouter,
  
  // نظام التخزين والمرفقات
  storage: storageRouter,
  
  // إدارة المشاريع
  projects: projectsRouter,
  
  // إدارة الموردين
  suppliers: suppliersRouter,
  
  // إدارة العقود
  contracts: contractsRouter,
  
  // إدارة التصنيفات
  categories: categoriesRouter,
  
  // إعدادات الجمعية
  organization: organizationRouter,
  
  // طلبات الصرف وأوامر الصرف
  disbursements: disbursementsRouter,
  progressReports: progressReportsRouter,
  
  // نظام الاستلامات
  handovers: handoversRouter,
  
  // إعدادات المراحل والتسلسل الصارم
  stageSettings: stageSettingsRouter,
  
  // إعدادات الإجراءات
  actions: actionsRouter,
  
  // نظام الصلاحيات
  permissions: permissionsRouter,
  
  // إدارة المستخدمين
  users: usersRouter,
  
  // الزيارات الميدانية
  fieldVisits: fieldVisitsRouter,

  // التقارير الختامية
  finalReports: finalReportsRouter,

  // الإحصاءات والتحليلات
  analytics: analyticsRouter,
  jobPositions: jobPositionsRouter,

  // التصعيد الإداري ومتابعة التأخيرات
  escalation: escalationRouter,
});

export type AppRouter = typeof appRouter;
