import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function setHandover() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  const dbs = ['test_temam', 'tamamgatemanarah_portal'];

  for (const dbName of dbs) {
    console.log(`\n🔄 Updating Request 48 in [${dbName}]...`);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Check if request 48 exists in this DB
    const [existing]: any = await connection.query(
      `SELECT id FROM \`${dbName}\`.mosque_requests WHERE id = 48`
    );

    if (existing.length === 0) {
      const [src]: any = await connection.query(
        `SELECT * FROM \`test_temam\`.mosque_requests WHERE id = 48`
      );
      if (src.length > 0) {
        const row = src[0];
        await connection.query(
          `INSERT INTO \`${dbName}\`.mosque_requests (
            id, requestNumber, mosqueId, userId, programType, currentStage, status,
            priority, reviewCompleted, requestTrack, technicalEvalDecision, programData,
            submittedAt, reviewedAt, approvedAt, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, 'handover', 'in_progress', ?, 1, 'standard', 'convert_to_project', ?, NOW(), NOW(), NOW(), NOW(), NOW())`,
          [
            row.id,
            row.requestNumber,
            row.mosqueId,
            row.userId,
            row.programType,
            row.priority,
            typeof row.programData === 'object' ? JSON.stringify(row.programData) : row.programData,
          ]
        );
        console.log(`✅ Inserted Request 48 in [${dbName}] directly in 'handover' stage.`);
      }
    } else {
      // Update to handover
      await connection.query(
        `UPDATE \`${dbName}\`.mosque_requests SET 
          currentStage = 'handover',
          status = 'in_progress',
          reviewCompleted = 1,
          reviewedAt = IFNULL(reviewedAt, NOW()),
          approvedAt = IFNULL(approvedAt, NOW()),
          technicalEvalDecision = 'convert_to_project',
          requestTrack = 'standard',
          updatedAt = NOW()
        WHERE id = 48`
      );
      console.log(`✅ Updated Request 48 in [${dbName}] to stage 'handover'.`);
    }

    // Add history record
    await connection.query(
      `INSERT INTO \`${dbName}\`.request_history (requestId, userId, fromStage, toStage, fromStatus, toStatus, action, notes, createdAt)
       VALUES (48, 1, 'execution', 'handover', 'in_progress', 'in_progress', 'stage_updated', 'تم نقل الطلب إلى مرحلة الاستلام', NOW())`
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Verify
    const [updated]: any = await connection.query(
      `SELECT id, requestNumber, currentStage, status, reviewCompleted, technicalEvalDecision, requestTrack 
       FROM \`${dbName}\`.mosque_requests WHERE id = 48`
    );
    console.table(updated);
  }

  await connection.end();
  console.log('\n🎉 Request 48 has been moved to "handover" (الاستلام) stage in all databases successfully!');
  process.exit(0);
}

setHandover().catch(console.error);
