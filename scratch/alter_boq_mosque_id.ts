import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  try {
    await db.execute(sql`
      ALTER TABLE quantity_schedules 
      ADD COLUMN mosqueId int(11) NULL AFTER projectId,
      ADD CONSTRAINT fk_qs_mosqueId FOREIGN KEY (mosqueId) REFERENCES mosques(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added mosqueId to quantity_schedules');
  } catch (err: any) {
    if (err.message?.includes('Duplicate column name') || err.message?.includes('already exists')) {
      console.log('mosqueId already exists on quantity_schedules');
    } else {
      console.log('Note on quantity_schedules alteration:', err.message);
    }
  }

  try {
    await db.execute(sql`
      ALTER TABLE boq_items 
      ADD COLUMN mosqueId int(11) NULL AFTER projectId,
      ADD CONSTRAINT fk_bi_mosqueId FOREIGN KEY (mosqueId) REFERENCES mosques(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added mosqueId to boq_items');
  } catch (err: any) {
    if (err.message?.includes('Duplicate column name') || err.message?.includes('already exists')) {
      console.log('mosqueId already exists on boq_items');
    } else {
      console.log('Note on boq_items alteration:', err.message);
    }
  }

  const [cols]: any = await db.execute(sql`DESCRIBE quantity_schedules`);
  console.log('Updated quantity_schedules columns:', cols.map((c: any) => c.Field));

  process.exit(0);
}

main().catch(console.error);
