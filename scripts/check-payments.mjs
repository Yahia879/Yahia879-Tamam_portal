import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [columns] = await connection.execute("DESCRIBE contract_payments");
console.log("أعمدة جدول contract_payments:");
columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
await connection.end();
