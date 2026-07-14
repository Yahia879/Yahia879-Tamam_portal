import { z } from "zod";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";

dotenv.config();
import { getDb } from "../db";
import { notifications, users, roles as rolesTable, suppliers, mosqueRequests, projects, notificationTriggerSettings, notificationTemplates } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray, ne, or, like, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";
import { calculateUserPermissions } from "../permissions";

// أنواع الإشعارات (مطابقة للـ schema)
export const NOTIFICATION_TYPES = {
  info: "إشعار",
  success: "نجاح",
  warning: "تحذير",
  error: "خطأ",
  request_update: "تحديث طلب",
  system: "نظام",
  mosque: "مسجد",
  request: "طلب",
} as const;

export type NotificationType = "info" | "success" | "warning" | "error" | "request_update" | "system" | "mosque" | "request";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER || "tamamgate@manarah.org.sa";
  const pass = process.env.SMTP_PASS || "pK9#mX2!vL7$qZ4*";
  const service = process.env.SMTP_SERVICE;

  if (service) {
    transporter = nodemailer.createTransport({
      service,
      auth: {
        user,
        pass,
      },
    });
  } else if (host) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

export async function sendEmailNotification(to: string, title: string, message: string) {
  const user = process.env.SMTP_USER || "tamamgate@manarah.org.sa";
  
  try {
    const mailOptions = {
      from: `"جمعية عمارة المساجد (منارة)" <${user}>`,
      to,
      subject: title,
      text: message,
      html: `
        <div style="direction: rtl; font-family: Tahoma, Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">إشعار جديد من جمعية عمارة المساجد (منارة)</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;"><strong>${title}</strong></p>
          <p style="font-size: 14px; line-height: 1.5; color: #555; background-color: #f9f9f9; padding: 15px; border-radius: 4px; border-right: 4px solid #0d9488;">
            ${message}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">هذا البريد تم إرساله تلقائياً من نظام التنبيهات لجمعية عمارة المساجد (منارة).</p>
        </div>
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
}

async function sendWhatsApp(phone: string, title: string, message: string) {
  const token = process.env.MOTTASL_API_TOKEN;
  const baseUrl = process.env.MOTTASL_API_URL || "https://api.mottasl.ai/v1";

  if (!token) {
    console.warn("WhatsApp notification skipped: MOTTASL_API_TOKEN is not configured in .env");
    return;
  }

  // Format phone number: strip '+', '00', spaces, and make sure it has the country code.
  let formattedPhone = phone.replace(/[\s+-]/g, "");
  if (formattedPhone.startsWith("00")) {
    formattedPhone = formattedPhone.substring(2);
  }
  // If phone starts with '05' (Saudi mobile without country code), prepend '966'
  if (formattedPhone.startsWith("05") && formattedPhone.length === 10) {
    formattedPhone = "966" + formattedPhone.substring(1);
  }

  const url = `${baseUrl}/message/send?create=true`;
  const body = JSON.stringify({
    to: formattedPhone,
    type: "text",
    text: {
      body: `${title}\n\n${message}`
    }
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body
    });

    const resText = await response.text();
    if (!response.ok) {
      console.error(`Failed to send WhatsApp message. Status: ${response.status}, Response: ${resText}`);
    } else {
      console.log(`WhatsApp message sent successfully to ${formattedPhone}. Response: ${resText}`);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  notes_response_submitted: "قام المستفيد {اسم_المستفيد} بتقديم رد على الملاحظات للطلب رقم {رقم_الطلب}",
  exception_request_submitted: "قام الإمام {اسم_الإمام} بتقديم طلب استثناء للطلب رقم {رقم_الطلب}",
  mosque_created: "تم إضافة مسجد جديد {اسم_المسجد} وهو بانتظار الموافقة",
  mosque_approved: "تم قبول طلب تسجيل المسجد الخاص بك: {اسم_المسجد}",
  request_created_admin: "قام المسؤول {اسم_المسؤول} بإنشاء طلب جديد رقم {رقم_الطلب}",
  request_created_beneficiary: "تم إنشاء طلب جديد رقم {رقم_الطلب} وهو بانتظار المعالجة",
  stage_initial_review: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: المراجعة الأولية",
  stage_field_visit: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: الزيارة الميدانية",
  field_visit_report_submitted: "تم رفع تقرير زيارة ميدانية من قبل الفريق الميداني للطلب رقم {رقم_الطلب}",
  quick_report_submitted: "تم رفع تقرير الاستجابة السريعة للطلب رقم {رقم_الطلب}",
  converted_to_project: "تم تحويل الطلب رقم {رقم_الطلب} إلى مشروع ويحتاج للتقييم المالي",
  stage_financial_eval: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التقييم المالي واعتماد العرض",
  stage_contracting: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التعاقد",
  stage_execution: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: التنفيذ",
  stage_closed: "قام المسؤول {اسم_المسؤول} بنقل الطلب رقم {رقم_الطلب} إلى مرحلة: الإغلاق",
  support_ticket_created: "تم إنشاء تذكرة دعم فني جديدة رقم #{رقم_التذكرة}",
  support_ticket_status_changed: "تم تغيير حالة تذكرة الدعم رقم #{رقم_التذكرة} إلى: {الحالة_الجديدة}",
  support_ticket_reply_added: "قام المسؤول {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم رقم #{رقم_التذكرة}",
  supplier_created: "تم تسجيل مورد جديد في البوابة: \"{اسم_المورد}\" وهو بانتظار المراجعة والاعتماد",
  supplier_approved: "قام المسؤول {اسم_المسؤول} باعتماد المورد: \"{اسم_المورد}\" بنجاح",
  supplier_rejected: "قام المسؤول {اسم_المسؤول} برفض المورد: \"{اسم_المورد}\" بسبب: {السبب}",
  quotation_created: "تم إضافة عرض سعر جديد رقم \"{رقم_العرض}\" من قبل المورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب}",
  quotation_approved: "تم اعتماد عرض السعر رقم \"{رقم_العرض}\" للمورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
  contract_created: "تم إنشاء عقد جديد رقم \"{رقم_العقد}\" مع المورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
  contract_approved: "تم اعتماد العقد رقم \"{رقم_العقد}\" للمورد \"{اسم_المورد}\" للطلب رقم {رقم_الطلب} بقيمة {القيمة} ريال",
  progress_report_created: "تم إنشاء تقرير إنجاز جديد رقم \"{رقم_التقرير}\" للمشروع \"{اسم_المشروع}\" للطلب رقم {رقم_الطلب}",
  progress_report_approved: "تم اعتماد تقرير الإنجاز رقم \"{رقم_التقرير}\" للمشروع \"{اسم_المشروع}\" للطلب رقم {رقم_الطلب}",
  disbursement_request_created: "تم إنشاء طلب صرف جديد رقم \"{رقم_طلب_الصرف}\" لطلب صرف دفعة أولى للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
  disbursement_converted_to_order: "تم تحويل طلب الصرف رقم \"{رقم_طلب_الصرف}\" إلى أمر صرف رقم \"{رقم_أمر_الصرف}\" للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
  disbursement_order_approved: "تم اعتماد أمر الصرف رقم \"{رقم_أمر_الصرف}\" (طلب رقم {رقم_طلب_الصرف}) للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال",
  disbursement_order_rejected: "تم رفض أمر الصرف رقم \"{رقم_أمر_الصرف}\" (طلب رقم {رقم_طلب_الصرف}) للمشروع \"{اسم_المشروع}\" بقيمة {القيمة} ريال بسبب: {السبب}",
};

const ALTERNATIVE_PATTERNS: Record<string, string[]> = {
  support_ticket_reply_added: [
    "قام المسؤول {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم الخاصة بك رقم #{رقم_التذكرة}",
    "قام مقدم الطلب {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم رقم #{رقم_التذكرة}",
    "قام مقدم الطلب {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم الخاصة بك رقم #{رقم_التذكرة}",
    "قام المسؤول {اسم_المرسل} بإضافة رد جديد على تذكرة الدعم رقم #{رقم_التذكرة}"
  ],
  support_ticket_status_changed: [
    "تم تغيير حالة تذكرة الدعم الخاصة بك رقم #{رقم_التذكرة} إلى: {الحالة_الجديدة}",
    "تم تغيير حالة تذكرة الدعم رقم #{رقم_التذكرة} إلى: {الحالة_الجديدة}"
  ],
  notes_response_submitted: [
    "قام المستفيد {اسم_المستفيد} بتقديم رد على الملاحظات للطلب رقم {رقم_الطلب}",
    "قام المستفيد {اسم_المستفيد} بتقديم رد على الرفض للطلب رقم {رقم_الطلب}",
    "قام المستفيد {اسم_المستفيد} بتقديم رد على الملاحظات",
    "قام المستفيد {اسم_المستفيد} بتقديم رد على الرفض"
  ]
};

function formatCustomMessage(defaultTemplate: string, customTemplate: string, actualMessage: string, triggerId?: string): string {
  try {
    const candidateTemplates = [defaultTemplate];
    if (triggerId && ALTERNATIVE_PATTERNS[triggerId]) {
      candidateTemplates.push(...ALTERNATIVE_PATTERNS[triggerId]);
    }

    for (const tpl of candidateTemplates) {
      let regexStr = tpl.replace(/[-\/\\^$*+?.()|[\]{}]/g, (match) => {
        if (match === '{' || match === '}') return match;
        return '\\' + match;
      });

      const placeholders: string[] = [];
      const placeholderRegex = /\{([^}]+)\}/g;
      let match;
      while ((match = placeholderRegex.exec(tpl)) !== null) {
        placeholders.push(match[1]);
      }

      let pattern = regexStr;
      placeholders.forEach((placeholder) => {
        pattern = pattern.replace(`{${placeholder}}`, "([\\s\\S]+?)");
      });

      const regex = new RegExp(`^${pattern}$`);
      const actualMatch = actualMessage.match(regex);

      if (actualMatch) {
        let result = customTemplate;
        placeholders.forEach((placeholder, index) => {
          const value = actualMatch[index + 1];
          if (value) {
            result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
          }
        });
        return result;
      }
    }
  } catch (error) {
    console.error("Error formatting custom message:", error);
  }
  return actualMessage;
}

export async function createNotification(data: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    // 1. Fetch user details first
    const [user] = await db
      .select({ 
        role: users.role, 
        phone: users.phone,
        email: users.email,
        receiveBeneficiaryNotifications: users.receiveBeneficiaryNotifications,
        receiveBeneficiaryEmail: users.receiveBeneficiaryEmail,
        receiveBeneficiaryWhatsapp: users.receiveBeneficiaryWhatsapp,
        receiveBeneficiarySms: users.receiveBeneficiarySms,
        receiveRequestNotifications: users.receiveRequestNotifications,
        receiveRequestEmail: users.receiveRequestEmail,
        receiveRequestWhatsapp: users.receiveRequestWhatsapp,
        receiveRequestSms: users.receiveRequestSms,
        receiveFinancialAndContractNotifications: users.receiveFinancialAndContractNotifications,
        receiveFinancialEmail: users.receiveFinancialEmail,
        receiveFinancialWhatsapp: users.receiveFinancialWhatsapp,
        receiveFinancialSms: users.receiveFinancialSms,
      })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (!user) return null;

    // 2. Fetch role settings
    const [roleSetting] = await db
      .select({
        receiveBeneficiaryNotifications: rolesTable.receiveBeneficiaryNotifications,
        receiveBeneficiaryEmail: rolesTable.receiveBeneficiaryEmail,
        receiveBeneficiaryWhatsapp: rolesTable.receiveBeneficiaryWhatsapp,
        receiveBeneficiarySms: rolesTable.receiveBeneficiarySms,
        
        receiveRequestNotifications: rolesTable.receiveRequestNotifications,
        receiveRequestEmail: rolesTable.receiveRequestEmail,
        receiveRequestWhatsapp: rolesTable.receiveRequestWhatsapp,
        receiveRequestSms: rolesTable.receiveRequestSms,
        
        receiveFinancialAndContractNotifications: rolesTable.receiveFinancialAndContractNotifications,
        receiveFinancialEmail: rolesTable.receiveFinancialEmail,
        receiveFinancialWhatsapp: rolesTable.receiveFinancialWhatsapp,
        receiveFinancialSms: rolesTable.receiveFinancialSms,
      })
      .from(rolesTable)
      .where(eq(rolesTable.id, user.role))
      .limit(1);

    // الكشف عن الـ triggerId بناءً على بيانات الإشعار أولاً
    let triggerId: string | null = null;
    if (data.title === "تقديم رد على الرفض" || data.title === "تقديم رد على الملاحظات" || data.message.includes("بتقديم رد على")) {
      triggerId = "notes_response_submitted";
    } else if (data.title === "طلب استثناء جديد" || data.message.includes("بتقديم طلب استثناء")) {
      triggerId = "exception_request_submitted";
    } else if (data.title === "طلب جديد مضاف من مسؤول" || (data.title === "طلب جديد" && data.message.includes("بإنشاء طلب"))) {
      triggerId = "request_created_admin";
    } else if (data.title === "طلب جديد" && data.message.includes("بانتظار المعالجة")) {
      triggerId = "request_created_beneficiary";
    } else if (data.message.includes("المراجعة الأولية")) {
      triggerId = "stage_initial_review";
    } else if (data.message.includes("الزيارة الميدانية")) {
      triggerId = "stage_field_visit";
    } else if (data.title === "تم رفع تقرير المعاينة الميدانية" || data.message.includes("تقرير زيارة ميدانية")) {
      triggerId = "field_visit_report_submitted";
    } else if (data.title === "تم رفع تقرير الاستجابة السريعة" || data.message.includes("تقرير الاستجابة السريعة")) {
      triggerId = "quick_report_submitted";
    } else if (data.title === "مشروع جديد للتقييم المالي" || data.message.includes("إلى مشروع ويحتاج للتقييم المالي")) {
      triggerId = "converted_to_project";
    } else if (data.message.includes("التقييم المالي واعتماد العرض")) {
      triggerId = "stage_financial_eval";
    } else if (data.message.includes("التعاقد")) {
      triggerId = "stage_contracting";
    } else if (data.message.includes("التنفيذ")) {
      triggerId = "stage_execution";
    } else if (data.message.includes("الإغلاق") || data.message.includes("closed") || data.message.includes("إغلاق")) {
      triggerId = "stage_closed";
    } else if (data.message.includes("بانتظار الموافقة") || data.message.includes("بانتظار الاعتماد") || data.title === "تسجيل مسجد من قبل مسؤول") {
      triggerId = "mosque_created";
    } else if (data.title === "تم اعتماد المسجد" || data.message.includes("تم قبول طلب تسجيل المسجد")) {
      triggerId = "mosque_approved";
    } else if (data.title === "مورد جديد قيد المراجعة" || data.message.includes("تم تسجيل مورد جديد في البوابة")) {
      triggerId = "supplier_created";
    } else if (data.title === "اعتماد مورد" || data.message.includes("باعتماد المورد")) {
      triggerId = "supplier_approved";
    } else if (data.title === "رفض مورد" || data.message.includes("برفض المورد")) {
      triggerId = "supplier_rejected";
    } else if (data.title === "إضافة عرض سعر جديد" || data.message.includes("تم إضافة عرض سعر جديد")) {
      triggerId = "quotation_created";
    } else if (data.title === "اعتماد عرض سعر" || data.message.includes("تم اعتماد عرض السعر")) {
      triggerId = "quotation_approved";
    } else if (data.title === "إنشاء عقد جديد" || data.title === "عقد جديد" || data.message.includes("تم إنشاء عقد جديد")) {
      triggerId = "contract_created";
    } else if (data.title === "اعتماد عقد" || data.message.includes("تم اعتماد العقد")) {
      triggerId = "contract_approved";
    } else if (data.title === "إنشاء تقرير إنجاز" || data.message.includes("تم إنشاء تقرير إنجاز جديد")) {
      triggerId = "progress_report_created";
    } else if (data.title === "اعتماد تقرير إنجاز" || data.message.includes("تم اعتماد تقرير الإنجاز")) {
      triggerId = "progress_report_approved";
    } else if (data.title === "إنشاء طلب صرف" || data.message.includes("تم إنشاء طلب صرف جديد")) {
      triggerId = "disbursement_request_created";
    } else if (data.title === "تحويل إلى أمر صرف" || data.message.includes("تم تحويل طلب الصرف")) {
      triggerId = "disbursement_converted_to_order";
    } else if (data.title === "اعتماد أمر صرف" || data.message.includes("تم اعتماد أمر الصرف")) {
      triggerId = "disbursement_order_approved";
    } else if (data.title === "رفض أمر صرف" || data.message.includes("تم رفض أمر الصرف")) {
      triggerId = "disbursement_order_rejected";
    } else if (data.title === "تذكرة دعم فني جديدة" || data.message.includes("بتقديم تذكرة دعم فني جديدة")) {
      triggerId = "support_ticket_created";
    } else if (data.title === "تحديث حالة التذكرة" || data.message.includes("تغيير حالة تذكرة الدعم")) {
      triggerId = "support_ticket_status_changed";
    } else if (data.title === "رد جديد على التذكرة" || data.message.includes("بإضافة رد جديد على تذكرة الدعم")) {
      triggerId = "support_ticket_reply_added";
    }

    const financialTriggerIds = [
      "supplier_created",
      "supplier_approved",
      "supplier_rejected",
      "quotation_created",
      "quotation_approved",
      "contract_created",
      "contract_approved",
      "progress_report_created",
      "progress_report_approved",
      "disbursement_request_created",
      "disbursement_converted_to_order",
      "disbursement_order_approved",
      "disbursement_order_rejected"
    ];

    let isInAppEnabled = false;
    let isEmailEnabled = false;
    let isWhatsappEnabled = false;
    let isSmsEnabled = false;

    const isFinancial = 
      (triggerId && financialTriggerIds.includes(triggerId)) ||
      data.relatedType?.startsWith("disbursement") || 
      data.relatedType === "contract" || 
      (data.type as string) === "financial";

    const isRequest = 
      data.relatedType === "request" || 
      data.relatedType === "support_ticket" || 
      data.type === "request" || 
      data.type === "request_update" ||
      data.type === "mosque" ||
      triggerId === "exception_request_submitted" ||
      (triggerId !== null && triggerId.startsWith("support_ticket_"));

    if (isFinancial) {
      isInAppEnabled = !!user.receiveFinancialAndContractNotifications || !!(roleSetting && roleSetting.receiveFinancialAndContractNotifications);
      isEmailEnabled = !!user.receiveFinancialEmail || !!(roleSetting && roleSetting.receiveFinancialEmail);
      isWhatsappEnabled = !!user.receiveFinancialWhatsapp || !!(roleSetting && roleSetting.receiveFinancialWhatsapp);
      isSmsEnabled = !!user.receiveFinancialSms || !!(roleSetting && roleSetting.receiveFinancialSms);
    } else if (isRequest) {
      isInAppEnabled = !!user.receiveRequestNotifications || !!(roleSetting && roleSetting.receiveRequestNotifications);
      isEmailEnabled = !!user.receiveRequestEmail || !!(roleSetting && roleSetting.receiveRequestEmail);
      isWhatsappEnabled = !!user.receiveRequestWhatsapp || !!(roleSetting && roleSetting.receiveRequestWhatsapp);
      isSmsEnabled = !!user.receiveRequestSms || !!(roleSetting && roleSetting.receiveRequestSms);
    } else {
      isInAppEnabled = !!user.receiveBeneficiaryNotifications || !!(roleSetting && roleSetting.receiveBeneficiaryNotifications);
      isEmailEnabled = !!user.receiveBeneficiaryEmail || !!(roleSetting && roleSetting.receiveBeneficiaryEmail);
      isWhatsappEnabled = !!user.receiveBeneficiaryWhatsapp || !!(roleSetting && roleSetting.receiveBeneficiaryWhatsapp);
      isSmsEnabled = !!user.receiveBeneficiarySms || !!(roleSetting && roleSetting.receiveBeneficiarySms);
    }

    // تطبيق قيم تخصيص مشغلات الإشعارات التفصيلية إذا تم العثور عليها
    if (triggerId) {
      const triggerOverrides = await db
        .select()
        .from(notificationTriggerSettings)
        .where(
          and(
            eq(notificationTriggerSettings.triggerId, triggerId),
            eq(notificationTriggerSettings.roleId, user.role)
          )
        );

      if (triggerOverrides && triggerOverrides.length > 0) {
        const inAppOverride = triggerOverrides.find(ts => ts.channel === "in_app");
        const emailOverride = triggerOverrides.find(ts => ts.channel === "email");
        const whatsappOverride = triggerOverrides.find(ts => ts.channel === "whatsapp");
        const smsOverride = triggerOverrides.find(ts => ts.channel === "sms");

        if (inAppOverride !== undefined) isInAppEnabled = inAppOverride.enabled;
        if (emailOverride !== undefined) isEmailEnabled = emailOverride.enabled;
        if (whatsappOverride !== undefined) isWhatsappEnabled = whatsappOverride.enabled;
        if (smsOverride !== undefined) isSmsEnabled = smsOverride.enabled;
      }
    }

    // جلب القالب المخصص من قاعدة البيانات وتطبيقه
    let customizedMessage = data.message;
    if (triggerId) {
      const template = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.triggerId, triggerId))
        .limit(1);

      if (template && template.length > 0 && template[0].templateMessage) {
        const defaultTpl = DEFAULT_TEMPLATES[triggerId];
        if (defaultTpl) {
          customizedMessage = formatCustomMessage(defaultTpl, template[0].templateMessage, data.message, triggerId);
        }
      }
    }

    let result = null;

    // 3. Only insert into database notifications table if in-app notifications are enabled
    if (isInAppEnabled || user.role === "service_requester") {
      result = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: customizedMessage,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        isRead: false,
      });
    }

    // 4. Send external notifications (Email and WhatsApp)
    if (user.role === "service_requester" && user.phone) {
      sendWhatsApp(user.phone, data.title, customizedMessage).catch((err) => {
        console.error("Async WhatsApp error:", err);
      });
    }

    if ((isEmailEnabled || user.role === "service_requester") && user.email) {
      if (!data.title.includes("طلب الاستثناء")) {
        sendEmailNotification(user.email, data.title, customizedMessage).catch((err) => {
          console.error("Async Email error:", err);
        });
      }
    }

    if (isWhatsappEnabled && user.phone && user.role !== "service_requester") {
      sendWhatsApp(user.phone, data.title, customizedMessage).catch((err) => {
        console.error("Async WhatsApp error:", err);
      });
    }

    return result;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// دالة لجلب معرفات جميع المسؤولين عن الطلبات (الذين لديهم أدوار افتراضية أو صلاحية requests.view_details)
// دالة لجلب معرفات جميع المسؤولين عن الطلبات (الذين لديهم خيار receiveBeneficiaryNotifications مفعل)
async function getRequestOfficerIds(db: any, excludeUserId?: number): Promise<number[]> {
  try {
    const candidateUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          ne(users.role, "service_requester")
        )
      );

    const officerIds: number[] = [];
    for (const row of candidateUsers) {
      if (excludeUserId && row.id === excludeUserId) continue;
      officerIds.push(row.id);
    }

    return officerIds;
  } catch (error) {
    console.error("Error in getRequestOfficerIds:", error);
    return [];
  }
}

// دالة لجلب معرفات المسؤولين الذين لديهم خيار receiveRequestNotifications مفعل
async function getRequestNotificationOfficerIds(db: any, excludeUserId?: number): Promise<number[]> {
  try {
    const candidateUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          ne(users.role, "service_requester")
        )
      );

    const officerIds: number[] = [];
    for (const row of candidateUsers) {
      if (excludeUserId && row.id === excludeUserId) continue;
      officerIds.push(row.id);
    }

    return officerIds;
  } catch (error) {
    console.error("Error in getRequestNotificationOfficerIds:", error);
    return [];
  }
}

// دالة لجلب معرفات المسؤولين الذين لديهم خيار receiveFinancialAndContractNotifications مفعل
async function getFinancialNotificationOfficerIds(db: any, excludeUserId?: number): Promise<number[]> {
  try {
    const candidateUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          ne(users.role, "service_requester")
        )
      );

    const officerIds: number[] = [];
    for (const row of candidateUsers) {
      if (excludeUserId && row.id === excludeUserId) continue;
      officerIds.push(row.id);
    }

    return officerIds;
  } catch (error) {
    console.error("Error in getFinancialNotificationOfficerIds:", error);
    return [];
  }
}

// دالة لإرسال إشعار لمجموعة من المستخدمين حسب الدور
export async function notifyUsersByRole(
  roles: string[],
  type: NotificationType,
  title: string,
  message: string,
  relatedType?: string,
  relatedId?: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const userIds = new Set<number>();

    // جلب المستخدمين حسب الأدوار
    const targetUsersByRole = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.role, roles as any), isNull(users.deletedAt)));

    targetUsersByRole.forEach(u => userIds.add(u.id));

    // إذا كانت الأدوار المستهدفة تشمل مسؤولي الطلبات الافتراضيين، نقوم بإضافة المسؤولين ذوي الصلاحية المباشرة أيضاً
    const defaultOfficerRoles = ["super_admin", "system_admin", "projects_office"];
    const targetsRequestOfficers = roles.some(r => defaultOfficerRoles.includes(r));
    
    if (targetsRequestOfficers) {
      const extraOfficers = await getRequestNotificationOfficerIds(db);
      extraOfficers.forEach(id => userIds.add(id));
    }

    // إنشاء إشعارات لجميع المستخدمين
    for (const userId of Array.from(userIds)) {
      if (relatedType === "request") {
        const [userSetting] = await db
          .select({
            role: users.role,
            receiveRequestNotifications: users.receiveRequestNotifications,
            receiveRequestEmail: users.receiveRequestEmail,
            receiveRequestWhatsapp: users.receiveRequestWhatsapp,
            receiveRequestSms: users.receiveRequestSms,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userSetting) {
          const [roleSetting] = await db
            .select({
              receiveRequestNotifications: rolesTable.receiveRequestNotifications,
              receiveRequestEmail: rolesTable.receiveRequestEmail,
              receiveRequestWhatsapp: rolesTable.receiveRequestWhatsapp,
              receiveRequestSms: rolesTable.receiveRequestSms,
            })
            .from(rolesTable)
            .where(eq(rolesTable.id, userSetting.role))
            .limit(1);

          const inAppEnabled = userSetting.receiveRequestNotifications || (roleSetting && roleSetting.receiveRequestNotifications);
          const emailEnabled = userSetting.receiveRequestEmail || (roleSetting && roleSetting.receiveRequestEmail);
          const whatsappEnabled = userSetting.receiveRequestWhatsapp || (roleSetting && roleSetting.receiveRequestWhatsapp);
          const smsEnabled = userSetting.receiveRequestSms || (roleSetting && roleSetting.receiveRequestSms);

          const enabled = inAppEnabled || emailEnabled || whatsappEnabled || smsEnabled;
          if (!enabled) {
            continue;
          }
        }
      }

      await createNotification({
        userId,
        type,
        title,
        message,
        relatedType,
        relatedId,
      });
    }

    // إرسال إشعار للمالك أيضاً
    await notifyOwner({
      title,
      content: message,
    });
  } catch (error) {
    console.error("Error notifying users by role:", error);
  }
}

// دالة لإرسال إشعار عند تقديم طلب جديد
export async function notifyNewRequest(
  requestId: number,
  requestNumber: string,
  programName: string,
  mosqueName: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const officerIds = await getRequestNotificationOfficerIds(db);
    const title = "طلب جديد";
    const message = `تم تقديم طلب جديد رقم ${requestNumber} لبرنامج ${programName} - ${mosqueName}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "request_update",
        title,
        message,
        relatedType: "request",
        relatedId: requestId,
      });
    }

    // إرسال إشعار للمالك أيضاً
    await notifyOwner({
      title,
      content: message,
    });
  } catch (error) {
    console.error("Error in notifyNewRequest:", error);
  }
}

