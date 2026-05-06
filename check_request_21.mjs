import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkRequest() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  try {
    console.log('--- Searching for ID 21 ---');
    const [rowsId] = await pool.query('SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 21');
    console.log(rowsId);
    
    console.log('\n--- Searching for Request Number ending in 21 ---');
    const [rowsNum] = await pool.query("SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE requestNumber LIKE '%21'");
    console.log(rowsNum);

    console.log('\n--- Searching for Request Number containing 21 ---');
    const [rowsNum2] = await pool.query("SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE requestNumber LIKE '%21%'");
    console.log(rowsNum2);
    
    console.log('\n--- Searching for requests in contracting stage ---');
    const [rowsContracting] = await pool.query("SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE currentStage = 'contracting'");
    console.log(rowsContracting);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRequest();
