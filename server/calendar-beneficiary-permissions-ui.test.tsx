import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CALENDAR_EVENT_TYPES } from "../shared/calendarPermissions";

const state = vi.hoisted(() => ({ permissions: [] as string[], data: {} as Record<string, any>, queries: [] as { path: string; enabled: boolean; input: any }[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "super_admin", permissions: ["*"] } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("wouter", () => ({ Link: ({ href, children }: any) => <a href={href}>{children}</a>, useLocation: () => ["/field-visits/calendar", vi.fn()] }));
vi.mock("@/components/ui/tabs", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { Tabs: Wrapper, TabsContent: Wrapper, TabsList: Wrapper, TabsTrigger: Wrapper };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (input: any, options: any = {}) => {
        const key = path.join(".");
        const enabled = options.enabled !== false;
        state.queries.push({ path: key, enabled, input });
        return { data: enabled ? key === "permissions.getUserPermissions" ? state.permissions : state.data[key] : undefined, isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

import FieldVisitsCalendar from "../client/src/pages/FieldVisitsCalendar";
import BeneficiarySatisfaction from "../client/src/pages/BeneficiarySatisfaction";

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = [];
  state.queries = [];
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  state.data = {
    "calendar.getUnifiedEvents": CALENDAR_EVENT_TYPES.map((type, index) => ({ id: String(index), rawId: index, type, title: `EVENT_${type}`, date: today, startTime: "09:00", assignedToId: 1, createdById: 1 })),
    "calendar.getCalendarSummaryStats": { fieldVisits: 1, quickResponse: 1, finalReports: 1, customEvents: 1, total: 4, todayCount: 4 },
    "users.getStaffUsers": [],
    "programs.getAll": [],
    "requests.getAllBeneficiaryEvaluations": { items: [
      { id: 1, requestNumber: "SURVEY_WITH_REPLY", rating: 4, comments: "Feedback", evaluatedAt: today, reply: { text: "Reply", repliedAt: today } },
      { id: 2, requestNumber: "SURVEY_WITHOUT_REPLY", rating: 4, comments: "Feedback", evaluatedAt: today },
    ], stats: { totalEvaluations: 2, averageRating: 4, satisfactionRate: 80, programsCount: 1 } },
  };
});

describe("calendar controls with explicit permissions", () => {
  it.each(CALENDAR_EVENT_TYPES)("only renders %s appointments and its statistic card", type => {
    state.permissions = [`appointments.view_${type}`];
    const html = renderToStaticMarkup(<FieldVisitsCalendar />);
    for (const other of CALENDAR_EVENT_TYPES) expect(html.includes(`EVENT_${other}`)).toBe(type === other);
    const labels = { field_visit: "الزيارات الميدانية", quick_response: "الاستجابة السريعة", final_report: "التقرير الختامي", custom: "الأحداث المخصصة" };
    for (const other of CALENDAR_EVENT_TYPES) expect(html.includes(`>${labels[other]}</p>`)).toBe(type === other);
    expect(html).not.toContain("إضافة حدث مخصص");
    const query = state.queries.find(q => q.path === "calendar.getUnifiedEvents")!;
    expect(query.input.types).toEqual([type]);
    expect(query.enabled).toBe(true);
  });
  it("shows creation independently while disabling unauthorized read queries", () => {
    state.permissions = ["appointments.create_custom"];
    const html = renderToStaticMarkup(<FieldVisitsCalendar />);
    expect(html).toContain("إضافة حدث مخصص");
    expect(html).not.toContain("EVENT_");
    expect(state.queries.filter(q => q.path.startsWith("calendar.")).every(q => !q.enabled)).toBe(true);
  });
  it("removes data and creation after rights are revoked even for the general administrator", () => {
    state.permissions = ["*"];
    const html = renderToStaticMarkup(<FieldVisitsCalendar />);
    expect(html).not.toContain("EVENT_");
    expect(html).not.toContain("إضافة حدث مخصص");
  });
  it("only displays assigned appointments in personal mode and hides creation even if a conflicting right is present", () => {
    state.permissions = ["appointments.view_own", "appointments.create_custom", "appointments.view_field_visit"];
    state.data["calendar.getUnifiedEvents"].push({ id: "other", type: "custom", title: "OTHER_USER_EVENT", date: state.data["calendar.getUnifiedEvents"][0].date, assignedToId: 9 });
    const html = renderToStaticMarkup(<FieldVisitsCalendar />);
    expect(html).toContain("EVENT_field_visit");
    expect(html).toContain("EVENT_quick_response");
    expect(html).toContain("EVENT_final_report");
    expect(html).toContain("EVENT_custom");
    expect(html).not.toContain("OTHER_USER_EVENT");
    expect(html).not.toContain("إضافة حدث مخصص");
    expect(state.queries.find(q => q.path === "users.getStaffUsers")?.enabled).toBe(false);
  });
});

describe("beneficiary survey log controls", () => {
  it.each([["view_reply", "عرض الرد"], ["reply", "إضافة رد"], ["hide", "إخفاء"]])("requires the survey log for %s", (action, label) => {
    state.permissions = ["beneficiary_evaluations.view", `beneficiary_evaluations.${action}`];
    let html = renderToStaticMarkup(<BeneficiarySatisfaction />);
    expect(html).not.toContain("SURVEY_WITH_REPLY");
    expect(html).not.toContain(`<span>${label}</span>`);
    state.permissions.push("beneficiary_evaluations.evaluations_log");
    html = renderToStaticMarkup(<BeneficiarySatisfaction />);
    expect(html).toContain("SURVEY_WITH_REPLY");
    expect(html).toContain(`<span>${label}</span>`);
    state.permissions = ["beneficiary_evaluations.view", `beneficiary_evaluations.${action}`];
    expect(renderToStaticMarkup(<BeneficiarySatisfaction />)).not.toContain(`<span>${label}</span>`);
  });
  it("hides retired sections and never fetches their data", () => {
    state.permissions = ["beneficiary_evaluations.evaluations_log", "beneficiary_evaluations.dispatch_log", "beneficiary_evaluations.contacts", "beneficiary_evaluations.resend_reminder"];
    const html = renderToStaticMarkup(<BeneficiarySatisfaction />);
    expect(html).not.toContain("السجلات (الاستبيانات المرسلة)");
    expect(html).not.toContain("المستفيدين المعتمدين والاستفسارات");
    expect(state.queries.filter(q => ["requests.getBeneficiarySurveyLogs", "requests.getApprovedBeneficiariesAndContacts"].includes(q.path)).every(q => !q.enabled)).toBe(true);
  });
  it("does not fall back to administrator wildcard after permissions are revoked", () => {
    const html = renderToStaticMarkup(<BeneficiarySatisfaction />);
    expect(html).not.toContain("SURVEY_");
    expect(html).toContain("ليس لديك صلاحية");
    expect(state.queries.find(q => q.path === "requests.getAllBeneficiaryEvaluations")?.enabled).toBe(false);
  });
});
