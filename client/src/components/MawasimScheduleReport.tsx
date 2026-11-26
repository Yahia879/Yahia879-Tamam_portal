import { displayQuantity } from "@/components/MawasimRequestForm";
import {
  formatSeasonalRequesterType,
  getSeasonalCity,
  getSeasonalGovernorate,
  seasonalMosqueLimit,
  seasonalServiceIds,
  seasonalServices,
  type SeasonalQuantities,
  type SeasonalSettings,
} from "@shared/mawasim";

export interface MawasimPrintableRequest {
  id: number;
  seasonId: number;
  mosqueName: string;
  status: string;
  createdAt?: Date | string | null;
  scheduledFor?: string | null;
  assignee?: string | null;
  governorate?: string | null;
  mosqueCity?: string | null;
  applicantName?: string | null;
  applicantPhone?: string | null;
  applicantEmail?: string | null;
  applicantNationalId?: string | null;
  applicantCity?: string | null;
  applicantRequesterType?: string | null;
  imamName?: string | null;
  imamPhone?: string | null;
  imamEmail?: string | null;
  specialRequest?: string | null;
  reviewNote?: string | null;
  contact: {
    name: string;
    phone: string;
    email?: string | null;
    reason?: string;
  };
  snapshot: {
    city: string;
    district: string;
    address: string;
    worshippers: number;
    men?: { lengthCm: number; widthCm: number } | null;
    women?: { lengthCm: number; widthCm: number } | null;
  };
  requested: SeasonalQuantities;
  approved?: SeasonalQuantities | null;
}

export interface MawasimPrintableSeason {
  id: number;
  title: string;
  hijriYear: number;
  managerName?: string | null;
  settings: SeasonalSettings;
}

