import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSeasonalSettings, MAWASIM_PERMISSIONS } from "../shared/mawasim";
import { sectionPermissionSelection } from "../shared/sectionPermissions";

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  sessionPermissions: ["*", "mawasim.view", "mawasim.create", "mawasim.manage"] as string[],
  role: "super_admin",
  data: {} as Record<string, any>,
  queries: [] as { path: string; enabled: boolean }[],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: state.role, permissions: state.sessionPermissions } }),
}));
vi.mock("wouter", () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/mawasim", vi.fn()],
  useSearch: () => "",
}));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/FileUpload", () => ({ FileUpload: () => null }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, {
      get: (_target, name: string) => {
        if (name === "useQuery") {
          return (_input: any, options: any = {}) => {
            const key = path.join(".");
            const enabled = options.enabled !== false;
            state.queries.push({ path: key, enabled });
            const value = key === "permissions.getUserPermissions" ? state.permissions : state.data[key];
            return { data: enabled ? value : undefined, isLoading: false, error: null, refetch: vi.fn() };
          };
        }
        if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
        if (name === "useUtils") return () => proxy();
        return proxy([...path, name]);
      },
    });
  }
  return { trpc: proxy() };
});

let MawasimStaff: React.ComponentType;
let RequestDetails: React.ComponentType<any>;
let SeasonEditor: React.ComponentType<any>;
let MawasimScheduleReportDocument: React.ComponentType<any>;
let filterAndSortSeasonRequests: any;
let buildSeasonalExcelPayload: any;
let Requests: React.ComponentType;
let SeasonalRequestCreate: React.ComponentType;

beforeAll(async () => {
  vi.stubGlobal("React", React);
  const staffMod = await import("../client/src/pages/MawasimStaff");
  MawasimStaff = staffMod.default;
  RequestDetails = staffMod.RequestDetails;
  SeasonEditor = staffMod.SeasonEditor;
  MawasimScheduleReportDocument = (await import("../client/src/components/MawasimScheduleReport")).MawasimScheduleReportDocument;
  filterAndSortSeasonRequests = staffMod.filterAndSortSeasonRequests;
  buildSeasonalExcelPayload = staffMod.buildSeasonalExcelPayload;
  Requests = (await import("../client/src/pages/Requests")).default;
  SeasonalRequestCreate = (await import("../client/src/pages/SeasonalRequestCreate")).default;
});

function sampleStaffData(withSeason = true) {
  const settings = defaultSeasonalSettings();
  const season = withSeason
    ? { id: 10, hijriYear: 1448, title: "موسم رمضان 1448", managerId: 5, managerName: "خالد العمري", isOpen: true, settings }
    : null;
  return {
    season,
    seasons: season ? [season] : [],
    employees: [
      { id: 5, name: "خالد العمري", email: "khaled@example.com", role: "project_manager", roleNameAr: "مدير المشروع", position: "مدير برامج", department: "المشاريع" },
      { id: 8, name: "فاطمة السالم", email: "fatima@example.com", role: "projects_office", roleNameAr: "مكتب المشاريع", position: null, department: null },
    ],
    capacity: [],
    requests: [],
  };
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: () => null });
  state.role = "super_admin";
  state.permissions = ["mawasim.view"];
  state.sessionPermissions = ["*", "mawasim.view", "mawasim.create", "mawasim.manage"];
  state.queries = [];
  state.data = {
    "mawasim.staff": sampleStaffData(true),
    "mawasim.searchMosques": [],
    "requests.search": { requests: [], total: 0 },
  };
});

