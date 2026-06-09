import "dotenv/config";
import { getDb } from "../server/db.ts";
import { projects, contractsEnhanced, progressReports } from "../drizzle/schema.ts";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    return;
  }
  
  const allProjects = await db.select().from(projects);
  console.log(`=== Projects (${allProjects.length}) ===`);
  for (const proj of allProjects) {
    console.log(`Project ID: ${proj.id}, Name: ${proj.name}, Number: ${proj.projectNumber}`);
    
    // Get contracts for this project
    const contracts = await db.select().from(contractsEnhanced).where({ projectId: proj.id });
    console.log(`  Contracts (${contracts.length}):`);
    for (const c of contracts) {
      console.log(`    Contract ID: ${c.id}, Status: ${c.status}, Title: ${c.contractTitle}, SecondPartyName: ${c.secondPartyName}`);
    }
    
    // Get progress reports for this project
    const reports = await db.select().from(progressReports).where({ projectId: proj.id });
    console.log(`  Progress Reports (${reports.length}):`);
    for (const r of reports) {
      console.log(`    Report ID: ${r.id}, Status: ${r.status}, Title: ${r.title}, Progress: ${r.actualProgress}%`);
    }
    console.log("");
  }
  
  process.exit(0);
}

run().catch(console.error);
