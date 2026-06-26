import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  console.log("Connecting to:", dbUrl);
  const connection = await mysql.createConnection(dbUrl);

  // Get project, request, and mosque info for request 13 (which has projectId: 12, contractId: 10)
  const [project] = await connection.query("SELECT * FROM projects WHERE id = 12");
  console.log("PROJECT 12:");
  console.log(project);

  if (project.length > 0) {
    const requestId = project[0].requestId;
    const [request] = await connection.query("SELECT * FROM mosque_requests WHERE id = ?", [requestId]);
    console.log("MOSQUE REQUEST:");
    console.log(request);

    if (request.length > 0 && request[0].mosqueId) {
      const [mosque] = await connection.query("SELECT * FROM mosques WHERE id = ?", [request[0].mosqueId]);
      console.log("MOSQUE:");
      console.log(mosque);
    }
  }

  const [contract] = await connection.query("SELECT * FROM contracts_enhanced WHERE id = 10");
  console.log("CONTRACT 10:");
  console.log(contract);

  await connection.end();
}

main().catch(console.error);
