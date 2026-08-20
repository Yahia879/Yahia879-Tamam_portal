import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function testCreate() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // Test insert with null requestId
  const projectNumber = "PRJ-TEST-0001";
  const [res] = await connection.query<any>(
    "INSERT INTO projects (projectNumber, requestId, name, description, isMultiMosque, managerId, status, completionPercentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [projectNumber, null, "مشروع تجريبي", null, 1, 1, "planning", 0]
  );
  console.log("Successfully inserted test project, insertId:", res.insertId);

  // Clean up test project
  await connection.query("DELETE FROM projects WHERE id = ?", [res.insertId]);
  console.log("Cleaned up test project successfully");

  await connection.end();
  process.exit(0);
}

testCreate().catch(err => {
  console.error(err);
  process.exit(1);
});
