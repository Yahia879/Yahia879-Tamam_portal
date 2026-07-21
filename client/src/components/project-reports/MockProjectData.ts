export interface ProjectOption {
  id: string;
  name: string;
  manager: string;
  department: string;
  currentPhase: string;
  plannedProgress?: number;
  actualProgress?: number;
  cumulativeBudget?: number;
  cumulativeSpent?: number;
}

export const MOCK_PROJECTS: ProjectOption[] = [
  {
    id: "proj-101",
    name: "مشروع إنشاء وتجهيز جامع الإيمان الذهبي",
    manager: "م. عبد الله الغامدي",
    department: "إدارة المشاريع الإنشائية والهندسية",
    currentPhase: "مرحلة التنفيذ الإنشائي والتشطيبات",
    plannedProgress: 75,
    actualProgress: 70,
    cumulativeBudget: 3500000,
    cumulativeSpent: 2450000,
  },
  {
    id: "proj-102",
    name: "مشروع صيانة وتأهيل أنظمة التكييف - مسجد الصفا",
    manager: "م. خالد العتيبي",
    department: "إدارة التشغيل والصيانة الفنية",
    currentPhase: "التوريد والتركيب والتشغيل التجريبي",
    plannedProgress: 90,
    actualProgress: 60, // Gap = 30 (Red)
    cumulativeBudget: 850000,
    cumulativeSpent: 620000,
  },
  {
    id: "proj-103",
    name: "مشروع تركيب منظومة الطاقة الشمسية الذكية - 5 مساجد",
    manager: "م. سارة الشهري",
    department: "إدارة الاستدامة والطاقة النظيفة",
    currentPhase: "إعداد الدراسات واختبارات الموقع",
    plannedProgress: 40,
    actualProgress: 38, // Gap = 2 (Green)
    cumulativeBudget: 1200000,
    cumulativeSpent: 410000,
  },
  {
    id: "proj-104",
    name: "مشروع سدنة السقاية والتأهيل المعماري لجامع الفتح",
    manager: "م. فهد الشمري",
    department: "إدارة الخدمات المساندة والعناية بالمساجد",
    currentPhase: "المراجعة النهائية والتسليم الابتدائي",
    plannedProgress: 100,
    actualProgress: 98, // Gap = 2 (Green)
    cumulativeBudget: 2100000,
    cumulativeSpent: 2050000,
  },
];

export const MOCK_DEPARTMENTS = [
  "إدارة المشاريع الإنشائية والهندسية",
  "إدارة التشغيل والصيانة الفنية",
  "إدارة الاستدامة والطاقة النظيفة",
  "إدارة الخدمات المساندة والعناية بالمساجد",
  "الإدارة العامة للتخطيط والتطوير",
  "إدارة الشؤون المالية والاستثمار",
  "إدارة الجودة والسلامة المهنية",
];

export const PROJECT_PHASES = [
  "الدراسة والتصميم والتخطيط",
  "إعداد جداول الكميات وترسية العقود",
  "مرحلة التنفيذ الإنشائي والتشطيبات",
  "التوريد والتركيب والتشغيل التجريبي",
  "المراجعة النهائية والتسليم الابتدائي",
  "التسليم النهائي والإغلاق",
];

export interface SemiMonthlyReportItem {
  id: string;
  projectId: string;
  title: string;
  period: string;
  actualProgress: number;
  plannedProgress: number;
  timeIndicator: string;
  costIndicator: string;
  milestones: { title: string; dueDate: string; status: string }[];
}

export interface MonthlyReportItem {
  id: string;
  projectId: string;
  title: string;
  monthYear: string;
  actualProgress: number;
  plannedProgress: number;
  timeIndicator: string;
  costIndicator: string;
  changeIndicator: string;
  cumulativeSpent: number;
  cumulativeBudget: number;
  milestones: { title: string; dueDate: string; status: string }[];
}