// دالة لإرسال إشعار عند إنشاء طلب جديد (للمستفيد والمدراء)
export async function notifyRequestCreation(
  requestId: number,
  requestNumber: string,
  requesterId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [creator] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    const creatorPerms = await calculateUserPermissions(requesterId);
    const isCreatorAdmin = creator && (
      ["super_admin", "system_admin", "projects_office"].includes(creator.role) ||
      creatorPerms.includes("requests.view_details")
    );

    if (!isCreatorAdmin) {
      // إشعار لمقدم الطلب
      await createNotification({
        userId: requesterId,
        type: "request",
        title: "طلب جديد",
        message: "تم إنشاء طلب جديد وهو بانتظار المعالجة",
        relatedType: "request",
        relatedId: requestId,
      });

      // إشعار للمدراء والمسؤولين
      const officerIds = await getRequestNotificationOfficerIds(db, requesterId);
      const title = "طلب جديد";
      const message = `تم إنشاء طلب جديد رقم ${requestNumber} وهو بانتظار المعالجة`;

      for (const userId of officerIds) {
        await createNotification({
          userId,
          type: "request",
          title,
          message,
          relatedType: "request",
          relatedId: requestId,
        });
      }
    } else {
      // إذا كان مقدم الطلب أحد المسؤولين، لا نرسل له إشعاراً بل نرسل للآخرين فقط
      const officerIds = await getRequestNotificationOfficerIds(db, requesterId);

      const roleLabels: Record<string, string> = {
        super_admin: "المدير العام",
        system_admin: "مدير النظام",
        projects_office: "مكتب المشاريع",
      };
      const roleName = creator ? (roleLabels[creator.role] || creator.role) : "المسؤول";
      const creatorName = creator ? creator.name : "";

      for (const userId of officerIds) {
        await createNotification({
          userId,
          type: "request",
          title: "طلب جديد مضاف من مسؤول",
          message: `قام ${roleName} ${creatorName} بإنشاء طلب جديد رقم ${requestNumber}`,
          relatedType: "request",
          relatedId: requestId,
        });
      }
    }
  } catch (error) {
    console.error("Error in notifyRequestCreation:", error);
  }
}

