import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, mediumtext, longtext, date, unique, datetime, foreignKey } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ==================== الأدوار والحالات ====================

// الأدوار التسعة للنظام
export const userRoles = [
  "super_admin",      // المدير العام
  "system_admin",     // مدير النظام
  "projects_office",  // مكتب المشاريع
  "field_team",       // الفريق الميداني
  "quick_response",   // فريق الاستجابة السريعة
  "financial",        // الإدارة المالية
  "project_manager",  // مدير المشروع
  "corporate_comm",   // الاتصال المؤسسي
  "service_requester" // طالب الخدمة
] as const;

// المراحل الرئيسية للطلبات (11 مرحلة)
export const requestStages = [
  "submitted",                  // تقديم الطلب
  "initial_review",             // المراجعة الأولية
  "field_visit",                // الزيارة الميدانية
  "technical_eval",             // التقييم الفني
  "boq_preparation",            // إعداد جدول الكميات
  "financial_eval_and_approval", // التقييم المالي واعتماد العرض
  "contracting",                // التعاقد
  "execution",                  // التنفيذ
  "handover",                   // الاستلام
  "closed"                      // الإغلاق
] as const;

// المراحل الفرعية (الإجراءات)
export const subStages = [
  // الزيارة الميدانية
  "field_visit_assign",
  "field_visit_schedule",
  "field_visit_execute",
  "field_visit_report",
  // التقييم الفني
  "technical_eval_review",
  "technical_eval_decision",
  // إعداد جدول الكميات
  "boq_items_add",
  "boq_review",
  "boq_approve",
  // التقييم المالي
  "financial_request_quotes",
  "financial_receive_quotes",
  "financial_compare",
  // التعاقد
  "contract_prepare",
  "contract_review",
  "contract_sign",
  "contract_to_project",
  // التنفيذ
  "execution_progress_report",
  "execution_payment_request",
  "execution_payment_order",
  // الاستلام
  "handover_preliminary",
  "handover_warranty",
  "handover_final",
  "handover_final_report",
  "handover_final_payment",
  // الإغلاق
  "closure_stakeholder_satisfaction",
  "closure_beneficiary_satisfaction",
  "closure_publish",
  "closure_feedback",
  "closure_archive",
] as const;

// قرارات التقييم الفني
export const technicalDecisions = [
  "apology",           // الاعتذار عن الطلب
  "suspension",        // تعليق الطلب
  "quick_response",    // التحويل للاستجابة السريعة
  "convert_to_project" // التحويل إلى مشروع
] as const;

// حالات الطلب
export const requestStatuses = [
  "pending",           // قيد الانتظار
  "under_review",      // قيد المراجعة
  "approved",          // معتمد
  "rejected",          // مرفوض
  "suspended",         // معلق
  "in_progress",       // قيد التنفيذ
  "completed"          // مكتمل
] as const;

// حالات المسجد
export const mosqueStatuses = [
  "new",               // جديد
  "existing",          // قائم
  "under_construction" // تحت الإنشاء
] as const;

// أنواع ملكية المسجد
export const mosqueOwnership = [
  "government",        // حكومي
  "waqf",              // وقف
  "private"            // أهلي
] as const;

// حالات المستخدم
export const userStatuses = [
  "pending",           // قيد الانتظار
  "active",            // نشط
  "suspended",         // معلق
  "blocked"            // محظور
] as const;

// ==================== جداول المستخدمين ====================

// جدول المستخدمين الرئيسي
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  nationalId: varchar("nationalId", { length: 20 }),
  role: mysqlEnum("role", userRoles).default("service_requester").notNull(),
  status: mysqlEnum("status", userStatuses).default("pending").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  city: varchar("city", { length: 100 }),
  requesterType: varchar("requesterType", { length: 50 }), // صفة طالب التسجيل (إمام، مؤذن، عضو مجلس إدارة)
  proofDocument: varchar("proofDocument", { length: 500 }), // إثبات الصفة
  mosqueExemptions: int("mosqueExemptions").default(0), // عدد الاستثناءات الممنوحة لتسجيل مساجد إضافية
  receiveBeneficiaryNotifications: boolean("receiveBeneficiaryNotifications").default(false),
  receiveRequestNotifications: boolean("receiveRequestNotifications").default(false),
  receiveFinancialAndContractNotifications: boolean("receiveFinancialAndContractNotifications").default(false),
  receiveBeneficiaryEmail: boolean("receiveBeneficiaryEmail").default(false),
  receiveRequestEmail: boolean("receiveRequestEmail").default(false),
  receiveFinancialEmail: boolean("receiveFinancialEmail").default(false),
  receiveBeneficiaryWhatsapp: boolean("receiveBeneficiaryWhatsapp").default(false),
  receiveRequestWhatsapp: boolean("receiveRequestWhatsapp").default(false),
  receiveFinancialWhatsapp: boolean("receiveFinancialWhatsapp").default(false),
  receiveBeneficiarySms: boolean("receiveBeneficiarySms").default(false),
  receiveRequestSms: boolean("receiveRequestSms").default(false),
  receiveFinancialSms: boolean("receiveFinancialSms").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  deletedAt: datetime("deletedAt"),
});

