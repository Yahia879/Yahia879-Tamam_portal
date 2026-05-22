import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL successfully!");
  
  const [rows] = await connection.execute("SELECT * FROM request_attachments ORDER BY id DESC LIMIT 10");
  console.log("Last 10 attachments stored in request_attachments:");
  console.log(JSON.stringify(rows, null, 2));
  
  const [reportRows] = await connection.execute("SELECT * FROM field_visit_reports ORDER BY id DESC LIMIT 5");
  console.log("\nLast 5 field_visit_reports:");
  console.log(JSON.stringify(reportRows, null, 2));

  await connection.end();
}

main().catch(console.error);
