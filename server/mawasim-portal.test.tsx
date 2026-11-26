import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSeasonalSettings } from "../shared/mawasim";
import { REQUESTER_ROUTES, hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  user: {
    id: 55,
    name: "إمام المسجد",
    email: "imam@example.com",
    role: "service_requester",
    status: "active",
    requesterType: "imam",
  } as any,
  search: "",
  location: "/requester",
  navigate: vi.fn(),
  data: {} as Record<string, any>,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, logout: vi.fn() }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
  useLocation: () => [state.location, state.navigate],
  useSearch: () => state.search,
  useParams: () => ({ id: "201" }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/components/EnhancedPagination", () => ({
  default: () => null,
  usePersistedPage: () => [1, vi.fn(), vi.fn()],
}));

vi.mock("@/components/FileUpload", () => ({ FileUpload: () => null }));
vi.mock("@/components/ProgramIcon", () => ({ ProgramIcon: () => null }));
vi.mock("leaflet", () => {
  class DefaultIcon { static mergeOptions() {} }
  return { default: { Icon: { Default: DefaultIcon }, divIcon: (options: any) => options } };
});
vi.mock("react-leaflet", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return {
    MapContainer: Wrapper,
    TileLayer: () => null,
    LayerGroup: Wrapper,
    Popup: Wrapper,
    Marker: () => null,
    useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
  };
});

vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, {
      get: (_target, name: string) => {
        if (name === "useQuery") {
          return (_input: any, options: any = {}) => {
            const key = path.join(".");
            const enabled = options.enabled !== false;
            return {
              data: enabled ? state.data[key] : undefined,
              isLoading: false,
              isFetching: false,
              error: null,
              refetch: vi.fn(),
            };
          };
        }
        if (name === "useMutation") {
          return () => ({ mutate: vi.fn(), isPending: false });
        }
        if (name === "useUtils") return () => proxy();
        if (name === "invalidate") return vi.fn();
        return proxy([...path, name]);
      },
    });
  }
  return { trpc: proxy() };
});

let BeneficiaryLayout: React.ComponentType<any>;
let RequesterDashboard: React.ComponentType;
let MawasimPortal: React.ComponentType;
let MyRequests: React.ComponentType;
let RequesterMosqueDetails: React.ComponentType;

beforeAll(async () => {
  vi.stubGlobal("React", React);
  BeneficiaryLayout = (await import("../client/src/components/BeneficiaryLayout")).default;
  RequesterDashboard = (await import("../client/src/pages/RequesterDashboard")).default;
  MawasimPortal = (await import("../client/src/pages/MawasimPortal")).default;
  MyRequests = (await import("../client/src/pages/MyRequests")).default;
  RequesterMosqueDetails = (await import("../client/src/pages/RequesterMosqueDetails")).default;
});

function buildPortalPayload(open: boolean) {
  const settings = defaultSeasonalSettings();
  const season = open
    ? {
        id: 12,
        hijriYear: 1448,
        title: "موسم رمضان 1448",
        isOpen: true,
        settings: {
          services: {
            carpet: { enabled: false, perMosqueLimit: 200 },
            water: { enabled: true, perMosqueLimit: 100 },
            maintenance: { enabled: false, perMosqueLimit: 2 },
            audio: { enabled: true, perMosqueLimit: 1 },
            fragrance: { enabled: false, perMosqueLimit: 1 },
          },
          largeMosqueWorshippers: settings.largeMosqueWorshippers,
          largeMosqueWaterLimit: settings.largeMosqueWaterLimit,
        },
      }
    : null;

  return {
    hasOpenSeason: open,
    seasons: season ? [{ id: 12, hijriYear: 1448, title: "موسم رمضان 1448", isOpen: true }] : [],
    season,
    eligible: open
      ? [
          {
            id: 201,
            name: "مسجد النور",
            city: "المدينة",
            district: "العوالي",
            address: "شارع الملك فهد",
            capacity: 280,
            area: "450.00",
            hasPrayerHall: true,
            previous: null,
          },
        ]
      : [],
    requests: [],
    allRequests: [
      {
        id: 88,
        seasonId: 12,
        mosqueId: 201,
        mosqueName: "مسجد النور",
        requested: { water: 20, audio: 1 },
        approved: null,
        status: "submitted",
        reviewNote: null,
        createdAt: new Date("2026-03-01T00:00:00Z").toISOString(),
        seasonTitle: "موسم رمضان 1448",
        hijriYear: 1448,
      },
    ],
    capacity: [
      { service: "water", available: 500 },
      { service: "audio", available: 50 },
    ],
  };
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });
  state.search = "";
  state.location = "/requester";
  state.navigate.mockReset();
  state.data = {
    "notifications.getUnreadCount": { count: 0 },
    "notifications.getRecent": [],
    "requests.getMyRequests": {
      requests: [],
      total: 0,
      stats: { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 },
    },
    "mosques.getMyMosques": [
      { id: 201, name: "مسجد النور", city: "المدينة", district: "العوالي", approvalStatus: "approved" },
    ],
    "programs.getActive": [],
    "mawasim.portal": buildPortalPayload(true),
  };
});

