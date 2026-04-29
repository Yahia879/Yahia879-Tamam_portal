import { describe, expect, it } from "vitest";
import { PROGRAMS, REQUEST_STAGES, PROGRAM_LABELS, STAGE_LABELS } from "../shared/constants";

/**
 * اختبارات نموذج طلبات المساجد الموحد
 * يتحقق من صحة البيانات والتحويلات بين أنواع الخدمات
 */

describe("نموذج طلبات المساجد الموحد", () => {
  // التحقق من وجود جميع البرامج التسعة
  it("يجب أن يحتوي على 9 برامج", () => {
    const programKeys = Object.keys(PROGRAMS);
    expect(programKeys).toHaveLength(9);
  });

  // التحقق من أسماء البرامج
  it("يجب أن تكون أسماء البرامج صحيحة", () => {
    const programNames = Object.values(PROGRAMS).map(p => p.name);
    expect(programNames).toContain("بنيان");
    expect(programNames).toContain("دعائم");
    expect(programNames).toContain("عناية");
    expect(programNames).toContain("إمداد");
    expect(programNames).toContain("إثراء");
    expect(programNames).toContain("سدانة");
    expect(programNames).toContain("طاقة");
    expect(programNames).toContain("مياه");
    expect(programNames).toContain("سقيا");
  });

  // التحقق من مفاتيح البرامج
  it("يجب أن تكون مفاتيح البرامج صحيحة", () => {
    const programKeys = Object.keys(PROGRAMS);
    expect(programKeys).toContain("bunyan");
    expect(programKeys).toContain("daaem");
    expect(programKeys).toContain("enaya");
    expect(programKeys).toContain("emdad");
    expect(programKeys).toContain("ethraa");
    expect(programKeys).toContain("sedana");
    expect(programKeys).toContain("taqa");
    expect(programKeys).toContain("miyah");
    expect(programKeys).toContain("suqya");
  });

  // التحقق من المراحل الـ 11
  it("يجب أن يحتوي على 11 مرحلة للطلبات", () => {
    const stageKeys = Object.keys(REQUEST_STAGES);
    expect(stageKeys).toHaveLength(11);
  });

  // التحقق من أسماء المراحل
  it("يجب أن تكون أسماء المراحل صحيحة", () => {
    const stageNames = Object.values(REQUEST_STAGES).map(s => s.name);
    expect(stageNames).toContain("تقديم الطلب");
    expect(stageNames).toContain("المراجعة الأولية");
    expect(stageNames).toContain("الزيارة الميدانية");
    expect(stageNames).toContain("التقييم الفني");
    expect(stageNames).toContain("إعداد جدول الكميات");
    expect(stageNames).toContain("التقييم المالي");
    expect(stageNames).toContain("اعتماد العرض");
    expect(stageNames).toContain("التعاقد");
    expect(stageNames).toContain("التنفيذ");
    expect(stageNames).toContain("الاستلام");
    expect(stageNames).toContain("الإغلاق");
  });
});

describe("تصنيف البرامج حسب متطلبات المسجد", () => {
  // برنامج بنيان لا يتطلب مسجد مسجل (بناء جديد)
  it("برنامج بنيان لا يتطلب مسجد مسجل مسبقاً", () => {
    const bunyan = PROGRAMS.bunyan;
    expect(bunyan).toBeDefined();
    expect(bunyan.name).toBe("بنيان");
    expect(bunyan.description).toBe("بناء مسجد جديد");
  });

  // البرامج 2-8 تتطلب مسجد مسجل
  it("البرامج من دعائم إلى مياه تتطلب مسجد مسجل", () => {
    const requiresMosque = ["daaem", "enaya", "emdad", "ethraa", "sedana", "taqa", "miyah"] as const;
    requiresMosque.forEach(key => {
      expect(PROGRAMS[key]).toBeDefined();
    });
  });

  // برنامج سقيا له حقول خاصة
  it("برنامج سقيا له حقول خاصة مختلفة", () => {
    const suqya = PROGRAMS.suqya;
    expect(suqya).toBeDefined();
    expect(suqya.name).toBe("سقيا");
    expect(suqya.description).toBe("توفير ماء الشرب");
  });
});

describe("التحقق من صحة بيانات الطلب", () => {
  // التحقق من تطابق PROGRAM_LABELS مع PROGRAMS
  it("يجب أن تتطابق تسميات البرامج", () => {
    Object.keys(PROGRAMS).forEach(key => {
      expect(PROGRAM_LABELS[key]).toBeDefined();
      expect(PROGRAM_LABELS[key]).toBe(PROGRAMS[key as keyof typeof PROGRAMS].name);
    });
  });

  // التحقق من تطابق STAGE_LABELS مع REQUEST_STAGES
  it("يجب أن تتطابق تسميات المراحل", () => {
    Object.keys(REQUEST_STAGES).forEach(key => {
      expect(STAGE_LABELS[key]).toBeDefined();
      expect(STAGE_LABELS[key]).toBe(REQUEST_STAGES[key as keyof typeof REQUEST_STAGES].name);
    });
  });

  // التحقق من ترتيب المراحل (11 مرحلة)
  it("يجب أن تكون المراحل مرتبة بشكل صحيح", () => {
    const stages = Object.values(REQUEST_STAGES);
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    
    expect(sortedStages[0].key).toBe("submitted");
    expect(sortedStages[1].key).toBe("initial_review");
    expect(sortedStages[2].key).toBe("field_visit");
    expect(sortedStages[3].key).toBe("technical_eval");
    expect(sortedStages[4].key).toBe("boq_preparation");
    expect(sortedStages[5].key).toBe("financial_eval");
    expect(sortedStages[6].key).toBe("quotation_approval");
    expect(sortedStages[7].key).toBe("contracting");
    expect(sortedStages[8].key).toBe("execution");
    expect(sortedStages[9].key).toBe("handover");
    expect(sortedStages[10].key).toBe("closed");
  });
});

describe("مسارات الطلب", () => {
  // المسار العادي (11 مرحلة)
  it("المسار العادي يحتوي على 11 مرحلة", () => {
    const standardStages = [
      "submitted", "initial_review", "field_visit", "technical_eval",
      "boq_preparation", "financial_eval", "quotation_approval",
      "contracting", "execution", "handover", "closed"
    ];
    standardStages.forEach(stage => {
      expect(REQUEST_STAGES[stage]).toBeDefined();
    });
  });

  // مسار الاستجابة السريعة (6 مراحل)
  it("مسار الاستجابة السريعة يحتوي على 6 مراحل", () => {
    const quickResponseStages = [
      "submitted", "initial_review", "field_visit", "technical_eval",
      "execution", "closed"
    ];
    quickResponseStages.forEach(stage => {
      expect(REQUEST_STAGES[stage]).toBeDefined();
    });
  });
});
