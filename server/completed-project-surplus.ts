import { and, gte, ne } from "drizzle-orm";
import { projects } from "../drizzle/schema";
import { getDb } from "./db";
import { lockFund, postCompletedProjectSurplus } from "./fund";

// Also handles projects already at 100% and receipts approved after completion.
export async function reconcileCompletedProjectSurpluses(db: any) {
  const completed = await db.select({ id: projects.id }).from(projects)
    .where(and(gte(projects.completionPercentage, 100), ne(projects.status, "cancelled")));
  for (const project of completed) {
    try {
      await db.transaction(async (tx: any) => {
        await lockFund(tx);
        await postCompletedProjectSurplus(tx, project.id, null);
      });
    } catch (error) {
      console.error(`[Project surplus] Settlement failed for project ${project.id}; will retry`, error);
    }
  }
}

export function startCompletedProjectSurplusSettlement() {
  let running = false;
  const reconcile = async () => {
    if (running) return;
    running = true;
    try {
      const db = await getDb();
      if (db) await reconcileCompletedProjectSurpluses(db);
    } catch (error) {
      console.error("[Project surplus] Reconciliation failed; will retry", error);
    } finally {
      running = false;
    }
  };
  void reconcile();
  const timer = setInterval(() => void reconcile(), 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
