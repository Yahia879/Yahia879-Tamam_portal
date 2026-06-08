import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Helper for Arabic RTL text formatting in PDFKit
function rtl(text: any): string {
  if (text === null || text === undefined) return "";
  const str = String(text).trim();
  if (!str) return "";

  // Check if string contains Arabic characters
  const hasArabic = /[\u0600-\u06FF]/.test(str);
  if (!hasArabic) return str;

  // Reverse words order so that it displays properly in PDFKit's left-to-right text box
  return str.split(/\s+/).reverse().join(" ");
}

async function generatePDF() {
  const outputPath = path.join(process.cwd(), "whatsapp_sms_notifications_report.pdf");
  const fontPath = path.join(process.cwd(), "server", "fonts", "Cairo.ttf");

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "تقرير استراتيجية إشعارات بوابة تمام (WhatsApp & SMS)",
      Author: "بوابة تمام",
      Subject: "استراتيجية قنوات الإرسال وتوفير التكلفة",
    },
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Register Font
  if (fs.existsSync(fontPath)) {
    doc.registerFont("Arabic", fontPath);
    doc.registerFont("ArabicBold", fontPath);
  } else {
    console.error("Arabic font Cairo.ttf not found!");
    process.exit(1);
  }

  const primaryColor = "#0D9488"; // Teal
  const secondaryColor = "#1e293b"; // Dark Slate
  const accentColor = "#f8fafc"; // Light Gray

  // ================= PAGE 1 =================
  // Header banner
  doc.rect(0, 0, doc.page.width, 130).fill(primaryColor);
  doc.fillColor("white").font("ArabicBold").fontSize(22);
  doc.text(rtl("بوابة تمام لخدمات المساجد"), 40, 35, { align: "right", width: doc.page.width - 80 });
  
  doc.fontSize(13).font("Arabic").fillColor("#ccfbfe");
  doc.text(rtl("تقرير استراتيجية قنوات الإشعارات (WhatsApp & SMS) وتخفيض التكاليف"), 40, 75, { align: "right", width: doc.page.width - 80 });

  doc.moveDown(4);

  // Section 1: Executive Summary
  doc.fillColor(primaryColor).font("ArabicBold").fontSize(14);
  doc.text(rtl("1. الملخص التنفيذي"), 40, 160, { align: "right", width: doc.page.width - 80 });
  doc.moveTo(40, 180).lineTo(doc.page.width - 40, 180).stroke(primaryColor);

  doc.fillColor(secondaryColor).font("Arabic").fontSize(10.5);
  let summaryText = 
    "يهدف هذا التقرير إلى رسم خريطة طريق واضحة وقابلة للتنفيذ للربط البرمجي مع شبكات إرسال رسائل الواتساب والرسائل النصية القصيرة المدفوعة. ونظراً لأن قنوات الإرسال المباشرة يترتب عليها تكاليف تشغيلية متغيرة، فقد قمنا بفلترة وتصنيف الإشعارات الـ 37 الواردة في دليل الهيكلية لضمان إرسال الإشعارات الأكثر أهمية وحرجة فقط، والإبقاء على العمليات الإدارية والروتينية على البريد الإلكتروني وإشعارات النظام المجانية لتوفير النفقات.";
  doc.text(rtl(summaryText), 40, 195, { align: "right", width: doc.page.width - 80, lineGap: 4 });

  // Section 2: Distribution Strategy
  doc.fillColor(primaryColor).font("ArabicBold").fontSize(14);
  doc.text(rtl("2. فلسفة توزيع قنوات الاتصال"), 40, 275, { align: "right", width: doc.page.width - 80 });
  doc.moveTo(40, 295).lineTo(doc.page.width - 40, 295).stroke(primaryColor);

  const strategies = [
    {
      title: "قناة الواتساب (WhatsApp Business API) - للأمور المحورية والمالية:",
      desc: "تُستخدم لإشعار المستفيدين والموردين بنقاط التحول الجوهرية (مثل قبول المسجد، وتعليق الطلب، والتعاقد، وتفاصيل الدفع والصرف). تتميز بالقدرة على إدراج أزرار تفاعلية وروابط لتسهيل الإجراء وتكلفة محادثة ثابتة."
    },
    {
      title: "الرسائل النصية القصيرة (SMS) - للحالات الطارئة والموظفين الميدانيين:",
      desc: "تُستخدم في أضيق الحدود للمهام الحرجة ميدانياً (مثل تكليف موظف ميداني بمهمة استجابة سريعة أو زيارة ميدانية مجدولة) لضمان وصول التنبيه فوراً حتى لو كان الموظف خارج تغطية الإنترنت."
    },
    {
      title: "البريد الإلكتروني وإشعارات النظام (Email / Web Push) - للعمليات الداخلية:",
      desc: "تُعتمد لكافة التحديثات والخطوات الروتينية والتقارير الإدارية بين موظفي النظام، وهي قنوات مجانية بالكامل تحمي ميزانية المؤسسة وتمنع إزعاج المستخدمين بالرسائل المتكررة."
    }
  ];

  let currentY = 310;
  strategies.forEach((strat) => {
    doc.fillColor(primaryColor).font("ArabicBold").fontSize(10.5);
    doc.text(rtl(strat.title), 40, currentY, { align: "right", width: doc.page.width - 80 });
    currentY += 18;
    
    doc.fillColor(secondaryColor).font("Arabic").fontSize(9.5);
    doc.text(rtl(strat.desc), 40, currentY, { align: "right", width: doc.page.width - 80, lineGap: 3 });
    currentY += 40;
  });

  // Footer for Page 1
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(accentColor);
  doc.fillColor("#94a3b8").font("Arabic").fontSize(8.5);
  doc.text(rtl("صفحة 1 من 3 | بوابة تمام لخدمات المساجد"), 40, doc.page.height - 25, { align: "center", width: doc.page.width - 80 });

  // ================= PAGE 2 =================
  doc.addPage();
  
  // Section 3: Tables
  doc.fillColor(primaryColor).font("ArabicBold").fontSize(14);
  doc.text(rtl("3. جدول تصنيف الإشعارات والقنوات المقترحة"), 40, 40, { align: "right", width: doc.page.width - 80 });
  doc.moveTo(40, 60).lineTo(doc.page.width - 40, 60).stroke(primaryColor);

  let tableY = 75;

  // Draw Table Header
  // Columns: [الإجراء, نص الإشعار, الأولوية والقناة, التبرير]
  // Widths:  [110, 160, 95, 150]
  // x-coords: [445, 285, 190, 40]
  
  doc.rect(40, tableY, 515, 25).fill(primaryColor);
  doc.fillColor("white").font("ArabicBold").fontSize(9.5);
  doc.text(rtl("الإجراء"), 445, tableY + 7, { width: 110, align: "center" });
  doc.text(rtl("نص الإشعار الصادر"), 285, tableY + 7, { width: 160, align: "center" });
  doc.text(rtl("الأولوية والقناة"), 190, tableY + 7, { width: 95, align: "center" });
  doc.text(rtl("التبرير والأثر"), 40, tableY + 7, { width: 150, align: "center" });
  
  tableY += 25;

  const rows = [
    {
      col1: "قبول تسجيل المسجد",
      col2: "تم قبول طلب تسجيل المسجد الخاص بك: مسجد رحمان",
      col3: "🟡 عالية | WhatsApp",
      col4: "تنبيه هام ومبهج للمستفيد، يبني مصداقية المنصة."
    },
    {
      col1: "جدولة زيارة ميدانية",
      col2: "تم الموافقة على طلبك وسيتم جدولة زيارة لمسجدك قريباً",
      col3: "🔴 حرجة | WhatsApp",
      col4: "يتطلب تواجد المستفيد في الموقع للتنسيق الميداني."
    },
    {
      col1: "تعليق الطلب مؤقتاً",
      col2: "تم تعليق طلبك رقم (REQ-XXXX) مؤقتاً",
      col3: "🔴 حرجة | WhatsApp",
      col4: "يتطلب إخطاراً فورياً مع توفير زر لاتخاذ إجراء تصحيحي."
    },
    {
      col1: "تكليف بمهمة (عاجل)",
      col2: "تم تكليفك بالطلب (REQ-XXXX) للاستجابة السريعة",
      col3: "🔴 حرجة | SMS",
      col4: "إشعار موجه للموظف الميداني لضمان سرعة الحركة والتواجد."
    },
    {
      col1: "جدولة زيارة للموظف",
      col2: "تم جدولة زيارة ميدانية للطلب بتاريخ 2026/6/25",
      col3: "🔴 حرجة | SMS",
      col4: "لضمان إدراج المهمة في خطة سير الموظف الميداني على الهاتف."
    },
    {
      col1: "اعتماد عرض سعر",
      col2: "تم اعتماد عرض السعر للمورد بقيمة 119,951 ريال",
      col3: "🔴 حرجة | WhatsApp",
      col4: "التزام مالي رسمي للمقاول، يحفزه على سرعة بدء العمل."
    },
    {
      col1: "اعتماد العقد النهائي",
      col2: "تم اعتماد العقد للمورد للطلب بقيمة 300,000 ريال",
      col3: "🔴 حرجة | WhatsApp",
      col4: "خطوة قانونية رسمية يتوجب توثيقها وإخطار المقاول بها فوراً."
    },
    {
      col1: "اعتماد أو رفض الصرف",
      col2: "تم اعتماد/رفض أمر الصرف بقيمة 1,000,000 ريال",
      col3: "🔴 حرجة | WhatsApp",
      col4: "حساس للغاية للموردين، يرتبط مباشرة بتدفقاتهم النقدية."
    },
    {
      col1: "إجراءات إدارية عامة",
      col2: "تغير حالة الطلب للمراجعة، رفع التقارير، التحويل لمشروع...",
      col3: "⚪ روتينية | Web Push",
      col4: "تنبيهات داخلية متكررة تهم الموظفين وتتم مجاناً داخل النظام."
    },
    {
      col1: "الحركات المحاسبية",
      col2: "تم تحويل طلب الصرف إلى أمر صرف، إنشاء تقرير إنجاز...",
      col3: "⚪ روتينية | Email / Web",
      col4: "دورات مستندية للمحاسبة والمراجعين الداخليين ولا تستدعي كلفة."
    }
  ];

  doc.font("Arabic").fontSize(8);
  rows.forEach((row, index) => {
    const rowBg = index % 2 === 0 ? "#ffffff" : accentColor;
    const rowHeight = 32;

    doc.rect(40, tableY, 515, rowHeight).fill(rowBg);
    
    doc.fillColor(secondaryColor);
    
    // Draw cells
    doc.text(rtl(row.col1), 445, tableY + 8, { width: 110, align: "right" });
    doc.text(rtl(row.col2), 285, tableY + 8, { width: 160, align: "right" });
    doc.text(rtl(row.col3), 190, tableY + 8, { width: 95, align: "center" });
    doc.text(rtl(row.col4), 40, tableY + 8, { width: 150, align: "right" });
    
    // Bottom border
    doc.moveTo(40, tableY + rowHeight).lineTo(555, tableY + rowHeight).stroke("#e2e8f0");
    
    tableY += rowHeight;
  });

  // Footer for Page 2
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(accentColor);
  doc.fillColor("#94a3b8").font("Arabic").fontSize(8.5);
  doc.text(rtl("صفحة 2 من 3 | بوابة تمام لخدمات المساجد"), 40, doc.page.height - 25, { align: "center", width: doc.page.width - 80 });

  // ================= PAGE 3 =================
  doc.addPage();

  // Section 4: Cost Savings and Tech Recommendations
  doc.fillColor(primaryColor).font("ArabicBold").fontSize(14);
  doc.text(rtl("4. التوصيات التقنية والتأثير المالي"), 40, 40, { align: "right", width: doc.page.width - 80 });
  doc.moveTo(40, 60).lineTo(doc.page.width - 40, 60).stroke(primaryColor);

  const techRecs = [
    {
      title: "أ. آلية الفلترة الذكية والربط الاحتياطي (Smart Fallback Mechanism):",
      desc: "لتخفيض تكاليف الـ SMS المرتفعة، ننصح ببرمجة النظام لإرسال إشعار الواتساب أولاً، وفي حال فشل التسليم أو عدم قراءته خلال 5 دقائق (للإشعارات الحرجة فقط)، يقوم النظام بإرسال رسالة SMS قصيرة واحتياطية تلقائياً."
    },
    {
      title: "ب. قوالب واتساب تفاعلية وموجهة للفعل (Interactive & Actionable Templates):",
      desc: "تضمين أزرار استجابة سريعة (Quick Replies) في رسائل الواتساب مثل زر [تفاصيل التعليق 🔗] أو [تحميل العقد 📂] لتقليل اعتماد المستخدمين على الدعم الفني وتسهيل رحلة المستفيدين والموردين."
    },
    {
      title: "ج. تقليص وتفادي الرسائل المكررة (Debouncing Notifications):",
      desc: "برمجة النظام لتأخير إرسال الإشعارات البرمجية لمدة دقيقتين عند حدوث تغييرات سريعة متتالية على الطلب من قبل الموظف، لضمان إرسال الحالة النهائية للمستفيد في رسالة واحدة وعدم هدر ميزانية الرسائل."
    },
    {
      title: "د. الأثر المالي المتوقع وتوفير الميزانية:",
      desc: "من خلال إبقاء 24 إشعاراً روتينياً وإدارياً داخلياً (من أصل 37 إشعاراً) على القنوات المجانية مثل الويب والبريد الإلكتروني، وتفعيل القنوات المدفوعة لـ 13 إشعاراً حرجاً فقط، يضمن النظام توفير ما يقارب 65% من التكلفة التشغيلية لإرسال الإشعارات مقارنة بالربط العشوائي لكافة الحالات."
    }
  ];

  let yOffset = 75;
  techRecs.forEach((rec) => {
    doc.fillColor(primaryColor).font("ArabicBold").fontSize(11);
    doc.text(rtl(rec.title), 40, yOffset, { align: "right", width: doc.page.width - 80 });
    yOffset += 18;

    doc.fillColor(secondaryColor).font("Arabic").fontSize(9.5);
    doc.text(rtl(rec.desc), 40, yOffset, { align: "right", width: doc.page.width - 80, lineGap: 3 });
    yOffset += 50;
  });

  // Stamp / Sign-off area
  yOffset += 20;
  doc.rect(40, yOffset, doc.page.width - 80, 70).fill(accentColor);
  doc.fillColor(primaryColor).font("ArabicBold").fontSize(10.5);
  doc.text(rtl("توصية إدارة المشاريع وتطوير النظم:"), 50, yOffset + 12, { align: "right", width: doc.page.width - 100 });
  
  doc.fillColor(secondaryColor).font("Arabic").fontSize(9);
  doc.text(rtl("يُنصح باعتماد هذا التوزيع بشكل عاجل وبرمجته في لوحة تحكم الإشعارات بالنظام لمنع أي هدر مالي قبل إطلاق قنوات الربط مع شركات الاتصالات."), 50, yOffset + 32, { align: "right", width: doc.page.width - 100, lineGap: 2 });

  // Footer for Page 3
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(accentColor);
  doc.fillColor("#94a3b8").font("Arabic").fontSize(8.5);
  doc.text(rtl("صفحة 3 من 3 | بوابة تمام لخدمات المساجد"), 40, doc.page.height - 25, { align: "center", width: doc.page.width - 80 });

  doc.end();
  console.log("PDF generated successfully at:", outputPath);
}

generatePDF().catch(err => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
