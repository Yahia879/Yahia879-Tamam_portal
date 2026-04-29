import { describe, it, expect, vi, beforeEach } from "vitest";
import { STAGE_TRANSITION_PERMISSIONS, STATUS_CHANGE_PERMISSIONS, canTransitionStage, canChangeStatus, getNextStage } from "@shared/constants";

describe("Stage Permissions", () => {
  describe("STAGE_TRANSITION_PERMISSIONS", () => {
    it("يجب أن تحتوي على جميع المراحل الـ 11", () => {
      const stages = [
        "submitted", "initial_review", "field_visit", "technical_eval",
        "boq_preparation", "financial_eval", "quotation_approval",
        "contracting", "execution", "handover", "closed"
      ];
      stages.forEach(stage => {
        expect(STAGE_TRANSITION_PERMISSIONS).toHaveProperty(stage);
      });
    });

    it("يجب أن يسمح للمدير العام بتحويل جميع المراحل ما عدا closed", () => {
      const stages = [
        "submitted", "initial_review", "field_visit", "technical_eval",
        "boq_preparation", "financial_eval", "quotation_approval",
        "contracting", "execution", "handover"
      ];
      stages.forEach(stage => {
        expect(STAGE_TRANSITION_PERMISSIONS[stage]).toContain("super_admin");
      });
    });

    it("يجب أن يسمح لمدير النظام بتحويل جميع المراحل ما عدا closed", () => {
      const stages = [
        "submitted", "initial_review", "field_visit", "technical_eval",
        "boq_preparation", "financial_eval", "quotation_approval",
        "contracting", "execution", "handover"
      ];
      stages.forEach(stage => {
        expect(STAGE_TRANSITION_PERMISSIONS[stage]).toContain("system_admin");
      });
    });

    it("يجب أن يسمح للفريق الميداني بتحويل مرحلة الزيارة الميدانية فقط", () => {
      expect(STAGE_TRANSITION_PERMISSIONS.field_visit).toContain("field_team");
      expect(STAGE_TRANSITION_PERMISSIONS.submitted).not.toContain("field_team");
      expect(STAGE_TRANSITION_PERMISSIONS.initial_review).not.toContain("field_team");
      expect(STAGE_TRANSITION_PERMISSIONS.technical_eval).not.toContain("field_team");
    });

    it("يجب أن يسمح للإدارة المالية بتحويل مراحل التقييم المالي واعتماد العرض", () => {
      expect(STAGE_TRANSITION_PERMISSIONS.financial_eval).toContain("financial");
      expect(STAGE_TRANSITION_PERMISSIONS.quotation_approval).toContain("financial");
      expect(STAGE_TRANSITION_PERMISSIONS.submitted).not.toContain("financial");
      expect(STAGE_TRANSITION_PERMISSIONS.field_visit).not.toContain("financial");
    });

    it("يجب أن تكون مرحلة الإغلاق فارغة (لا يمكن التحويل منها)", () => {
      expect(STAGE_TRANSITION_PERMISSIONS.closed).toEqual([]);
    });
  });

  describe("STATUS_CHANGE_PERMISSIONS", () => {
    it("يجب أن تحتوي على صلاحيات الاعتماد والرفض والتعليق", () => {
      expect(STATUS_CHANGE_PERMISSIONS).toHaveProperty("approve");
      expect(STATUS_CHANGE_PERMISSIONS).toHaveProperty("reject");
      expect(STATUS_CHANGE_PERMISSIONS).toHaveProperty("suspend");
    });

    it("يجب أن يسمح للمدير العام بجميع عمليات تغيير الحالة", () => {
      expect(STATUS_CHANGE_PERMISSIONS.approve).toContain("super_admin");
      expect(STATUS_CHANGE_PERMISSIONS.reject).toContain("super_admin");
      expect(STATUS_CHANGE_PERMISSIONS.suspend).toContain("super_admin");
    });

    it("يجب أن يسمح لمكتب المشاريع بالاعتماد والرفض", () => {
      expect(STATUS_CHANGE_PERMISSIONS.approve).toContain("projects_office");
      expect(STATUS_CHANGE_PERMISSIONS.reject).toContain("projects_office");
    });
  });

  describe("canTransitionStage", () => {
    it("يجب أن يرجع true للمدير العام في أي مرحلة ما عدا closed", () => {
      expect(canTransitionStage("super_admin", "submitted")).toBe(true);
      expect(canTransitionStage("super_admin", "initial_review")).toBe(true);
      expect(canTransitionStage("super_admin", "field_visit")).toBe(true);
      expect(canTransitionStage("super_admin", "technical_eval")).toBe(true);
      expect(canTransitionStage("super_admin", "boq_preparation")).toBe(true);
      expect(canTransitionStage("super_admin", "financial_eval")).toBe(true);
      expect(canTransitionStage("super_admin", "quotation_approval")).toBe(true);
      expect(canTransitionStage("super_admin", "contracting")).toBe(true);
      expect(canTransitionStage("super_admin", "execution")).toBe(true);
      expect(canTransitionStage("super_admin", "handover")).toBe(true);
      expect(canTransitionStage("super_admin", "closed")).toBe(false);
    });

    it("يجب أن يرجع true للفريق الميداني فقط في مرحلة الزيارة الميدانية", () => {
      expect(canTransitionStage("field_team", "field_visit")).toBe(true);
      expect(canTransitionStage("field_team", "submitted")).toBe(false);
      expect(canTransitionStage("field_team", "initial_review")).toBe(false);
    });

    it("يجب أن يرجع true للإدارة المالية في مراحل التقييم المالي واعتماد العرض", () => {
      expect(canTransitionStage("financial", "financial_eval")).toBe(true);
      expect(canTransitionStage("financial", "quotation_approval")).toBe(true);
      expect(canTransitionStage("financial", "submitted")).toBe(false);
      expect(canTransitionStage("financial", "execution")).toBe(false);
    });

    it("يجب أن يرجع false لطالب الخدمة في جميع المراحل", () => {
      const stages = [
        "submitted", "initial_review", "field_visit", "technical_eval",
        "boq_preparation", "financial_eval", "quotation_approval",
        "contracting", "execution", "handover", "closed"
      ];
      stages.forEach(stage => {
        expect(canTransitionStage("service_requester", stage)).toBe(false);
      });
    });
  });

  describe("canChangeStatus", () => {
    it("يجب أن يرجع true للمدير العام لجميع العمليات", () => {
      expect(canChangeStatus("super_admin", "approve")).toBe(true);
      expect(canChangeStatus("super_admin", "reject")).toBe(true);
      expect(canChangeStatus("super_admin", "suspend")).toBe(true);
    });

    it("يجب أن يرجع false لطالب الخدمة لجميع العمليات", () => {
      expect(canChangeStatus("service_requester", "approve")).toBe(false);
      expect(canChangeStatus("service_requester", "reject")).toBe(false);
      expect(canChangeStatus("service_requester", "suspend")).toBe(false);
    });
  });

  describe("getNextStage", () => {
    it("يجب أن يرجع المرحلة التالية الصحيحة للمسار العادي", () => {
      expect(getNextStage("submitted")).toBe("initial_review");
      expect(getNextStage("initial_review")).toBe("field_visit");
      expect(getNextStage("field_visit")).toBe("technical_eval");
      expect(getNextStage("technical_eval")).toBe("boq_preparation");
      expect(getNextStage("boq_preparation")).toBe("financial_eval");
      expect(getNextStage("financial_eval")).toBe("quotation_approval");
      expect(getNextStage("quotation_approval")).toBe("contracting");
      expect(getNextStage("contracting")).toBe("execution");
      expect(getNextStage("execution")).toBe("handover");
      expect(getNextStage("handover")).toBe("closed");
    });

    it("يجب أن يرجع null لمرحلة الإغلاق", () => {
      expect(getNextStage("closed")).toBe(null);
    });

    it("يجب أن يرجع null لمرحلة غير موجودة", () => {
      expect(getNextStage("invalid_stage")).toBe(null);
    });
  });
});
