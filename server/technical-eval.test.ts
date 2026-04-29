import { describe, it, expect } from "vitest";
import { TECHNICAL_EVAL_OPTIONS, TECHNICAL_EVAL_OPTION_LABELS } from "@shared/constants";

describe("التقييم الفني - الخيارات الأربعة", () => {
  describe("الثوابت", () => {
    it("يجب أن تحتوي على 4 خيارات", () => {
      const options = Object.keys(TECHNICAL_EVAL_OPTIONS);
      expect(options).toHaveLength(4);
      expect(options).toContain("apologize");
      expect(options).toContain("suspend");
      expect(options).toContain("quick_response");
      expect(options).toContain("convert_to_project");
    });

    it("يجب أن يكون لكل خيار اسم ووصف", () => {
      Object.values(TECHNICAL_EVAL_OPTIONS).forEach((option) => {
        expect(option.name).toBeDefined();
        expect(option.description).toBeDefined();
        expect(option.key).toBeDefined();
      });
    });

    it("يجب أن تكون الأسماء العربية موجودة", () => {
      expect(TECHNICAL_EVAL_OPTION_LABELS.apologize).toBe("الاعتذار عن الطلب");
      expect(TECHNICAL_EVAL_OPTION_LABELS.suspend).toBe("تعليق الطلب");
      expect(TECHNICAL_EVAL_OPTION_LABELS.quick_response).toBe("التحويل إلى الاستجابة السريعة");
      expect(TECHNICAL_EVAL_OPTION_LABELS.convert_to_project).toBe("التحويل إلى مشروع");
    });
  });

  describe("خيار الاعتذار عن الطلب", () => {
    const option = TECHNICAL_EVAL_OPTIONS.apologize;

    it("يجب أن يتطلب مبررات", () => {
      expect(option.requiresJustification).toBe(true);
    });

    it("يجب أن ينتقل للإغلاق", () => {
      expect(option.nextStage).toBe("closed");
    });

    it("يجب أن تكون الحالة النهائية rejected", () => {
      expect(option.resultStatus).toBe("rejected");
    });

    it("يجب أن يكون متاحاً لمكتب المشاريع والمدراء", () => {
      expect(option.allowedRoles).toContain("projects_office");
      expect(option.allowedRoles).toContain("super_admin");
      expect(option.allowedRoles).toContain("system_admin");
    });
  });

  describe("خيار تعليق الطلب", () => {
    const option = TECHNICAL_EVAL_OPTIONS.suspend;

    it("يجب أن يتطلب مبررات", () => {
      expect(option.requiresJustification).toBe(true);
    });

    it("يجب أن يبقى في نفس المرحلة", () => {
      expect(option.nextStage).toBeNull();
    });

    it("يجب أن تكون الحالة النهائية suspended", () => {
      expect(option.resultStatus).toBe("suspended");
    });
  });

  describe("خيار التحويل للاستجابة السريعة", () => {
    const option = TECHNICAL_EVAL_OPTIONS.quick_response;

    it("لا يتطلب مبررات", () => {
      expect(option.requiresJustification).toBe(false);
    });

    it("يجب أن ينتقل للتنفيذ مباشرة", () => {
      expect(option.nextStage).toBe("execution");
    });

    it("يجب أن تكون الحالة النهائية in_progress", () => {
      expect(option.resultStatus).toBe("in_progress");
    });

    it("يجب أن يسند لفريق الاستجابة السريعة", () => {
      expect(option.assignTo).toBe("quick_response");
    });
  });

  describe("خيار التحويل إلى مشروع", () => {
    const option = TECHNICAL_EVAL_OPTIONS.convert_to_project;

    it("لا يتطلب مبررات", () => {
      expect(option.requiresJustification).toBe(false);
    });

    it("يجب أن ينتقل لإعداد جدول الكميات", () => {
      expect(option.nextStage).toBe("boq_preparation");
    });

    it("يجب أن تكون الحالة النهائية in_progress", () => {
      expect(option.resultStatus).toBe("in_progress");
    });

    it("يجب أن ينشئ مشروع", () => {
      expect(option.createsProject).toBe(true);
    });
  });

  describe("الصلاحيات", () => {
    it("جميع الخيارات متاحة للمدير العام", () => {
      Object.values(TECHNICAL_EVAL_OPTIONS).forEach((option) => {
        expect(option.allowedRoles).toContain("super_admin");
      });
    });

    it("جميع الخيارات متاحة لمدير النظام", () => {
      Object.values(TECHNICAL_EVAL_OPTIONS).forEach((option) => {
        expect(option.allowedRoles).toContain("system_admin");
      });
    });

    it("جميع الخيارات متاحة لمكتب المشاريع", () => {
      Object.values(TECHNICAL_EVAL_OPTIONS).forEach((option) => {
        expect(option.allowedRoles).toContain("projects_office");
      });
    });
  });
});