export const MOCK_SEMI_MONTHLY_REPORTS: SemiMonthlyReportItem[] = [
  {
    id: "sm-101-1",
    projectId: "proj-101",
    title: "تقرير النصف الأول - يوليو 2026",
    period: "1 - 15 يوليو 2026",
    actualProgress: 65,
    plannedProgress: 70,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "استلام دفعة مواد التشطيبات الإنشائية", dueDate: "2026-07-05", status: "منجز" },
      { title: "صّب الأعمدة الرئيسية للمصلى الخارجي", dueDate: "2026-07-12", status: "منجز" },
    ],
  },
  {
    id: "sm-101-2",
    projectId: "proj-101",
    title: "تقرير النصف الثاني - يوليو 2026",
    period: "16 - 31 يوليو 2026",
    actualProgress: 72,
    plannedProgress: 75,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "تركيب تمديدات الكهرباء للمنبر", dueDate: "2026-07-22", status: "جارٍ" },
      { title: "تبليط الفناء الخارجي", dueDate: "2026-07-28", status: "منجز" },
    ],
  },
  {
    id: "sm-101-3",
    projectId: "proj-101",
    title: "تقرير النصف الأول - يونيو 2026",
    period: "1 - 15 يونيو 2026",
    actualProgress: 58,
    plannedProgress: 60,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "حفر وتجهيز الأساسات السفلية", dueDate: "2026-06-10", status: "منجز" },
    ],
  },
  {
    id: "sm-101-4",
    projectId: "proj-101",
    title: "تقرير النصف الثاني - يونيو 2026",
    period: "16 - 30 يونيو 2026",
    actualProgress: 62,
    plannedProgress: 65,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "عزل القواعد والمباني الأرضية", dueDate: "2026-06-25", status: "منجز" },
    ],
  },
  {
    id: "sm-101-5",
    projectId: "proj-101",
    title: "تقرير النصف الأول - مايو 2026",
    period: "1 - 15 مايو 2026",
    actualProgress: 48,
    plannedProgress: 50,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "تجهيز الموقع والأسوار المؤقتة", dueDate: "2026-05-12", status: "منجز" },
    ],
  },
  {
    id: "sm-101-6",
    projectId: "proj-101",
    title: "تقرير النصف الثاني - مايو 2026",
    period: "16 - 31 مايو 2026",
    actualProgress: 53,
    plannedProgress: 55,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    milestones: [
      { title: "توصيل شبكات المياه المؤقتة", dueDate: "2026-05-28", status: "منجز" },
    ],
  },
  {
    id: "sm-102-1",
    projectId: "proj-102",
    title: "تقرير النصف الأول - يوليو 2026",
    period: "1 - 15 يوليو 2026",
    actualProgress: 55,
    plannedProgress: 85,
    timeIndicator: "أحمر",
    costIndicator: "أصفر",
    milestones: [
      { title: "توريد وحدات التكييف المركزية", dueDate: "2026-07-10", status: "متأخر" },
    ],
  },
  {
    id: "sm-102-2",
    projectId: "proj-102",
    title: "تقرير النصف الثاني - يوليو 2026",
    period: "16 - 31 يوليو 2026",
    actualProgress: 60,
    plannedProgress: 90,
    timeIndicator: "أحمر",
    costIndicator: "أخضر",
    milestones: [
      { title: "تركيب حاملات التكييف الخارجية", dueDate: "2026-07-25", status: "جارٍ" },
    ],
  },
];

export const MOCK_MONTHLY_REPORTS: MonthlyReportItem[] = [
  {
    id: "m-101-1",
    projectId: "proj-101",
    title: "التقرير الشهري - مايو 2026",
    monthYear: "2026-05",
    actualProgress: 53,
    plannedProgress: 55,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    changeIndicator: "أخضر",
    cumulativeBudget: 3500000,
    cumulativeSpent: 1800000,
    milestones: [
      { title: "تجهيز الموقع والأسوار المؤقتة", dueDate: "2026-05-12", status: "منجز" },
      { title: "توصيل شبكات المياه المؤقتة", dueDate: "2026-05-28", status: "منجز" },
    ],
  },
  {
    id: "m-101-2",
    projectId: "proj-101",
    title: "التقرير الشهري - يونيو 2026",
    monthYear: "2026-06",
    actualProgress: 62,
    plannedProgress: 65,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    changeIndicator: "أخضر",
    cumulativeBudget: 3500000,
    cumulativeSpent: 2100000,
    milestones: [
      { title: "حفر وتجهيز الأساسات السفلية", dueDate: "2026-06-10", status: "منجز" },
      { title: "عزل القواعد والمباني الأرضية", dueDate: "2026-06-25", status: "منجز" },
    ],
  },
  {
    id: "m-101-3",
    projectId: "proj-101",
    title: "التقرير الشهري - يوليو 2026",
    monthYear: "2026-07",
    actualProgress: 72,
    plannedProgress: 75,
    timeIndicator: "أخضر",
    costIndicator: "أخضر",
    changeIndicator: "أخضر",
    cumulativeBudget: 3500000,
    cumulativeSpent: 2450000,
    milestones: [
      { title: "استلام دفعة مواد التشطيبات الإنشائية", dueDate: "2026-07-05", status: "منجز" },
      { title: "صّب الأعمدة الرئيسية للمصلى الخارجي", dueDate: "2026-07-12", status: "منجز" },
      { title: "تبليط الفناء الخارجي", dueDate: "2026-07-28", status: "منجز" },
    ],
  },
  {
    id: "m-102-1",
    projectId: "proj-102",
    title: "التقرير الشهري - يونيو 2026",
    monthYear: "2026-06",
    actualProgress: 60,
    plannedProgress: 90,
    timeIndicator: "أحمر",
    costIndicator: "أصفر",
    changeIndicator: "أخضر",
    cumulativeBudget: 850000,
    cumulativeSpent: 620000,
    milestones: [
      { title: "توريد وحدات التكييف المركزية", dueDate: "2026-07-10", status: "متأخر" },
    ],
  },
];
