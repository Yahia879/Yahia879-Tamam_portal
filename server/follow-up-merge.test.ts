import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import {
  FOLLOW_UP_REPORT_TITLE,
  mergeFollowUpReports,
  type MergeableFollowUpReport,
} from "../shared/followUpReport";

const state = vi.hoisted(() => ({
  role: "project_manager",
  selected: [] as string[],
  reports: [] as any[],
  writes: [] as { table: string; values: any }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    function rows(table: any) {
      switch (getTableName(table)) {
        case "users":
          return [{ id: 1, role: state.role, name: "أحمد" }];
        case "roles":
          return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
        case "permissions":
          return state.selected.map(id => ({ id }));
        case "role_permissions":
          return [];
        case "user_permissions":
          return [];
        case "progress_reports":
          return state.reports;
        default:
          return [];
      }
    }

    function query(table?: any): any {
      const chain: any = {
        from: (value: any) => {
          table = value;
          return chain;
        },
        then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject),
      };
      for (const method of ["where", "limit", "offset", "orderBy", "leftJoin", "innerJoin", "groupBy"]) {
        chain[method] = () => chain;
      }
      return chain;
    }

    const write = (table: any) => (values: any) => {
      state.writes.push({ table: getTableName(table), values });
      const result = Promise.resolve([{ insertId: 500 }]);
      return Object.assign(result, { where: () => result });
    };

    return {
      select: () => query(),
      insert: (table: any) => ({ values: write(table) }),
      update: (table: any) => ({ set: write(table) }),
    };
  },
}));

vi.mock("./routers/notifications", () => ({
  notifyProgressReportCreation: vi.fn(),
  notifyProgressReportApproval: vi.fn(),
  createNotification: vi.fn(),
}));

import { progressReportsRouter } from "./routers/progressReports";

const caller = () =>
  progressReportsRouter.createCaller({
    user: { id: 1, role: state.role, name: "أحمد" },
    req: {},
    res: {},
  } as TrpcContext);

const baseApprovedReport1: MergeableFollowUpReport = {
  id: 10,
  reportNumber: "RPT-2026-0010",
  projectId: 7,
  title: FOLLOW_UP_REPORT_TITLE,
  status: "approved",
  reportDate: "2026-01-16",
  reportPeriodStart: "2026-01-01",
  reportPeriodEnd: "2026-01-15",
  plannedProgress: 30,
  actualProgress: 25,
  followUpDetails: {
    summary: "أعمال الحفر والأساسات",
    challenges: "تأخر توريد الحديد",
    timeIndicator: "أصفر",
    costIndicator: "أخضر",
    amountSpent: "120000",
    approvedBudget: "500000",
    escalation: true,
    milestones: [
      { title: "الأساسات", dueDate: "2026-01-20", status: "قيد التنفيذ" },
    ],
    risks: [{ description: "تأخر التوريد", plan: "مورد بديل", assignee: "سالم" }],
    links: [{ title: "ملف الموقع", url: "https://example.com/site" }],
  },
  attachments: JSON.stringify([
    { fileName: "site-1.jpg", fileData: "AAAA1111", mimeType: "image/jpeg", size: 1200 },
  ]),
};

const baseApprovedReport2: MergeableFollowUpReport = {
  id: 12,
  reportNumber: "RPT-2026-0012",
  projectId: 7,
  title: FOLLOW_UP_REPORT_TITLE,
  status: "approved",
  reportDate: "2026-02-01",
  reportPeriodStart: "2026-01-16",
  reportPeriodEnd: "2026-01-31",
  plannedProgress: 60,
  actualProgress: 58,
  followUpDetails: {
    summary: "صب الأعمدة والسقف الأول",
    recommendations: "زيادة عدد العمالة",
    timeIndicator: "أخضر",
    overallTrend: "متحسّن",
    amountSpent: "260000",
    milestones: [
      { title: "الأساسات", completionDate: "2026-01-19", status: "مكتمل" },
      { title: "الأعمدة", dueDate: "2026-02-05", status: "قيد التنفيذ" },
    ],
    risks: [
      { description: "تأخر التوريد", plan: "مورد بديل", assignee: "سالم" },
      { description: "أمطار موسمية", plan: "تغطية الموقع", assignee: "خالد" },
    ],
    links: [{ title: "ملف الموقع المحدّث", url: "https://example.com/site" }],
  },
  attachments: JSON.stringify([
    { fileName: "site-1.jpg", fileData: "AAAA1111", mimeType: "image/jpeg", size: 1200 },
    { fileName: "site-2.jpg", fileData: "BBBB2222", mimeType: "image/jpeg", size: 1500 },
  ]),
};

