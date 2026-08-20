import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateEmails() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  const targetDatabases = ['tamamgatemanarah_portal', 'test_temam'];

  for (const dbName of targetDatabases) {
    console.log(`\n📧 Inspecting users in database: [${dbName}]...`);
    const [staffUsers]: any = await connection.query(`
      SELECT id, name, email, role, status, createdAt 
      FROM \`${dbName}\`.users 
      WHERE role != 'service_requester'
      ORDER BY id ASC
    `);

    console.table(staffUsers);

    console.log(`\nUpdating emails in [${dbName}] to test@gmail.com, test1@gmail.com, test2@gmail.com...`);
    
    // Step 1: Give temp emails to avoid unique index violation
    for (const u of staffUsers) {
      await connection.query(
        `UPDATE \`${dbName}\`.users SET email = ? WHERE id = ?`,
        [`temp_${u.id}_${Date.now()}@temp.local`, u.id]
      );
    }

    // Step 2: Assign sequential test@gmail.com, test1@gmail.com, test2@gmail.com...
    for (let i = 0; i < staffUsers.length; i++) {
      const u = staffUsers[i];
      const newEmail = i === 0 ? 'test@gmail.com' : `test${i}@gmail.com`;
      await connection.query(
        `UPDATE \`${dbName}\`.users SET email = ? WHERE id = ?`,
        [newEmail, u.id]
      );
      console.log(`✅ [ID ${u.id}] ${u.name} (${u.role}) -> ${newEmail}`);
    }

    // Verify
    const [updatedRows]: any = await connection.query(`
      SELECT id, name, email, role, status 
      FROM \`${dbName}\`.users 
      WHERE role != 'service_requester'
      ORDER BY id ASC
    `);
    console.log(`\nVerified users in [${dbName}]:`);
    console.table(updatedRows);
  }

  await connection.end();
  console.log('\n🎉 All user emails have been updated in the DB successfully!');
  process.exit(0);
}

updateEmails().catch((err) => {
  console.error('❌ Error updating emails:', err);
  process.exit(1);
});

