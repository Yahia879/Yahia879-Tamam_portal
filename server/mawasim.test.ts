import { describe, expect, it, vi } from "vitest";
import { getMenuGroupsFromPermissions } from "../client/src/components/DashboardLayout";
import { hasRouteAccess } from "../client/src/lib/routePermissions";
import type { TrpcContext } from "./_core/context";
import { mawasimRouter } from "./routers/mawasim";
import {
  carpetArea, defaultSeasonalSettings, mayApplyForSeason, seasonalCapacity, seasonalExecutionSchema,
  seasonalMosqueLimit, seasonalMosqueSnapshotSchema, seasonalSettingsSchema,
  summarizeSeasonalCapacity,
} from "../shared/mawasim";

const userRoleRef = { current: "super_admin" };

vi.mock("./db", () => ({ getDb: async () => null }));
vi.mock("./permissions", () => ({
  checkPermission: async (_userId: number, _perm: string) => {
    return ["super_admin", "system_admin"].includes(userRoleRef.current);
  },
}));

const imam = { role: "service_requester", status: "active", requesterType: "imam" };
const men = { lengthCm: 400, widthCm: 500 };
const women = { lengthCm: 220, widthCm: 350 };
const snapshot = { city: "المدينة", district: "الحي", address: "الشارع", worshippers: 20, men, women };

const caller = (role: string, status = "active", deletedAt: Date | null = null) => {
  userRoleRef.current = role;
  return mawasimRouter.createCaller({
    user: { id: 1, role, status, deletedAt }, req: {}, res: {},
  } as TrpcContext);
};