// دالة لإرسال إشعار عند تسجيل مسجد جديد
// دالة لإرسال إشعار عند تسجيل مسجد جديد
export async function notifyNewMosque(
  mosqueId: number,
  mosqueName: string,
  requesterId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [creator] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    const isCreatorAdmin = creator && ["super_admin", "system_admin", "projects_office"].includes(creator.role);

    if (!isCreatorAdmin) {
      // إشعار للمسؤولين
      const officerIds = await getRequestOfficerIds(db, requesterId);
      for (const userId of officerIds) {
        await createNotification({
          userId,
          type: "mosque",
          title: "مسجد جديد",
          message: `تم تسجيل مسجد جديد "${mosqueName}" وهو بانتظار الاعتماد`,
          relatedType: "mosque",
          relatedId: mosqueId,
        });
      }

      // إشعار لمقدم الطلب لتأكيد استلام طلبه
      await createNotification({
        userId: requesterId,
        type: "mosque",
        title: "مسجد جديد",
        message: "تم إضافة مسجد جديد وهو بانتظار الموافقة",
        relatedType: "mosque",
        relatedId: mosqueId,
      });
    } else {
      // إذا كان مقدم الطلب مسؤولاً، لا نرسل له إشعاراً بل نرسل للآخرين فقط
      const officerIds = await getRequestOfficerIds(db, requesterId);

      const roleLabels: Record<string, string> = {
        super_admin: "المدير العام",
        system_admin: "مدير النظام",
        projects_office: "مكتب المشاريع",
      };
      const roleName = creator ? (roleLabels[creator.role] || creator.role) : "المسؤول";
      const creatorName = creator ? creator.name : "";

      for (const targetId of officerIds) {
        await createNotification({
          userId: targetId,
          type: "mosque",
          title: "تسجيل مسجد من قبل مسؤول",
          message: `قام ${roleName} ${creatorName} بتسجيل مسجد جديد "${mosqueName}"`,
          relatedType: "mosque",
          relatedId: mosqueId,
        });
      }
    }
  } catch (error) {
    console.error("Error in notifyNewMosque:", error);
  }
}

