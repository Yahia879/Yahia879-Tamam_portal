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
