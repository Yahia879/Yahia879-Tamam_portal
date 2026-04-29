import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

// فحص المشاريع
const [projects] = await connection.execute("SELECT id, projectNumber FROM projects");
console.log("المشاريع:", projects);

// فحص العقود
const [contracts] = await connection.execute("SELECT id, contractNumber, projectId FROM contracts_enhanced");
console.log("\nالعقود:", contracts);

await connection.end();
