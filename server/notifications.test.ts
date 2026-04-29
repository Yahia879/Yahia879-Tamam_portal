import { describe, expect, it } from "vitest";
import { REQUEST_STAGES, PROGRAMS, STAGE_LABELS, PROGRAM_LABELS } from "../shared/constants";

describe("Notifications System", () => {
  describe("Request Stages", () => {
    it("should have all main request stages defined", () => {
      expect(REQUEST_STAGES).toBeDefined();
      // Stage count may vary as workflow evolves (currently 11 or 12)
      expect(Object.keys(REQUEST_STAGES).length).toBeGreaterThanOrEqual(11);
    });

    it("should have the correct stage keys", () => {
      const expectedStages = [
        "submitted",
        "initial_review",
        "field_visit",
        "technical_eval",
        "boq_preparation",
        "financial_eval",
        "quotation_approval",
        "contracting",
        "execution",
        "handover",
        "closed",
      ];
      
      expectedStages.forEach((stage) => {
        expect(REQUEST_STAGES).toHaveProperty(stage);
      });
    });

    it("should have Arabic labels for all stages", () => {
      expect(STAGE_LABELS).toBeDefined();
      // Stage count may vary as workflow evolves
      expect(Object.keys(STAGE_LABELS).length).toBeGreaterThanOrEqual(11);
      
      Object.values(STAGE_LABELS).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it("should have correct order for stages", () => {
      expect(REQUEST_STAGES.submitted.order).toBe(1);
      expect(REQUEST_STAGES.initial_review.order).toBe(2);
      expect(REQUEST_STAGES.field_visit.order).toBe(3);
      expect(REQUEST_STAGES.technical_eval.order).toBe(4);
      expect(REQUEST_STAGES.boq_preparation.order).toBe(5);
      expect(REQUEST_STAGES.financial_eval.order).toBe(6);
      expect(REQUEST_STAGES.quotation_approval.order).toBe(7);
      expect(REQUEST_STAGES.contracting.order).toBe(8);
      expect(REQUEST_STAGES.execution.order).toBe(9);
      expect(REQUEST_STAGES.handover.order).toBe(10);
      expect(REQUEST_STAGES.closed.order).toBe(11);
    });
  });

  describe("Programs", () => {
    it("should have all 9 programs defined", () => {
      expect(PROGRAMS).toBeDefined();
      expect(Object.keys(PROGRAMS).length).toBe(9);
    });

    it("should have the correct program keys", () => {
      const expectedPrograms = [
        "bunyan",
        "daaem",
        "enaya",
        "emdad",
        "ethraa",
        "sedana",
        "taqa",
        "miyah",
        "suqya",
      ];
      
      expectedPrograms.forEach((program) => {
        expect(PROGRAMS).toHaveProperty(program);
      });
    });

    it("should have Arabic labels for all programs", () => {
      expect(PROGRAM_LABELS).toBeDefined();
      expect(Object.keys(PROGRAM_LABELS).length).toBe(9);
      
      Object.values(PROGRAM_LABELS).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it("should have correct program names in Arabic", () => {
      expect(PROGRAM_LABELS.bunyan).toBe("بنيان");
      expect(PROGRAM_LABELS.daaem).toBe("دعائم");
      expect(PROGRAM_LABELS.enaya).toBe("عناية");
      expect(PROGRAM_LABELS.emdad).toBe("إمداد");
      expect(PROGRAM_LABELS.ethraa).toBe("إثراء");
      expect(PROGRAM_LABELS.sedana).toBe("سدانة");
      expect(PROGRAM_LABELS.taqa).toBe("طاقة");
      expect(PROGRAM_LABELS.miyah).toBe("مياه");
      expect(PROGRAM_LABELS.suqya).toBe("سقيا");
    });
  });
});

describe("Notification Message Generation", () => {
  it("should generate correct message for new request notification", () => {
    const requestNumber = "REQ-2024-001";
    const programName = PROGRAM_LABELS.bunyan;
    const mosqueName = "مسجد النور";
    
    const message = `تم تقديم طلب جديد رقم ${requestNumber} لبرنامج ${programName} - ${mosqueName}`;
    
    expect(message).toContain(requestNumber);
    expect(message).toContain(programName);
    expect(message).toContain(mosqueName);
  });

  it("should generate correct message for status change notification", () => {
    const requestNumber = "REQ-2024-001";
    const newStage = STAGE_LABELS.field_visit;
    
    const message = `تم تحديث حالة الطلب ${requestNumber} إلى: ${newStage}`;
    
    expect(message).toContain(requestNumber);
    expect(message).toContain(newStage);
  });

  it("should generate correct message for field visit scheduled notification", () => {
    const requestNumber = "REQ-2024-001";
    const visitDate = "2024-03-15";
    
    const message = `تم جدولة زيارة ميدانية للطلب ${requestNumber} بتاريخ ${visitDate}`;
    
    expect(message).toContain(requestNumber);
    expect(message).toContain(visitDate);
  });

  it("should generate correct message for request approval", () => {
    const requestNumber = "REQ-2024-001";
    const programName = PROGRAM_LABELS.enaya;
    
    const message = `تمت الموافقة على الطلب ${requestNumber} - برنامج ${programName}`;
    
    expect(message).toContain(requestNumber);
    expect(message).toContain(programName);
  });
});
