import { getDb } from './db';
import { rolePermissions, userPermissions, roles, users } from '../drizzle/schema';
import { like } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('No DB');
    return;
  }
  const rp = await db.select().from(rolePermissions).where(like(rolePermissions.permissionId, 'boq%'));
  const up = await db.select().from(userPermissions).where(like(userPermissions.permissionId, 'boq%'));
  const customRoles = await db.select({ id: roles.id, nameAr: roles.nameAr, description: roles.description }).from(roles);
  
  console.log('--- Role Permissions for BOQ ---');
  console.log(JSON.stringify(rp, null, 2));

  console.log('--- User Permissions Overrides for BOQ ---');
  console.log(JSON.stringify(up, null, 2));

  console.log('--- Custom Roles containing BOQ in description ---');
  for (const r of customRoles) {
    if (r.description && r.description.includes('boq')) {
      console.log(`Role ${r.id} (${r.nameAr}):`, r.description);
    }
  }

  process.exit(0);
}

main().catch(console.error);
