import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [columns] = await connection.execute("DESCRIBE mosques");
console.log("أعمدة جدول المساجد:");
columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
await connection.end();
