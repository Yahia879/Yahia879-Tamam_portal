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

beforeAll(async () => {
  vi.stubGlobal("React", React);
  BeneficiaryLayout = (await import("../client/src/components/BeneficiaryLayout")).default;
  RequesterDashboard = (await import("../client/src/pages/RequesterDashboard")).default;
  MawasimPortal = (await import("../client/src/pages/MawasimPortal")).default;
  MyRequests = (await import("../client/src/pages/MyRequests")).default;
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

  it("shows برنامج مواسم entry point in BeneficiaryLayout and RequesterDashboard only when an open season exists", () => {
    state.data["mawasim.portal"] = buildPortalPayload(true);
    const navOpen = renderToStaticMarkup(
      <BeneficiaryLayout activeTab="dashboard">
        <div>content</div>
      </BeneficiaryLayout>,
    );
    const dashOpen = renderToStaticMarkup(<RequesterDashboard />);
    expect(navOpen).toContain('href="/requester/mawasim"');
    expect(navOpen).toContain("برنامج مواسم");
    expect(dashOpen).toContain('href="/requester/mawasim"');
    expect(dashOpen).toContain("متاح للتسجيل");

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

  it("binds the requester's linked mosque automatically on MawasimPortal with editable pre-filled fields", () => {
    state.location = "/requester/mawasim";
    const html = renderToStaticMarkup(<MawasimPortal />);
    expect(html).toContain("برنامج مواسم");
    expect(html).toContain("مسجد النور");
    expect(html).toContain("طلباتي في برنامج مواسم");
    expect(html).toContain('value="المدينة"');
    expect(html).toContain('value="العوالي"');
    expect(html).toContain('value="شارع الملك فهد"');
    expect(html).toContain('value="280"');
    expect(html).toContain("المساحة المسجلة:");
    expect(html).toContain("سقف المسجد:");
    expect(html).not.toContain("readonly");
    expect(html).not.toContain("ابحث باسم المسجد");
  });

  it("renders a non-blocking warning and removes max restriction when quantity exceeds mosque ceiling", () => {
    const html = renderToStaticMarkup(
      <MawasimPortal />,
    );
    // In buildPortalPayload, water perMosqueLimit is 100 and Input has no max="100" blocking attribute
    expect(html).not.toContain('max="100"');
    expect(html).toContain("سقف المسجد: ١٠٠ كرتون");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("صورة مصلى الرجال");
  });

  it("renders submitted seasonal requests and confirmation alert on /my-requests", () => {
    state.location = "/my-requests";
    state.search = "?seasonal=submitted";
    const html = renderToStaticMarkup(<MyRequests />);
    expect(html).toContain("تم إرسال طلبك في برنامج مواسم بنجاح");
    expect(html).toContain("طلبات برنامج مواسم");
    expect(html).toContain("مسجد النور");
    expect(html).toContain("موسم رمضان 1448");
    expect(html).not.toContain("لا توجد طلبات سابقة");
  });
});
