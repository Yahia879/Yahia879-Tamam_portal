import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  const [rows] = await connection.execute("SHOW CREATE TABLE payments;");
  console.log(rows[0]['Create Table']);

  await connection.end();
}

main().catch(console.error);