// دالة لإرسال إشعار عند اعتماد مسجد
export async function notifyMosqueApproval(
  mosqueId: number,
  mosqueName: string,
  requesterId: number
) {
  const db = await getDb();
  if (!db) return;

  // 1. إشعار مقدم الطلب (المستفيد)
  await createNotification({
    userId: requesterId,
    type: "mosque",
    title: "تم اعتماد المسجد",
    message: `تم قبول طلب تسجيل المسجد الخاص بك: ${mosqueName}`,
    relatedType: "mosque",
    relatedId: mosqueId,
  });

  // 2. إشعار المسؤولين (مثل الفريق الميداني والمشرفين)
  try {
    const officerIds = await getRequestNotificationOfficerIds(db, requesterId);
    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "mosque",
        title: "تم اعتماد المسجد",
        message: `تم قبول طلب تسجيل المسجد: ${mosqueName}`,
        relatedType: "mosque",
        relatedId: mosqueId,
      });
    }
  } catch (err) {
    console.error("Error in notifyMosqueApproval for officers:", err);
  }
}

// دالة لإرسال إشعار عند تغيير حالة الطلب
export async function notifyRequestStatusChange(
  requestId: number,
  requestNumber: string,
  newStatus: string,
  statusLabel: string,
  requesterId: number
) {
  // إشعار مقدم الطلب
  await createNotification({
    userId: requesterId,
    type: "request_update",
    title: "تحديث حالة الطلب",
    message: `تم تحديث حالة طلبك رقم ${requestNumber} إلى: ${statusLabel}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

// دالة لإرسال إشعار عند إضافة تعليق
export async function notifyNewComment(
  requestId: number,
  requestNumber: string,
  commenterName: string,
  requesterId: number
) {
  await createNotification({
    userId: requesterId,
    type: "info",
    title: "تعليق جديد",
    message: `أضاف ${commenterName} تعليقاً على طلبك رقم ${requestNumber}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

// دالة لإرسال إشعار عند جدولة زيارة ميدانية
export async function notifyFieldVisitScheduled(
  requestId: number,
  requestNumber: string,
  visitDate: Date,
  assignedUserId: number
) {
  await createNotification({
    userId: assignedUserId,
    type: "info",
    title: "زيارة ميدانية مجدولة",
    message: `تم جدولة زيارة ميدانية للطلب رقم ${requestNumber} بتاريخ ${visitDate.toLocaleDateString("ar-SA")}`,
    relatedType: "request",
    relatedId: requestId,
  });
}

// دالة لإرسال إشعار عند تعيين مدير للمشروع
export async function notifyProjectManagerAssigned(
  projectId: number,
  projectNumber: string,
  projectName: string,
  managerId: number
) {
  await createNotification({
    userId: managerId,
    type: "info",
    title: "تعيينك مديراً للمشروع",
    message: `تم تكليفك كمدير للمشروع: "${projectName}" (رقم المشروع: ${projectNumber})`,
    relatedType: "project",
    relatedId: projectId,
  });
}

// دالة لإرسال إشعار للمسؤولين الآخرين عند تغيير مرحلة الطلب من قبل مسؤول آخر
export async function notifyRequestStageChangeToOfficers(
  requestId: number,
  requestNumber: string,
  fromStage: string,
  toStage: string,
  changerId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [changer] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, changerId))
      .limit(1);

    const roleLabels: Record<string, string> = {
      super_admin: "المدير العام",
      system_admin: "مدير النظام",
      projects_office: "مكتب المشاريع",
    };
    const changerRoleLabel = changer ? (roleLabels[changer.role] || changer.role) : "المسؤول";
    const changerName = changer ? changer.name : "";

    const stageLabels: Record<string, string> = {
      submitted: "تقديم الطلب",
      initial_review: "المراجعة الأولية",
      field_visit: "الزيارة الميدانية",
      technical_eval: "التقييم الفني",
      boq_preparation: "إعداد جدول الكميات",
      financial_eval: "التقييم المالي",
      financial_eval_and_approval: "التقييم المالي واعتماد العرض",
      quotation_approval: "اعتماد العرض",
      contracting: "التعاقد",
      execution: "التنفيذ",
      handover: "الاستلام",
      closed: "الإغلاق",
    };

    const newStageLabel = stageLabels[toStage] || toStage;

    const officerIds = await getRequestNotificationOfficerIds(db, changerId);

    const title = "تحديث مرحلة الطلب";
    const message = `قام ${changerRoleLabel} ${changerName} بنقل الطلب رقم ${requestNumber} إلى مرحلة: ${newStageLabel}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "request_update",
        title,
        message,
        relatedType: "request",
        relatedId: requestId,
      });
    }
  } catch (error) {
    console.error("Error in notifyRequestStageChangeToOfficers:", error);
  }
}


export const notificationsRouter = router({
  // جلب إشعارات المستخدم الحالي
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      // Removed restrictive title/message filtering for request officers to ensure all notifications (e.g. comments, status changes, assignments) are visible.

      const [notificationsList, countResult] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(input.limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(and(...conditions)),
      ]);

      return {
        notifications: notificationsList,
        total: countResult[0]?.count || 0,
        page: input.page,
        totalPages: Math.ceil((countResult[0]?.count || 0) / input.limit),
      };
    }),

  // عدد الإشعارات غير المقروءة
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const conditions = [eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)];
    
    // Removed restrictive title/message filtering for request officers to ensure accurate unread count.

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }),

  // تحديد إشعار كمقروء
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));

      return { success: true };
    }),

  // تحديد جميع الإشعارات كمقروءة
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    const conditions = [eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)];

    // Removed restrictive title/message filtering for request officers.

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(...conditions));

    return { success: true };
  }),

  // إرسال إشعار (للمدراء فقط)
  send: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        roles: z.array(z.string()).optional(),
        type: z.string().default("general"),
        title: z.string().min(1),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      if (input.userId) {
        // إرسال لمستخدم محدد
        await createNotification({
          userId: input.userId,
          type: input.type as NotificationType,
          title: input.title,
          message: input.message,
        });
      } else if (input.roles && input.roles.length > 0) {
        // إرسال لمجموعة أدوار
        await notifyUsersByRole(
          input.roles,
          input.type as NotificationType,
          input.title,
          input.message
        );
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب تحديد مستخدم أو أدوار لإرسال الإشعار",
        });
      }

      return { success: true };
    }),

  // حذف إشعار
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .delete(notifications)
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));

      return { success: true };
    }),

  // جلب إعدادات مشغلات الإشعارات لجميع الأدوار
  getTriggerSettings: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      return db.select().from(notificationTriggerSettings);
    }),

  // تحديث إعدادات مشغلات الإشعارات
  updateTriggerSetting: protectedProcedure
    .input(
      z.object({
        triggerId: z.string(),
        roleId: z.string(),
        channel: z.enum(["in_app", "email", "whatsapp", "sms"]),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .insert(notificationTriggerSettings)
        .values({
          triggerId: input.triggerId,
          roleId: input.roleId,
          channel: input.channel,
          enabled: input.enabled,
        })
        .onDuplicateKeyUpdate({
          set: {
            enabled: input.enabled,
          },
        });

      return { success: true };
    }),

  // جلب قوالب رسائل الإشعارات المخصصة
  getNotificationTemplates: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      return db.select().from(notificationTemplates);
    }),

  // تحديث أو إنشاء قالب رسالة إشعار مخصصة
  updateNotificationTemplate: protectedProcedure
    .input(
      z.object({
        triggerId: z.string(),
        templateMessage: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .insert(notificationTemplates)
        .values({
          triggerId: input.triggerId,
          templateMessage: input.templateMessage,
        })
        .onDuplicateKeyUpdate({
          set: {
            templateMessage: input.templateMessage,
          },
        });

      return { success: true };
    }),
});

export async function notifySupplierRegistration(supplierId: number, supplierName: string) {
  const db = await getDb();
  if (!db) return;

  try {
    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "مورد جديد قيد المراجعة";
    const message = `تم تسجيل مورد جديد في البوابة: "${supplierName}" وهو بانتظار المراجعة والاعتماد`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "info",
        title,
        message,
        relatedType: "supplier",
        relatedId: supplierId,
      });
    }
  } catch (error) {
    console.error("Error in notifySupplierRegistration:", error);
  }
}

export async function notifySupplierApproval(supplierId: number, supplierName: string, approverName: string) {
  const db = await getDb();
  if (!db) return;

  try {
    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "اعتماد مورد";
    const message = `قام المسؤول ${approverName} باعتماد المورد: "${supplierName}" بنجاح`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title,
        message,
        relatedType: "supplier",
        relatedId: supplierId,
      });
    }
  } catch (error) {
    console.error("Error in notifySupplierApproval:", error);
  }
}

export async function notifySupplierRejection(supplierId: number, supplierName: string, rejecterName: string, reason: string) {
  const db = await getDb();
  if (!db) return;

  try {
    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "رفض مورد";
    const message = `قام المسؤول ${rejecterName} برفض المورد: "${supplierName}" بسبب: ${reason}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "error",
        title,
        message,
        relatedType: "supplier",
        relatedId: supplierId,
      });
    }
  } catch (error) {
    console.error("Error in notifySupplierRejection:", error);
  }
}

