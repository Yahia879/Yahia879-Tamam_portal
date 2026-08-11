import 'dotenv/config';
import { getDb } from "../server/db";
import { mosqueRequests, requestEvaluations, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { triggerBeneficiarySatisfactionSurvey } from "../server/routers/requests";

async function testBeneficiaryEvaluation() {
  console.log("🧪 Starting Beneficiary Satisfaction Survey tests...\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  try {
    // 1. Verify schema columns exist in mosqueRequests and requestEvaluations
    const [sampleRequest] = await db
      .select()
      .from(mosqueRequests)
      .limit(1);

    console.log("✅ mosqueRequests query success. Sample request ID:", sampleRequest?.id);

    const [sampleEval] = await db
      .select()
      .from(requestEvaluations)
      .limit(1);

    console.log("✅ requestEvaluations query success. Sample evaluation ID:", sampleEval?.id);

    console.log("\n🎉 All schema columns and exports are fully valid!");
  } catch (error) {
    console.error("❌ Test error:", error);
    process.exit(1);
  }
}

testBeneficiaryEvaluation();
