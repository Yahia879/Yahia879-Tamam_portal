import type { Request } from "express";
import { getDb } from "./db";
import { organizationSettings } from "../drizzle/schema";

interface CachedSettings {
  siteTitle: string;
  orgName: string;
  description: string;
  logoUrl: string;
  timestamp: number;
}

let cachedSettings: CachedSettings | null = null;
const CACHE_TTL = 30000; // 30 ثانية لمنع الاستعلام المتكرر مع الاستجابة السريعة للتحديثات

export function invalidateSeoCache() {
  cachedSettings = null;
}

export async function getCachedOrgSettings(): Promise<CachedSettings> {
  const now = Date.now();
  if (cachedSettings && now - cachedSettings.timestamp < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const db = await getDb();
    if (db) {
      const rows = await db.select().from(organizationSettings).limit(1);
      if (rows && rows.length > 0) {
        const s = rows[0];
        const siteTitle = s.metaTitle?.trim() || s.organizationName?.trim() || "البوابة الإلكترونية";
        const orgName = s.organizationName?.trim() || siteTitle;
        const description = s.aboutOrganization?.trim() || `${orgName} - البوابة الإلكترونية الموحدة`;
        const logoUrl = s.logoUrl?.trim() || "/logo.svg";

        cachedSettings = {
          siteTitle,
          orgName,
          description,
          logoUrl,
          timestamp: now,
        };
        return cachedSettings;
      }
    }
  } catch (err) {
    console.warn("[SEO] Error fetching organization settings:", err);
  }

  return {
    siteTitle: "البوابة الإلكترونية",
    orgName: "الجمعية",
    description: "البوابة الإلكترونية الموحدة",
    logoUrl: "/logo.svg",
    timestamp: now,
  };
}

const ROUTE_NAMES: Record<string, string> = {
  "/": "",
  "/login": "تسجيل الدخول",
  "/admin/login": "تسجيل دخول المشرفين",
  "/register": "إنشاء حساب جديد",
  "/profile": "الملف الشخصي",
  "/notifications": "الإشعارات",
  "/notifications/customization": "تخصيص الإشعارات",
  "/support": "الدعم الفني",
  "/dashboard": "الرئيسية",
  "/requester": "لوحة تحكم طالب الخدمة",
  "/requester/dashboard": "لوحة تحكم طالب الخدمة",
  "/supplier/dashboard": "لوحة تحكم المورد",
  "/supplier-registration": "تسجيل مورد جديد",
  "/supplier/join": "تسجيل مورد جديد",
  "/supplier/register": "تسجيل مورد",
  "/mosques": "المساجد",
  "/mosques/map": "خريطة المساجد",
  "/mosques/new": "إضافة مسجد جديد",
  "/track": "متابعة الطلب",
  "/service-request": "طلب خدمة",
  "/requests": "الطلبات",
  "/projects": "المشاريع",
  "/organization-settings": "إعدادات الجمعية",
  "/branding": "الهوية البصرية",
  "/suppliers": "الموردون",
  "/contracts": "العقود",
  "/disbursements": "طلبات الصرف",
  "/disbursement-orders": "أوامر الصرف",
  "/receipt-vouchers": "سندات القبض",
  "/staff": "إدارة المستخدمين والأدوار",
  "/users": "إدارة المستخدمين",
  "/roles": "إدارة الأدوار",
  "/financial-dashboard": "لوحة المؤشرات المالية",
  "/kpi-dashboard": "مؤشرات الأداء",
  "/board-dashboard": "لوحة مجلس الإدارة",
  "/forms-customization": "تخصيص النماذج",
};

export function getPageTitle(pathname: string): string {
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (ROUTE_NAMES[clean] !== undefined) {
    return ROUTE_NAMES[clean];
  }
  if (clean.startsWith("/suppliers/")) return "تفاصيل المورد";
  if (clean.startsWith("/requests/")) return "تفاصيل الطلب";
  if (clean.startsWith("/mosques/")) return "تفاصيل المسجد";
  if (clean.startsWith("/contracts/")) return "تفاصيل العقد";
  if (clean.startsWith("/disbursement-orders/")) return "أمر الصرف";
  return "";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function injectSeoTags(html: string, req: Request): Promise<string> {
  const settings = await getCachedOrgSettings();
  const pageName = getPageTitle(req.originalUrl || req.url || "/");

  const fullTitle = pageName
    ? `${pageName} - ${settings.siteTitle}`
    : settings.siteTitle;

  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const baseUrl = host ? `${protocol}://${host}` : "";
  const canonicalUrl = `${baseUrl}${req.originalUrl || ""}`;

  let imageUrl = settings.logoUrl;
  if (imageUrl && !imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }

  const escapedTitle = escapeHtml(fullTitle);
  const escapedSiteName = escapeHtml(settings.siteTitle);
  const escapedDescription = escapeHtml(settings.description);
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedUrl = escapeHtml(canonicalUrl);

  const metaTags = `
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <!-- Open Graph / Social Media Sharing (WhatsApp, Facebook, Twitter, Telegram, etc.) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapedSiteName}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:url" content="${escapedUrl}" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />
  `.trim();

  let result = html;
  if (/<title>.*?<\/title>/i.test(result)) {
    result = result.replace(/<title>.*?<\/title>/i, metaTags);
  } else {
    result = result.replace("</head>", `  ${metaTags}\n  </head>`);
  }

  return result;
}
