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
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
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

export default router;
