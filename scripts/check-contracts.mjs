import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [columns] = await connection.execute("DESCRIBE contracts_enhanced");
console.log("أعمدة جدول contracts_enhanced:");
columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : ''}`));
await connection.end();
