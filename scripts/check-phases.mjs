import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [columns] = await connection.execute("DESCRIBE project_phases");
console.log("أعمدة جدول project_phases:");
columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
await connection.end();
