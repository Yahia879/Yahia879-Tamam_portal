import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute("SELECT * FROM project_phases WHERE projectId = 22 ORDER BY phaseOrder");
console.log(JSON.stringify(rows, null, 2));
await connection.end();
