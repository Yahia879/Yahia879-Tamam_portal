import { beforeEach, describe, expect, it, vi } from "vitest";
import { mawasimGrants, mawasimRequests, mawasimSeasons, mosques, users } from "../drizzle/schema";
import { defaultSeasonalSettings } from "../shared/mawasim";
import type { TrpcContext } from "./_core/context";
import { mawasimRouter } from "./routers/mawasim";

const state = vi.hoisted(() => ({
  seasons: [] as any[],
  allRequests: [] as any[],
  grants: [] as any[],
  eligibleMosques: [] as any[],
  previousSnapshots: [] as any[],
  usageRows: [] as any[],
  submitMosque: null as any,
  submitGrants: [] as any[],
  candidateUsers: [] as any[],
  allowAdmin: false,
  insertedValues: [] as any[],
  updatedMosques: [] as any[],
}));

function makeSelectChain(table: any, columns: any) {
  let hasJoin = false;
  let isForUpdate = false;
  const resolveRows = () => {
    if (table === mawasimSeasons) return state.seasons;
    if (table === mawasimGrants) return isForUpdate ? state.submitGrants : state.grants;
    if (table === mosques) return isForUpdate ? (state.submitMosque ? [state.submitMosque] : []) : state.eligibleMosques;
    if (table === users) return state.candidateUsers;
    if (table === mawasimRequests) {
      if (hasJoin) return state.allRequests;
      if (columns && "menPhoto" in columns) return state.previousSnapshots;
      return state.usageRows;
    }
    return [];
  };
  const chain: any = {
    innerJoin: () => {
      hasJoin = true;
      return chain;
    },
    leftJoin: () => {
      hasJoin = true;
      return chain;
    },
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    for: () => {
      isForUpdate = true;
      return chain;
    },
    then: (resolve: any, reject?: any) => Promise.resolve(resolveRows()).then(resolve, reject),
  };
  return chain;
}

function makeDb(inTx = false) {
  return {
    select: (columns?: any) => ({
      from: (table: any) => {
        const chain = makeSelectChain(table, columns);
        if (inTx) {
          const origWhere = chain.where;
          chain.where = () => {
            const c = origWhere();
            c.for = () => {
              return chain;
            };
            // Mark submit lookup vs portal lookup inside tx
            return {
              ...c,
              for: () =>
                Promise.resolve(table === mawasimSeasons ? (state.seasons[0] ? [state.seasons[0]] : []) : []),
              then: (resolve: any, reject?: any) => {
                if (table === mosques) {
                  return Promise.resolve(state.submitMosque ? [state.submitMosque] : []).then(resolve, reject);
                }
                if (table === mawasimGrants) {
                  return Promise.resolve(state.submitGrants).then(resolve, reject);
                }
                return c.then(resolve, reject);
              },
            };
          };
        }
        return chain;
      },
    }),
    insert: () => ({
      values: (vals: any) => {
        state.insertedValues.push(vals);
        return {
          $returningId: async () => [{ id: 700 }],
        };
      },
    }),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: () => {
          state.updatedMosques.push({ table, vals });
          return Promise.resolve();
        },
      }),
    }),
    transaction: async (fn: (tx: any) => Promise<any>) => fn(makeDb(true)),
  };
}

vi.mock("./db", () => ({
  getDb: async () => makeDb(false),
}));

vi.mock("./permissions", () => ({
  checkPermission: async () => state.allowAdmin,
}));

function buildSettings() {
  const settings = defaultSeasonalSettings();
  return {
    ...settings,
    services: {
      ...settings.services,
      water: { enabled: true, budgetHalalas: 500_000, unitPriceHalalas: 1000, perMosqueLimit: 100, capacity: 500 },
    },
  };
}

function callerFor(overrides: Partial<NonNullable<TrpcContext["user"]>>) {
  return mawasimRouter.createCaller({
    user: {
      id: 42,
      name: "الشيخ أحمد",
      email: "imam@mosque.sa",
      phone: "0551234567",
      role: "service_requester",
      status: "active",
      requesterType: "imam",
      deletedAt: null,
      ...overrides,
    },
    req: {},
    res: {},
  } as TrpcContext);
}

