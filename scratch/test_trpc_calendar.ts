import { appRouter } from "../server/routers.ts";
import { getDb } from "../server/db.ts";
import * as dotenv from "dotenv";

dotenv.config();

async function testTrpc() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }
  
  // Define ctx mock for user ID 3 (field_team)
  const ctx: any = {
    user: {
      id: 3,
      role: "field_team"
    },
    req: {},
    res: {}
  };

  const caller = appRouter.createCaller(ctx);
  
  console.log("=== Calling trpc.requests.getScheduledVisits for July 2026 ===");
  try {
    const response = await caller.requests.getScheduledVisits({
      startDate: "2026-07-01",
      endDate: "2026-07-31"
    });
    console.log("Response:", response);
  } catch (error) {
    console.error("Error calling getScheduledVisits:", error);
  }
}

testTrpc().catch(console.error);
