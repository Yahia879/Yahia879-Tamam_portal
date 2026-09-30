import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [tables]: any = await conn.query("SHOW TABLES");
  const tableNames = tables.map((t: any) => Object.values(t)[0]);
  console.log('All tables:', tableNames.filter((n: string) => 
    n.includes('notif') || n.includes('log') || n.includes('hist') || n.includes('sms') || n.includes('mail') || n.includes('message')
  ));

  // Inspect notifications table
  const [notifCount]: any = await conn.query("SELECT COUNT(*) as cnt FROM notifications");
  console.log('Total notifications in notifications table:', notifCount[0].cnt);
  const [sampleNotifs]: any = await conn.query("SELECT * FROM notifications ORDER BY id DESC LIMIT 5");
  console.log('Sample notifications:', sampleNotifs);

  // Check audit_logs or similar
  if (tableNames.includes('audit_logs')) {
    const [auditCount]: any = await conn.query("SELECT COUNT(*) as cnt FROM audit_logs WHERE action LIKE '%notif%' OR action LIKE '%sms%' OR action LIKE '%mail%'");
    console.log('Relevant audit_logs count:', auditCount[0].cnt);
  }

  process.exit(0);
}

main().catch(console.error);
