import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL successfully!");
  
  const [rows] = await connection.execute("DESCRIBE disbursement_requests");
  console.log("Columns of disbursement_requests:");
  console.log(rows);
  
  await connection.end();
}

main().catch(console.error);
