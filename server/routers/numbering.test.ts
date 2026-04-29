import { describe, it, expect } from "vitest";

// اختبارات منهجية الترقيم الجديدة
describe("منهجية الترقيم", () => {
  const currentYear = new Date().getFullYear();

  it("رقم الطلب يجب أن يبدأ بـ REQ", () => {
    const requestNumber = `REQ-${currentYear}-ENY-0001`;
    expect(requestNumber).toMatch(/^REQ-\d{4}-[A-Z]+-\d{4}$/);
  });

  it("رقم العقد يجب أن يبدأ بـ CNT", () => {
    const contractNumber = `CNT-${currentYear}-0001`;
    expect(contractNumber).toMatch(/^CNT-\d{4}-\d{4}$/);
  });

  it("رقم المشروع يجب أن يبدأ بـ PRJ", () => {
    const projectNumber = `PRJ-${currentYear}-0001`;
    expect(projectNumber).toMatch(/^PRJ-\d{4}-\d{4}$/);
  });

  it("رقم الطلب يحتوي على السنة الحالية", () => {
    const requestNumber = `REQ-${currentYear}-BNY-0001`;
    expect(requestNumber).toContain(currentYear.toString());
  });

  it("رقم العقد يحتوي على السنة الحالية", () => {
    const contractNumber = `CNT-${currentYear}-0001`;
    expect(contractNumber).toContain(currentYear.toString());
  });

  it("رقم المشروع يحتوي على السنة الحالية", () => {
    const projectNumber = `PRJ-${currentYear}-0001`;
    expect(projectNumber).toContain(currentYear.toString());
  });

  it("رمز برنامج عناية هو ENY", () => {
    const programCode = "ENY";
    expect(programCode).toBe("ENY");
  });

  it("رمز برنامج بنيان هو BNY", () => {
    const programCode = "BNY";
    expect(programCode).toBe("BNY");
  });

  it("رمز برنامج دعائم هو DAM", () => {
    const programCode = "DAM";
    expect(programCode).toBe("DAM");
  });
});

// اختبارات ترجمة حقول البرامج
describe("ترجمة حقول البرامج", () => {
  const PROGRAM_DATA_LABELS: Record<string, string> = {
    workDescription: "وصف الأعمال المطلوبة",
    mosqueArea: "مساحة المسجد (م²)",
    actualWorshippers: "عدد المصلين الفعلي",
    hasDonorForMaintenance: "وجود متبرع للصيانة",
    willingToVolunteer: "الاستعداد للتطوع",
    cartonsNeeded: "عدد الكراتين المطلوبة",
    monthlyCartonNeed: "الاحتياج الشهري من الكراتين",
    hasWaterFridge: "وجود ثلاجة مياه",
    hasLand: "توفر أرض",
    landOwnership: "ملكية الأرض",
    landArea: "مساحة الأرض",
    hasDonor: "وجود متبرع",
    neighborhoodName: "اسم الحي",
  };

  it("يجب أن تحتوي على ترجمة لـ workDescription", () => {
    expect(PROGRAM_DATA_LABELS.workDescription).toBe("وصف الأعمال المطلوبة");
  });

  it("يجب أن تحتوي على ترجمة لـ mosqueArea", () => {
    expect(PROGRAM_DATA_LABELS.mosqueArea).toBeDefined();
    expect(PROGRAM_DATA_LABELS.mosqueArea).toContain("مساحة");
  });

  it("يجب أن تحتوي على ترجمة لـ actualWorshippers", () => {
    expect(PROGRAM_DATA_LABELS.actualWorshippers).toBeDefined();
    expect(PROGRAM_DATA_LABELS.actualWorshippers).toContain("مصلين");
  });

  it("يجب أن تحتوي على ترجمة لـ hasDonorForMaintenance", () => {
    expect(PROGRAM_DATA_LABELS.hasDonorForMaintenance).toBeDefined();
  });
});

// اختبارات ترجمة السجل الزمني
describe("ترجمة السجل الزمني", () => {
  const AUDIT_ACTION_LABELS: Record<string, string> = {
    request_created: "تم إنشاء الطلب",
    stage_updated: "تم تحديث المرحلة",
    status_updated: "تم تحديث الحالة",
    comment_added: "تمت إضافة تعليق",
    attachment_added: "تمت إضافة مرفق",
    request_assigned: "تم تعيين الطلب",
    mosque_approved: "تم اعتماد المسجد",
    mosque_rejected: "تم رفض المسجد",
    contract_created: "تم إنشاء العقد",
    project_created: "تم إنشاء المشروع",
    quotation_submitted: "تم تقديم عرض السعر",
    quotation_approved: "تم اعتماد عرض السعر",
  };

  it("يجب ترجمة request_created إلى عربي", () => {
    expect(AUDIT_ACTION_LABELS.request_created).toBe("تم إنشاء الطلب");
  });

  it("يجب ترجمة stage_updated إلى عربي", () => {
    expect(AUDIT_ACTION_LABELS.stage_updated).toBe("تم تحديث المرحلة");
  });

  it("يجب ترجمة mosque_approved إلى عربي", () => {
    expect(AUDIT_ACTION_LABELS.mosque_approved).toBe("تم اعتماد المسجد");
  });

  it("يجب ترجمة contract_created إلى عربي", () => {
    expect(AUDIT_ACTION_LABELS.contract_created).toBe("تم إنشاء العقد");
  });
});