export async function notifyQuotationCreation(
  quotationId: number,
  quotationNumber: string,
  requestId: number | null,
  projectId: number | null,
  supplierId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [supplier] = await db
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    const supplierName = supplier ? supplier.name : "غير معروف";

    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "إضافة عرض سعر جديد";
    const message = `تم إضافة عرض سعر جديد رقم "${quotationNumber}" من قبل المورد "${supplierName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "info",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyQuotationCreation:", error);
  }
}

export async function notifyQuotationApproval(
  quotationId: number,
  quotationNumber: string,
  requestId: number | null,
  projectId: number | null,
  supplierId: number,
  approvedAmount: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [supplier] = await db
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    const supplierName = supplier ? supplier.name : "غير معروف";

    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "اعتماد عرض سعر";
    const message = `تم اعتماد عرض السعر رقم "${quotationNumber}" للمورد "${supplierName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""} بقيمة ${approvedAmount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyQuotationApproval:", error);
  }
}

export async function notifyContractCreation(
  contractId: number,
  contractNumber: string,
  contractTitle: string,
  secondPartyName: string,
  contractAmount: string,
  requestId: number | null,
  projectId: number | null
) {
  const db = await getDb();
  if (!db) return;

  try {
    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "إنشاء عقد مع مورد";
    const message = `تم إنشاء عقد جديد رقم "${contractNumber}" مع المورد "${secondPartyName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""} بقيمة ${contractAmount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "info",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyContractCreation:", error);
  }
}

export async function notifyContractApproval(
  contractId: number,
  contractNumber: string,
  contractTitle: string,
  secondPartyName: string,
  contractAmount: string,
  requestId: number | null,
  projectId: number | null
) {
  const db = await getDb();
  if (!db) return;

  try {
    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "اعتماد عقد مع مورد";
    const message = `تم اعتماد العقد رقم "${contractNumber}" للمورد "${secondPartyName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""} بقيمة ${contractAmount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyContractApproval:", error);
  }
}

