import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting insertion of test data for pending and late reports...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const now = new Date();
  
  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace('T', ' ');

  // 3 days ago (makes it late by > 2 days)
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

  // 4 days ago
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(now.getDate() - 4);
  const fourDaysAgoStr = fourDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

  // 5 days ago
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(now.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

  // Target User IDs from existing DB scan
  const fieldTeamUser = 4;
  const qrUser = 7;
  const corpCommUser = 21;
  const adminUser = 1;
  const mosqueId = 2; // sgdfgfdssdfg in Al Namas

  const testRequests = [
    {
      requestNumber: "REQ-FV-PENDING",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "field_visit",
      status: "in_progress",
      fieldVisitAssignedTo: fieldTeamUser,
      fieldVisitScheduledDate: tomorrowStr,
      fieldVisitScheduledTime: "10:00",
      requestTrack: "standard",
      description: "طلب زيارة ميدانية قيد الانتظار وغير متأخرة"
    },
    {
      requestNumber: "REQ-FV-LATE",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "field_visit",
      status: "in_progress",
      fieldVisitAssignedTo: fieldTeamUser,
      fieldVisitScheduledDate: threeDaysAgoStr,
      fieldVisitScheduledTime: "14:00",
      requestTrack: "standard",
      description: "طلب زيارة ميدانية متأخر (تجاوز الموعد بأكثر من يومين)"
    },
    {
      requestNumber: "REQ-QR-PENDING",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "execution",
      status: "in_progress",
      requestTrack: "quick_response",
      assignedTo: qrUser,
      quickResponseScheduledDate: tomorrowStr,
      quickResponseScheduledTime: "09:00",
      description: "طلب استجابة سريعة قيد الانتظار وغير متأخرة"
    },
    {
      requestNumber: "REQ-QR-LATE",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "execution",
      status: "in_progress",
      requestTrack: "quick_response",
      assignedTo: qrUser,
      quickResponseScheduledDate: fourDaysAgoStr,
      quickResponseScheduledTime: "13:00",
      description: "طلب استجابة سريعة متأخر (تجاوز الموعد بأكثر من يومين)"
    },
    {
      requestNumber: "REQ-FR-PENDING",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "handover",
      status: "in_progress",
      finalReportAssignedTo: corpCommUser,
      finalReportScheduledDate: tomorrowStr,
      finalReportScheduledTime: "11:00",
      requestTrack: "standard",
      description: "طلب تقرير ختامي قيد الانتظار وغير متأخر"
    },
    {
      requestNumber: "REQ-FR-LATE",
      mosqueId: mosqueId,
      userId: adminUser,
      programType: "banyan",
      currentStage: "handover",
      status: "in_progress",
      finalReportAssignedTo: corpCommUser,
      finalReportScheduledDate: fiveDaysAgoStr,
      finalReportScheduledTime: "15:00",
      requestTrack: "standard",
      description: "طلب تقرير ختامي متأخر (تجاوز الموعد بأكثر من يومين)"
    }
  ];

  try {
    for (const req of testRequests) {
      // Clean up previous test requests if they exist
      await connection.query("DELETE FROM mosque_requests WHERE requestNumber = ?", [req.requestNumber]);

      console.log(`Inserting request: ${req.requestNumber}...`);
      await connection.query(
        `INSERT INTO mosque_requests (
          requestNumber, mosqueId, userId, programType, currentStage, status,
          fieldVisitAssignedTo, fieldVisitScheduledDate, fieldVisitScheduledTime,
          assignedTo, quickResponseScheduledDate, quickResponseScheduledTime,
          finalReportAssignedTo, finalReportScheduledDate, finalReportScheduledTime,
          requestTrack, technicalEvalDecision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.requestNumber,
          req.mosqueId,
          req.userId,
          req.programType,
          req.currentStage,
          req.status,
          req.fieldVisitAssignedTo || null,
          req.fieldVisitScheduledDate || null,
          req.fieldVisitScheduledTime || null,
          req.assignedTo || null,
          req.quickResponseScheduledDate || null,
          req.quickResponseScheduledTime || null,
          req.finalReportAssignedTo || null,
          req.finalReportScheduledDate || null,
          req.finalReportScheduledTime || null,
          req.requestTrack,
          req.requestTrack === "quick_response" ? "quick_response" : null
        ]
      );
      console.log(`✅ Request ${req.requestNumber} inserted successfully!`);
    }

    console.log("\n🎉 All test requests for pending/delayed reports seeded successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
