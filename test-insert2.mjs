import mysql from 'mysql2/promise';

async function testInsert() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const result = await connection.execute(`
      INSERT INTO contracts_enhanced 
      (contractNumber, contractYear, contractSequence, contractType, contractTitle, 
       supplierId, secondPartyName, contractAmount, duration, durationUnit, status, createdBy,
       signatoryId, mosqueName, mosqueNeighborhood, mosqueCity, contractDateHijri, endDate)
      VALUES 
      ('TEST-002', 2026, 2, 'construction', 'Test Contract 2', 
       30001, 'Test Company', 10000, 3, 'months', 'draft', 1,
       NULL, NULL, NULL, NULL, NULL, NULL)
    `);
    console.log('Insert successful:', result[0].insertId);
    
    // Delete test record
    await connection.execute(`DELETE FROM contracts_enhanced WHERE contractNumber = 'TEST-002'`);
    console.log('Test record deleted');
  } catch (error) {
    console.error('Insert error:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.code);
  }
  
  await connection.end();
}

testInsert();
