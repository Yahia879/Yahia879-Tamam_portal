import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, users, userRoleAssignments, userPermissions } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  
  // Find request 35
  const [request] = await db
    .select()
    .from(mosqueRequests)
    .where(eq(mosqueRequests.id, 35))
    .limit(1);
    
  if (!request) {
    console.error("Request 35 not found");
    return;
  }
  
  const assignedUserId = request.finalReportAssignedTo;
  console.log("Request 35 details:");
  console.log(" - requestNumber:", request.requestNumber);
  console.log(" - currentStage:", request.currentStage);
  console.log(" - finalReportAssignedTo:", assignedUserId);
  
  if (!assignedUserId) {
    console.log("No final report user assigned to this request.");
    return;
  }
  
  // Find user details
  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, assignedUserId))
    .limit(1);
    
  if (!userData) {
    console.error(`User with ID ${assignedUserId} not found`);
    return;
  }
  
  console.log("\nUser Details:");
  console.log(" - Name:", userData.name);
  console.log(" - Email:", userData.email);
  console.log(" - Primary Role in users table:", userData.role);
  console.log(" - Status:", userData.status);
  
  // Custom role assignments
  const rolesAssigned = await db
    .select()
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, assignedUserId));
  console.log("\nAssigned Roles (userRoleAssignments):", rolesAssigned);
  
  // Direct user permissions
  const directPerms = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, assignedUserId));
  console.log("\nDirect Permissions (userPermissions):", directPerms);
  
  // Calculated permissions
  const calculated = await calculateUserPermissions(assignedUserId);
  console.log("\nCalculated Permissions:", calculated);
  console.log(" - Has 'requests.upload_final_report'?", calculated.includes("requests.upload_final_report"));
}

main().catch(console.error);