describe.each(["super_admin", "system_admin", "projects_office", "custom_role_test"])(
  "Mawasim UI permission boundaries for %s",
  role => {
    beforeEach(() => {
      state.role = role;
    });

    it("view-only hides 'إضافة موسم', 'إضافة أول موسم', and 'إعدادات الموسم' in both populated and empty states (ignoring stale session perms)", () => {
      state.permissions = ["mawasim.view"];
      // Populated state
      const populatedHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(populatedHtml).toContain("برنامج مواسم");
      expect(populatedHtml).toContain("عام 1448 هـ");
      expect(populatedHtml).toContain("السعة والمتابعة");
      expect(populatedHtml).not.toContain("إضافة موسم");
      expect(populatedHtml).not.toContain("إعدادات الموسم");
      expect(populatedHtml).not.toContain("إنشاء موسم جديد");
      expect(populatedHtml).not.toContain("افتح «إعدادات الموسم»");

      // Empty state (no seasons yet) - critical check!
      state.data["mawasim.staff"] = sampleStaffData(false);
      const emptyHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(emptyHtml).toContain("لا توجد مواسم محفوظة بعد");
      expect(emptyHtml).not.toContain("إضافة موسم");
      expect(emptyHtml).not.toContain("إضافة أول موسم");
      expect(emptyHtml).not.toContain("ابدأ بإنشاء موسم جديد");
      expect(emptyHtml).not.toContain("إنشاء موسم جديد");
    });

    it("shows 'إضافة موسم' / 'إضافة أول موسم' only when mawasim.create is granted", () => {
      state.permissions = ["mawasim.view", "mawasim.create"];
      const populatedHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(populatedHtml).toContain("إضافة موسم");
      expect(populatedHtml).not.toContain("إعدادات الموسم");

      state.data["mawasim.staff"] = sampleStaffData(false);
      const emptyHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(emptyHtml).toContain("إضافة أول موسم");
    });

    it("shows 'إعدادات الموسم' only when mawasim.manage is granted without exposing 'إضافة موسم'", () => {
      state.permissions = ["mawasim.view", "mawasim.manage"];
      const populatedHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(populatedHtml).toContain("إعدادات الموسم");
      expect(populatedHtml).not.toContain("إضافة موسم");

      state.data["mawasim.staff"] = sampleStaffData(false);
      const emptyHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(emptyHtml).not.toContain("إضافة أول موسم");
    });

    it("blocks view and stops queries when permissions are revoked or only wildcard exists", () => {
      for (const perms of [[], ["*"]]) {
        state.permissions = perms;
        state.queries = [];
        const staffHtml = renderToStaticMarkup(<MawasimStaff />);
        expect(staffHtml).toContain("ليس لديك صلاحية");
        expect(state.queries.find(q => q.path === "mawasim.staff")?.enabled).toBe(false);

        const reqHtml = renderToStaticMarkup(<Requests />);
        expect(reqHtml).not.toContain("/requests/seasonal");

        const createReqHtml = renderToStaticMarkup(<SeasonalRequestCreate />);
        expect(createReqHtml).toContain("ليس لديك صلاحية");
      }

      // Granting requests.create_seasonal_request shows the "برنامج مواسم" button in /requests for any role (not just super_admin)
      state.permissions = ["requests.view", "requests.create_seasonal_request"];
      const reqWithSeasonalPermHtml = renderToStaticMarkup(<Requests />);
      expect(reqWithSeasonalPermHtml).toContain("/requests/seasonal");
      expect(reqWithSeasonalPermHtml).toContain("برنامج مواسم");
      const createWithSeasonalPermHtml = renderToStaticMarkup(<SeasonalRequestCreate />);
      expect(createWithSeasonalPermHtml).not.toContain("ليس لديك صلاحية");
      expect(createWithSeasonalPermHtml).not.toContain("إدارة مواسم");
      expect(createWithSeasonalPermHtml).not.toContain("/mawasim");

      // Having only mawasim.view without requests.create_seasonal_request does NOT show the button on /requests
      state.permissions = ["requests.view", "mawasim.view"];
      const reqWithoutSeasonalPermHtml = renderToStaticMarkup(<Requests />);
      expect(reqWithoutSeasonalPermHtml).not.toContain("/requests/seasonal");
    });

    it("renders LinkedRequesterSummary with beneficiary details on SeasonalRequestCreate when linkedRequester exists", async () => {
      const { LinkedRequesterSummary } = await import("../client/src/pages/SeasonalRequestCreate");
      const html = renderToStaticMarkup(
        <LinkedRequesterSummary
          linkedRequester={{
            id: 42,
            name: "الشيخ خالد",
            phone: "0551234567",
            email: "khalid@example.com",
            requesterType: "imam",
          }}
        />,
      );
      expect(html).toContain("بيانات المستفيد المرتبط بالمسجد");
      expect(html).toContain("الشيخ خالد");
      expect(html).toContain("إمام");
      expect(html).toContain("0551234567");
      expect(html).toContain("khalid@example.com");

      expect(renderToStaticMarkup(<LinkedRequesterSummary linkedRequester={null} />)).toBe("");
    });

    it("view-only hides 'طلبات الموسم' section, while view_requests reveals it without approve actions, and approve_requests enables approval", () => {
      const base = sampleStaffData(true);
      const reqs: any[] = [
        {
          id: 11,
          seasonId: 10,
          mosqueId: 1,
          mosqueName: "جامع الفاروق",
          governorate: "عسير",
          mosqueCity: "أبها",
          applicantName: "عبدالله القحطاني",
          applicantPhone: "0500000011",
          applicantEmail: "abdullah@example.com",
          applicantNationalId: "1023456789",
          applicantCity: "أبها",
          applicantRequesterType: "imam",
          status: "submitted",
          requested: { water: 20 },
          approved: null,
          execution: null,
          snapshot: { city: "أبها", district: "المنسك", address: "طريق الملك", worshippers: 200, men: null, women: null },
          contact: { name: "إمام", phone: "0500000001" },
          hasPhotos: false,
        },
        {
          id: 12,
          seasonId: 10,
          mosqueId: 2,
          mosqueName: "مسجد السلام",
          governorate: "مكة المكرمة",
          mosqueCity: "جدة",
          status: "approved",
          scheduledFor: "2026-04-20",
          assignedTo: 5,
          assignee: "خالد العمري",
          requested: { water: 10 },
          approved: { water: 10 },
          execution: null,
          snapshot: { city: "جدة", district: "الروضة", address: "شارع 2", worshippers: 150, men: null, women: null },
          contact: { name: "إمام 2", phone: "0500000002" },
          hasPhotos: false,
        },
      ];
      state.data["mawasim.staff"] = { ...base, requests: reqs };

      // 1. mawasim.view only: seasons & capacity visible, طلبات الموسم section hidden
      state.permissions = ["mawasim.view"];
      const viewOnlyHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(viewOnlyHtml).toContain("برنامج مواسم");
      expect(viewOnlyHtml).toContain("السعة والمتابعة");
      expect(viewOnlyHtml).not.toContain("طلبات الموسم");
      expect(viewOnlyHtml).not.toContain("مراجعة الطلبات الموسمية واعتماد الكميات وحجز السعة");
      expect(viewOnlyHtml).not.toContain("جامع الفاروق");
      expect(viewOnlyHtml).not.toContain("تصفية حسب المحافظة");

      // 2. mawasim.view + mawasim.view_requests: طلبات الموسم section & filters visible, approval actions hidden
      state.permissions = ["mawasim.view", "mawasim.view_requests"];
      const html = renderToStaticMarkup(<MawasimStaff />);
      expect(html).toContain("طلبات الموسم");
      expect(html).toContain("توزيع طلبات برنامج مواسم");
      expect(html).toContain("توزيع الطلبات المسجلة في الموسم المحدد حسب المحافظة والمدينة");
      expect(html).toContain("عسير · أبها");
      expect(html).toContain("مكة المكرمة · جدة");
      expect(html).toContain("تصفية حسب المحافظة");
      expect(html).toContain("تصفية حسب المدينة");
      expect(html).toContain("ترتيب الطلبات");
      expect(html).toContain("تصدير إلى Excel");
      expect(html).toContain("عسير · أبها · المنسك");
      expect(html).toContain("مكة المكرمة · جدة · الروضة");

      const detailsReadOnly = renderToStaticMarkup(
        <RequestDetails request={reqs[0]} season={base.season} canApprove={false} refresh={vi.fn()} />,
      );
      expect(detailsReadOnly).toContain("ملخص الخدمات والكميات");
      expect(detailsReadOnly).not.toContain("مراجعة الطلب والاعتماد وحجز السعة");
      expect(detailsReadOnly).not.toContain("اعتماد الكميات");
      expect(detailsReadOnly).not.toContain("الاعتذار عن الطلب");

      // 3. mawasim.approve_requests shows 'أمر العمل' on scheduled cards, approval action in details, and work-order document
      state.permissions = ["mawasim.view", "mawasim.view_requests", "mawasim.approve_requests"];
      const withApproveHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(withApproveHtml).toContain("مراجعة الطلبات الموسمية واعتماد الكميات وحجز السعة");
      expect(withApproveHtml).toContain("أمر العمل");
      expect(withApproveHtml).toContain('/mawasim/requests/10/12/print');

      const detailsApprove = renderToStaticMarkup(
        <RequestDetails
          request={reqs[0]}
          season={base.season}
          employees={base.employees}
          canApprove={true}
          refresh={vi.fn()}
        />,
      );
      expect(detailsApprove).toContain("مراجعة الطلب والاعتماد وحجز السعة");
      expect(detailsApprove).toContain("اعتماد الكميات");
      expect(detailsApprove).toContain("الاعتذار عن الطلب");

      const scheduledReq = {
        ...reqs[0],
        status: "approved",
        scheduledFor: "2026-04-15",
        assignedTo: 5,
        assignee: "خالد العمري",
        approved: { water: 20 },
      };
      const printableReportHtml = renderToStaticMarkup(
        <MawasimScheduleReportDocument request={scheduledReq} season={base.season} orgSettings={null} />,
      );
      expect(printableReportHtml).toContain("أمر العمل — جدول تنفيذ طلب برنامج مواسم");
      expect(printableReportHtml).toContain("1. معلومات المستفيد (طالب الخدمة):");
      expect(printableReportHtml).toContain("2. معلومات المسجد وموعد التنفيذ:");
      expect(printableReportHtml).toContain("3. تفاصيل الخدمات والكميات المطلوبة:");
      expect(printableReportHtml).toContain("عبدالله القحطاني");
      expect(printableReportHtml).toContain("إمام");
      expect(printableReportHtml).toContain("1023456789");
      expect(printableReportHtml).toContain("جامع الفاروق");
      expect(printableReportHtml).toContain("2026-04-15");
      expect(printableReportHtml).toContain("سقيا الماء");
      expect(printableReportHtml).toContain("المكلّف بالتنفيذ:");
      expect(printableReportHtml).not.toContain("المكلّف بالتنفيذ / الحالة:");
      expect(printableReportHtml).not.toContain("مسؤول الجدولة / المكلّف بالتنفيذ:");
      expect(printableReportHtml).not.toContain("مدير الموسم / الاعتماد:");
      expect(printableReportHtml).not.toContain("التوقيع:");

      const excelPayload = buildSeasonalExcelPayload(reqs, base.season);
      expect(excelPayload.columns.map((c: any) => c.header)).toEqual([
        "رقم الطلب",
        "تاريخ الطلب",
        "اسم المسجد",
        "المحافظة",
        "المدينة",
        "الحي",
        "العنوان",
        "اسم طالب الخدمة",
        "صفة طالب الخدمة",
        "رقم جوال طالب الخدمة",
        "البريد الإلكتروني لطالب الخدمة",
        "رقم الهوية الوطنية لطالب الخدمة",
        "مدينة طالب الخدمة",
        "الخدمات والكميات المطلوبة",
        "الكميات المعتمدة",
        "حالة الطلب",
        "الملاحظات",
      ]);
      expect(excelPayload.rows[0]).toContain("عبدالله القحطاني");
      expect(excelPayload.rows[0]).toContain("إمام");
      expect(excelPayload.rows[0]).toContain("0500000011");
      expect(excelPayload.rows[0]).toContain("abdullah@example.com");
      expect(excelPayload.rows[0]).toContain("1023456789");
      expect(excelPayload.rows[0]).toContain("جامع الفاروق");
      expect(excelPayload.rows[0]).toContain("عسير");
      // Second row without registered applicant requesterType falls back to "-" for missing registered fields
      expect(excelPayload.rows[1]).toContain("إمام 2");
      expect(excelPayload.rows[1]).toContain("0500000002");
      expect(excelPayload.rows[1][8]).toBe("-");

      expect(
        filterAndSortSeasonRequests(reqs, {
          statusFilter: "all",
          governorateFilter: "عسير",
          cityFilter: "all",
          searchQuery: "",
          sortBy: "newest",
        }).map((r: any) => r.id),
      ).toEqual([11]);

      expect(
        filterAndSortSeasonRequests(reqs, {
          statusFilter: "all",
          governorateFilter: "all",
          cityFilter: "all",
          searchQuery: "",
          sortBy: "city_desc",
        }).map((r: any) => r.id),
      ).toEqual([12, 11]);
    });

    it("renders season manager field and assigned manager badge on /mawasim", () => {
      state.permissions = ["mawasim.view", "mawasim.create"];
      const staffHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(staffHtml).toContain("مدير الموسم: خالد العمري");

      const editorHtml = renderToStaticMarkup(
        <SeasonEditor
          employees={sampleStaffData(true).employees}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(editorHtml).toContain("تعيين مدير للموسم");
      expect(editorHtml).toContain("اختر مدير الموسم");
    });

    it("supports mawasim.view_assigned and renamed 'عرض كافة المواسم' permission metadata", () => {
      expect(MAWASIM_PERMISSIONS.find(p => p.id === "mawasim.view")?.nameAr).toBe("عرض كافة المواسم");
      expect(MAWASIM_PERMISSIONS.find(p => p.id === "mawasim.view_assigned")?.nameAr).toBe("عرض المواسم المسندة لك كمدير");

      expect(sectionPermissionSelection(["mawasim.view_assigned", "mawasim.manage", "mawasim.view_requests"])).toEqual([
        "mawasim.view_assigned",
        "mawasim.manage",
        "mawasim.view_requests",
      ]);
      expect(sectionPermissionSelection(["mawasim.manage", "mawasim.view_requests"])).toEqual([]);

      state.permissions = ["mawasim.view_assigned"];
      state.data["mawasim.staff"] = sampleStaffData(false);
      const assignedEmptyHtml = renderToStaticMarkup(<MawasimStaff />);
      expect(assignedEmptyHtml).toContain("لا توجد مواسم مسندة لك كمدير بعد");
    });
  },
);
