import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server', 'routers', 'disbursements.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetQuery = `      const byProject = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
          totalRequested: sql<number>\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`,
          approvedCount: sql<number>\`SUM(CASE WHEN f.status IN ('approved', 'paid') THEN 1 ELSE 0 END)\`,
          paidCount: sql<number>\`SUM(CASE WHEN f.status = 'paid' THEN 1 ELSE 0 END)\`,
          totalPaid: sql<number>\`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)\`,
          managementPercentage: sql<number>\`COALESCE(MAX(CAST(\${contractsEnhanced.managementPercentage} AS DECIMAL(5,2))), 0)\`,
          associationValue: sql<number>\`COALESCE(SUM(CAST(\${contractsEnhanced.contractAmount} AS DECIMAL(15,2)) * CAST(\${contractsEnhanced.managementPercentage} AS DECIMAL(5,2)) / 100), 0)\`,
        })
        .from(projects)
        .leftJoin(sql\`\${allProjectFinancials} as f\`, eq(projects.id, sql\`f.projectId\`))
        .leftJoin(contractsEnhanced, eq(projects.id, contractsEnhanced.projectId))
        .groupBy(projects.id, projects.name, projects.projectNumber)
        .orderBy(desc(sql\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`));`;

const newQuery = `      const byProject = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
          totalRequested: sql<number>\`
            COALESCE((
              SELECT SUM(CAST(amount AS DECIMAL(15,2)))
              FROM (\${allProjectFinancials}) as f
              WHERE f.projectId = \${projects.id}
            ), 0)
          \`,
          approvedCount: sql<number>\`
            COALESCE((
              SELECT SUM(CASE WHEN status IN ('approved', 'paid') THEN 1 ELSE 0 END)
              FROM (\${allProjectFinancials}) as f
              WHERE f.projectId = \${projects.id}
            ), 0)
          \`,
          paidCount: sql<number>\`
            COALESCE((
              SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
              FROM (\${allProjectFinancials}) as f
              WHERE f.projectId = \${projects.id}
            ), 0)
          \`,
          totalPaid: sql<number>\`
            COALESCE((
              SELECT SUM(CASE WHEN status = 'paid' THEN CAST(amount AS DECIMAL(15,2)) ELSE 0 END)
              FROM (\${allProjectFinancials}) as f
              WHERE f.projectId = \${projects.id}
            ), 0)
          \`,
          contractAmount: sql<number>\`
            COALESCE((
              SELECT CAST(contractAmount AS DECIMAL(15,2))
              FROM contracts_enhanced
              WHERE projectId = \${projects.id} AND status != 'cancelled'
              ORDER BY id DESC
              LIMIT 1
            ), 0)
          \`,
          managementPercentage: sql<number>\`
            COALESCE((
              SELECT CAST(managementPercentage AS DECIMAL(5,2))
              FROM contracts_enhanced
              WHERE projectId = \${projects.id} AND status != 'cancelled'
              ORDER BY id DESC
              LIMIT 1
            ), 0)
          \`,
          associationValue: sql<number>\`
            COALESCE((
              SELECT CAST(contractAmount AS DECIMAL(15,2)) * CAST(managementPercentage AS DECIMAL(5,2)) / 100
              FROM contracts_enhanced
              WHERE projectId = \${projects.id} AND status != 'cancelled'
              ORDER BY id DESC
              LIMIT 1
            ), 0)
          \`,
        })
        .from(projects)
        .orderBy(desc(sql\`
          COALESCE((
            SELECT SUM(CAST(amount AS DECIMAL(15,2)))
            FROM (\${allProjectFinancials}) as f
            WHERE f.projectId = \${projects.id}
          ), 0)
        \`));`;

const normalize = (str) => str.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = normalize(targetQuery);
const normalizedNew = newQuery.replace(/\r\n/g, '\n');

// Find index of the query by doing whitespace-insensitive search
let found = false;
let startPos = -1;
let endPos = -1;

// Let's do a regex search or a simple search for unique parts
const startAnchor = 'const byProject = await db';
const endAnchor = "orderBy(desc(sql`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`));";

const startIndex = normalizedContent.indexOf(startAnchor);
const endIndex = normalizedContent.indexOf(endAnchor);

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  startPos = startIndex;
  endPos = endIndex + endAnchor.length;
  found = true;
}

if (found) {
  const originalPart = normalizedContent.slice(startPos, endPos);
  const updatedContent = normalizedContent.replace(originalPart, normalizedNew);
  const finalContent = content.includes('\r\n') ? updatedContent.replace(/\n/g, '\r\n') : updatedContent;
  
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log("Successfully replaced byProject query in disbursements.ts!");
} else {
  console.error("Could not find the target query boundaries in disbursements.ts!");
  process.exit(1);
}