const baseSubmission = {
  seasonId: 10,
  mosqueId: 201,
  snapshot: { city: "المدينة", district: "العوالي", address: "الشارع العام", worshippers: 50, men: null, women: null },
  requested: { water: 15 },
  pledge: true as const,
};

describe("Mawasim requester portal & submit server enforcement", () => {
  beforeEach(() => {
    const season = { id: 10, hijriYear: 1448, title: "رمضان 1448", isOpen: true, settings: buildSettings() };
    state.seasons = [season];
    state.allRequests = [
      {
        id: 1,
        seasonId: 10,
        mosqueId: 201,
        mosqueName: "مسجد النور",
        requested: { water: 10 },
        approved: null,
        status: "submitted",
        reviewNote: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        seasonTitle: "رمضان 1448",
        hijriYear: 1448,
      },
    ];
    state.grants = [];
    state.eligibleMosques = [
      { id: 201, name: "مسجد النور", city: "المدينة", district: "العوالي", address: "الشارع العام" },
    ];
    state.previousSnapshots = [];
    state.usageRows = [];
    state.submitMosque = {
      id: 201,
      name: "مسجد النور",
      city: "المدينة",
      district: "العوالي",
      address: "الشارع العام",
      capacity: 50,
      area: null,
      hasPrayerHall: false,
      registeredBy: 42,
      imamEmail: "imam@mosque.sa",
      imamPhone: "0551234567",
    };
    state.submitGrants = [];
    state.candidateUsers = [];
    state.allowAdmin = false;
    state.insertedValues = [];
    state.updatedMosques = [];
  });

  it("blocks non-requesters from calling portal and returns sanitized season limits + linked mosques for service_requester", async () => {
    const staffApi = callerFor({ id: 1, role: "projects_office" });
    await expect(staffApi.portal()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const reqApi = callerFor({});
    const data = await reqApi.portal();
    expect(data.hasOpenSeason).toBe(true);
    expect(data.eligible).toHaveLength(1);
    expect(data.eligible[0].name).toBe("مسجد النور");
    expect((data.season?.settings.services.water as any).budgetHalalas).toBeUndefined();
    expect(data.season?.settings.services.water).toEqual({ enabled: true, perMosqueLimit: 100 });
    expect(data.allRequests).toHaveLength(1);
  });

  it("forbids submitting for another person's ungranted mosque", async () => {
    state.submitMosque = {
      id: 999,
      name: "مسجد الغير",
      registeredBy: 999,
      imamEmail: "other@mosque.sa",
      imamPhone: "0599999999",
    };
    state.submitGrants = [];

    const reqApi = callerFor({});
    await expect(reqApi.submit({ ...baseSubmission, mosqueId: 999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.insertedValues).toHaveLength(0);
  });

  it("allows linked imam/muezzin or granted requester to submit and binds applicantId to ctx.user.id", async () => {
    const reqApi = callerFor({ id: 42, requesterType: "muezzin" });
    const created = await reqApi.submit(baseSubmission);
    expect(created).toEqual({ id: 700 });
    expect(state.insertedValues).toHaveLength(1);
    expect(state.insertedValues[0]).toMatchObject({
      seasonId: 10,
      mosqueId: 201,
      applicantId: 42,
      submittedBy: 42,
      mosqueName: "مسجد النور",
    });

    // Granted 'other' requester for unowned mosque
    state.submitMosque = {
      id: 305,
      name: "مسجد الرحمة",
      registeredBy: 888,
      imamEmail: "other@mosque.sa",
      imamPhone: "0599999999",
    };
    state.submitGrants = [{ id: 55 }];
    const grantedApi = callerFor({ id: 77, requesterType: "other" });
    await grantedApi.submit({ ...baseSubmission, mosqueId: 305 });
    expect(state.insertedValues[1]).toMatchObject({
      mosqueId: 305,
      applicantId: 77,
      submittedBy: 77,
    });
  });

  it("links admin-created seasonal requests to the selected mosque's service_requester while preserving submittedBy", async () => {
    state.allowAdmin = true;
    state.submitMosque = {
      id: 201,
      name: "مسجد النور",
      registeredBy: 99,
      imamName: "الشيخ صالح",
      imamEmail: "imam201@mosque.sa",
      imamPhone: "0557778888",
    };
    state.candidateUsers = [
      { id: 99, name: "متبرع مسجل", email: "donor@example.com", phone: "0501111111", requesterType: "donor" },
      { id: 42, name: "الإمام صالح", email: "imam201@mosque.sa", phone: "0557778888", requesterType: "imam" },
    ];

    const adminApi = callerFor({
      id: 1,
      name: "مدير النظام",
      email: "admin@tamam.sa",
      phone: "0500000001",
      role: "super_admin",
      requesterType: null,
    });
    const created = await adminApi.submit(baseSubmission);
    expect(created).toEqual({ id: 700 });
    expect(state.insertedValues).toHaveLength(1);
    expect(state.insertedValues[0]).toMatchObject({
      mosqueId: 201,
      applicantId: 42,
      submittedBy: 1,
      contact: {
        name: "الإمام صالح",
        phone: "0557778888",
        email: "imam201@mosque.sa",
      },
    });
  });

  it("handles admin submission gracefully when the selected mosque has no linked requester account yet", async () => {
    state.allowAdmin = true;
    state.submitMosque = {
      id: 404,
      name: "مسجد قيد الربط",
      registeredBy: 1,
      imamName: "إمام المسجد",
      imamEmail: null,
      imamPhone: "0553334444",
    };
    state.candidateUsers = [];

    const adminApi = callerFor({
      id: 1,
      name: "مدير النظام",
      email: "admin@tamam.sa",
      phone: "0500000001",
      role: "super_admin",
      requesterType: null,
    });
    const created = await adminApi.submit({ ...baseSubmission, mosqueId: 404 });
    expect(created).toEqual({ id: 700 });
    expect(state.insertedValues[0]).toMatchObject({
      mosqueId: 404,
      applicantId: null,
      submittedBy: 1,
      contact: {
        name: "إمام المسجد",
        phone: "0553334444",
      },
    });
  });

  it("includes resolved linkedRequester metadata in searchMosques for staff", async () => {
    state.allowAdmin = true;
    state.eligibleMosques = [
      { id: 201, name: "مسجد النور", city: "المدينة", district: "العوالي", address: "الشارع", capacity: 100, registeredBy: 42, imamEmail: null, imamPhone: null },
      { id: 202, name: "مسجد بلا حساب", city: "المدينة", district: "الحرة", address: "شارع 2", capacity: 80, registeredBy: 1, imamEmail: null, imamPhone: null },
    ];
    state.candidateUsers = [
      { id: 42, name: "الشيخ أحمد", email: "imam@mosque.sa", phone: "0551234567", requesterType: "imam" },
    ];

    const adminApi = callerFor({ id: 1, role: "super_admin" });
    const rows = await adminApi.searchMosques();
    expect(rows).toHaveLength(2);
    expect(rows[0].linkedRequester).toMatchObject({ id: 42, name: "الشيخ أحمد" });
    expect(rows[1].linkedRequester).toBeNull();
  });

  it("syncs edited mosque details back to the mosque master record on seasonal submission", async () => {
    const reqApi = callerFor({ id: 42, requesterType: "imam" });
    await reqApi.submit({
      ...baseSubmission,
      snapshot: {
        city: "أبها",
        district: "المنسك",
        address: "شارع الملك عبدالعزيز",
        worshippers: 320,
        men: null,
        women: null,
      },
    });
    expect(state.updatedMosques).toHaveLength(1);
    expect(state.updatedMosques[0]).toMatchObject({
      table: mosques,
      vals: {
        city: "أبها",
        district: "المنسك",
        address: "شارع الملك عبدالعزيز",
        capacity: 320,
      },
    });
  });
});
