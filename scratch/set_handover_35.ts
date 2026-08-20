import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [rows] = await connection.query<any[]>(
    "SELECT id, requestNumber, currentStage, status, requestTrack, programType FROM mosque_requests WHERE id = 35"
  );
  
  console.log("Current state of request 35:", rows);

  if (rows.length > 0) {
    await connection.query(
      "UPDATE mosque_requests SET currentStage = 'handover', status = 'in_progress' WHERE id = 35"
    );
    console.log("✅ Successfully updated request 35 to stage 'handover'!");
  } else {
    console.log("❌ Request 35 not found!");
  }

  const [afterRows] = await connection.query<any[]>(
    "SELECT id, requestNumber, currentStage, status, requestTrack, programType FROM mosque_requests WHERE id = 35"
  );
  console.log("Updated state of request 35:", afterRows);

  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
