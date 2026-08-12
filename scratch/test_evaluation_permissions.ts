import 'dotenv/config';
import { getDb } from '../server/db';
import { mosqueRequests, users, requestHistory } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { triggerBeneficiarySatisfactionSurvey } from '../server/routers/requests';

async function testPermissions() {
  console.log("🧪 Testing Beneficiary Satisfaction Survey permissions & notifications...\n");

  const db = await getDb();
  if (!db) process.exit(1);

  // Set Request 77 (REQ-2026-DAA-0048) user_id to user 1 (yamenbk6@gmail.com)
  const [user1] = await db.select().from(users).where(eq(users.email, 'yamenbk6@gmail.com')).limit(1);

  if (user1) {
    await db.update(mosqueRequests).set({
      userId: user1.id,
      currentStage: 'closed',
      status: 'completed',
      isEvaluated: false,
    }).where(eq(mosqueRequests.id, 77));

    await triggerBeneficiarySatisfactionSurvey(77);
    console.log(`✅ Request 77 is now owned by ${user1.name} (ID: ${user1.id}, email: ${user1.email})`);
    console.log(`🔗 Request Details URL: http://localhost:5000/requests/77`);
    console.log(`⭐ Evaluation URL: http://localhost:5000/requests/77/evaluation`);
  }
}

testPermissions();
