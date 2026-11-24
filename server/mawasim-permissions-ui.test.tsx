import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSeasonalSettings } from "../shared/mawasim";

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
let Requests: React.ComponentType;
let SeasonalRequestCreate: React.ComponentType;

beforeAll(async () => {
  vi.stubGlobal("React", React);
  MawasimStaff = (await import("../client/src/pages/MawasimStaff")).default;
  Requests = (await import("../client/src/pages/Requests")).default;
  SeasonalRequestCreate = (await import("../client/src/pages/SeasonalRequestCreate")).default;
});

function sampleStaffData(withSeason = true) {
  const settings = defaultSeasonalSettings();
  const season = withSeason
    ? { id: 10, hijriYear: 1448, title: "موسم رمضان 1448", isOpen: true, settings }
    : null;
  return {
    season,
    seasons: season ? [season] : [],
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
      expect(populatedHtml).toContain("موسم رمضان 1448");
      expect(populatedHtml).not.toContain("إضافة موسم");
      expect(populatedHtml).not.toContain("إعدادات الموسم");
      expect(populatedHtml).not.toContain("إنشاء موسم جديد");

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
    });
  },
);
