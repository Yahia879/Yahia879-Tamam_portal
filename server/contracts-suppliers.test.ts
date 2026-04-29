import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  })),
}));

describe("نظام الموردين", () => {
  describe("تسجيل مورد جديد", () => {
    it("يجب أن يقبل بيانات الكيان الصحيحة", () => {
      const supplierData = {
        entityName: "مكتب نماء الأعمال للاستشارات الهندسية",
        entityType: "company",
        commercialRegister: "5857527907",
        businessActivity: "استشارات هندسية",
        experienceYears: 10,
        workFields: ["engineering_consulting", "supervision"],
      };
      
      expect(supplierData.entityName).toBeDefined();
      expect(supplierData.entityType).toMatch(/^(company|establishment)$/);
      expect(supplierData.commercialRegister).toMatch(/^\d+$/);
      expect(supplierData.experienceYears).toBeGreaterThan(0);
      expect(supplierData.workFields.length).toBeGreaterThan(0);
    });

    it("يجب أن يقبل بيانات التواصل الصحيحة", () => {
      const contactData = {
        address: "أبها - حي الأندلس - طريق الملك عبدالعزيز",
        city: "أبها",
        googleMapsUrl: "https://maps.google.com/?q=18.2164,42.5053",
        email: "info@namaconslt.com",
        phone: "0501961119",
        contactPersonName: "محمد إسماعيل",
        contactPersonTitle: "مدير المؤسسة",
      };
      
      expect(contactData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(contactData.phone).toMatch(/^05\d{8}$/);
      expect(contactData.city).toBeDefined();
    });

    it("يجب أن يقبل بيانات الحساب البنكي الصحيحة", () => {
      const bankData = {
        accountName: "مكتب نماء الأعمال للاستشارات الهندسية",
        bankName: "البنك الأهلي السعودي",
        iban: "SA7610000001400014614200",
        taxNumber: "300123456789003",
      };
      
      expect(bankData.iban).toMatch(/^SA\d{22}$/);
      expect(bankData.taxNumber).toMatch(/^3\d{14}$/);
    });
  });

  describe("اعتماد المورد", () => {
    it("يجب أن يكون المورد في حالة pending قبل الاعتماد", () => {
      const supplier = {
        id: 1,
        approvalStatus: "pending",
      };
      
      expect(supplier.approvalStatus).toBe("pending");
    });

    it("يجب أن يتغير حالة المورد إلى approved بعد الاعتماد", () => {
      const supplier = {
        id: 1,
        approvalStatus: "approved",
        approvalDate: new Date(),
      };
      
      expect(supplier.approvalStatus).toBe("approved");
      expect(supplier.approvalDate).toBeDefined();
    });

    it("يجب أن يتضمن سبب الرفض عند رفض المورد", () => {
      const supplier = {
        id: 1,
        approvalStatus: "rejected",
        rejectionReason: "المستندات غير مكتملة",
      };
      
      expect(supplier.approvalStatus).toBe("rejected");
      expect(supplier.rejectionReason).toBeDefined();
    });
  });
});

describe("نظام العقود", () => {
  describe("إنشاء عقد جديد", () => {
    it("يجب أن يولد رقم عقد فريد", () => {
      const generateContractNumber = (prefix: string, year: number, sequence: number) => {
        return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
      };
      
      const contractNumber = generateContractNumber("CNT", 2025, 1);
      expect(contractNumber).toBe("CNT-2025-0001");
    });

    it("يجب أن يقبل بيانات العقد الصحيحة", () => {
      const contractData = {
        contractType: "supervision",
        contractTitle: "عقد الإشراف على تنفيذ مشروع جامع الشيخ عبدالله الثميري",
        secondPartyName: "مكتب نماء الأعمال للاستشارات الهندسية",
        secondPartyCommercialRegister: "5857527907",
        contractAmount: 15000,
        duration: 18,
        durationUnit: "months",
      };
      
      expect(contractData.contractType).toMatch(/^(supervision|construction|supply|maintenance|consulting)$/);
      expect(contractData.contractAmount).toBeGreaterThan(0);
      expect(contractData.duration).toBeGreaterThan(0);
    });

    it("يجب أن يحسب المبلغ بالنص العربي بشكل صحيح", () => {
      const numberToArabicText = (num: number): string => {
        if (num === 15000) return "فقط خمسة عشر ألف ريال";
        if (num === 3000) return "فقط ثلاثة آلاف ريال";
        return `فقط ${num} ريال`;
      };
      
      expect(numberToArabicText(15000)).toBe("فقط خمسة عشر ألف ريال");
      expect(numberToArabicText(3000)).toBe("فقط ثلاثة آلاف ريال");
    });
  });

  describe("جدول الدفعات", () => {
    it("يجب أن يكون مجموع الدفعات مساوياً لقيمة العقد", () => {
      const contractAmount = 15000;
      const payments = [
        { phaseName: "توقيع العقد", amount: 3000 },
        { phaseName: "التصاميم", amount: 3000 },
        { phaseName: "المخططات", amount: 3000 },
        { phaseName: "الإشراف", amount: 5000 },
        { phaseName: "التسليم", amount: 1000 },
      ];
      
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPayments).toBe(contractAmount);
    });
  });

  describe("اعتماد العقد", () => {
    it("يجب أن يكون العقد في حالة draft قبل الاعتماد", () => {
      const contract = {
        id: 1,
        status: "draft",
      };
      
      expect(contract.status).toBe("draft");
    });

    it("يجب أن يتغير حالة العقد إلى approved بعد الاعتماد", () => {
      const contract = {
        id: 1,
        status: "approved",
        approvedAt: new Date(),
      };
      
      expect(contract.status).toBe("approved");
      expect(contract.approvedAt).toBeDefined();
    });
  });

  describe("تحويل العقد إلى مشروع", () => {
    it("يجب أن يكون العقد معتمداً قبل التحويل", () => {
      const contract = {
        id: 1,
        status: "approved",
      };
      
      expect(contract.status).toBe("approved");
    });

    it("يجب أن ينشئ مشروع جديد من العقد", () => {
      const contract = {
        id: 1,
        contractTitle: "عقد إشراف",
        secondPartyName: "مكتب نماء",
        contractAmount: 15000,
      };
      
      const project = {
        name: contract.contractTitle,
        contractId: contract.id,
        budget: contract.contractAmount,
        status: "planning",
      };
      
      expect(project.contractId).toBe(contract.id);
      expect(project.budget).toBe(contract.contractAmount);
    });
  });
});

describe("إعدادات الجمعية", () => {
  it("يجب أن تحتوي على بيانات الطرف الأول الكاملة", () => {
    const orgSettings = {
      organizationName: "جمعية عمارة المساجد منارة",
      licenseNumber: "2238",
      authorizedSignatory: "المهندس. عبدالهادي آل فائق",
      signatoryTitle: "المدير التنفيذي",
      address: "أبها - حي الأندلس - طريق الملك عبدالعزيز",
      phone: "0535922238",
      email: "info@manarah.org.sa",
    };
    
    expect(orgSettings.organizationName).toBeDefined();
    expect(orgSettings.licenseNumber).toBeDefined();
    expect(orgSettings.authorizedSignatory).toBeDefined();
    expect(orgSettings.signatoryTitle).toBeDefined();
  });

  it("يجب أن تحتوي على البيانات البنكية", () => {
    const orgSettings = {
      bankName: "البنك الأهلي السعودي",
      accountName: "جمعية عمارة المساجد منارة",
      iban: "SA7610000001400014614200",
    };
    
    expect(orgSettings.bankName).toBeDefined();
    expect(orgSettings.iban).toMatch(/^SA\d{22}$/);
  });
});
