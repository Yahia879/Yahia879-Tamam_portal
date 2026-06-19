import 'dotenv/config';
import { getDb } from '../server/db';
import { projects, contractsEnhanced, payments, disbursementRequests } from '../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) {
    console.error("No DB available");
    process.exit(1);
  }

  // Define union queries
  const projectRequests = db
    .select({
      projectId: disbursementRequests.projectId,
      amount: disbursementRequests.amount,
      status: disbursementRequests.status,
    })
    .from(disbursementRequests);

  const projectManualPayments = db
    .select({
      projectId: payments.projectId,
      amount: payments.amount,
      status: payments.status,
    })
    .from(payments);

  const allProjectFinancials = sql`(${projectRequests} UNION ALL ${projectManualPayments})`;

  console.log("--- RUNNING NESTED SELECTS QUERY ---");
  try {
    const nestedByProject = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
        totalRequested: sql<number>`
          COALESCE((
            SELECT SUM(CAST(amount AS DECIMAL(15,2)))
            FROM (${allProjectFinancials}) as f
            WHERE f.projectId = ${projects.id}
          ), 0)
        `,
        approvedCount: sql<number>`
          COALESCE((
            SELECT SUM(CASE WHEN status IN ('approved', 'paid') THEN 1 ELSE 0 END)
            FROM (${allProjectFinancials}) as f
            WHERE f.projectId = ${projects.id}
          ), 0)
        `,
        paidCount: sql<number>`
          COALESCE((
            SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
            FROM (${allProjectFinancials}) as f
            WHERE f.projectId = ${projects.id}
          ), 0)
        `,
        totalPaid: sql<number>`
          COALESCE((
            SELECT SUM(CASE WHEN status = 'paid' THEN CAST(amount AS DECIMAL(15,2)) ELSE 0 END)
            FROM (${allProjectFinancials}) as f
            WHERE f.projectId = ${projects.id}
          ), 0)
        `,
        contractAmount: sql<number>`
          COALESCE((
            SELECT SUM(CAST(contractAmount AS DECIMAL(15,2)))
            FROM contracts_enhanced
            WHERE projectId = ${projects.id} AND status IN ('approved', 'active')
          ), 0)
        `,
        managementPercentage: sql<number>`
          COALESCE((
            SELECT MAX(CAST(managementPercentage AS DECIMAL(5,2)))
            FROM contracts_enhanced
            WHERE projectId = ${projects.id} AND status IN ('approved', 'active')
          ), 0)
        `,
        associationValue: sql<number>`
          COALESCE((
            SELECT SUM(CAST(contractAmount AS DECIMAL(15,2)) * CAST(managementPercentage AS DECIMAL(5,2)) / 100)
            FROM contracts_enhanced
            WHERE projectId = ${projects.id} AND status IN ('approved', 'active')
          ), 0)
        `,
      })
      .from(projects)
      .orderBy(desc(sql`
        COALESCE((
          SELECT SUM(CAST(amount AS DECIMAL(15,2)))
          FROM (${allProjectFinancials}) as f
          WHERE f.projectId = ${projects.id}
        ), 0)
      `))
      .limit(5);

    console.log("Nested selects results count:", nestedByProject.length);
    console.log("Sample rows:", JSON.stringify(nestedByProject, null, 2));
  } catch (err) {
    console.error("Error in nested selects query:", err);
  }

  process.exit(0);
})();
