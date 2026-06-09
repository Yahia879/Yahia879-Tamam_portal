import 'dotenv/config';
import { getDb } from '../server/db.ts';
import { projects, contractsEnhanced, contractPayments, payments, disbursementRequests, disbursementOrders } from '../drizzle/schema.ts';
import { desc, eq } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    process.exit(1);
  }

  // Find the most recently updated project
  const [latestProject] = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(1);
  if (!latestProject) {
    console.log("No projects found in database.");
    process.exit(0);
  }

  console.log(`=== Checking project: ${latestProject.name} (ID: ${latestProject.id}, Number: ${latestProject.projectNumber}) ===`);
  console.log(`Project Status: ${latestProject.status}`);
  console.log(`Project Request ID (mosqueRequests): ${latestProject.requestId}`);

  // Fetch contracts
  const contracts = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.projectId, latestProject.id));
  console.log(`\n--- Contracts (${contracts.length}) ---`);
  for (const c of contracts) {
    console.log(`Contract ID: ${c.id}, Status: ${c.status}, Number: ${c.contractNumber}, Amount: ${c.contractAmount}`);
  }

  // Fetch contract payments
  const cPayments = [];
  for (const c of contracts) {
    const cps = await db.select().from(contractPayments).where(eq(contractPayments.contractId, c.id));
    cPayments.push(...cps);
  }
  console.log(`\n--- Contract Payments (Installments) (${cPayments.length}) ---`);
  for (const cp of cPayments) {
    console.log(`Payment ID: ${cp.id}, Contract ID: ${cp.contractId}, Phase: ${cp.phaseName}, Amount: ${cp.amount}, Status: ${cp.status}`);
  }

  // Fetch manual payments
  const mPayments = await db.select().from(payments).where(eq(payments.projectId, latestProject.id));
  console.log(`\n--- Manual Payments (${mPayments.length}) ---`);
  for (const mp of mPayments) {
    console.log(`Payment ID: ${mp.id}, Type: ${mp.paymentType}, Amount: ${mp.amount}, Status: ${mp.status}`);
  }

  // Fetch disbursement requests
  const disbRequests = await db.select().from(disbursementRequests).where(eq(disbursementRequests.projectId, latestProject.id));
  console.log(`\n--- Disbursement Requests (${disbRequests.length}) ---`);
  for (const dr of disbRequests) {
    console.log(`Request ID: ${dr.id}, Request Number: ${dr.requestNumber}, Title: ${dr.title}, Amount: ${dr.amount}, Status: ${dr.status}, Contract Payment ID: ${dr.contractPaymentId}`);
    
    // Fetch associated disbursement orders
    const orders = await db.select().from(disbursementOrders).where(eq(disbursementOrders.disbursementRequestId, dr.id));
    console.log(`  Associated Disbursement Orders (${orders.length}):`);
    for (const o of orders) {
      console.log(`    Order ID: ${o.id}, Status: ${o.status}, Amount: ${o.amount}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
