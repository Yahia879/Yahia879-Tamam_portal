import { Router } from "express";
import PDFDocument from "pdfkit";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import {
  mosqueRequests,
  mosques,
  users,
  requestHistory,
  quantitySchedules,
  contractsEnhanced,
  finalReports,
  programs,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const router = Router();

// تسميات المراحل
const STAGE_LABELS: Record<string, string> = {
  submitted: "تقديم الطلب",
  initial_review: "المراجعة الأولية",
  field_visit: "الزيارة الميدانية",
  technical_eval: "التقييم الفني",
  boq_preparation: "إعداد جدول الكميات",
  financial_eval_and_approval: "التقييم المالي واعتماد العرض",
  contracting: "التعاقد",
  execution: "التنفيذ",
  handover: "الاستلام",
  closed: "الإغلاق",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  on_hold: "معلق",
};

const PROGRAM_LABELS: Record<string, string> = {
  bunyan: "بنيان",
  daaem: "دعائم",
  enaya: "عناية",
  emdad: "إمداد",
  ethraa: "إثراء",
  sedana: "سدانة",
  taqa: "طاقة",
  miyah: "مياه",
  suqya: "سقيا",
};

// مسار خط Cairo
const ARABIC_FONT_PATH = path.join(process.cwd(), "server", "fonts", "Cairo.ttf");
const ARABIC_FONT_BOLD_PATH = path.join(process.cwd(), "server", "fonts", "Cairo.ttf");

// دالة مساعدة لعكس النص العربي (RTL)
function rtl(text: string): string {
  if (!text) return "";
  // نعيد النص كما هو - PDFKit يدعم RTL بشكل محدود
  return text;
}

router.get("/request/:requestId/pdf", async (req, res) => {
  try {
    // التحقق من المصادقة
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const requestId = parseInt(req.params.requestId);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "معرف الطلب غير صحيح" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "قاعدة البيانات غير متاحة" });
    }

    // جلب بيانات الطلب
    const [request] = await db
      .select({
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        programType: mosqueRequests.programType,
        currentStage: mosqueRequests.currentStage,
        status: mosqueRequests.status,
        reviewNotes: mosqueRequests.reviewNotes,
        createdAt: mosqueRequests.createdAt,
        updatedAt: mosqueRequests.updatedAt,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
        mosqueDistrict: mosques.district,
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(mosqueRequests)
      .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
      .leftJoin(users, eq(mosqueRequests.userId, users.id))
      .where(eq(mosqueRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من الصلاحيات: المستفيد يرى طلباته فقط
    if (user.role === "service_requester") {
      const [myRequest] = await db
        .select({ userId: mosqueRequests.userId })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (!myRequest || myRequest.userId !== user.id) {
        return res.status(403).json({ error: "ليس لديك صلاحية لعرض هذا الطلب" });
      }
    }

    // جلب تاريخ الطلب
    const history = await db
      .select({
        fromStage: requestHistory.fromStage,
        toStage: requestHistory.toStage,
        action: requestHistory.action,
        notes: requestHistory.notes,
        createdAt: requestHistory.createdAt,
        userName: users.name,
      })
      .from(requestHistory)
      .leftJoin(users, eq(requestHistory.userId, users.id))
      .where(eq(requestHistory.requestId, requestId))
      .orderBy(desc(requestHistory.createdAt))
      .limit(20);

    // جلب جدول الكميات
    const boqItems = await db
      .select()
      .from(quantitySchedules)
      .where(eq(quantitySchedules.requestId, requestId))
      .limit(50);

    // جلب العقود
    const contracts = await db
      .select({
        contractNumber: contractsEnhanced.contractNumber,
        status: contractsEnhanced.status,
        contractAmount: contractsEnhanced.contractAmount,
        createdAt: contractsEnhanced.createdAt,
      })
      .from(contractsEnhanced)
      .where(eq(contractsEnhanced.requestId, requestId))
      .limit(5);

    // إنشاء PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `تقرير الطلب ${request.requestNumber}`,
        Author: "منارة",
        Subject: "تقرير طلب خدمة",
      },
    });

    // إعداد الاستجابة
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="request-${request.requestNumber}.pdf"`
    );
    doc.pipe(res);

    // تحميل خط Cairo
    const hasArabicFont = fs.existsSync(ARABIC_FONT_PATH);

    if (hasArabicFont) {
      doc.registerFont("Arabic", ARABIC_FONT_PATH);
      doc.registerFont("ArabicBold", ARABIC_FONT_PATH);
    }

    const regularFont = hasArabicFont ? "Arabic" : "Helvetica";
    const boldFont = hasArabicFont ? "ArabicBold" : "Helvetica-Bold";

    // ===== رأس الصفحة =====
    doc.rect(0, 0, doc.page.width, 80).fill("#1a5276");

    doc.fillColor("white").font(boldFont).fontSize(20);
    doc.text("منارة - بوابة العناية بالمساجد", 50, 20, {
      align: "right",
      width: doc.page.width - 100,
    });

    doc.font(regularFont).fontSize(12);
    doc.text("تقرير الطلب الكامل", 50, 48, {
      align: "right",
      width: doc.page.width - 100,
    });

    doc.moveDown(3);

    // ===== معلومات الطلب الأساسية =====
    doc.fillColor("#1a5276").font(boldFont).fontSize(14);
    doc.text("المعلومات الأساسية", 50, 100, {
      align: "right",
      width: doc.page.width - 100,
    });

    doc.moveTo(50, 118).lineTo(doc.page.width - 50, 118).stroke("#1a5276");

    const infoY = 125;
    doc.fillColor("#333").font(regularFont).fontSize(11);

    const infoData = [
      ["رقم الطلب", request.requestNumber || "-"],
      ["البرنامج", PROGRAM_LABELS[request.programType] || request.programType],
      ["المرحلة الحالية", STAGE_LABELS[request.currentStage] || request.currentStage],
      ["الحالة", STATUS_LABELS[request.status] || request.status],
      ["اسم المسجد", request.mosqueName || "-"],
      ["المدينة", request.mosqueCity || "-"],
      ["الحي", request.mosqueDistrict || "-"],
      ["مقدم الطلب", request.requesterName || "-"],
      ["تاريخ التقديم", request.createdAt ? new Date(request.createdAt).toLocaleDateString("ar-SA") : "-"],
      ["آخر تحديث", request.updatedAt ? new Date(request.updatedAt).toLocaleDateString("ar-SA") : "-"],
    ];

    let currentY = infoY;
    infoData.forEach(([label, value], index) => {
      const bgColor = index % 2 === 0 ? "#f8f9fa" : "#ffffff";
      doc.rect(50, currentY - 3, doc.page.width - 100, 20).fill(bgColor);

      doc.fillColor("#666").font(boldFont).fontSize(10);
      doc.text(label + ":", doc.page.width - 200, currentY, {
        align: "right",
        width: 140,
      });

      doc.fillColor("#333").font(regularFont).fontSize(10);
      doc.text(value, 50, currentY, {
        align: "left",
        width: doc.page.width - 260,
      });

      currentY += 22;
    });

    // ملاحظات المراجعة
    if (request.reviewNotes) {
      currentY += 10;
      doc.fillColor("#1a5276").font(boldFont).fontSize(12);
      doc.text("ملاحظات المراجعة:", 50, currentY, { align: "right", width: doc.page.width - 100 });
      currentY += 20;
      doc.fillColor("#333").font(regularFont).fontSize(10);
      doc.text(request.reviewNotes, 50, currentY, {
        align: "right",
        width: doc.page.width - 100,
      });
      currentY = doc.y + 10;
    }

    // ===== مراحل التقدم =====
    doc.addPage();
    doc.fillColor("#1a5276").font(boldFont).fontSize(14);
    doc.text("مراحل التقدم", 50, 50, {
      align: "right",
      width: doc.page.width - 100,
    });
    doc.moveTo(50, 68).lineTo(doc.page.width - 50, 68).stroke("#1a5276");

    const stages = Object.entries(STAGE_LABELS);
    const completedStageIndex = stages.findIndex(([key]) => key === request.currentStage);

    let stageY = 80;
    stages.forEach(([stageKey, stageName], index) => {
      const isCompleted = index < completedStageIndex;
      const isCurrent = index === completedStageIndex;

      const circleColor = isCompleted ? "#27ae60" : isCurrent ? "#1a5276" : "#bdc3c7";
      const textColor = isCompleted ? "#27ae60" : isCurrent ? "#1a5276" : "#999";

      doc.circle(doc.page.width - 65, stageY + 7, 7).fill(circleColor);

      if (isCompleted) {
        doc.fillColor("white").font(boldFont).fontSize(8);
        doc.text("✓", doc.page.width - 70, stageY + 2, { width: 14, align: "center" });
      } else if (isCurrent) {
        doc.fillColor("white").font(boldFont).fontSize(8);
        doc.text("●", doc.page.width - 70, stageY + 2, { width: 14, align: "center" });
      }

      doc.fillColor(textColor).font(isCurrent ? boldFont : regularFont).fontSize(11);
      doc.text(stageName, 50, stageY, {
        align: "right",
        width: doc.page.width - 100,
      });

      stageY += 28;
    });

    // ===== جدول الكميات =====
    if (boqItems.length > 0) {
      doc.addPage();
      doc.fillColor("#1a5276").font(boldFont).fontSize(14);
      doc.text("جدول الكميات", 50, 50, {
        align: "right",
        width: doc.page.width - 100,
      });
      doc.moveTo(50, 68).lineTo(doc.page.width - 50, 68).stroke("#1a5276");

      // رأس الجدول
      const tableHeaders = ["الإجمالي", "سعر الوحدة", "الكمية", "الوحدة", "البند"];
      const colWidths = [80, 80, 60, 60, doc.page.width - 380];
      const colPositions = [50, 130, 210, 270, 330];

      let tableY = 80;
      doc.rect(50, tableY, doc.page.width - 100, 22).fill("#1a5276");
      doc.fillColor("white").font(boldFont).fontSize(9);

      tableHeaders.forEach((header, i) => {
        doc.text(header, colPositions[i], tableY + 6, {
          width: colWidths[i],
          align: "center",
        });
      });

      tableY += 22;

      boqItems.forEach((item: any, index: number) => {
        const bgColor = index % 2 === 0 ? "#f8f9fa" : "#ffffff";
        doc.rect(50, tableY, doc.page.width - 100, 20).fill(bgColor);

        doc.fillColor("#333").font(regularFont).fontSize(9);
        const rowData = [
          item.totalPrice ? item.totalPrice.toLocaleString("ar-SA") : "-",
          item.unitPrice ? item.unitPrice.toLocaleString("ar-SA") : "-",
          item.quantity ? item.quantity.toString() : "-",
          item.unit || "-",
          item.description || item.itemName || "-",
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, colPositions[i], tableY + 5, {
            width: colWidths[i],
            align: "center",
          });
        });

        tableY += 20;

        if (tableY > doc.page.height - 100) {
          doc.addPage();
          tableY = 50;
        }
      });

      // إجمالي جدول الكميات
      const totalAmount = boqItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      if (totalAmount > 0) {
        doc.rect(50, tableY, doc.page.width - 100, 24).fill("#e8f4f8");
        doc.fillColor("#1a5276").font(boldFont).fontSize(10);
        doc.text(`الإجمالي: ${totalAmount.toLocaleString("ar-SA")} ريال`, 50, tableY + 6, {
          align: "right",
          width: doc.page.width - 100,
        });
      }
    }

    // ===== العقود =====
    if (contracts.length > 0) {
      doc.addPage();
      doc.fillColor("#1a5276").font(boldFont).fontSize(14);
      doc.text("العقود", 50, 50, {
        align: "right",
        width: doc.page.width - 100,
      });
      doc.moveTo(50, 68).lineTo(doc.page.width - 50, 68).stroke("#1a5276");

      let contractY = 80;
      contracts.forEach((contract, index) => {
        const bgColor = index % 2 === 0 ? "#f8f9fa" : "#ffffff";
        doc.rect(50, contractY, doc.page.width - 100, 50).fill(bgColor);

        doc.fillColor("#333").font(boldFont).fontSize(11);
        doc.text(contract.contractNumber || `عقد ${index + 1}`, 50, contractY + 8, {
          align: "right",
          width: doc.page.width - 100,
        });

        doc.font(regularFont).fontSize(10);
        doc.text(
          `الحالة: ${contract.status || "-"} | المبلغ: ${contract.contractAmount ? Number(contract.contractAmount).toLocaleString("ar-SA") + " ريال" : "-"} | التاريخ: ${contract.createdAt ? new Date(contract.createdAt).toLocaleDateString("ar-SA") : "-"}`,
          50,
          contractY + 28,
          { align: "right", width: doc.page.width - 100 }
        );

        contractY += 58;
      });
    }

    // ===== سجل الأحداث =====
    if (history.length > 0) {
      doc.addPage();
      doc.fillColor("#1a5276").font(boldFont).fontSize(14);
      doc.text("سجل الأحداث", 50, 50, {
        align: "right",
        width: doc.page.width - 100,
      });
      doc.moveTo(50, 68).lineTo(doc.page.width - 50, 68).stroke("#1a5276");

      let historyY = 80;
      history.forEach((event, index) => {
        if (historyY > doc.page.height - 100) {
          doc.addPage();
          historyY = 50;
        }

        const bgColor = index % 2 === 0 ? "#f8f9fa" : "#ffffff";
        doc.rect(50, historyY, doc.page.width - 100, 45).fill(bgColor);

        doc.fillColor("#333").font(boldFont).fontSize(10);
        const eventTitle =
          event.toStage
            ? `${STAGE_LABELS[event.fromStage || ""] || event.fromStage || ""} ← ${STAGE_LABELS[event.toStage] || event.toStage}`
            : event.action || "-";
        doc.text(eventTitle, 50, historyY + 6, {
          align: "right",
          width: doc.page.width - 100,
        });

        doc.font(regularFont).fontSize(9).fillColor("#666");
        doc.text(
          `${event.userName || "النظام"} | ${event.createdAt ? new Date(event.createdAt).toLocaleString("ar-SA") : "-"}`,
          50,
          historyY + 22,
          { align: "right", width: doc.page.width - 100 }
        );

        if (event.notes) {
          doc.text(event.notes, 50, historyY + 34, {
            align: "right",
            width: doc.page.width - 100,
          });
        }

        historyY += 50;
      });
    }

    // ===== تذييل الصفحة =====
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .rect(0, doc.page.height - 40, doc.page.width, 40)
        .fill("#f8f9fa");
      doc.fillColor("#999").font(regularFont).fontSize(9);
      doc.text(
        `صفحة ${i + 1} من ${pageCount} | منارة - بوابة العناية بالمساجد | تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}`,
        50,
        doc.page.height - 25,
        { align: "center", width: doc.page.width - 100 }
      );
    }

    doc.end();
  } catch (error) {
    console.error("خطأ في توليد PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "فشل توليد التقرير" });
    }
  }
});

// ===== تصدير التقرير الإحصائي العام كـ PDF =====
router.get("/reports/pdf", async (req, res) => {
  try {
    // 1. التحقق من المصادقة
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "غير مصرح" });
    }

    // 2. التحقق من أن المستخدم إداري ولديه الصلاحية
    const allowedRoles = ["super_admin", "system_admin", "projects_office", "financial_manager", "executive_director", "technical_supervisor", "corporate_comm"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "ليس لديك صلاحية لعرض هذا التقرير" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "قاعدة البيانات غير متاحة" });
    }

    // 3. جلب معايير الفلترة من الـ Query
    const { fromDate, toDate, programType, status } = req.query;

    const conditions: any[] = [];
    if (fromDate) {
      conditions.push(gte(mosqueRequests.createdAt, new Date(fromDate as string)));
    }
    if (toDate) {
      conditions.push(lte(mosqueRequests.createdAt, new Date(toDate as string)));
    }
    if (programType && programType !== "all") {
      conditions.push(eq(mosqueRequests.programType, programType as any));
    }
    if (status && status !== "all") {
      conditions.push(eq(mosqueRequests.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // جلب مؤشرات الأداء
    const totalRequestsResult = await db
      .select({ count: count() })
      .from(mosqueRequests)
      .where(whereClause);
    const totalRequests = totalRequestsResult[0]?.count || 0;

    const closedRequestsResult = await db
      .select({ count: count() })
      .from(mosqueRequests)
      .where(and(whereClause, eq(mosqueRequests.currentStage, "closed")));
    const closedRequests = closedRequestsResult[0]?.count || 0;

    const benefitedMosquesResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${mosqueRequests.mosqueId})` })
      .from(mosqueRequests)
      .where(whereClause);
    const benefitedMosques = Number(benefitedMosquesResult[0]?.count || 0);

    // الطلبات قيد التنفيذ (المستبدلة بالتكاليف)
    const activeRequestsResult = await db
      .select({ count: count() })
      .from(mosqueRequests)
      .where(
        and(
          whereClause,
          sql`${mosqueRequests.currentStage} NOT IN ('closed', 'submitted', 'initial_review')`
        )
      );
    const activeRequests = activeRequestsResult[0]?.count || 0;

    const completionRate = totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0;

    const byProgramResult = await db
      .select({
        programType: mosqueRequests.programType,
        count: count(),
      })
      .from(mosqueRequests)
      .where(whereClause)
      .groupBy(mosqueRequests.programType);

    const requests = await db
      .select({
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        programType: mosqueRequests.programType,
        currentStage: mosqueRequests.currentStage,
        status: mosqueRequests.status,
        createdAt: mosqueRequests.createdAt,
        mosqueName: mosques.name,
      })
      .from(mosqueRequests)
      .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
      .where(whereClause)
      .orderBy(desc(mosqueRequests.createdAt))
      .limit(100);

    // 4. إنشاء PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
      info: {
        Title: "التقرير الإحصائي العام",
        Author: "بوابة تمام",
        Subject: "التقارير والتحليلات الإحصائية",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="statistical-report-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    doc.pipe(res);

    // إعداد الخطوط
    const hasArabicFont = fs.existsSync(ARABIC_FONT_PATH);
    if (hasArabicFont) {
      doc.registerFont("Arabic", ARABIC_FONT_PATH);
      doc.registerFont("ArabicBold", ARABIC_FONT_PATH);
    }
    const regularFont = hasArabicFont ? "Arabic" : "Helvetica";
    const boldFont = hasArabicFont ? "ArabicBold" : "Helvetica-Bold";

    // ترويسة الصفحة
    doc.rect(0, 0, doc.page.width, 105).fill("#0D9488");

    doc.fillColor("white").font(boldFont).fontSize(18);
    doc.text("بوابة تمام لخدمات المساجد", 40, 20, {
      align: "right",
      width: doc.page.width - 80,
    });

    doc.font(regularFont).fontSize(11).fillColor("#e2f0ef");
    doc.text("التقرير الإحصائي والتحليلي العام للطلبات والمشاريع المباشرة", 40, 48, {
      align: "right",
      width: doc.page.width - 80,
    });

    // معايير الفلترة النشطة
    let filterText = `البرنامج: ${programType && programType !== 'all' ? PROGRAM_LABELS[programType as string] || programType : 'جميع البرامج'} | `;
    filterText += `الحالة: ${status && status !== 'all' ? STATUS_LABELS[status as string] || status : 'جميع الحالات'} | `;
    filterText += `الفترة: ${fromDate ? new Date(fromDate as string).toLocaleDateString("ar-SA") : "الكل"} إلى ${toDate ? new Date(toDate as string).toLocaleDateString("ar-SA") : "الآن"}`;

    doc.fontSize(9).fillColor("#fff9e6");
    doc.text(filterText, 40, 75, {
      align: "right",
      width: doc.page.width - 80,
    });

    doc.moveDown(3);

    // قسم بطاقات الأداء الرئيسي (زدنا الارتفاع للـ Y لتفادي أي تداخل كلام في حال التفاف فلتر التصفية)
    const cardWidth = 118;
    const cardGap = 12;
    const startX = 40;
    const cardY = 135;
    const cardHeight = 65;

    const cards = [
      { label: "نسبة الإنجاز", val: `${completionRate}%`, bg: "#f3e8ff", border: "#e9d5ff", textCol: "#6b21a8" },
      { label: "قيد التنفيذ", val: activeRequests.toLocaleString(), bg: "#fff7ed", border: "#fed7aa", textCol: "#c2410c" },
      { label: "المساجد المخدومة", val: benefitedMosques.toLocaleString(), bg: "#dcfce7", border: "#bbf7d0", textCol: "#166534" },
      { label: "إجمالي الطلبات", val: totalRequests.toLocaleString(), bg: "#e0f2fe", border: "#bae6fd", textCol: "#075985" },
    ];

    cards.forEach((card, index) => {
      const x = startX + (3 - index) * (cardWidth + cardGap);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 6).fillAndStroke(card.bg, card.border);
      
      doc.fillColor(card.textCol).font(boldFont).fontSize(8.5);
      doc.text(card.label, x + 5, cardY + 12, {
        align: "center",
        width: cardWidth - 10,
      });

      doc.font(boldFont).fontSize(12.5);
      doc.text(card.val, x + 5, cardY + 34, {
        align: "center",
        width: cardWidth - 10,
      });
    });

    let currentY = cardY + cardHeight + 35;

    // توزيع الطلبات حسب البرنامج
    doc.fillColor("#0D9488").font(boldFont).fontSize(12);
    doc.text("توزيع الطلبات حسب البرنامج", 40, currentY, {
      align: "right",
      width: doc.page.width - 80,
    });
    doc.moveTo(40, currentY + 16).lineTo(doc.page.width - 40, currentY + 16).stroke("#0D9488");

    currentY += 24;

    doc.fillColor("#666").font(boldFont).fontSize(9);
    doc.rect(40, currentY, doc.page.width - 80, 22).fill("#f1f5f9");
    doc.fillColor("#334155");
    doc.text("النسبة المئوية", 50, currentY + 6, { align: "left", width: 100 });
    doc.text("عدد الطلبات", doc.page.width / 2 - 50, currentY + 6, { align: "center", width: 100 });
    doc.text("اسم البرنامج", doc.page.width - 240, currentY + 6, { align: "right", width: 180 });

    currentY += 24;

    byProgramResult.forEach((prog, index) => {
      const progName = PROGRAM_LABELS[prog.programType as string] || prog.programType;
      const progPercent = totalRequests > 0 ? ((prog.count / totalRequests) * 100).toFixed(1) + "%" : "0%";
      const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      
      doc.rect(40, currentY, doc.page.width - 80, 22).fill(rowBg);
      // رسم حدود سفلية ناعمة جداً
      doc.moveTo(40, currentY + 22).lineTo(doc.page.width - 40, currentY + 22).stroke("#f1f5f9");
      
      doc.fillColor("#334155").font(regularFont).fontSize(8.5);
      doc.text(progPercent, 50, currentY + 6, { align: "left", width: 100 });
      doc.text(prog.count.toString(), doc.page.width / 2 - 50, currentY + 6, { align: "center", width: 100 });
      
      doc.font(boldFont).fillColor("#0f172a");
      doc.text(progName, doc.page.width - 240, currentY + 6, { align: "right", width: 180 });
      
      currentY += 22;
    });

    currentY += 20;

    // سجل الطلبات التفصيلي
    if (requests.length > 0) {
      if (currentY > doc.page.height - 140) {
        doc.addPage();
        currentY = 40;
      }

      doc.fillColor("#0D9488").font(boldFont).fontSize(12);
      doc.text("سجل الطلبات التفصيلي", 40, currentY, {
        align: "right",
        width: doc.page.width - 80,
      });
      doc.moveTo(40, currentY + 16).lineTo(doc.page.width - 40, currentY + 16).stroke("#0D9488");

      currentY += 24;

      doc.rect(40, currentY, doc.page.width - 80, 26).fill("#0D9488");
      doc.fillColor("white").font(boldFont).fontSize(8.5);
      doc.text("تاريخ التقديم", 45, currentY + 8, { align: "left", width: 70 });
      doc.text("الحالة", 120, currentY + 8, { align: "left", width: 60 });
      doc.text("المرحلة الحالية", 185, currentY + 8, { align: "center", width: 90 });
      doc.text("البرنامج", 280, currentY + 8, { align: "center", width: 70 });
      doc.text("اسم المسجد", 355, currentY + 8, { align: "right", width: 110 });
      doc.text("رقم الطلب", doc.page.width - 120, currentY + 8, { align: "right", width: 75 });

      currentY += 28;

      requests.forEach((reqItem, index) => {
        if (currentY > doc.page.height - 65) {
          doc.addPage();
          currentY = 40;
          
          doc.rect(40, currentY, doc.page.width - 80, 26).fill("#0D9488");
          doc.fillColor("white").font(boldFont).fontSize(8.5);
          doc.text("تاريخ التقديم", 45, currentY + 8, { align: "left", width: 70 });
          doc.text("الحالة", 120, currentY + 8, { align: "left", width: 60 });
          doc.text("المرحلة الحالية", 185, currentY + 8, { align: "center", width: 90 });
          doc.text("البرنامج", 280, currentY + 8, { align: "center", width: 70 });
          doc.text("اسم المسجد", 355, currentY + 8, { align: "right", width: 110 });
          doc.text("رقم الطلب", doc.page.width - 120, currentY + 8, { align: "right", width: 75 });
          
          currentY += 28;
        }

        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, currentY, doc.page.width - 80, 26).fill(rowBg);
        // رسم خط تقسيم أفقي عصري للغاية بدلاً من التظليل الكثيف
        doc.moveTo(40, currentY + 26).lineTo(doc.page.width - 40, currentY + 26).stroke("#f1f5f9");

        const dateStr = reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleDateString("ar-SA") : "-";
        const statusStr = STATUS_LABELS[reqItem.status as string] || reqItem.status;
        const stageStr = STAGE_LABELS[reqItem.currentStage as string] || reqItem.currentStage;
        const progStr = PROGRAM_LABELS[reqItem.programType as string] || reqItem.programType;

        // قص أسماء المساجد الطويلة للغاية لتجنب أي تداخل بصري في الأعمدة
        const rawMosqueName = reqItem.mosqueName || "بنيان (عام)";
        const mosqueName = rawMosqueName.length > 25 ? rawMosqueName.slice(0, 23) + "..." : rawMosqueName;

        doc.fillColor("#475569").font(regularFont).fontSize(8);
        doc.text(dateStr, 45, currentY + 8, { align: "left", width: 70 });
        
        let statusColor = "#475569";
        if (reqItem.status === "completed") statusColor = "#166534";
        else if (reqItem.status === "rejected") statusColor = "#9f1239";
        doc.fillColor(statusColor).font(boldFont);
        doc.text(statusStr, 120, currentY + 8, { align: "left", width: 60 });
        
        doc.fillColor("#475569").font(regularFont);
        doc.text(stageStr, 185, currentY + 8, { align: "center", width: 90 });
        doc.text(progStr, 280, currentY + 8, { align: "center", width: 70 });
        doc.text(mosqueName, 355, currentY + 8, { align: "right", width: 110 });
        
        doc.fillColor("#0f172a").font(boldFont);
        doc.text(reqItem.requestNumber, doc.page.width - 120, currentY + 8, { align: "right", width: 75 });

        currentY += 26;
      });
    }

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .rect(0, doc.page.height - 25, doc.page.width, 25)
        .fill("#f1f5f9");
      doc.fillColor("#64748b").font(regularFont).fontSize(7.5);
      doc.text(
        `صفحة ${i + 1} من ${pageCount} | بوابة تمام لخدمات المساجد | تقرير إحصائي رسمي مصدّر في: ${new Date().toLocaleString("ar-SA")}`,
        40,
        doc.page.height - 18,
        { align: "center", width: doc.page.width - 80 }
      );
    }

    doc.end();
  } catch (error) {
    console.error("خطأ في توليد تقرير PDF الإحصائي:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "فشل توليد التقرير الإحصائي" });
    }
  }
});

export default router;
