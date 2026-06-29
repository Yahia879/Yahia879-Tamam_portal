import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, users, userRoleAssignments, userPermissions } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";
import { eq, isNotNull } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  
  const handovers = await db
    .select()
    .from(mosqueRequests)
    .where(isNotNull(mosqueRequests.finalReportAssignedTo));
    
  console.log(`Found ${handovers.length} requests with finalReportAssignedTo:`);
  for (const req of handovers) {
    const userId = req.finalReportAssignedTo!;
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (userData) {
      const calculated = await calculateUserPermissions(userId);
      console.log(`\nRequest ID ${req.id} (${req.requestNumber}):`);
      console.log(` - Assigned User: ${userData.name} (ID: ${userId}, Email: ${userData.email}, Role: ${userData.role})`);
      console.log(` - Has requests.upload_final_report permission?`, calculated.includes("requests.upload_final_report"));
    }
  }
}

main().catch(console.error);