function formatDateValue(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

export function MawasimScheduleReportDocument({
  request,
  season,
  orgSettings,
}: {
  request: MawasimPrintableRequest;
  season: MawasimPrintableSeason;
  orgSettings?: {
    organizationName?: string | null;
    officialReportsName?: string | null;
    logoUrl?: string | null;
  } | null;
}) {
  const requesterName = request.applicantName?.trim() || request.contact?.name?.trim() || request.imamName?.trim() || "—";
  const requesterTypeLabel = formatSeasonalRequesterType(request.applicantRequesterType) || "غير محدد";
  const requesterPhone = request.applicantPhone?.trim() || request.contact?.phone?.trim() || request.imamPhone?.trim() || "—";
  const requesterEmail = request.applicantEmail?.trim() || request.contact?.email?.trim() || request.imamEmail?.trim() || "—";
  const requesterNationalId = request.applicantNationalId?.trim() || "—";
  const requesterCity = request.applicantCity?.trim() || "—";

  const governorate = getSeasonalGovernorate({ governorate: request.governorate ?? null }) || "—";
  const city = getSeasonalCity({ snapshot: request.snapshot, mosqueCity: request.mosqueCity ?? null }) || "—";
  const requestedServices = seasonalServiceIds.filter(
    service => (request.requested[service] ?? 0) > 0 || (request.approved?.[service] ?? 0) > 0,
  );
  const { men, women } = request.snapshot;

  return (
    <div
      dir="rtl"
      className="w-full border-[3px] border-[#1a5f4a] p-3 sm:p-6 rounded-lg relative overflow-hidden bg-white text-slate-900 shadow-lg print:shadow-none print:border-[2px] print:p-4 print:overflow-visible"
    >
      {/* خط ذهبي داخلي رفيع مطابق لتنسيق تقرير الإنجاز */}
      <div className="absolute inset-1.5 border border-[#d4a574] rounded pointer-events-none print:hidden" />

      <div className="relative z-10 print:overflow-visible">
        {/* الترويسة: الشعار والتاريخ ورقم الطلب */}
        <div className="flex flex-col sm:flex-row print:flex-row justify-between items-center sm:items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            {orgSettings?.logoUrl ? (
              <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 sm:h-16 w-auto shrink-0 print:h-14" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#1a5f4a]/10 rounded-lg flex items-center justify-center shrink-0 print:w-14 print:h-14">
                <span className="text-[#1a5f4a] font-bold text-xl sm:text-2xl">تمام</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-[#1a5f4a] break-words print:text-sm">
                {orgSettings?.officialReportsName || orgSettings?.organizationName || "بوابة منارة للعناية بالمساجد"}
              </div>
              <div className="text-xs text-gray-500">برنامج مواسم — إدارة المشاريع والصيانة</div>
            </div>
          </div>

          <div className="text-xs space-y-1 text-center sm:text-left print:text-left sm:pl-5 print:pl-5 shrink-0">
            <div className="flex gap-2 justify-center sm:justify-end print:justify-end">
              <span className="font-bold">تاريخ الطلب:</span>
              <span className="border-b border-dotted border-gray-400 px-2 sm:px-3">{formatDateValue(request.createdAt)}</span>
            </div>
            <div className="flex gap-2 justify-center sm:justify-end print:justify-end">
              <span className="font-bold">موعد التنفيذ:</span>
              <span className="border-b border-dotted border-gray-400 px-2 sm:px-3 font-mono font-bold text-[#1a5f4a]">
                {request.scheduledFor || "—"}
              </span>
            </div>
            <div className="flex gap-2 justify-center sm:justify-end print:justify-end">
              <span className="font-bold">رقم الطلب:</span>
              <span className="border-b border-dotted border-gray-400 px-2 sm:px-3 font-mono">#{request.id}</span>
            </div>
          </div>
        </div>

        {/* البانر الرئيسي */}
        <div
          className="text-center py-3.5 sm:py-4 px-4 sm:px-6 mb-5 sm:mb-6 rounded-lg"
          style={{ backgroundColor: "#1a5f4a", color: "white" }}
        >
          <h1 className="text-lg sm:text-2xl font-bold leading-snug">
            أمر العمل — جدول تنفيذ طلب برنامج مواسم
          </h1>
          <p className="text-xs sm:text-sm opacity-90 mt-1 break-words">
            {season.title} ({season.hijriYear} هـ) — {request.mosqueName}
          </p>
        </div>

        {/* القسم الأول: معلومات المستفيد */}
        <div className="mb-5 sm:mb-6">
          <h3
            className="font-bold py-2 px-3 sm:px-4 rounded mb-3 flex items-center leading-snug text-xs sm:text-base"
            style={{ backgroundColor: "#d4a574", color: "#5d4037" }}
          >
            1. معلومات المستفيد (طالب الخدمة):
          </h3>

          <div className="sm:hidden print:hidden grid grid-cols-1 gap-2 text-xs">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
              <span className="font-bold text-gray-500 text-[11px]">اسم المستفيد</span>
              <span className="font-semibold text-gray-900">{requesterName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">الصفة</span>
                <span className="font-semibold text-[#1a5f4a]">{requesterTypeLabel}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">رقم الجوال</span>
                <span className="font-semibold text-gray-900" dir="ltr">{requesterPhone}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">رقم الهوية الوطنية</span>
                <span className="text-gray-900 font-mono">{requesterNationalId}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">مدينة المستفيد</span>
                <span className="text-gray-900">{requesterCity}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
              <span className="font-bold text-gray-500 text-[11px]">البريد الإلكتروني</span>
              <span className="text-gray-900" dir="ltr">{requesterEmail}</span>
            </div>
          </div>

          <div className="hidden sm:block print:block overflow-x-auto w-full">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold w-36 text-gray-600">اسم المستفيد:</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{requesterName}</td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold w-36 text-gray-600">الصفة المسجلة:</td>
                  <td className="py-2.5 px-3 font-bold text-[#1a5f4a]">{requesterTypeLabel}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">رقم الجوال:</td>
                  <td className="py-2.5 px-3 text-gray-900 font-mono" dir="ltr">{requesterPhone}</td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">البريد الإلكتروني:</td>
                  <td className="py-2.5 px-3 text-gray-900" dir="ltr">{requesterEmail}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">رقم الهوية الوطنية:</td>
                  <td className="py-2.5 px-3 text-gray-900 font-mono">{requesterNationalId}</td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">مدينة المستفيد:</td>
                  <td className="py-2.5 px-3 text-gray-900">{requesterCity}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* القسم الثاني: معلومات المسجد والجدولة */}
        <div className="mb-5 sm:mb-6">
          <h3
            className="font-bold py-2 px-3 sm:px-4 rounded mb-3 flex items-center leading-snug text-xs sm:text-base"
            style={{ backgroundColor: "#d4a574", color: "#5d4037" }}
          >
            2. معلومات المسجد وموعد التنفيذ:
          </h3>

          <div className="sm:hidden print:hidden grid grid-cols-1 gap-2 text-xs">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
              <span className="font-bold text-gray-500 text-[11px]">اسم المسجد</span>
              <span className="font-semibold text-gray-900">{request.mosqueName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">المحافظة / المدينة</span>
                <span className="text-gray-900">{[governorate, city].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">الحي</span>
                <span className="text-gray-900">{request.snapshot.district || "—"}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
              <span className="font-bold text-gray-500 text-[11px]">العنوان التفصيلي</span>
              <span className="text-gray-900">{request.snapshot.address || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">عدد المصلين</span>
                <span className="text-gray-900">{request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-col gap-0.5">
                <span className="font-bold text-gray-500 text-[11px]">موعد التنفيذ المجدول</span>
                <span className="font-bold text-[#1a5f4a] font-mono">{request.scheduledFor || "—"}</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block print:block overflow-x-auto w-full">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold w-36 text-gray-600">اسم المسجد:</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{request.mosqueName}</td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold w-36 text-gray-600">المحافظة / المدينة:</td>
                  <td className="py-2.5 px-3 text-gray-900">{[governorate, city].filter(Boolean).join(" · ")}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">الحي / العنوان:</td>
                  <td className="py-2.5 px-3 text-gray-900">
                    {[request.snapshot.district, request.snapshot.address].filter(Boolean).join(" — ") || "—"}
                  </td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">عدد المصلين:</td>
                  <td className="py-2.5 px-3 text-gray-900">{request.snapshot.worshippers.toLocaleString("ar-SA")} مصلٍ</td>
                </tr>
                {(men || women) && (
                  <tr className="border-b">
                    <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">أبعاد مصلى الرجال:</td>
                    <td className="py-2.5 px-3 text-gray-900">
                      {men ? `${men.lengthCm / 100} × ${men.widthCm / 100} م` : "—"}
                    </td>
                    <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">أبعاد مصلى النساء:</td>
                    <td className="py-2.5 px-3 text-gray-900">
                      {women ? `${women.lengthCm / 100} × ${women.widthCm / 100} م` : "لا يوجد"}
                    </td>
                  </tr>
                )}
                <tr className="border-b">
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">موعد التنفيذ المجدول:</td>
                  <td className="py-2.5 px-3 font-bold text-[#1a5f4a] font-mono">{request.scheduledFor || "—"}</td>
                  <td className="py-2.5 px-2 bg-gray-50/60 font-bold text-gray-600">المكلّف بالتنفيذ:</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">
                    {request.assignee?.trim() || "غير محدد"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* القسم الثالث: الخدمات والكميات المطلوبة */}
        <div className="mb-5 sm:mb-6">
          <h3
            className="font-bold py-2 px-3 sm:px-4 rounded mb-3 flex items-center leading-snug text-xs sm:text-base"
            style={{ backgroundColor: "#d4a574", color: "#5d4037" }}
          >
            3. تفاصيل الخدمات والكميات المطلوبة:
          </h3>

          <div className="overflow-x-auto w-full">
            <table className="w-full border text-xs sm:text-sm mb-3">
              <thead>
                <tr className="bg-gray-100/80 border-b">
                  <th className="p-2 sm:p-3 text-right font-bold">الخدمة المطلوبة</th>
                  <th className="p-2 sm:p-3 text-center font-bold">الكمية المطلوبة</th>
                  {request.approved && <th className="p-2 sm:p-3 text-center font-bold">الكمية المعتمدة</th>}
                  <th className="p-2 sm:p-3 text-center font-bold">الوحدة</th>
                  <th className="p-2 sm:p-3 text-center font-bold">سقف المسجد</th>
                </tr>
              </thead>
              <tbody>
                {requestedServices.length > 0 ? (
                  requestedServices.map(service => {
                    const meta = seasonalServices[service];
                    const requestedAmount = request.requested[service] ?? 0;
                    const approvedAmount = request.approved?.[service] ?? 0;
                    const ceiling = seasonalMosqueLimit(service, season.settings, request.snapshot.worshippers);
                    return (
                      <tr key={service} className="border-b">
                        <td className="p-2 sm:p-3 font-semibold text-gray-900">{meta.label}</td>
                        <td className="p-2 sm:p-3 text-center font-bold text-[#1a5f4a] tabular-nums">
                          {displayQuantity(service, requestedAmount)}
                        </td>
                        {request.approved && (
                          <td className="p-2 sm:p-3 text-center font-bold text-sky-700 tabular-nums">
                            {displayQuantity(service, approvedAmount)}
                          </td>
                        )}
                        <td className="p-2 sm:p-3 text-center text-gray-600">{meta.unit}</td>
                        <td className="p-2 sm:p-3 text-center text-gray-700 tabular-nums">
                          {Number.isFinite(ceiling) ? `${displayQuantity(service, ceiling)} ${meta.unit}` : "بدون سقف"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={request.approved ? 5 : 4} className="p-3 text-center text-gray-500">
                      لا توجد كميات خدمات محددة في هذا الطلب.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(request.specialRequest || request.contact?.reason || request.reviewNote) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs space-y-1.5">
              {request.specialRequest && (
                <p>
                  <strong className="text-[#5d4037]">طلب خاص: </strong>
                  <span className="text-gray-800">{request.specialRequest}</span>
                </p>
              )}
              {request.contact?.reason && (
                <p>
                  <strong className="text-[#5d4037]">ملاحظة التسجيل: </strong>
                  <span className="text-gray-800">{request.contact.reason}</span>
                </p>
              )}
              {request.reviewNote && (
                <p>
                  <strong className="text-[#5d4037]">ملاحظة المراجعة: </strong>
                  <span className="text-gray-800">{request.reviewNote}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* التذييل */}
        <div className="mt-6 pt-3 border-t text-center text-gray-400 text-[10px]">
          <p>
            تم توليد أمر العمل آلياً من نظام {orgSettings?.organizationName || "بوابة منارة"} الإلكترونية للعناية بالمساجد.
          </p>
          <p className="mt-1">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")} - صفحة 1 من 1</p>
        </div>
      </div>
    </div>
  );
}
