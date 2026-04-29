import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// فحص العقود المرتبطة بالمشروع 240001
const [contracts] = await connection.execute(`
  SELECT id, contractNumber, projectId, contractAmount, status, supplierId 
  FROM contracts_enhanced 
  WHERE projectId = 240001
`);
console.log("العقود المرتبطة بالمشروع 240001:");
console.table(contracts);

await connection.end();
