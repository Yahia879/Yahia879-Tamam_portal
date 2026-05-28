import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL successfully!");
  
  const [rows] = await connection.execute("DESCRIBE __drizzle_migrations");
  console.log("Columns of __drizzle_migrations:");
  console.log(rows);
  
  const [data] = await connection.execute("SELECT * FROM __drizzle_migrations");
  console.log("Data in __drizzle_migrations:");
  console.log(data);

  await connection.end();
}

main().catch(console.error);