export async function notifyProgressReportCreation(
  reportId: number,
  reportNumber: string,
  reportTitle: string,
  projectId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [project] = await db
      .select({ name: projects.name, requestId: projects.requestId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const projectName = project ? project.name : "غير معروف";
    const requestId = project ? project.requestId : null;

    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "إنشاء تقرير إنجاز";
    const message = `تم إنشاء تقرير إنجاز جديد رقم "${reportNumber}" للمشروع "${projectName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "info",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyProgressReportCreation:", error);
  }
}

export async function notifyProgressReportApproval(
  reportId: number,
  reportNumber: string,
  reportTitle: string,
  projectId: number
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [project] = await db
      .select({ name: projects.name, requestId: projects.requestId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const projectName = project ? project.name : "غير معروف";
    const requestId = project ? project.requestId : null;

    let requestNumber = "";
    if (requestId) {
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, requestId))
        .limit(1);
      if (req) {
        requestNumber = req.requestNumber;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const title = "اعتماد تقرير إنجاز";
    const message = `تم اعتماد تقرير الإنجاز رقم "${reportNumber}" للمشروع "${projectName}" ${requestNumber ? `للطلب رقم ${requestNumber}` : ""}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title,
        message,
        relatedType: "request",
        relatedId: requestId || undefined,
      });
    }
  } catch (error) {
    console.error("Error in notifyProgressReportApproval:", error);
  }
}

