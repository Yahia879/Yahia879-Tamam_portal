import mysql from 'mysql2/promise';

async function addColumn() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Check if signatories table exists
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'signatories'`);
    console.log('Signatories table exists:', tables.length > 0);
    
    // Add signatoryId column
    await connection.execute(`
      ALTER TABLE contracts_enhanced 
      ADD COLUMN signatoryId int(11) NULL AFTER requestId
    `);
    console.log('Column signatoryId added successfully');
    
    // Add foreign key if signatories table exists
    if (tables.length > 0) {
      try {
        await connection.execute(`
          ALTER TABLE contracts_enhanced 
          ADD CONSTRAINT fk_contract_signatory 
          FOREIGN KEY (signatoryId) REFERENCES signatories(id)
        `);
        console.log('Foreign key added successfully');
      } catch (fkError) {
        console.log('Foreign key skipped:', fkError.message);
      }
    }
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
  
  await connection.end();
}

addColumn();
