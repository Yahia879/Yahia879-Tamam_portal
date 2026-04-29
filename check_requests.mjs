import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await connection.execute('SELECT id, requestNumber, currentStage, status, programType FROM mosque_requests ORDER BY id DESC LIMIT 10');
console.log('Requests:', JSON.stringify(result[0], null, 2));

await connection.end();