export async function notifyDisbursementRequestCreation(
  requestId: number,
  requestNumber: string,
  title: string,
  amount: string,
  projectId: number | null
) {
  const db = await getDb();
  if (!db) return;

  try {
    let projectName = "";
    if (projectId) {
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (project) {
        projectName = project.name;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const notificationTitle = "إنشاء طلب صرف";
    const message = `تم إنشاء طلب صرف جديد رقم "${requestNumber}" ("${title}")${projectName ? ` للمشروع "${projectName}"` : ""} بقيمة ${amount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "info",
        title: notificationTitle,
        message,
        relatedType: "disbursement_request",
        relatedId: requestId,
      });
    }
  } catch (error) {
    console.error("Error in notifyDisbursementRequestCreation:", error);
  }
}

export async function notifyDisbursementOrderCreation(
  orderId: number,
  orderNumber: string,
  requestNumber: string,
  amount: string,
  projectId: number | null
) {
  const db = await getDb();
  if (!db) return;

  try {
    let projectName = "";
    if (projectId) {
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (project) {
        projectName = project.name;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const notificationTitle = "تحويل إلى أمر صرف";
    const message = `تم تحويل طلب الصرف رقم "${requestNumber}" إلى أمر صرف رقم "${orderNumber}"${projectName ? ` للمشروع "${projectName}"` : ""} بقيمة ${amount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title: notificationTitle,
        message,
        relatedType: "disbursement_order",
        relatedId: orderId,
      });
    }
  } catch (error) {
    console.error("Error in notifyDisbursementOrderCreation:", error);
  }
}