describe("mergeFollowUpReports", () => {
  it("sorts chronologically and merges periods, metrics, text, tables, and attachments without duplicates", () => {
    const merged = mergeFollowUpReports([baseApprovedReport2, baseApprovedReport1], {
      reportDate: "2026-02-05",
    });

    expect(merged.projectId).toBe(7);
    expect(merged.reportDate).toBe("2026-02-05");
    expect(merged.reportPeriodStart).toBe("2026-01-01");
    expect(merged.reportPeriodEnd).toBe("2026-01-31");
    expect(merged.plannedProgress).toBe(60);
    expect(merged.actualProgress).toBe(58);

    expect(merged.followUpDetails.timeIndicator).toBe("أخضر");
    expect(merged.followUpDetails.costIndicator).toBe("أخضر");
    expect(merged.followUpDetails.overallTrend).toBe("متحسّن");
    expect(merged.followUpDetails.amountSpent).toBe("260000");
    expect(merged.followUpDetails.approvedBudget).toBe("500000");
    expect(merged.followUpDetails.escalation).toBe(true);

    expect(merged.followUpDetails.summary).toContain("[RPT-2026-0010 | 1/1/2026 - 15/1/2026]\nأعمال الحفر والأساسات");
    expect(merged.followUpDetails.summary).toContain("[RPT-2026-0012 | 16/1/2026 - 31/1/2026]\nصب الأعمدة والسقف الأول");
    expect(merged.followUpDetails.challenges).toContain("تأخر توريد الحديد");
    expect(merged.followUpDetails.recommendations).toContain("زيادة عدد العمالة");

    // Milestone deduplicated by title with latest state + preserved dueDate
    expect(merged.followUpDetails.milestones).toEqual([
      { title: "الأساسات", dueDate: "2026-01-20", completionDate: "2026-01-19", status: "مكتمل" },
      { title: "الأعمدة", dueDate: "2026-02-05", status: "قيد التنفيذ" },
    ]);

    // Risks deduplicated
    expect(merged.followUpDetails.risks).toHaveLength(2);

    // Link deduplicated by URL keeping latest title
    expect(merged.followUpDetails.links).toEqual([
      { title: "ملف الموقع المحدّث", url: "https://example.com/site" },
    ]);

    // Attachments deduplicated
    expect(merged.attachments.map(file => file.fileName)).toEqual(["site-1.jpg", "site-2.jpg"]);

    // Source reports preserved in chronological order
    expect(merged.followUpDetails.sourceReports?.map(source => source.id)).toEqual([10, 12]);
  });

  it("allows re-merging an already merged approved follow-up report with another report", () => {
    const firstMerged = mergeFollowUpReports([baseApprovedReport1, baseApprovedReport2], {
      reportDate: "2026-02-05",
    });

    const previouslyMergedReport: MergeableFollowUpReport = {
      id: 20,
      reportNumber: "RPT-2026-0020",
      projectId: 7,
      title: FOLLOW_UP_REPORT_TITLE,
      status: "approved",
      reportDate: firstMerged.reportDate,
      reportPeriodStart: firstMerged.reportPeriodStart,
      reportPeriodEnd: firstMerged.reportPeriodEnd,
      plannedProgress: firstMerged.plannedProgress,
      actualProgress: firstMerged.actualProgress,
      followUpDetails: firstMerged.followUpDetails,
      attachments: JSON.stringify(firstMerged.attachments),
    };

    const thirdReport: MergeableFollowUpReport = {
      id: 25,
      reportNumber: "RPT-2026-0025",
      projectId: 7,
      title: FOLLOW_UP_REPORT_TITLE,
      status: "approved",
      reportDate: "2026-02-16",
      reportPeriodStart: "2026-02-01",
      reportPeriodEnd: "2026-02-15",
      plannedProgress: 80,
      actualProgress: 78,
      followUpDetails: {
        summary: "أعمال التشطيب الأولية",
      },
    };

    const reMerged = mergeFollowUpReports([previouslyMergedReport, thirdReport], {
      reportDate: "2026-02-20",
    });

    expect(reMerged.reportPeriodStart).toBe("2026-01-01");
    expect(reMerged.reportPeriodEnd).toBe("2026-02-15");
    expect(reMerged.actualProgress).toBe(78);
    expect(reMerged.followUpDetails.sourceReports?.map(source => source.id)).toEqual([20, 25]);
  });
});

