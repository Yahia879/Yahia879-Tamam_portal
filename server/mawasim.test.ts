import { describe, expect, it } from "vitest";
import {
  carpetArea, defaultSeasonalSettings, mayApplyForSeason, seasonalCapacity, seasonalExecutionSchema,
  seasonalMosqueLimit, seasonalMosqueSnapshotSchema, seasonalSettingsSchema, seasonalStaffAccess,
  summarizeSeasonalCapacity,
} from "../shared/mawasim";

const imam = { role: "service_requester", status: "active", requesterType: "imam" };
const men = { lengthCm: 400, widthCm: 500 };
const women = { lengthCm: 220, widthCm: 350 };

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
    expect(seasonalStaffAccess("field_team")).toEqual({ canEnter: true, canManage: false });
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

  it("validates map links without throwing for malformed URLs", () => {
    const snapshot = { city: "المدينة", district: "الحي", address: "الشارع", worshippers: 20, men, women };
    expect(seasonalMosqueSnapshotSchema.safeParse({ ...snapshot, mapsUrl: "https://maps.app.goo.gl/example" }).success).toBe(true);
    for (const mapsUrl of ["not a URL", "https://example.test/maps", "http://maps.google.com/"]) {
      expect(seasonalMosqueSnapshotSchema.safeParse({ ...snapshot, mapsUrl }).success).toBe(false);
    }
  });

  it("reserves approved quantities and releases the unperformed balance after completion", () => {
    const settings = defaultSeasonalSettings();
    settings.services.water.capacity = 100;
    const requests = [
      { status: "submitted", requested: { water: 60 }, approved: null, execution: null },
      { status: "scheduled", requested: { water: 30 }, approved: { water: 30 }, execution: null },
      { status: "completed", requested: { water: 40 }, approved: { water: 40 }, execution: { men, women, performed: { water: 20 }, notes: "" } },
      { status: "rejected", requested: { water: 70 }, approved: null, execution: null },
    ];
    expect(summarizeSeasonalCapacity(settings, requests).find(row => row.service === "water")).toEqual({
      service: "water", limit: 100, requested: 130, approved: 70, performed: 20, reserved: 50, available: 50,
    });
  });
});