export async function notifyDisbursementOrderApproval(
  orderId: number,
  orderNumber: string,
  requestNumber: string,
  amount: string,
  projectId: number | null
) {
  const db = await getDb();
  if (!db) return;

  try {
    let projectName = "";
    if (projectId) {
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (project) {
        projectName = project.name;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const notificationTitle = "اعتماد أمر صرف";
    const message = `تم اعتماد أمر الصرف رقم "${orderNumber}" (طلب رقم "${requestNumber}")${projectName ? ` للمشروع "${projectName}"` : ""} بقيمة ${amount} ريال`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "success",
        title: notificationTitle,
        message,
        relatedType: "disbursement_order",
        relatedId: orderId,
      });
    }
  } catch (error) {
    console.error("Error in notifyDisbursementOrderApproval:", error);
  }
}

export async function notifyDisbursementOrderRejection(
  orderId: number,
  orderNumber: string,
  requestNumber: string,
  amount: string,
  projectId: number | null,
  reason: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    let projectName = "";
    if (projectId) {
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (project) {
        projectName = project.name;
      }
    }

    const officerIds = await getFinancialNotificationOfficerIds(db);
    const notificationTitle = "رفض أمر صرف";
    const message = `تم رفض أمر الصرف رقم "${orderNumber}" (طلب رقم "${requestNumber}")${projectName ? ` للمشروع "${projectName}"` : ""} بقيمة ${amount} ريال بسبب: ${reason}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "error",
        title: notificationTitle,
        message,
        relatedType: "disbursement_order",
        relatedId: orderId,
      });
    }
  } catch (error) {
    console.error("Error in notifyDisbursementOrderRejection:", error);
  }
}

export async function notifyNotesResponseSubmitted(
  requesterId: number,
  isRejectionResponse: boolean
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [requester] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    if (!requester) return;

    // Get administrators/officers to notify
    const officerIds = await getRequestOfficerIds(db);

    const title = isRejectionResponse ? "تقديم رد على الرفض" : "تقديم رد على الملاحظات";
    const message = `قام المستفيد ${requester.name} بتقديم رد على ${isRejectionResponse ? "الرفض" : "الملاحظات"}`;

    for (const userId of officerIds) {
      await createNotification({
        userId,
        type: "request_update",
        title,
        message,
        relatedType: "requester_approval",
        relatedId: requesterId,
      });
    }
  } catch (error) {
    console.error("Error in notifyNotesResponseSubmitted:", error);
  }
}