describe("progressReportsRouter follow-up merge procedures", () => {
  beforeEach(() => {
    state.role = "project_manager";
    state.selected = ["project_reports.view", "project_reports.create"];
    state.writes = [];
    state.reports = [baseApprovedReport1, baseApprovedReport2];
  });

  it("lists approved follow-ups with merged indicator metadata", async () => {
    state.reports = [
      {
        ...baseApprovedReport1,
        followUpDetails: {
          ...(baseApprovedReport1.followUpDetails as object),
          sourceReports: [{ id: 1, reportNumber: "RPT-2026-0001" }, { id: 2, reportNumber: "RPT-2026-0002" }],
        },
      },
      baseApprovedReport2,
    ];

    const list = await caller().listApprovedFollowUps({ projectId: 7 });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: 10, isMerged: true, sourceReportsCount: 2 });
    expect(list[1]).toMatchObject({ id: 12, isMerged: false, sourceReportsCount: 0 });
  });

  it("rejects merging non-approved follow-up reports", async () => {
    state.reports = [baseApprovedReport1, { ...baseApprovedReport2, status: "draft" }];

    await expect(
      caller().previewFollowUpMerge({ projectId: 7, reportIds: [10, 12] })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "يُسمح بدمج تقارير المتابعة المعتمدة فقط.",
    });
  });

  it("rejects merging non-follow-up reports", async () => {
    state.reports = [baseApprovedReport1, { ...baseApprovedReport2, title: "تقرير زيارة ميدانية" }];

    await expect(
      caller().previewFollowUpMerge({ projectId: 7, reportIds: [10, 12] })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "يُسمح بدمج تقارير المتابعة فقط.",
    });
  });

  it("rejects merging reports from different projects", async () => {
    state.reports = [baseApprovedReport1, { ...baseApprovedReport2, projectId: 99 }];

    await expect(
      caller().previewFollowUpMerge({ projectId: 7, reportIds: [10, 12] })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "يجب أن تنتمي جميع التقارير المختارة إلى نفس المشروع.",
    });
  });

  it("enforces create permission for previewFollowUpMerge", async () => {
    state.selected = ["project_reports.view"];

    await expect(
      caller().previewFollowUpMerge({ projectId: 7, reportIds: [10, 12] })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows saving a newly merged follow-up report when all source reports are approved", async () => {
    const merged = await caller().previewFollowUpMerge({ projectId: 7, reportIds: [10, 12] });

    const created = await caller().create({
      projectId: 7,
      reportDate: merged.reportDate,
      reportPeriodStart: merged.reportPeriodStart,
      reportPeriodEnd: merged.reportPeriodEnd,
      plannedProgress: merged.plannedProgress,
      actualProgress: merged.actualProgress,
      overallProgress: merged.actualProgress,
      followUpDetails: merged.followUpDetails,
      attachments: JSON.stringify(merged.attachments),
    });

    expect(created.id).toBe(500);
    expect(state.writes.some(write => write.table === "progress_reports")).toBe(true);
    const saved = state.writes.find(write => write.table === "progress_reports")?.values;
    expect(saved.title).toBe(FOLLOW_UP_REPORT_TITLE);
    expect(saved.followUpDetails.sourceReports).toHaveLength(2);
  });

  it("rejects saving a follow-up report referencing an unapproved source report", async () => {
    state.reports = [baseApprovedReport1, { ...baseApprovedReport2, status: "submitted" }];

    await expect(
      caller().create({
        projectId: 7,
        reportDate: "2026-02-05",
        reportPeriodStart: "2026-01-01",
        reportPeriodEnd: "2026-01-31",
        followUpDetails: {
          summary: "ملخص مدمج",
          sourceReports: [
            { id: 10, reportNumber: "RPT-2026-0010" },
            { id: 12, reportNumber: "RPT-2026-0012" },
          ],
        },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "يُسمح بدمج تقارير المتابعة المعتمدة فقط.",
    });
    expect(state.writes).toEqual([]);
  });
});