describe("Mawasim season rules", () => {
  it("converts funding into floor-rounded service capacity and respects a smaller physical limit", () => {
    const settings = defaultSeasonalSettings();
    const carpet = { ...settings.services.carpet, enabled: true, budgetHalalas: 5_000_000, unitPriceHalalas: 500 };
    expect(seasonalCapacity("carpet", carpet)).toBe(1_000_000);
    expect(seasonalCapacity("carpet", { ...carpet, capacity: 750_000 })).toBe(750_000);
    expect(seasonalCapacity("water", { ...settings.services.water, budgetHalalas: 1000, unitPriceHalalas: 300 })).toBe(3);
    expect(seasonalSettingsSchema.safeParse({
      ...settings, services: { ...settings.services, carpet: { ...carpet, unitPriceHalalas: 0 } },
    }).success).toBe(false);
  });

  it("restricts ordinary access to an active affiliated imam or muezzin and recognizes a scoped grant", () => {
    expect(mayApplyForSeason(imam, true, false)).toBe(true);
    expect(mayApplyForSeason({ ...imam, requesterType: "muezzin" }, true, false)).toBe(true);
    expect(mayApplyForSeason(imam, false, false)).toBe(false);
    expect(mayApplyForSeason({ ...imam, requesterType: "other" }, true, false)).toBe(false);
    expect(mayApplyForSeason({ ...imam, requesterType: "other" }, false, true)).toBe(true);
    expect(mayApplyForSeason({ ...imam, status: "pending" }, true, true)).toBe(false);
  });

  it("uses separate water limits for large mosques and calculates both prayer halls", () => {
    const settings = defaultSeasonalSettings();
    settings.services.water.perMosqueLimit = 30;
    settings.largeMosqueWorshippers = 200;
    settings.largeMosqueWaterLimit = 50;
    expect(seasonalMosqueLimit("water", settings, 199)).toBe(30);
    expect(seasonalMosqueLimit("water", settings, 200)).toBe(50);
    expect(carpetArea(men, women)).toBe(2770);
    expect(seasonalExecutionSchema.safeParse({ men, women, performed: { carpet: 2771 }, notes: "" }).success).toBe(false);
  });

  it("accepts mosque details without a map link and ignores legacy links", () => {
    expect(seasonalMosqueSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(seasonalMosqueSnapshotSchema.parse({ ...snapshot, mapsUrl: "https://maps.app.goo.gl/example" })).toEqual(snapshot);
  });

  it("reserves approved quantities and releases the unperformed balance after completion", () => {
    const settings = defaultSeasonalSettings();
    settings.services.water.capacity = 100;
    const requests = [
      { status: "approved", requested: { water: 10 }, approved: { water: 10 }, execution: null },
      { status: "submitted", requested: { water: 60 }, approved: null, execution: null },
      { status: "scheduled", requested: { water: 30 }, approved: { water: 30 }, execution: null },
      { status: "completed", requested: { water: 40 }, approved: { water: 40 }, execution: { men, women, performed: { water: 20 }, notes: "" } },
      { status: "rejected", requested: { water: 70 }, approved: null, execution: null },
    ];
    expect(summarizeSeasonalCapacity(settings, requests).find(row => row.service === "water")).toEqual({
      service: "water", limit: 100, requested: 140, approved: 80, performed: 20, reserved: 60, available: 40,
    });
  });
});

describe("Mawasim access and submission", () => {
  const request = { seasonId: 1, requestId: 1 };
  const submission = {
    seasonId: 1, mosqueId: 1,
    snapshot: { city: snapshot.city, district: snapshot.district, address: snapshot.address, worshippers: snapshot.worshippers },
    requested: { water: 1 },
    pledge: true as const,
  };

  it.each(["projects_office", "project_manager", "field_team"])(
    "hides Mawasim from non-admin role %s and blocks direct access by default",
    async role => {
      expect(getMenuGroupsFromPermissions(["*"], role).flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(false);
      expect(hasRouteAccess("/mawasim", role, ["*"], true)).toBe(false);
      expect(hasRouteAccess("/mawasim/requests/10/12/print", role, ["*"], true)).toBe(false);
      expect(hasRouteAccess("/mawasim/requests/10/12/print", role, ["mawasim.view_requests"], true)).toBe(true);
      expect(hasRouteAccess("/requests/seasonal", role, ["*"], true)).toBe(false);
      const api = caller(role);
      const results = await Promise.allSettled([
        api.staff(), api.searchMosques(), api.photos(request), api.submit(submission),
        api.review({ ...request, approved: { water: 1 }, note: "" }),
      ]);
      for (const result of results) {
        expect(result).toMatchObject({ status: "rejected", reason: { code: "FORBIDDEN" } });
      }
    },
  );

  it("blocks service_requester from admin Mawasim management routes and procedures", async () => {
    expect(getMenuGroupsFromPermissions(["*"], "service_requester").flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(false);
    expect(hasRouteAccess("/mawasim", "service_requester", ["*"], true)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "service_requester", ["*"], true)).toBe(false);
    expect(hasRouteAccess("/requester/mawasim", "service_requester", [], false)).toBe(true);
    const api = caller("service_requester");
    const results = await Promise.allSettled([
      api.staff(),
      api.searchMosques(),
      api.photos(request),
      api.review({ ...request, approved: { water: 1 }, note: "" }),
      api.submit({
        ...submission,
        onBehalf: { name: "Tester", phone: "0500000000", reason: "تقديم بالنيابة" },
      }),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({ status: "rejected", reason: { code: "FORBIDDEN" } });
    }
  });

  it.each(["super_admin", "system_admin"])(
    "shows Mawasim for admin role %s when permissions granted and hides when revoked",
    role => {
      expect(getMenuGroupsFromPermissions(["mawasim.view"], role).flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(true);
      expect(hasRouteAccess("/mawasim", role, ["mawasim.view"], false)).toBe(true);
      expect(hasRouteAccess("/requests/seasonal/", role, ["mawasim.view"], false)).toBe(true);

      expect(getMenuGroupsFromPermissions([], role).flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(false);
      expect(hasRouteAccess("/mawasim", role, [], false)).toBe(false);
      expect(hasRouteAccess("/requests/seasonal/", role, [], false)).toBe(false);
    },
  );

  it("shows Mawasim and grants access to staff role once granted mawasim.view or mawasim.manage", () => {
    expect(getMenuGroupsFromPermissions(["mawasim.view"], "projects_office").flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(true);
    expect(hasRouteAccess("/mawasim", "projects_office", ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal", "projects_office", ["mawasim.view"], false)).toBe(true);

    expect(getMenuGroupsFromPermissions(["mawasim.manage"], "projects_office").flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(true);
    expect(hasRouteAccess("/mawasim", "projects_office", ["mawasim.manage"], false)).toBe(true);
  });

  it("accepts a water-only request without prayer hall data or applicant details", async () => {
    expect(getMenuGroupsFromPermissions(["mawasim.view"], "super_admin").flatMap(group => group.items).some(item => item.path === "/mawasim")).toBe(true);
    expect(hasRouteAccess("/mawasim", "super_admin", ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal/", "super_admin", ["mawasim.view"], false)).toBe(true);
    const api = caller("super_admin");
    await expect(api.submit(submission)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    await expect(api.submit({ ...submission, pledge: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires men\u2019s prayer hall measurements for carpet cleaning without requiring photos", async () => {
    const api = caller("super_admin");
    const carpet = { ...submission, requested: { carpet: carpetArea(men) } };
    await expect(api.submit(carpet)).rejects.toMatchObject({
      code: "BAD_REQUEST", message: "أدخل قياسات مصلى الرجال لطلب غسيل الفرش.",
    });
    const measured = { ...carpet, snapshot: { ...submission.snapshot, men } };
    await expect(api.submit(measured)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("denies inactive and deleted super admins", async () => {
    await expect(caller("super_admin", "pending").staff()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("super_admin", "active", new Date()).staff()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
