import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function updateReq21() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);
  
  // 1. Update request stage to technical_eval
  await conn.query(`
    UPDATE mosque_requests 
    SET currentStage = 'technical_eval',
        status = 'under_review',
        updatedAt = NOW()
    WHERE id = 21
  `);

  // 2. Add entry to request_history
  await conn.query(`
    INSERT INTO request_history (requestId, userId, fromStage, toStage, fromStatus, toStatus, action, notes, createdAt)
    VALUES (21, 1, 'execution', 'technical_eval', 'in_progress', 'under_review', 'stage_updated', 'تم إرجاع الطلب إلى مرحلة التقييم الفني بناءً على الطلب', NOW())
  `);

  const [rows] = await conn.query("SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 21");
  console.log("Updated Request 21 data:", rows);
  await conn.end();
}

updateReq21().catch(console.error);
