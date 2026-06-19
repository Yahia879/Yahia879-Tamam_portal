import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server', 'routers', 'disbursements.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetMonth = `      const byMonth = await db
        .select({
          month: sql<string>\`f.month\`,
          totalRequested: sql<number>\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`,
          requestCount: sql<number>\`COUNT(*)\`,
          totalPaid: sql<number>\`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)\`,
        })
        .from(sql\`\${allMonthlyFinancials} as f\`)
        .groupBy(sql\`f.month\`)
        .orderBy(desc(sql\`f.month\`));`;

const replacementMonth = `      const byMonth = await (db
        .select({
          month: sql<string>\`f.month\`,
          totalRequested: sql<number>\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`,
          requestCount: sql<number>\`COUNT(*)\`,
          totalPaid: sql<number>\`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)\`,
        })
        .from(sql\`\${allMonthlyFinancials} as f\`)
        .groupBy(sql\`f.month\`) as any)
        .orderBy(desc(sql\`f.month\`));`;

const targetFunding = `      const byFundingSource = await db
        .select({
          fundingSource: sql<string>\`f.paymentType\`,
          totalRequested: sql<number>\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`,
          requestCount: sql<number>\`COUNT(*)\`,
          totalPaid: sql<number>\`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)\`,
        })
        .from(sql\`\${allTypeFinancials} as f\`)
        .groupBy(sql\`f.paymentType\`)
        .orderBy(desc(sql\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`));`;

const replacementFunding = `      const byFundingSource = await (db
        .select({
          fundingSource: sql<string>\`f.paymentType\`,
          totalRequested: sql<number>\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`,
          requestCount: sql<number>\`COUNT(*)\`,
          totalPaid: sql<number>\`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)\`,
        })
        .from(sql\`\${allTypeFinancials} as f\`)
        .groupBy(sql\`f.paymentType\`) as any)
        .orderBy(desc(sql\`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)\`));`;

const normalize = (str) => str.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

let normalizedContent = content.replace(/\r\n/g, '\n');

let updatedContent = normalizedContent;

// 1. Replace month query
const normTargetMonth = normalize(targetMonth);
const normReplacementMonth = replacementMonth.replace(/\r\n/g, '\n');

// Find and replace month query
const startMonthAnchor = 'const byMonth = await db';
const endMonthAnchor = '.orderBy(desc(sql`f.month`));';
const startIdx = normalizedContent.indexOf(startMonthAnchor);
const endIdx = normalizedContent.indexOf(endMonthAnchor);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  const originalMonth = normalizedContent.slice(startIdx, endIdx + endMonthAnchor.length);
  updatedContent = updatedContent.replace(originalMonth, normReplacementMonth);
} else {
  console.error("Month query not found!");
  process.exit(1);
}

// 2. Replace funding query
const normReplacementFunding = replacementFunding.replace(/\r\n/g, '\n');
const startFundingAnchor = 'const byFundingSource = await db';
const endFundingAnchor = ".orderBy(desc(sql`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`));";
const startFundIdx = updatedContent.indexOf(startFundingAnchor);
const endFundIdx = updatedContent.indexOf(endFundingAnchor);

if (startFundIdx !== -1 && endFundIdx !== -1 && endFundIdx > startFundIdx) {
  const originalFunding = updatedContent.slice(startFundIdx, endFundIdx + endFundingAnchor.length);
  updatedContent = updatedContent.replace(originalFunding, normReplacementFunding);
} else {
  console.error("Funding source query not found!");
  process.exit(1);
}

const finalContent = content.includes('\r\n') ? updatedContent.replace(/\n/g, '\r\n') : updatedContent;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("Successfully cast monthly and funding source queries to any!");