describe("Mawasim service requester portal UI & routing", () => {
  it("allows service_requester on /requester/mawasim while keeping admin seasonal pages blocked", () => {
    expect(REQUESTER_ROUTES.has("/requester/mawasim")).toBe(true);
    expect(hasRouteAccess("/requester/mawasim", "service_requester", [], false)).toBe(true);
    expect(hasRouteAccess("/mawasim", "service_requester", ["*"], true)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "service_requester", ["*"], true)).toBe(false);
  });

  it("shows برنامج مواسم entry point in RequesterDashboard only when an open season exists and omits it from BeneficiaryLayout header", () => {
    state.data["mawasim.portal"] = buildPortalPayload(true);
    const navOpen = renderToStaticMarkup(
      <BeneficiaryLayout activeTab="dashboard">
        <div>content</div>
      </BeneficiaryLayout>,
    );
    const dashOpen = renderToStaticMarkup(<RequesterDashboard />);
    expect(navOpen).not.toContain('href="/requester/mawasim"');
    expect(navOpen).not.toContain("برنامج مواسم");
    expect(dashOpen).toContain('href="/requester/mawasim"');
    expect(dashOpen).toContain("متاح للتسجيل");
    expect(dashOpen).toContain("يمكنك الآن تقديم طلب لمسجدك ضمن الخدمات المتاحة في برنامج مواسم.");
    expect(dashOpen).not.toContain("تأهيل مسجدك ضمن الخدمات الرمضانية");

    state.data["mawasim.portal"] = buildPortalPayload(false);
    const navClosed = renderToStaticMarkup(
      <BeneficiaryLayout activeTab="dashboard">
        <div>content</div>
      </BeneficiaryLayout>,
    );
    const dashClosed = renderToStaticMarkup(<RequesterDashboard />);
    expect(navClosed).not.toContain('href="/requester/mawasim"');
    expect(dashClosed).not.toContain('href="/requester/mawasim"');
  });

  it("shows add-mosque guidance when requester has no eligible mosque on MawasimPortal", () => {
    state.location = "/requester/mawasim";
    const base = buildPortalPayload(true);
    state.data["mawasim.portal"] = { ...base, eligible: [] };
    const html = renderToStaticMarkup(<MawasimPortal />);
    expect(html).toContain("حسابك غير مرتبط بمسجد معتمد للتقديم");
    expect(html).toContain("يرجى إضافة مسجد");
    expect(html).toContain('href="/requester/mosques/new"');
  });

  it("renders area field next to length/width and prompts when dimensions are missing", async () => {
    const { PrayerMeasurements } = await import("../client/src/components/MawasimRequestForm");
    const emptyWithFallbackHtml = renderToStaticMarkup(
      <PrayerMeasurements
        label="مصلى الرجال"
        value={{ lengthCm: 0, widthCm: 0 }}
        fallbackArea="500.00"
        onChange={vi.fn()}
      />,
    );
    expect(emptyWithFallbackHtml).toContain("الطول بالمتر");
    expect(emptyWithFallbackHtml).toContain("العرض بالمتر");
    expect(emptyWithFallbackHtml).toContain("المساحة (م²)");
    expect(emptyWithFallbackHtml).toContain("٥٠٠ م²");
    expect(emptyWithFallbackHtml).toContain("يرجى تعبئة الطول بالمتر والعرض بالمتر لحساب المساحة تلقائياً.");

    const filledHtml = renderToStaticMarkup(
      <PrayerMeasurements
        label="مصلى النساء"
        value={{ lengthCm: 2000, widthCm: 1500 }}
        onChange={vi.fn()}
      />,
    );
    expect(filledHtml).toContain("٣٠٠ م²");
    expect(filledHtml).not.toContain("يرجى تعبئة الطول بالمتر والعرض بالمتر لحساب المساحة تلقائياً.");
  });

  it("binds the requester's linked mosque automatically on MawasimPortal with editable pre-filled fields", () => {
    state.location = "/requester/mawasim";
    const html = renderToStaticMarkup(<MawasimPortal />);
    expect(html).toContain("برنامج مواسم");
    expect(html).toContain("مسجد النور");
    expect(html).not.toContain("طلباتي في برنامج مواسم");
    expect(html).toContain('value="المدينة"');
    expect(html).toContain('value="العوالي"');
    expect(html).toContain('value="شارع الملك فهد"');
    expect(html).toContain('value="280"');
    expect(html).toContain("المساحة المسجلة:");
    expect(html).toContain("سقف المسجد:");
    expect(html).not.toContain("readonly");
    expect(html).not.toContain("ابحث باسم المسجد");
  });

  it("renders a non-blocking warning and removes max restriction when quantity exceeds mosque ceiling", async () => {
    const html = renderToStaticMarkup(
      <MawasimPortal />,
    );
    // In buildPortalPayload, water perMosqueLimit is 100 and Input has no max="100" blocking attribute
    expect(html).not.toContain('max="100"');
    expect(html).toContain("سقف المسجد: ١٠٠ كرتون");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("صورة مصلى الرجال");

    // Inline ceiling warnings must not appear before clicking Submit
    expect(html).not.toContain("سيتم تسجيل طلبكم بالكمية المطلوبة");
    expect(html).not.toContain("سيتم تسجيل طلبكم بالمساحة الفعلية");

    const { SEASONAL_PRE_SUBMIT_NOTICE, SEASONAL_SUBMISSION_NOTICE } = await import("../client/src/components/MawasimRequestForm");
    expect(SEASONAL_PRE_SUBMIT_NOTICE).toBe(
      "نؤكد على أن التسجيل الحالي لحصر الاحتياج فقط، وسيتم التواصل معكم بعد اكتمال الدعم واكتمال الشروط والمعايير.",
    );
    expect(SEASONAL_SUBMISSION_NOTICE).toBe(
      "تم تسجيل طلبكم ونؤكد على أن التسجيل الحالي لحصر الاحتياج فقط وسيتم التواصل معكم بعد اكتمال الدعم واكتمال الشروط والمعايير",
    );
  });

  it("renders submitted seasonal requests and confirmation alert on /my-requests", () => {
    state.location = "/my-requests";
    state.search = "?seasonal=submitted";
    const html = renderToStaticMarkup(<MyRequests />);
    expect(html).toContain("تم إرسال طلبك في برنامج مواسم بنجاح");
    expect(html).toContain("الطلبات العادية (0)");
    expect(html).toContain("طلبات برنامج مواسم (1)");
    expect(html).toContain("إجمالي طلبات مواسم");
    expect(html).toContain("معتمد");
    expect(html).toContain("معتذر عنه");
    expect(html).not.toContain("مجدول");
    expect(html).not.toContain("منفّذ");
    expect(html).toContain("طلبات برنامج مواسم");
    expect(html).toContain("مسجد النور");
    expect(html).toContain("موسم رمضان 1448");
    // User-relative numbering (#1 instead of global DB id #88) and date display
    expect(html).toContain("#1");
    expect(html).not.toContain("#88");
    expect(html).not.toContain("md:grid-cols-2");
    expect(html).not.toContain("لا توجد طلبات سابقة");

    // Default regular view on /my-requests renders top tabs + regular KPI cards only
    state.search = "";
    const regularHtml = renderToStaticMarkup(<MyRequests />);
    expect(regularHtml).toContain("الطلبات العادية (0)");
    expect(regularHtml).toContain("طلبات برنامج مواسم (1)");
    expect(regularHtml).toContain("إجمالي الطلبات");
    expect(regularHtml).not.toContain("إجمالي طلبات مواسم");
    expect(regularHtml).toContain("لا توجد طلبات سابقة");
    expect(regularHtml).not.toContain("موسم رمضان 1448");
  });

  it("blocks active seasonal request on MawasimPortal and requires Mawasim exception approval", () => {
    state.location = "/requester/mawasim";
    const base = buildPortalPayload(true);
    state.data["mawasim.portal"] = {
      ...base,
      activeRequest: {
        id: 88,
        status: "submitted",
        mosqueName: "مسجد النور",
        createdAt: new Date("2026-03-01T00:00:00Z").toISOString(),
      },
      latestException: null,
    };
    const blockedHtml = renderToStaticMarkup(<MawasimPortal />);
    expect(blockedHtml).toContain("لا يمكن تقديم طلب مواسم جديد حالياً");
    expect(blockedHtml).toContain("طلب استثناء (برنامج مواسم)");
    expect(blockedHtml).not.toContain("إرسال طلب برنامج مواسم");

    state.data["mawasim.portal"] = {
      ...base,
      activeRequest: {
        id: 88,
        status: "submitted",
        mosqueName: "مسجد النور",
        createdAt: new Date("2026-03-01T00:00:00Z").toISOString(),
      },
      latestException: {
        id: 15,
        activeRequestId: 88,
        consumedByRequestId: null,
        status: "pending",
        createdAt: new Date("2026-03-01T01:00:00Z").toISOString(),
      },
    };
    const pendingHtml = renderToStaticMarkup(<MawasimPortal />);
    expect(pendingHtml).toContain("طلب الاستثناء قيد المراجعة حالياً");

    state.data["mawasim.portal"] = {
      ...base,
      activeRequest: {
        id: 88,
        status: "submitted",
        mosqueName: "مسجد النور",
        createdAt: new Date("2026-03-01T00:00:00Z").toISOString(),
      },
      latestException: {
        id: 15,
        activeRequestId: 88,
        consumedByRequestId: null,
        status: "approved",
        createdAt: new Date("2026-03-01T01:00:00Z").toISOString(),
      },
    };
    const approvedHtml = renderToStaticMarkup(<MawasimPortal />);
    expect(approvedHtml).toContain("تم قبول طلب الاستثناء الخاص بك في برنامج مواسم");
    expect(approvedHtml).toContain("إرسال طلب برنامج مواسم");
  });

  it("displays saved seasonal prayer hall length and width inside RequesterMosqueDetails", () => {
    state.data["mosques.getById"] = {
      id: 201,
      name: "مسجد النور",
      city: "المدينة",
      district: "العوالي",
      address: "شارع الملك فهد",
      capacity: 280,
      area: "450.00",
      approvalStatus: "approved",
      hasPrayerHall: false,
      images: [],
      prayerHallDimensions: {
        men: { lengthCm: 2500, widthCm: 1400 },
        women: { lengthCm: 700, widthCm: 500 },
      },
    };
    const html = renderToStaticMarkup(<RequesterMosqueDetails />);
    expect(html).toContain("طول مصلى الرجال (م)");
    expect(html).toContain('value="25 م"');
    expect(html).toContain("عرض مصلى الرجال (م)");
    expect(html).toContain('value="14 م"');
    expect(html).toContain("طول مصلى النساء (م)");
    expect(html).toContain('value="7 م"');
    expect(html).toContain("عرض مصلى النساء (م)");
    expect(html).toContain('value="5 م"');
    expect(html).toContain('value="٣٥ م²"');
  });
});
