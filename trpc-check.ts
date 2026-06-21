import dotenv from "dotenv";
dotenv.config();

import { getDb } from "./server/db";
import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    console.log("Calling projects.getById for project ID 3...");
    const projectResult = await caller.projects.getById({ id: 3 });
    console.log("Project Name:", projectResult.name);
    console.log("Project Payments count:", projectResult.payments?.length);
    console.log("Project Contracts count:", projectResult.contracts?.length);
    console.log("Size of projectResult in JSON bytes:", JSON.stringify(projectResult).length);

    console.log("\nCalling contracts.getById for contract ID 1...");
    const contractResult = await caller.contracts.getById({ id: 1 });
    console.log("Contract Number:", contractResult.contract?.contractNumber);
    console.log("Second Party Name:", contractResult.contract?.secondPartyName);
    console.log("Second Party IBAN:", contractResult.contract?.secondPartyIban);
    console.log("Second Party Bank:", contractResult.contract?.secondPartyBankName);
    console.log("Size of contractResult in JSON bytes:", JSON.stringify(contractResult).length);
    
  } catch (err) {
    console.error("TRPC error:", err);
  }
  process.exit(0);
}

main();
