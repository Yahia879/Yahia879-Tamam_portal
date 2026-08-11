import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function inspectLinkedDisbursement() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.log("No DATABASE_URL"); return; }
  const conn = await mysql.createConnection(dbUrl);

  // 1. List all projects with their contracts
  console.log("\n=== All active projects with contracts ===");
  const [projects] = await conn.query(`
    SELECT p.id, p.name, p.budget, 
           c.id as contractId, c.contractAmount, c.contractNumber
    FROM projects p
    LEFT JOIN contracts c ON c.projectId = p.id
    WHERE p.deletedAt IS NULL
    ORDER BY p.id DESC
    LIMIT 20
  `) as any[];
  console.table(projects);

  // 2. For each project with a contract, check payments sum
  for (const proj of projects) {
    if (!proj.contractId) continue;
    
    const contractAmount = parseFloat(proj.contractAmount || "0");
    
    // Get all disbursement requests for this project
    const [payments] = await conn.query(`
      SELECT dr.id, dr.requestNumber, dr.amount, dr.status, dr.paymentType
      FROM disbursement_requests dr
      WHERE dr.projectId = ? AND dr.status NOT IN ('rejected', 'cancelled')
      ORDER BY dr.id
    `, [proj.id]) as any[];
    
    const totalPayments = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0);
    const remaining = contractAmount - totalPayments;
    
    if (payments.length > 0) {
      console.log(`\n--- Project ${proj.id}: ${proj.name} ---`);
      console.log(`  Contract Amount: ${contractAmount}`);
      console.log(`  Total Payments (non-rejected): ${totalPayments}`);
      console.log(`  Remaining: ${remaining}`);
      console.log(`  Would block new?: ${remaining <= 0 ? "YES ❌" : "NO ✅"}`);
      console.table(payments);
    }
  }

  // 3. Also check contract_payments table
  console.log("\n=== Contract Payments (from contract_payments table) ===");
  const [contractPayments] = await conn.query(`
    SELECT cp.id, cp.contractId, cp.amount, cp.status, cp.paymentNumber,
           c.contractAmount, c.projectId
    FROM contract_payments cp
    JOIN contracts c ON cp.contractId = c.id
    WHERE cp.status NOT IN ('rejected', 'cancelled')
    ORDER BY cp.contractId, cp.paymentNumber
  `) as any[];
  console.table(contractPayments);

  await conn.end();
}

inspectLinkedDisbursement().catch(console.error);
