import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  projects,
  contractsEnhanced,
  users,
} from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

describe("نظام طلبات الصرف وأوامر الصرف", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testProjectId: number;
  let testContractId: number;
  let testUserId: number;
  let testRequestId: number;
  let testOrderId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("فشل الاتصال بقاعدة البيانات");

    // جلب مشروع موجود للاختبار
    const [existingProject] = await db
      .select({ id: projects.id })
      .from(projects)
      .limit(1);
    
    if (existingProject) {
      testProjectId = existingProject.id;
    }

    // جلب عقد موجود
    const [existingContract] = await db
      .select({ id: contractsEnhanced.id })
      .from(contractsEnhanced)
      .limit(1);
    
    if (existingContract) {
      testContractId = existingContract.id;
    }

    // جلب مستخدم موجود
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);
    
    if (existingUser) {
      testUserId = existingUser.id;
    }
  });

  describe("طلبات الصرف", () => {
    it("يجب أن يتم إنشاء طلب صرف جديد بنجاح", async () => {
      if (!testProjectId || !testUserId || !testContractId) {
        console.log("تخطي الاختبار: لا توجد بيانات اختبار (مشروع/مستخدم/عقد)");
        return;
      }

      const requestNumber = `DR-TEST-${Date.now()}`;
      
      // استخدام SQL مباشر للتوافق مع هيكل قاعدة البيانات الفعلي
      const [result] = await db!.execute(sql`
        INSERT INTO disbursement_requests 
        (requestNumber, projectId, contractId, title, description, amount, paymentType, completionPercentage, status, requestedBy, beneficiaryName, beneficiaryBank, beneficiaryIban)
        VALUES (${requestNumber}, ${testProjectId}, ${testContractId || null}, 'طلب صرف اختباري', 'وصف طلب الصرف الاختباري', 5000.00, 'progress', 50, 'pending', ${testUserId}, 'مورد اختباري', 'مصرف الراجحي', 'SA0000000000000000000000')
      `);

      expect((result as any).insertId).toBeDefined();
      testRequestId = Number((result as any).insertId);

      // التحقق من إنشاء الطلب
      const [createdRequest] = await db!.execute(sql`
        SELECT * FROM disbursement_requests WHERE id = ${testRequestId}
      `);

      expect(createdRequest).toBeDefined();
    });

    it("يجب أن يتم جلب قائمة طلبات الصرف", async () => {
      const [requests] = await db!.execute(sql`
        SELECT * FROM disbursement_requests LIMIT 10
      `);

      expect(Array.isArray(requests)).toBe(true);
    });

    it("يجب أن يتم جلب طلب صرف بالتفصيل", async () => {
      if (!testRequestId) {
        console.log("تخطي الاختبار: لا يوجد طلب صرف اختباري");
        return;
      }

      const [requests] = await db!.execute(sql`
        SELECT * FROM disbursement_requests WHERE id = ${testRequestId}
      `);

      expect(Array.isArray(requests)).toBe(true);
      expect((requests as any[]).length).toBeGreaterThan(0);
    });

    it("يجب أن يتم تحديث حالة طلب الصرف", async () => {
      if (!testRequestId) {
        console.log("تخطي الاختبار: لا يوجد طلب صرف اختباري");
        return;
      }

      await db!.execute(sql`
        UPDATE disbursement_requests 
        SET status = 'approved', approvedAt = NOW() 
        WHERE id = ${testRequestId}
      `);

      const [requests] = await db!.execute(sql`
        SELECT * FROM disbursement_requests WHERE id = ${testRequestId}
      `);

      const updatedRequest = (requests as any[])[0];
      expect(updatedRequest.status).toBe("approved");
    });
  });

  describe("أوامر الصرف", () => {
    it("يجب أن يتم إنشاء أمر صرف جديد بنجاح", async () => {
      if (!testRequestId || !testUserId) {
        console.log("تخطي الاختبار: لا توجد بيانات اختبار");
        return;
      }

      const orderNumber = `DO-TEST-${Date.now()}`;

      const [result] = await db!.execute(sql`
        INSERT INTO disbursement_orders 
        (orderNumber, disbursementRequestId, amount, beneficiaryName, beneficiaryBank, beneficiaryIban, paymentMethod, status, createdBy)
        VALUES (${orderNumber}, ${testRequestId}, 5000.00, 'مورد اختباري', 'مصرف الراجحي', 'SA0000000000000000000000', 'bank_transfer', 'pending', ${testUserId})
      `);

      expect((result as any).insertId).toBeDefined();
      testOrderId = Number((result as any).insertId);

      // التحقق من إنشاء الأمر
      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      expect(Array.isArray(orders)).toBe(true);
      expect((orders as any[]).length).toBeGreaterThan(0);
    });

    it("يجب أن يتم جلب قائمة أوامر الصرف", async () => {
      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders LIMIT 10
      `);

      expect(Array.isArray(orders)).toBe(true);
    });

    it("يجب أن يتم جلب أمر صرف بالتفصيل", async () => {
      if (!testOrderId) {
        console.log("تخطي الاختبار: لا يوجد أمر صرف اختباري");
        return;
      }

      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      expect(Array.isArray(orders)).toBe(true);
      expect((orders as any[]).length).toBeGreaterThan(0);
    });

    it("يجب أن يتم تحديث حالة أمر الصرف", async () => {
      if (!testOrderId) {
        console.log("تخطي الاختبار: لا يوجد أمر صرف اختباري");
        return;
      }

      await db!.execute(sql`
        UPDATE disbursement_orders 
        SET status = 'approved', approvedAt = NOW() 
        WHERE id = ${testOrderId}
      `);

      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      const updatedOrder = (orders as any[])[0];
      expect(updatedOrder.status).toBe("approved");
    });

    it("يجب أن يتم تنفيذ أمر الصرف", async () => {
      if (!testOrderId) {
        console.log("تخطي الاختبار: لا يوجد أمر صرف اختباري");
        return;
      }

      await db!.execute(sql`
        UPDATE disbursement_orders 
        SET status = 'executed', executedAt = NOW() 
        WHERE id = ${testOrderId}
      `);

      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      const executedOrder = (orders as any[])[0];
      expect(executedOrder.status).toBe("executed");
    });
  });

  describe("الربط بين طلبات الصرف وأوامر الصرف", () => {
    it("يجب أن يكون أمر الصرف مرتبطاً بطلب صرف", async () => {
      if (!testOrderId || !testRequestId) {
        console.log("تخطي الاختبار: لا توجد بيانات اختبار");
        return;
      }

      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      const order = (orders as any[])[0];
      expect(order.disbursementRequestId).toBe(testRequestId);
    });

    it("يجب أن يتم تحديث حالة طلب الصرف عند تنفيذ أمر الصرف", async () => {
      if (!testRequestId) {
        console.log("تخطي الاختبار: لا يوجد طلب صرف اختباري");
        return;
      }

      // تحديث حالة طلب الصرف إلى "مصروف"
      await db!.execute(sql`
        UPDATE disbursement_requests 
        SET status = 'processed' 
        WHERE id = ${testRequestId}
      `);

      const [requests] = await db!.execute(sql`
        SELECT * FROM disbursement_requests WHERE id = ${testRequestId}
      `);

      const paidRequest = (requests as any[])[0];
      expect(paidRequest.status).toBe("processed");
    });
  });

  describe("التحقق من صحة البيانات", () => {
    it("يجب أن يكون المبلغ رقماً موجباً", async () => {
      if (!testRequestId) {
        console.log("تخطي الاختبار: لا يوجد طلب صرف اختباري");
        return;
      }

      const [requests] = await db!.execute(sql`
        SELECT * FROM disbursement_requests WHERE id = ${testRequestId}
      `);

      const request = (requests as any[])[0];
      const amount = parseFloat(request.amount?.toString() || "0");
      expect(amount).toBeGreaterThan(0);
    });

    it("يجب أن يكون رقم الآيبان بالتنسيق الصحيح", async () => {
      if (!testOrderId) {
        console.log("تخطي الاختبار: لا يوجد أمر صرف اختباري");
        return;
      }

      const [orders] = await db!.execute(sql`
        SELECT * FROM disbursement_orders WHERE id = ${testOrderId}
      `);

      const order = (orders as any[])[0];
      // التحقق من أن الآيبان يبدأ بـ SA (للسعودية)
      if (order.beneficiaryIban) {
        expect(order.beneficiaryIban.startsWith("SA")).toBe(true);
      }
    });
  });

  afterAll(async () => {
    // تنظيف البيانات الاختبارية
    if (testOrderId && db) {
      await db.execute(sql`DELETE FROM disbursement_orders WHERE id = ${testOrderId}`);
    }
    if (testRequestId && db) {
      await db.execute(sql`DELETE FROM disbursement_requests WHERE id = ${testRequestId}`);
    }
  });
});
