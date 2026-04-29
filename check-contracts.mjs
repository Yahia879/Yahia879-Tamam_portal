import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// فحص أعمدة جدول العقود
const [columns] = await connection.execute("DESCRIBE contracts_enhanced");
console.log("أعمدة جدول العقود:");
columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

// فحص العقود
const [contracts] = await connection.execute("SELECT id, contractNumber, projectId, requestId, status, supplierId FROM contracts_enhanced LIMIT 10");
console.log("\nالعقود:");
console.table(contracts);

await connection.end();
