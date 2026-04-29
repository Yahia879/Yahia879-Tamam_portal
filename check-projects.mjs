import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// فحص أعمدة جدول المشاريع
const [columns] = await connection.execute("DESCRIBE projects");
console.log("أعمدة جدول المشاريع:");
console.table(columns);

// فحص المشاريع
const [projects] = await connection.execute("SELECT * FROM projects");
console.log("\nالمشاريع:");
console.table(projects);

// فحص العقود
const [contracts] = await connection.execute("SELECT id, contract_number, project_id, request_id, status FROM contracts_enhanced LIMIT 10");
console.log("\nالعقود:");
console.table(contracts);

await connection.end();