// جدول الموظفين (بيانات إضافية للموظفين)
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  employeeNumber: varchar("employeeNumber", { length: 50 }),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: datetime("hireDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول رموز إعادة تعيين كلمة المرور
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expiresAt").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== جداول المساجد ====================

// جدول المساجد
export const mosques = mysqlTable("mosques", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  mosqueType: varchar("mosqueType", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }), // الحي
  governorate: varchar("governorate", { length: 100 }), // المحافظة
  center: varchar("center", { length: 100 }), // المركز
  area: decimal("area", { precision: 10, scale: 2 }), // المساحة بالمتر المربع
  capacity: int("capacity"), // السعة (عدد المصلين)
  hasPrayerHall: boolean("hasPrayerHall").default(false), // هل يوجد مصلى
  mosqueAge: int("mosqueAge"), // عمر المسجد بالسنوات
  imamName: varchar("imamName", { length: 255 }),
  imamPhone: varchar("imamPhone", { length: 20 }),
  imamEmail: varchar("imamEmail", { length: 320 }),
  registeredBy: int("registeredBy").references(() => users.id, { onDelete: "set null" }),
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending"),
  approvalDate: datetime("approvalDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول صور المساجد
export const mosqueImages = mysqlTable("mosque_images", {
  id: int("id").autoincrement().primaryKey(),
  mosqueId: int("mosqueId").notNull().references(() => mosques.id),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  imageType: varchar("imageType", { length: 50 }), // main, exterior, interior
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== جداول الطلبات ====================

// جدول البرامج والخدمات
export const programs = mysqlTable("programs", {
  id: varchar("id", { length: 50 }).primaryKey(), // معرف فريد (مثل bunyan, custom_123)
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 50 }),
  icon: varchar("icon", { length: 50 }),
  requiresMosque: boolean("requiresMosque").default(true),
  isActive: boolean("isActive").default(true),
  conditions: json("conditions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول الطلبات الرئيسي
export const mosqueRequests = mysqlTable("mosque_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNumber: varchar("requestNumber", { length: 50 }).notNull().unique(),
  mosqueId: int("mosqueId").references(() => mosques.id), // nullable لبرنامج بنيان
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  programType: varchar("programType", { length: 50 }).notNull(),
  currentStage: mysqlEnum("currentStage", requestStages).default("submitted").notNull(),
  status: mysqlEnum("status", requestStatuses).default("pending").notNull(),
  priority: mysqlEnum("priority", ["urgent", "medium", "normal"]).default("normal"),
  assignedTo: int("assignedTo").references(() => users.id, { onDelete: "set null" }),
  currentResponsible: int("currentResponsible").references(() => users.id, { onDelete: "set null" }), // المسؤول الحالي عن الطلب
  currentResponsibleDepartment: varchar("currentResponsibleDepartment", { length: 100 }), // الإدارة المسؤولة الحالية
  
  // بيانات المراجعة الأولية
  reviewCompleted: boolean("reviewCompleted").default(false), // هل تمت المراجعة الأولية
  reviewNotes: text("reviewNotes"), // ملاحظات المراجعة الأولية
  
  // بيانات الزيارة الميدانية
  fieldVisitAssignedTo: int("fieldVisitAssignedTo").references(() => users.id, { onDelete: "set null" }), // الموظف المسند إليه الزيارة
  finalReportAssignedTo: int("finalReportAssignedTo").references(() => users.id, { onDelete: "set null" }), // موظف الاتصال المؤسسي المسند إليه التقرير الختامي
  fieldVisitScheduledDate: datetime("fieldVisitScheduledDate"), // تاريخ الزيارة المجدولة
  fieldVisitScheduledTime: varchar("fieldVisitScheduledTime", { length: 10 }), // وقت الزيارة المجدولة
  fieldVisitNotes: text("fieldVisitNotes"), // ملاحظات الزيارة
  fieldVisitContactName: varchar("fieldVisitContactName", { length: 255 }), // اسم الشخص المسؤول للزيارة
  fieldVisitContactTitle: varchar("fieldVisitContactTitle", { length: 100 }), // صفة الشخص (إمام، مؤذن، جار، إلخ)
  fieldVisitContactPhone: varchar("fieldVisitContactPhone", { length: 20 }), // رقم جوال الشخص
  
  // بيانات البرنامج (JSON مرن لكل برنامج)
  programData: json("programData"),
  
  // مسار الطلب (standard: مشروع عادي, quick_response: استجابة سريعة, rejected: مرفوض)
  requestTrack: mysqlEnum("requestTrack", ["standard", "quick_response", "rejected"]).default("standard"),
  
  // قرار التقييم الفني (apologize, suspend, quick_response, convert_to_project)
  technicalEvalDecision: varchar("technicalEvalDecision", { length: 50 }),
  technicalEvalJustification: text("technicalEvalJustification"),
  quickResponseStartDate: datetime("quickResponseStartDate"), // تاريخ بدء الاستجابة السريعة
  quickResponseEndDate: datetime("quickResponseEndDate"), // تاريخ الانتهاء المتوقع للاستجابة السريعة
  quickResponseScheduledDate: datetime("quickResponseScheduledDate"), // تاريخ الاستجابة السريعة المجدولة
  quickResponseScheduledTime: varchar("quickResponseScheduledTime", { length: 10 }), // وقت الاستجابة السريعة المجدولة
  finalReportScheduledDate: datetime("finalReportScheduledDate"), // تاريخ التقرير الختامي المجدول
  finalReportScheduledTime: varchar("finalReportScheduledTime", { length: 10 }), // وقت التقرير الختامي المجدول
  
  // التكلفة والميزانية
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  approvedBudget: decimal("approvedBudget", { precision: 15, scale: 2 }),
  
  // عرض السعر المختار للاعتماد المالي (quotationNumber)
  selectedQuotationId: varchar("selectedQuotationId", { length: 50 }),
  
  // التواريخ
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: datetime("reviewedAt"),
  approvedAt: datetime("approvedAt"),
  completedAt: datetime("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول مرفقات الطلبات
export const requestAttachments = mysqlTable("request_attachments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileType: varchar("fileType", { length: 50 }), // image, document, report
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// جدول تعليقات الطلبات
export const requestComments = mysqlTable("request_comments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  comment: text("comment").notNull(),
  isInternal: boolean("isInternal").default(false), // تعليق داخلي للموظفين فقط
  isRead: boolean("isRead").default(false), // هل تم قراءة التعليق
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// جدول سجل تغييرات حالة الطلب
export const requestHistory = mysqlTable("request_history", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  fromStage: varchar("fromStage", { length: 50 }),
  toStage: varchar("toStage", { length: 50 }),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const requestEvaluations = mysqlTable("request_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  decision: varchar("decision", { length: 50 }),
  justification: text("justification"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== جداول التقارير ====================

// تقارير الزيارات الميدانية (نموذج المعاينة الميدانية)
export const fieldVisitReports = mysqlTable("field_visit_reports", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  visitedBy: int("visitedBy").references(() => users.id, { onDelete: "set null" }),
  visitDate: datetime("visitDate").notNull(),
  
  // التقييم الفني
  mosqueCondition: varchar("mosqueCondition", { length: 100 }), // حالة المسجد
  conditionRating: mysqlEnum("conditionRating", ["excellent", "good", "fair", "poor", "critical"]),
  
  // مساحة مصلى الرجال
  menPrayerLength: decimal("menPrayerLength", { precision: 10, scale: 2 }),
  menPrayerWidth: decimal("menPrayerWidth", { precision: 10, scale: 2 }),
  menPrayerHeight: decimal("menPrayerHeight", { precision: 10, scale: 2 }),
  
  // مساحة مصلى النساء (إن وجد)
  womenPrayerExists: boolean("womenPrayerExists").default(false),
  womenPrayerLength: decimal("womenPrayerLength", { precision: 10, scale: 2 }),
  womenPrayerWidth: decimal("womenPrayerWidth", { precision: 10, scale: 2 }),
  womenPrayerHeight: decimal("womenPrayerHeight", { precision: 10, scale: 2 }),
  
  // الاحتياج والتوصيف
  requiredNeeds: text("requiredNeeds"), // الاحتياج المطلوب
  generalDescription: text("generalDescription"), // الوصف العام للحالة
  
  // الحقول القديمة للتوافق
  findings: text("findings"),
  recommendations: text("recommendations"),
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  technicalNeeds: text("technicalNeeds"),
  
  // فريق المعاينة
  teamMember1: varchar("teamMember1", { length: 255 }),
  teamMember2: varchar("teamMember2", { length: 255 }),
  teamMember3: varchar("teamMember3", { length: 255 }),
  teamMember4: varchar("teamMember4", { length: 255 }),
  teamMember5: varchar("teamMember5", { length: 255 }),

  // تقييم صحة معلومات المستفيد
  beneficiaryInfoAccuracyRating: int("beneficiaryInfoAccuracyRating"), // تقييم النجوم (1-5)
  beneficiaryInfoAccuracyNotes: text("beneficiaryInfoAccuracyNotes"), // ملاحظات صحة المعلومات
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// تقارير الاستجابة السريعة (تقرير برنامج الاستجابة السريعة)
export const quickResponseReports = mysqlTable("quick_response_reports", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  respondedBy: int("respondedBy").references(() => users.id, { onDelete: "set null" }),
  responseDate: datetime("responseDate").notNull(),
  
  // التقييم الفني
  technicalEvaluation: text("technicalEvaluation"), // التقييم الفني
  finalEvaluation: text("finalEvaluation"), // التقييم النهائي
  
  // الأعمال غير المنفذة
  unexecutedWorks: text("unexecutedWorks"), // الأعمال غير المنفذة / أسباب عدم التنفيذ
  
  // الفني المختص
  technicianName: varchar("technicianName", { length: 255 }), // اسم الفني المختص
  
  // الحقول القديمة للتوافق
  issueDescription: text("issueDescription"),
  actionsTaken: text("actionsTaken"),
  resolved: boolean("resolved").default(false),
  requiresProject: boolean("requiresProject").default(false),
  status: varchar("status", { length: 50 }), // 'partially_solved', 'fully_solved', 'not_solved'
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// التقارير الختامية للمشاريع
export const finalReports = mysqlTable("final_reports", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().unique().references(() => mosqueRequests.id),
  projectId: int("projectId").references(() => projects.id),
  preparedBy: int("preparedBy").references(() => users.id, { onDelete: "set null" }),
  summary: text("summary"),
  achievements: text("achievements"),
  challenges: text("challenges"),
  totalCost: decimal("totalCost", { precision: 15, scale: 2 }),
  completionDate: datetime("completionDate"),
  satisfactionRating: int("satisfactionRating"), // 1-5
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== جداول المشاريع ====================

// جدول المشاريع
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectNumber: varchar("projectNumber", { length: 50 }).notNull().unique(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: int("managerId").references(() => users.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["planning", "in_progress", "on_hold", "completed", "cancelled"]).default("planning"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }),
  startDate: datetime("startDate"),
  expectedEndDate: datetime("expectedEndDate"),
  actualEndDate: datetime("actualEndDate"),
  completionPercentage: int("completionPercentage").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// مراحل تنفيذ المشروع
export const projectPhases = mysqlTable("project_phases", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  phaseName: varchar("phaseName", { length: 255 }).notNull(),
  phaseOrder: int("phaseOrder").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending"),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  completionPercentage: int("completionPercentage").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول العقود
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  contractNumber: varchar("contractNumber", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull().references(() => projects.id),
  supplierId: int("supplierId").references(() => suppliers.id),
  signatoryId: int("signatoryId").references(() => signatories.id), // مفوض التوقيع
  contractType: varchar("contractType", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  status: mysqlEnum("status", ["draft", "active", "completed", "terminated"]).default("draft"),
  terms: text("terms"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول الدفعات المالية
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  paymentNumber: varchar("paymentNumber", { length: 50 }).notNull().unique(),
  projectId: int("projectId").references(() => projects.id),
  contractId: int("contractId").references(() => contractsEnhanced.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentType: mysqlEnum("paymentType", ["advance", "progress", "final", "retention"]).default("progress"),
  status: mysqlEnum("status", ["pending", "approved", "paid", "rejected"]).default("pending"),
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  paidAt: datetime("paidAt"),
  description: text("description"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  completionPercentage: int("completionPercentage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== جداول التمويل والتبرعات ====================

// فرص التبرع
export const donationOpportunities = mysqlTable("donation_opportunities", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").references(() => mosqueRequests.id),
  projectId: int("projectId").references(() => projects.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetAmount: decimal("targetAmount", { precision: 15, scale: 2 }).notNull(),
  collectedAmount: decimal("collectedAmount", { precision: 15, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["active", "completed", "closed"]).default("active"),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  isPublic: boolean("isPublic").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// التبرعات
export const donations = mysqlTable("donations", {
  id: int("id").autoincrement().primaryKey(),
  opportunityId: int("opportunityId").references(() => donationOpportunities.id),
  donorName: varchar("donorName", { length: 255 }),
  donorPhone: varchar("donorPhone", { length: 20 }),
  donorEmail: varchar("donorEmail", { length: 320 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  isAnonymous: boolean("isAnonymous").default(false),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending"),
  transactionId: varchar("transactionId", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// أنواع الكيانات
export const entityTypes = [
  "company",          // شركة
  "establishment",    // مؤسسة
] as const;

// حالات اعتماد المورد
export const supplierApprovalStatuses = [
  "pending",          // قيد المراجعة
  "approved",         // معتمد
  "rejected",         // مرفوض
  "suspended",        // موقوف
] as const;

// مجالات العمل
export const workFields = [
  "construction",           // بناء وتشييد
  "engineering_consulting", // استشارات هندسية
  "electrical",             // أعمال كهربائية
  "plumbing",               // أعمال سباكة
  "hvac",                   // تكييف وتبريد
  "finishing",              // تشطيبات
  "carpentry",              // نجارة
  "aluminum",               // ألمنيوم
  "painting",               // دهانات
  "flooring",               // أرضيات
  "landscaping",            // تنسيق حدائق
  "cleaning",               // نظافة
  "maintenance",            // صيانة
  "security_systems",       // أنظمة أمنية
  "sound_systems",          // أنظمة صوتية
  "solar_energy",           // طاقة شمسية
  "water_systems",          // أنظمة مياه
  "furniture",              // أثاث
  "carpets",                // سجاد
  "supplies",               // توريدات
  "other",                  // أخرى
] as const;

// الموردين والمقاولين - الجدول المحسن
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  
  // ==================== الصفحة 1: معلومات الكيان ====================
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["contractor", "supplier", "service_provider"]).default("supplier"),
  entityType: mysqlEnum("entityType", entityTypes).default("establishment"),
  commercialRegister: varchar("commercialRegister", { length: 50 }).notNull(),
  commercialActivity: varchar("commercialActivity", { length: 500 }), // النشاط حسب السجل
  yearsOfExperience: int("yearsOfExperience"), // عدد سنوات الخبرة
  workFields: json("workFields").$type<string[]>(), // مجالات العمل
  
  // ==================== الصفحة 2: معلومات التواصل ====================
  address: text("address"),
  city: varchar("city", { length: 100 }),
  googleMapsUrl: varchar("googleMapsUrl", { length: 500 }), // موقع الكيان على خرائط Google
  googleMapsLat: decimal("googleMapsLat", { precision: 10, scale: 7 }),
  googleMapsLng: decimal("googleMapsLng", { precision: 10, scale: 7 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  phoneSecondary: varchar("phoneSecondary", { length: 20 }),
  contactPerson: varchar("contactPerson", { length: 255 }).notNull(), // اسم مسؤول التواصل
  contactPersonTitle: varchar("contactPersonTitle", { length: 100 }), // وظيفته في الكيان
  
  // ==================== الصفحة 3: معلومات الحساب البنكي ====================
  bankAccountName: varchar("bankAccountName", { length: 255 }),
  bankName: varchar("bankName", { length: 255 }),
  iban: varchar("iban", { length: 50 }),
  taxNumber: varchar("taxNumber", { length: 50 }),
  
  // ==================== الصفحة 4: المرفقات ====================
  commercialRegisterDoc: longtext("commercialRegisterDoc"), // إرفاق السجل التجاري (Base64)
  vatCertificateDoc: longtext("vatCertificateDoc"), // شهادة ضريبة القيمة المضافة (Base64)
  nationalAddressDoc: longtext("nationalAddressDoc"), // العنوان الوطني (Base64)
  bankCertificateDoc: longtext("bankCertificateDoc"), // الشهادة البنكية (Base64)
  otherAttachments: json("otherAttachments").$type<{ name: string; fileData: string }[]>(), // مرفقات أخرى
  
  // ==================== بيانات الاعتماد ====================
  approvalStatus: mysqlEnum("approvalStatus", supplierApprovalStatuses).default("pending"),
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: datetime("approvedAt"),
  rejectionReason: text("rejectionReason"),
  
  // ==================== بيانات إضافية ====================
  status: mysqlEnum("status", ["active", "inactive", "blacklisted"]).default("active"),
  rating: int("rating"), // 1-5
  notes: text("notes"),
  
  // ==================== المنشئ والتواريخ ====================
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// حالات عروض الأسعار
export const quotationStatuses = [
  "pending",      // قيد المراجعة
  "negotiating",  // قيد التفاوض
  "accepted",     // معتمد
  "approved",     // معتمد نهائياً
  "rejected",     // مرفوض
  "expired"       // منتهي الصلاحية
] as const;

// عروض الأسعار
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(),
  requestId: int("requestId").references(() => mosqueRequests.id),
  projectId: int("projectId").references(() => projects.id),
  supplierId: int("supplierId").notNull().references(() => suppliers.id),
  
  // المبلغ الأصلي من المورد (قبل الضريبة والخصم)
  totalAmount: decimal('totalAmount', { precision: 15, scale: 2 }).notNull(),
  // بيانات الضريبة
  includesTax: boolean("includesTax").default(false), // هل السعر شامل الضريبة
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("15.00"), // نسبة الضريبة (افتراضي 15%)
  taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }), // مبلغ الضريبة
  
  // بيانات الخصم
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]), // نوع الخصم: نسبة مئوية أو مبلغ ثابت
  discountValue: decimal("discountValue", { precision: 15, scale: 2 }), // قيمة الخصم (نسبة أو مبلغ)
  discountAmount: decimal("discountAmount", { precision: 15, scale: 2 }), // مبلغ الخصم المحسوب
  
  // المبلغ النهائي (بعد الضريبة والخصم)
  finalAmount: decimal("finalAmount", { precision: 15, scale: 2 }),
  
  // بيانات التفاوض
  negotiatedAmount: decimal("negotiatedAmount", { precision: 15, scale: 2 }), // المبلغ بعد التفاوض
  negotiationNotes: text("negotiationNotes"), // ملاحظات التفاوض
  negotiatedBy: int("negotiatedBy").references(() => users.id, { onDelete: "set null" }), // من قام بالتفاوض
  negotiatedAt: datetime("negotiatedAt"), // تاريخ التفاوض
  
  // المبلغ المعتمد (إما المبلغ بعد التفاوض أو الأصلي)
  approvedAmount: decimal("approvedAmount", { precision: 15, scale: 2 }),
  
  validUntil: datetime("validUntil"),
  status: mysqlEnum("status", quotationStatuses).default("pending"),
  items: json("items"), // تفاصيل البنود
  notes: text("notes"),
  documentUrl: varchar("documentUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جداول الكميات
export const quantitySchedules = mysqlTable("quantity_schedules", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").references(() => mosqueRequests.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "cascade" }),
  boqCode: varchar("boqCode", { length: 50 }).unique(), // BOQ-2025-001
  boqName: varchar("boqName", { length: 255 }), // اسم وصفي للجدول
  itemName: varchar("itemName", { length: 255 }).notNull(),
  itemDescription: text("itemDescription"),
  unit: varchar("unit", { length: 50 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 15, scale: 2 }),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جداول الكميات (BOQ) - النسخة المتوافقة مع سكربتات الاختبار والتحقق
export const boqItems = mysqlTable("boq_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").references(() => mosqueRequests.id, { onDelete: "cascade" }),
  projectId: int("projectId").references(() => projects.id, { onDelete: "cascade" }),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  itemDescription: text("itemDescription"),
  unit: varchar("unit", { length: 50 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 15, scale: 2 }),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== جداول الإشعارات ====================

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error", "request_update", "system", "mosque", "request"]).default("info"),  relatedType: varchar("relatedType", { length: 50 }), // request, project, user
  relatedId: int("relatedId"),
  isRead: boolean("isRead").default(false),
  readAt: datetime("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== جداول الإعدادات والتصنيفات ====================

// التصنيفات الرئيسية
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // city, nationality, maintenance_type, etc.
  parentId: int("parentId"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});



// إعدادات الهوية البصرية
export const brandSettings = mysqlTable("brand_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  settingType: varchar("settingType", { length: 50 }), // text, color, image, json
  description: varchar("description", { length: 255 }),
  updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// الشعارات
export const brandLogos = mysqlTable("brand_logos", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  logoType: mysqlEnum("logoType", ["primary", "secondary", "white", "dark", "icon"]).default("primary"),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// الألوان
export const brandColors = mysqlTable("brand_colors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  colorType: mysqlEnum("colorType", ["primary", "secondary", "accent", "background", "text"]).default("primary"),
  hexValue: varchar("hexValue", { length: 7 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// تخصيص الصفحة الرئيسية
export const homepageCustomization = mysqlTable("homepage_customization", {
  id: int("id").autoincrement().primaryKey(),
  sectionKey: varchar("sectionKey", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  titleAr: varchar("titleAr", { length: 255 }),
  subtitle: text("subtitle"),
  subtitleAr: text("subtitleAr"),
  content: text("content"),
  contentAr: text("contentAr"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  iconName: varchar("iconName", { length: 100 }),
  sortOrder: int("sortOrder").default(0),
  isVisible: boolean("isVisible").default(true),
  updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== جداول الشركاء والداعمين ====================

export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  logoUrl: varchar("logoUrl", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  partnerType: mysqlEnum("partnerType", ["strategic", "sponsor", "supporter", "media"]).default("supporter"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== إعدادات الجمعية ====================

// إعدادات الجمعية (الطرف الأول في العقود)
export const organizationSettings = mysqlTable("organization_settings", {
  id: int("id").autoincrement().primaryKey(),
  // بيانات الجمعية الأساسية
  organizationName: varchar("organizationName", { length: 255 }).notNull(),
  organizationNameShort: varchar("organizationNameShort", { length: 100 }),
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  administrativeSupervisor: varchar("administrativeSupervisor", { length: 255 }), // جهة الإشراف الإداري
  technicalSupervisor: varchar("technicalSupervisor", { length: 255 }), // جهة الإشراف الفني
  // أسماء المسؤولين
  boardChairmanName: varchar("boardChairmanName", { length: 255 }), // اسم رئيس مجلس الإدارة
  executiveDirectorName: varchar("executiveDirectorName", { length: 255 }), // اسم المدير التنفيذي
  accountantName: varchar("accountantName", { length: 255 }), // اسم المحاسب
  pmoManagerName: varchar("pmoManagerName", { length: 255 }), // اسم مدير مكتب إدارة المشاريع
  csrManagerName: varchar("csrManagerName", { length: 255 }), // اسم مسؤول الاتصال المؤسسي
  aboutOrganization: text("aboutOrganization"), // نبذة عن الجمعية
  // بيانات التواصل
  address: text("address"),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  // الشعارات والأختام
  logoUrl: varchar("logoUrl", { length: 500 }),
  stampUrl: varchar("stampUrl", { length: 500 }),
  secondaryLogoUrl: varchar("secondaryLogoUrl", { length: 500 }), // شعار ثانوي (رؤية 2030 مثلاً)
  // البيانات البنكية
  bankName: varchar("bankName", { length: 100 }),
  bankAccountName: varchar("bankAccountName", { length: 255 }),
  iban: varchar("iban", { length: 34 }),
  // إعدادات العقود
  contractPrefix: varchar("contractPrefix", { length: 10 }).default("CON"),
  contractFooterText: text("contractFooterText"),
  contractTermsAndConditions: text("contractTermsAndConditions"),
  // الألوان الرئيسية والثانوية للهوية البصرية
  colorPrimary1: varchar("colorPrimary1", { length: 7 }).default("#09707e"),  // اللون الرئيسي الأول
  colorPrimary2: varchar("colorPrimary2", { length: 7 }).default("#0891b2"),  // اللون الرئيسي الثاني
  colorSecondary1: varchar("colorSecondary1", { length: 7 }).default("#6366f1"), // اللون الثانوي 1
  colorSecondary2: varchar("colorSecondary2", { length: 7 }).default("#f59e0b"), // اللون الثانوي 2
  colorSecondary3: varchar("colorSecondary3", { length: 7 }).default("#ef4444"), // اللون الثانوي 3
  colorSecondary4: varchar("colorSecondary4", { length: 7 }).default("#8b5cf6"), // اللون الثانوي 4
  colorSecondary5: varchar("colorSecondary5", { length: 7 }).default("#10b981"), // اللون الثانوي 5
  // حقول قديمة (للتوافق العكسي)
  authorizedSignatory: varchar("authorizedSignatory", { length: 255 }),
  signatoryTitle: varchar("signatoryTitle", { length: 100 }),
  signatoryPhone: varchar("signatoryPhone", { length: 20 }),
  signatoryEmail: varchar("signatoryEmail", { length: 320 }),
  updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// مفوضو التوقيع
export const signatories = mysqlTable("signatories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // اسم المفوض
  title: varchar("title", { length: 100 }).notNull(), // المنصب (المدير التنفيذي، رئيس مجلس الإدارة، إلخ)
  nationalId: varchar("nationalId", { length: 20 }), // رقم الهوية
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"), // العنوان
  signatureUrl: varchar("signatureUrl", { length: 500 }), // صورة التوقيع
  isDefault: boolean("isDefault").default(false), // هل هو المفوض الافتراضي
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// أنواع العقود
export const contractTypes = [
  "supervision",      // إشراف هندسي
  "construction",     // مقاولات
  "supply",           // توريد
  "maintenance",      // صيانة
  "consulting",       // استشارات
] as const;

// حالات العقد الموسعة
export const contractStatuses = [
  "draft",            // مسودة
  "pending_approval", // بانتظار الاعتماد
  "approved",         // معتمد
  "active",           // نشط
  "completed",        // مكتمل
  "terminated",       // منتهي
  "cancelled",        // ملغي
] as const;

// وحدات المدة
export const durationUnits = [
  "days",             // أيام
  "weeks",            // أسابيع
  "months",           // شهور
  "years",            // سنوات
] as const;

// جدول العقود المحسن
export const contractsEnhanced = mysqlTable("contracts_enhanced", {
  id: int("id").autoincrement().primaryKey(),
  contractNumber: varchar("contractNumber", { length: 50 }).notNull().unique(),
  contractYear: int("contractYear").notNull(),
  contractSequence: int("contractSequence").notNull(),
  
  // ربط بالقالب
  templateId: int("templateId"), // سيتم ربطه بعد إنشاء جدول القوالب
  
  // نوع العقد
  contractType: mysqlEnum("contractType", contractTypes).notNull(),
  contractTitle: varchar("contractTitle", { length: 500 }).notNull(),
  
  // الربط بالمشروع والطلب
  projectId: int("projectId").references(() => projects.id),
  requestId: int("requestId").references(() => mosqueRequests.id),
  signatoryId: int("signatoryId").references(() => signatories.id), // مفوض التوقيع
  
  // بيانات الطرف الثاني (المقاول/المكتب الهندسي)
  supplierId: int("supplierId").references(() => suppliers.id),
  secondPartyName: varchar("secondPartyName", { length: 255 }).notNull(),
  secondPartyCommercialRegister: varchar("secondPartyCommercialRegister", { length: 50 }),
  secondPartyRepresentative: varchar("secondPartyRepresentative", { length: 255 }),
  secondPartyTitle: varchar("secondPartyTitle", { length: 100 }),
  secondPartyAddress: text("secondPartyAddress"),
  secondPartyPhone: varchar("secondPartyPhone", { length: 20 }),
  secondPartyEmail: varchar("secondPartyEmail", { length: 320 }),
  secondPartyBankName: varchar("secondPartyBankName", { length: 255 }),
  secondPartyIban: varchar("secondPartyIban", { length: 50 }),
  secondPartyAccountName: varchar("secondPartyAccountName", { length: 255 }),
  
  // بيانات المسجد/المشروع
  mosqueName: varchar("mosqueName", { length: 255 }),
  mosqueNeighborhood: varchar("mosqueNeighborhood", { length: 255 }),
  mosqueCity: varchar("mosqueCity", { length: 100 }),
  
  // قيمة العقد
  contractAmount: decimal("contractAmount", { precision: 15, scale: 2 }).notNull(),
  contractAmountText: varchar("contractAmountText", { length: 500 }),
  managementPercentage: decimal("managementPercentage", { precision: 5, scale: 2 }).default("0.00"),
  
  // مدة العقد
  duration: int("duration").notNull(),
  durationUnit: mysqlEnum("durationUnit", durationUnits).default("months"),
  
  // التواريخ
  contractDate: datetime("contractDate"),
  contractDateHijri: varchar("contractDateHijri", { length: 50 }),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  
  // الحالة
  status: mysqlEnum("status", contractStatuses).default("draft"),
  
  // بيانات الدعم والتمويل
  supportingEntity: varchar("supportingEntity", { length: 100 }), // الجهة الداعمة
  supportType: varchar("supportType", { length: 50 }), // نوع الدعم (كامل/جزئي)
  supportedAmount: decimal("supportedAmount", { precision: 15, scale: 2 }), // مبلغ الدعم
  
  // البنود الإضافية (قابلة للتخصيص)
  customTerms: text("customTerms"),
  customNotifications: text("customNotifications"),
  customGeneralTerms: text("customGeneralTerms"),
  
  // جدول الدفعات وبنود العقد (JSON)
  paymentScheduleJson: json("paymentScheduleJson"),
  clauseValuesJson: json("clauseValuesJson"),
  customClausesJson: json("customClausesJson"),
  
  // الملفات
  documentUrl: varchar("documentUrl", { length: 500 }),
  signedDocumentUrl: varchar("signedDocumentUrl", { length: 500 }),
  
  // الاعتماد
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: datetime("approvedAt"),
  
  // المنشئ
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول دفعات العقد
export const contractPayments = mysqlTable("contract_payments", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull().references(() => contractsEnhanced.id),
  phaseName: varchar("phaseName", { length: 255 }).notNull(),
  phaseOrder: int("phaseOrder").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: datetime("dueDate"),
  status: mysqlEnum("status", ["pending", "due", "paid"]).default("pending"),
  paidAt: datetime("paidAt"),
  paidBy: int("paidBy").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  completionPercentage: int("completionPercentage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// حالات طلبات الصرف
export const disbursementRequestStatuses = [
  "draft",           // مسودة
  "pending",         // قيد المراجعة
  "approved",        // معتمد
  "rejected",        // مرفوض
  "paid"             // مصروف
] as const;

// حالات أوامر الصرف
export const disbursementOrderStatuses = [
  "draft",           // مسودة
  "pending",         // قيد الاعتماد
  "approved",        // معتمد
  "rejected",        // مرفوض
  "executed",        // منفذ
  "edited"           // تم التعديل
] as const;

// جدول طلبات الصرف (مكتب المشاريع)
export const disbursementRequests = mysqlTable("disbursement_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNumber: varchar("requestNumber", { length: 50 }).notNull().unique(),
  projectId: int("projectId").references(() => projects.id),
  contractId: int("contractId").references(() => contractsEnhanced.id),
  contractPaymentId: int("contractPaymentId").references(() => contractPayments.id),
  paymentId: int("paymentId").references(() => payments.id),
  
  // بيانات الطلب
  title: varchar("title", { length: 255 }),
  description: text("description"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentType: mysqlEnum("paymentType", ["advance", "progress", "final", "retention"]).default("progress"),
  dateMiladi: date("dateMiladi"),
  completionPercentage: int("completionPercentage"), // نسبة الإنجاز المرتبطة بالدفعة
  
  // المرفقات
  attachmentsJson: text("attachmentsJson"), // JSON array of attachments
  
  // الحالة
  status: mysqlEnum("status", disbursementRequestStatuses).default("draft"),
  
  // مقدم الطلب
  requestedBy: int("requestedBy").references(() => users.id, { onDelete: "set null" }),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  
  // الاعتماد
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: datetime("approvedAt"),
  approvalNotes: text("approvalNotes"),
  
  // الرفض
  rejectedBy: int("rejectedBy").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: datetime("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول أوامر الصرف (الإدارة المالية)
export const disbursementOrders = mysqlTable("disbursement_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  disbursementRequestId: int("disbursementRequestId").notNull(),
  
  // بيانات الأمر
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  beneficiaryName: varchar("beneficiaryName", { length: 255 }).notNull(),
  beneficiaryBank: varchar("beneficiaryBank", { length: 255 }),
  beneficiaryIban: varchar("beneficiaryIban", { length: 50 }),
  paymentMethod: varchar("paymentMethod", { length: 50 }).default("bank_transfer"),
  beneficiaryAccountName: varchar("beneficiaryAccountName", { length: 255 }),
  sadadNumber: varchar("sadadNumber", { length: 50 }),
  billerCode: varchar("billerCode", { length: 50 }),
  
  // الحالة
  status: mysqlEnum("status", disbursementOrderStatuses).default("draft"),
  
  // منشئ الأمر
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  
  // الاعتماد
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: datetime("approvedAt"),
  approvalNotes: text("approvalNotes"),
  
  // التنفيذ
  executedBy: int("executedBy").references(() => users.id, { onDelete: "set null" }),
  executedAt: datetime("executedAt"),
  transactionReference: varchar("transactionReference", { length: 255 }),
  
  // الرفض
  rejectedBy: int("rejectedBy").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: datetime("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  reqFk: foreignKey({ columns: [table.disbursementRequestId], foreignColumns: [disbursementRequests.id], name: "do_req_fk" }),
}));

// تقارير الإنجاز
export const progressReports = mysqlTable("progress_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportNumber: varchar("reportNumber", { length: 50 }).notNull().unique(),
  projectId: int("projectId").notNull().references(() => projects.id),
  
  // بيانات التقرير
  title: varchar("title", { length: 255 }).notNull(),
  reportDate: date("reportDate").notNull(),
  reportPeriodStart: date("reportPeriodStart"),
  reportPeriodEnd: date("reportPeriodEnd"),
  
  // نسب الإنجاز
  overallProgress: int("overallProgress").default(0), // نسبة الإنجاز الإجمالية
  plannedProgress: int("plannedProgress").default(0), // نسبة الإنجاز المخططة
  actualProgress: int("actualProgress").default(0), // نسبة الإنجاز الفعلية
  variance: int("variance").default(0), // الانحراف (موجب = متقدم، سالب = متأخر)
  
  // ملخص الأعمال
  workSummary: text("workSummary"), // ملخص الأعمال المنجزة
  challenges: text("challenges"), // التحديات والمعوقات
  nextSteps: text("nextSteps"), // الخطوات القادمة
  recommendations: text("recommendations"), // التوصيات
  
  // المالية
  budgetSpent: decimal("budgetSpent", { precision: 15, scale: 2 }).default("0"), // المبلغ المصروف
  budgetRemaining: decimal("budgetRemaining", { precision: 15, scale: 2 }).default("0"), // المبلغ المتبقي
  
  // المرفقات
  attachments: longtext("attachments"), // قائمة المرفقات
  photos: longtext("photos"), // صور الموقع
  
  // الحالة
  status: mysqlEnum("status", ["draft", "submitted", "reviewed", "approved"]).default("draft"),
  
  // المنشئ والمراجع
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: datetime("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== إعدادات المراحل والمدد الزمنية ====================

// جدول إعدادات المراحل (المدد الزمنية قابلة للتخصيص)
export const stageSettings = mysqlTable("stage_settings", {
  id: int("id").autoincrement().primaryKey(),
  stageCode: varchar("stageCode", { length: 50 }).notNull().unique(), // كود المرحلة
  stageName: varchar("stageName", { length: 100 }).notNull(), // اسم المرحلة بالعربية
  stageOrder: int("stageOrder").notNull().default(0), // ترتيب المرحلة
  durationDays: int("durationDays").notNull().default(3), // المدة المحددة بالأيام
  warningDays: int("warningDays").default(1), // عدد أيام التنبيه قبل التأخير
  escalationLevel1Days: int("escalationLevel1Days").default(1), // أيام إضافية للتصعيد للمدير المباشر
  escalationLevel2Days: int("escalationLevel2Days").default(3), // أيام إضافية للتصعيد للمدير التنفيذي
  isActive: boolean("isActive").default(true),
  description: text("description"), // وصف المرحلة
  requiredConditions: text("requiredConditions"), // الشروط المطلوبة للانتقال لهذه المرحلة (JSON)
  availableActions: text("availableActions"), // الإجراءات المتاحة في هذه المرحلة (JSON)
  notificationTitle: varchar("notificationTitle", { length: 200 }), // عنوان الإشعار لطالب الخدمة عند الانتقال لهذه المرحلة
  notificationMessage: text("notificationMessage"), // نص الإشعار لطالب الخدمة عند الانتقال لهذه المرحلة
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول تتبع المراحل لكل طلب
export const requestStageTracking = mysqlTable("request_stage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  stageCode: varchar("stageCode", { length: 50 }).notNull(),
  subStageCode: varchar("subStageCode", { length: 50 }), // المرحلة الفرعية الحالية
  startedAt: timestamp("startedAt").defaultNow(), // تاريخ بداية المرحلة
  dueAt: datetime("dueAt"), // تاريخ الاستحقاق
  completedAt: datetime("completedAt"), // تاريخ الاكتمال
  isDelayed: boolean("isDelayed").default(false), // هل متأخر
  delayDays: int("delayDays").default(0), // عدد أيام التأخير
  escalationLevel: int("escalationLevel").default(0), // مستوى التصعيد (0=لا, 1=مدير مباشر, 2=مدير تنفيذي)
  assignedTo: int("assignedTo").references(() => users.id, { onDelete: "set null" }), // الموظف المسؤول
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول تتبع المراحل الفرعية
export const requestSubStageTracking = mysqlTable("request_sub_stage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  parentStageCode: varchar("parentStageCode", { length: 50 }).notNull(), // المرحلة الرئيسية
  subStageCode: varchar("subStageCode", { length: 50 }).notNull(), // المرحلة الفرعية
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  dueAt: datetime("dueAt").notNull(),
  completedAt: datetime("completedAt"),
  isDelayed: boolean("isDelayed").default(false),
  delayDays: int("delayDays").default(0),
  assignedTo: int("assignedTo").references(() => users.id, { onDelete: "set null" }),
  completedBy: int("completedBy").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  actionData: text("actionData"), // بيانات الإجراء (JSON)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول سجل التصعيدات
export const escalationLogs = mysqlTable("escalation_logs", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  stageCode: varchar("stageCode", { length: 50 }).notNull(),
  escalationLevel: int("escalationLevel").notNull(), // 1=مدير مباشر, 2=مدير تنفيذي
  escalatedTo: int("escalatedTo").references(() => users.id, { onDelete: "set null" }), // المسؤول الذي تم التصعيد إليه
  escalatedFrom: int("escalatedFrom").references(() => users.id, { onDelete: "set null" }), // الموظف المتأخر
  reason: text("reason"), // سبب التصعيد
  delayDays: int("delayDays").notNull(), // عدد أيام التأخير
  isResolved: boolean("isResolved").default(false), // هل تم حل المشكلة
  resolvedAt: datetime("resolvedAt"),
  resolvedBy: int("resolvedBy").references(() => users.id, { onDelete: "set null" }),
  resolution: text("resolution"), // كيف تم الحل
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// سجل ترقيم العقود
export const projectNumberSequence = mysqlTable("project_number_sequence", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  lastSequence: int("lastSequence").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const requestNumberSequence = mysqlTable("request_number_sequence", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  lastSequence: int("lastSequence").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contractNumberSequence = mysqlTable("contract_number_sequence", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  lastSequence: int("lastSequence").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== جداول التدقيق ====================

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // user, mosque, request, project
  entityId: int("entityId"),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== العلاقات ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  mosques: many(mosques),
  requests: many(mosqueRequests),
  notifications: many(notifications),
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
}));

export const mosquesRelations = relations(mosques, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [mosques.registeredBy],
    references: [users.id],
  }),
  requests: many(mosqueRequests),
  images: many(mosqueImages),
}));

export const mosqueRequestsRelations = relations(mosqueRequests, ({ one, many }) => ({
  mosque: one(mosques, {
    fields: [mosqueRequests.mosqueId],
    references: [mosques.id],
  }),
  user: one(users, {
    fields: [mosqueRequests.userId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [mosqueRequests.assignedTo],
    references: [users.id],
  }),
  attachments: many(requestAttachments),
  comments: many(requestComments),
  history: many(requestHistory),
}));

// ==================== أنواع TypeScript ====================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type Mosque = typeof mosques.$inferSelect;
export type InsertMosque = typeof mosques.$inferInsert;
export type MosqueRequest = typeof mosqueRequests.$inferSelect;
export type InsertMosqueRequest = typeof mosqueRequests.$inferInsert;
export type RequestAttachment = typeof requestAttachments.$inferSelect;
export type RequestComment = typeof requestComments.$inferSelect;
export type RequestHistory = typeof requestHistory.$inferSelect;
export type FieldVisitReport = typeof fieldVisitReports.$inferSelect;
export type QuickResponseReport = typeof quickResponseReports.$inferSelect;
export type FinalReport = typeof finalReports.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type DonationOpportunity = typeof donationOpportunities.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type QuantitySchedule = typeof quantitySchedules.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type CategoryValue = typeof categories.$inferSelect;
export type BrandSetting = typeof brandSettings.$inferSelect;
export type BrandLogo = typeof brandLogos.$inferSelect;
export type BrandColor = typeof brandColors.$inferSelect;
export type HomepageCustomization = typeof homepageCustomization.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type ContractEnhanced = typeof contractsEnhanced.$inferSelect;
export type ContractPayment = typeof contractPayments.$inferSelect;
export type ContractType = typeof contractTypes[number];
export type ContractStatus = typeof contractStatuses[number];
export type DurationUnit = typeof durationUnits[number];
export type EntityType = typeof entityTypes[number];
export type SupplierApprovalStatus = typeof supplierApprovalStatuses[number];
export type WorkField = typeof workFields[number];
export type QuotationStatus = typeof quotationStatuses[number];

// ==================== نظام قوالب العقود المتقدم ====================

// تصنيفات بنود العقود
export const clauseCategories = [
  "obligations_first_party",   // التزامات الطرف الأول
  "obligations_second_party",  // التزامات الطرف الثاني
  "financial",                 // بنود مالية
  "duration",                  // مدة العقد
  "modifications",             // تعديل العقد
  "notifications",             // الإشعارات
  "general",                   // أحكام عامة
  "confidentiality",           // سرية المعلومات
  "intellectual_property",     // حقوق الملكية الفكرية
  "disputes",                  // حل المنازعات
  "termination",               // فسخ العقد
  "penalties",                 // الغرامات
  "warranty",                  // الضمان
  "force_majeure",             // القوة القاهرة
  "copies",                    // نُسخ الاتفاقية
  "custom"                     // بنود مخصصة
] as const;

// قوالب العقود
export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  type: mysqlEnum("type", contractTypes).notNull(),
  description: text("description"),
  headerTemplate: text("headerTemplate"), // ترويسة العقد
  introTemplate: text("introTemplate"), // مقدمة العقد (التمهيد)
  footerTemplate: text("footerTemplate"), // تذييل العقد
  signatureTemplate: text("signatureTemplate"), // قسم التوقيعات
  isActive: boolean("isActive").default(true),
  isDefault: boolean("isDefault").default(false), // القالب الافتراضي لهذا النوع
  isSystem: boolean("isSystem").default(false), // قالب نظام غير قابل للتعديل
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// بنود العقود (مكتبة البنود)
export const contractClauses = mysqlTable("contract_clauses", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").references(() => contractTemplates.id), // null = بند عام في المكتبة
  title: varchar("title", { length: 255 }).notNull(), // عنوان البند (مثل: المادة الأولى)
  titleAr: varchar("titleAr", { length: 255 }).notNull(), // العنوان بالعربية
  content: text("content").notNull(), // نص البند (يدعم المتغيرات مثل {{contract_value}})
  category: mysqlEnum("category", clauseCategories).default("general"),
  orderIndex: int("orderIndex").default(0), // ترتيب البند
  isRequired: boolean("isRequired").default(false), // بند إلزامي
  isEditable: boolean("isEditable").default(true), // قابل للتعديل
  isGlobal: boolean("isGlobal").default(false), // بند عام في المكتبة
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// قيم البنود في العقود الفعلية
export const contractClauseValues = mysqlTable("contract_clause_values", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull().references(() => contractsEnhanced.id),
  clauseId: int("clauseId").references(() => contractClauses.id), // null = بند مخصص جديد
  title: varchar("title", { length: 255 }), // العنوان المخصص
  customContent: text("customContent"), // النص المخصص (إن تم التعديل)
  orderIndex: int("orderIndex").default(0),
  isIncluded: boolean("isIncluded").default(true), // مضمن في العقد
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// المفوضين بالتوقيع (يمكن إضافة أكثر من مفوض)
export const authorizedSignatories = mysqlTable("authorized_signatories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(), // صفة المفوض
  nationalId: varchar("nationalId", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  signatureUrl: varchar("signatureUrl", { length: 500 }), // صورة التوقيع
  isActive: boolean("isActive").default(true),
  isDefault: boolean("isDefault").default(false), // المفوض الافتراضي
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// العلاقات
export const contractTemplatesRelations = relations(contractTemplates, ({ many }) => ({
  clauses: many(contractClauses),
}));

export const contractClausesRelations = relations(contractClauses, ({ one }) => ({
  template: one(contractTemplates, {
    fields: [contractClauses.templateId],
    references: [contractTemplates.id],
  }),
}));

// حالات طلب التعديل
export const modificationRequestStatuses = [
  "pending",    // بانتظار الموافقة
  "approved",   // موافق عليه
  "rejected",   // مرفوض
] as const;

// جدول طلبات تعديل العقود
export const contractModificationRequests = mysqlTable("contract_modification_requests", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  
  // نوع التعديل
  modificationType: varchar("modificationType", { length: 50 }).notNull(), // amount, duration, terms, other
  
  // وصف التعديلات المطلوبة
  description: text("description").notNull(),
  
  // القيم الحالية والجديدة
  currentValue: text("currentValue"),
  newValue: text("newValue"),
  
  // المبررات
  justification: text("justification").notNull(),
  
  // الحالة
  status: mysqlEnum("status", modificationRequestStatuses).default("pending"),
  
  // طالب التعديل
  requestedBy: int("requestedBy").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  
  // الموافق/الرافض
  reviewedBy: int("reviewedBy"),
  reviewedAt: datetime("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contractFk: foreignKey({ columns: [table.contractId], foreignColumns: [contractsEnhanced.id], name: "cmr_contract_fk" }),
  requestedByFk: foreignKey({ columns: [table.requestedBy], foreignColumns: [users.id], name: "cmr_requested_fk" }),
  reviewedByFk: foreignKey({ columns: [table.reviewedBy], foreignColumns: [users.id], name: "cmr_reviewed_fk" }),
}));

// جدول الاستلامات (Handovers)
export const handoverTypes = [
  "preliminary",  // استلام أولي
  "warranty",     // فترة ضمان
  "final"         // استلام نهائي
] as const;

export const handoverStatuses = [
  "pending",    // قيد المراجعة
  "approved",   // معتمد
  "rejected",   // مرفوض
  "completed"   // مكتمل
] as const;

export const handovers = mysqlTable("handovers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  
  // نوع الاستلام
  type: mysqlEnum("type", handoverTypes).notNull(),
  
  // تفاصيل الاستلام
  handoverDate: date("handoverDate"),
  completionPercentage: decimal("completionPercentage", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  
  // الملفات
  documentUrl: text("documentUrl"),
  photosUrls: json("photosUrls").$type<string[]>(),
  
  // الحالة
  status: mysqlEnum("status", handoverStatuses).default("pending").notNull(),
  
  // معلومات المعتمد
  approvedBy: int("approvedBy").references(() => users.id, { onDelete: "set null" }),
  approvedAt: datetime("approvedAt"),
  approvalNotes: text("approvalNotes"),
  
  // معلومات الضمان (لنوع warranty)
  warrantyStartDate: date("warrantyStartDate"),
  warrantyEndDate: date("warrantyEndDate"),
  warrantyDurationMonths: int("warrantyDurationMonths"),
  
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول قياس الرضا (Satisfaction Surveys)
export const surveyTypes = [
  "stakeholder",   // أصحاب المصلحة
  "beneficiary"    // المستفيدين
] as const;

export const surveyStatuses = [
  "draft",       // مسودة
  "published",   // منشور
  "closed"       // مغلق
] as const;

export const satisfactionSurveys = mysqlTable("satisfaction_surveys", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  
  // نوع الاستبيان
  type: mysqlEnum("type", surveyTypes).notNull(),
  
  // عنوان ووصف
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // الأسئلة (قابلة للتخصيص)
  questions: json("questions").$type<{
    id: string;
    question: string;
    type: "rating" | "text" | "multiple_choice";
    options?: string[];
    required: boolean;
  }[]>().notNull(),
  
  // الحالة
  status: mysqlEnum("status", surveyStatuses).default("draft").notNull(),
  
  // تواريخ
  publishedAt: datetime("publishedAt"),
  closedAt: datetime("closedAt"),
  
  // رابط الاستبيان (للمستفيدين)
  surveyUrl: varchar("surveyUrl", { length: 500 }),
  
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// جدول ردود قياس الرضا (Survey Responses)
export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("surveyId").notNull().references(() => satisfactionSurveys.id),
  
  // معلومات المستجيب
  respondentName: varchar("respondentName", { length: 255 }),
  respondentEmail: varchar("respondentEmail", { length: 255 }),
  respondentPhone: varchar("respondentPhone", { length: 20 }),
  
  // الإجابات
  responses: json("responses").$type<{
    questionId: string;
    answer: string | number | string[];
  }[]>().notNull(),
  
  // التقييم العام
  overallRating: decimal("overallRating", { precision: 3, scale: 2 }),
  
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

// سجل تعديلات العقود
export const contractModificationLogs = mysqlTable("contract_modification_logs", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  modificationRequestId: int("modificationRequestId"),
  
  // تفاصيل التعديل
  fieldName: varchar("fieldName", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  
  // من قام بالتعديل
  modifiedBy: int("modifiedBy").notNull(),
  modifiedAt: timestamp("modifiedAt").defaultNow().notNull(),
}, (table) => ({
  contractFk: foreignKey({ columns: [table.contractId], foreignColumns: [contractsEnhanced.id], name: "cml_contract_fk" }),
  modReqFk: foreignKey({ columns: [table.modificationRequestId], foreignColumns: [contractModificationRequests.id], name: "cml_modreq_fk" }),
  modifiedByFk: foreignKey({ columns: [table.modifiedBy], foreignColumns: [users.id], name: "cml_user_fk" }),
}));

// ==================== إعدادات الإجراءات ====================

// العلاقات بين الإجراءات
export const actionRelationTypes = [
  "before",      // يجب أن يكون قبله
  "after",       // يجب أن يكون بعده
  "concurrent",  // يتزامن معه
  "independent"  // غير مرتبط
] as const;

// جدول إعدادات الإجراءات
export const actionSettings = mysqlTable("action_settings", {
  id: int("id").autoincrement().primaryKey(),
  
  // معلومات الإجراء
  actionCode: varchar("actionCode", { length: 100 }).notNull().unique(),
  actionLabel: varchar("actionLabel", { length: 255 }).notNull(),
  actionDescription: text("actionDescription"),
  
  // المرحلة المرتبطة
  parentStage: varchar("parentStage", { length: 100 }).notNull(),
  
  // الترتيب داخل المرحلة
  order: int("order").notNull().default(0),
  
  // المسار (Route)
  route: varchar("route", { length: 255 }),
  
  // الصلاحيات المطلوبة (JSON array)
  requiredRoles: json("requiredRoles").$type<string[]>(),
  
  // الإجراء السابق المطلوب (prerequisite)
  prerequisiteAction: varchar("prerequisiteAction", { length: 100 }),
  
  // الإجراء التالي
  nextAction: varchar("nextAction", { length: 100 }),
  
  // نوع العلاقة مع الإجراء التالي
  relationWithNext: mysqlEnum("relationWithNext", actionRelationTypes).default("after"),
  
  // هل الإجراء نشط
  isActive: boolean("isActive").default(true).notNull(),
  
  // أيقونة الإجراء (اسم الأيقونة من lucide-react)
  icon: varchar("icon", { length: 50 }),
  
  // اللون المميز
  color: varchar("color", { length: 50 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// تصدير الأنواع
export type ActionSetting = typeof actionSettings.$inferSelect;
export type InsertActionSetting = typeof actionSettings.$inferInsert;
export type ActionRelationType = typeof actionRelationTypes[number];

export type Handover = typeof handovers.$inferSelect;
export type InsertHandover = typeof handovers.$inferInsert;
export type HandoverType = typeof handoverTypes[number];
export type HandoverStatus = typeof handoverStatuses[number];

export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = typeof satisfactionSurveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;
export type SurveyType = typeof surveyTypes[number];
export type SurveyStatus = typeof surveyStatuses[number];

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;
export type ContractClause = typeof contractClauses.$inferSelect;
export type InsertContractClause = typeof contractClauses.$inferInsert;
export type ContractClauseValue = typeof contractClauseValues.$inferSelect;
export type AuthorizedSignatory = typeof authorizedSignatories.$inferSelect;
export type ClauseCategory = typeof clauseCategories[number];
export type StageSetting = typeof stageSettings.$inferSelect;
export type RequestStageTracking = typeof requestStageTracking.$inferSelect;
export type EscalationLog = typeof escalationLogs.$inferSelect;

// تصدير الثوابت
export type UserRole = typeof userRoles[number];
export type ProgramType = string;
export type RequestStage = typeof requestStages[number];
export type RequestStatus = typeof requestStatuses[number];
export type MosqueStatus = typeof mosqueStatuses[number];
export type MosqueOwnership = typeof mosqueOwnership[number];
export type UserStatus = typeof userStatuses[number];


// ==================== نظام الصلاحيات المتكامل ====================

// الوحدات الرئيسية (Modules)
export const modules = mysqlTable("modules", {
  id: varchar("id", { length: 50 }).primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  displayOrder: int("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// الصلاحيات التفصيلية (Permissions)
export const permissions = mysqlTable("permissions", {
  id: varchar("id", { length: 100 }).primaryKey(), // مثل: requests.view
  moduleId: varchar("module_id", { length: 50 }).notNull().references(() => modules.id),
  action: varchar("action", { length: 50 }).notNull(), // view, create, edit, delete, approve, export, print
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// المسميات المرنة (Roles)
export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 50 }).primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(), // true للأدوار الافتراضية
  isActive: boolean("is_active").default(true).notNull(),
  receiveBeneficiaryNotifications: boolean("receiveBeneficiaryNotifications").default(false),
  receiveRequestNotifications: boolean("receiveRequestNotifications").default(false),
  receiveFinancialAndContractNotifications: boolean("receiveFinancialAndContractNotifications").default(false),
  receiveBeneficiaryEmail: boolean("receiveBeneficiaryEmail").default(false),
  receiveRequestEmail: boolean("receiveRequestEmail").default(false),
  receiveFinancialEmail: boolean("receiveFinancialEmail").default(false),
  receiveBeneficiaryWhatsapp: boolean("receiveBeneficiaryWhatsapp").default(false),
  receiveRequestWhatsapp: boolean("receiveRequestWhatsapp").default(false),
  receiveFinancialWhatsapp: boolean("receiveFinancialWhatsapp").default(false),
  receiveBeneficiarySms: boolean("receiveBeneficiarySms").default(false),
  receiveRequestSms: boolean("receiveRequestSms").default(false),
  receiveFinancialSms: boolean("receiveFinancialSms").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// صلاحيات المسميات (Role Permissions)
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").primaryKey().autoincrement(),
  roleId: varchar("role_id", { length: 50 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id", { length: 100 }).notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRolePermission: unique("unique_role_permission").on(table.roleId, table.permissionId),
}));

// ربط المستخدمين بالمسميات (User Roles)
export const userRoleAssignments = mysqlTable("user_roles", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
  roleId: varchar("role_id", { length: 50 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedBy: int("assigned_by").references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  expiresAt: datetime("expires_at"),
}, (table) => ({
  uniqueUserRole: unique("unique_user_role").on(table.userId, table.roleId),
}));

// الصلاحيات الفردية (User Permissions)
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
  permissionId: varchar("permission_id", { length: 100 }).notNull().references(() => permissions.id, { onDelete: "cascade" }),
  granted: boolean("granted").notNull(), // true = منح، false = سحب
  grantedBy: int("granted_by").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason"),
  expiresAt: datetime("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// سجل التدقيق للصلاحيات (Permissions Audit Log)
export const permissionsAuditLog = mysqlTable("permissions_audit_log", {
  id: int("id").primaryKey().autoincrement(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // grant_permission, revoke_permission, assign_role, remove_role
  targetUserId: int("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetRoleId: varchar("target_role_id", { length: 50 }).references(() => roles.id, { onDelete: "set null" }),
  permissionId: varchar("permission_id", { length: 100 }).references(() => permissions.id, { onDelete: "set null" }),
  performedBy: int("performed_by").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول الزيارات الميدانية
export const fieldVisits = mysqlTable("field_visits", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => mosqueRequests.id),
  // بيانات الجدولة
  scheduledDate: datetime("scheduledDate"),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  assignedTo: int("assignedTo").references(() => users.id, { onDelete: "set null" }),
  teamMembers: text("teamMembers"),
  scheduleNotes: text("scheduleNotes"),
  scheduledBy: int("scheduledBy").references(() => users.id, { onDelete: "set null" }),
  scheduledAt: datetime("scheduledAt"),
  // بيانات التنفيذ
  executionDate: datetime("executionDate"),
  executionTime: varchar("executionTime", { length: 10 }),
  attendees: text("attendees"),
  executionNotes: text("executionNotes"),
  executedBy: int("executedBy").references(() => users.id, { onDelete: "set null" }),
  executedAt: datetime("executedAt"),
  // بيانات التقرير
  reportSubmitted: boolean("reportSubmitted").default(false),
  reportSubmittedBy: int("reportSubmittedBy").references(() => users.id, { onDelete: "set null" }),
  reportSubmittedAt: datetime("reportSubmittedAt"),
  // الحالة العامة
  status: mysqlEnum("status", ["scheduled", "executed", "reported", "completed"]).default("scheduled"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FieldVisit = typeof fieldVisits.$inferSelect;
export type InsertFieldVisit = typeof fieldVisits.$inferInsert;

// تصدير الأنواع
export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = typeof userRoleAssignments.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type PermissionsAuditLog = typeof permissionsAuditLog.$inferSelect;
export type InsertPermissionsAuditLog = typeof permissionsAuditLog.$inferInsert;

// ==================== الأدوار الوظيفية المخصصة ====================
export const jobPositions = mysqlTable("job_positions", {
  id: int("id").primaryKey().autoincrement(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  nameEn: varchar("nameEn", { length: 100 }),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type JobPosition = typeof jobPositions.$inferSelect;
export type InsertJobPosition = typeof jobPositions.$inferInsert;

// ==================== إعدادات مشغلات الإشعارات التفصيلية ====================
export const notificationTriggerSettings = mysqlTable("notification_trigger_settings", {
  id: int("id").primaryKey().autoincrement(),
  triggerId: varchar("triggerId", { length: 100 }).notNull(),
  roleId: varchar("roleId", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(), // 'in_app' | 'email' | 'whatsapp' | 'sms'
  enabled: boolean("enabled").default(false).notNull(),
}, (table) => ({
  uniqueTriggerRoleChannel: unique("unique_trigger_role_channel").on(table.triggerId, table.roleId, table.channel),
}));

export type NotificationTriggerSetting = typeof notificationTriggerSettings.$inferSelect;
export type InsertNotificationTriggerSetting = typeof notificationTriggerSettings.$inferInsert;

