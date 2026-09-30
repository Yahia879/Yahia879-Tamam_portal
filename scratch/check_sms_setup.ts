import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [channelCounts]: any = await conn.query(`
    SELECT channel, count(*) as total, sum(enabled) as enabledCount 
    FROM notification_trigger_settings 
    GROUP BY channel
  `);
  console.log('Channel counts in trigger settings:', channelCounts);

  const [enabledSms]: any = await conn.query(`
    SELECT * FROM notification_trigger_settings 
    WHERE channel = 'sms' AND enabled = 1
  `);
  console.log('Enabled SMS triggers count:', enabledSms.length, enabledSms);

  process.exit(0);
}

main().catch(console.error);
