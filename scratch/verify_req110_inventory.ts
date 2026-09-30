import 'dotenv/config';
import { appRouter } from '../server/routers';

async function main() {
  const ctx: any = {
    user: {
      id: 1,
      name: 'System Admin',
      role: 'system_admin',
      status: 'active',
    },
  };

  const caller = appRouter.createCaller(ctx);
  const result = await caller.sedanaExecution.getVirtualInventory({ requestId: 110 });

  console.log('=== Request 110 Virtual Inventory ===');
  console.log('Items Count:', result.inventoryItems.length);
  result.inventoryItems.forEach((it: any) => {
    console.log(`- Item ${it.id} (${it.name}):`);
    console.log(`  Approved Qty: ${it.approvedQty}`);
    console.log(`  Available Stock in Warehouse: ${it.availableStock}`);
    console.log(`  Next Due Date: ${it.nextDueDate}`);
    console.log(`  Days Until Next Due: ${it.daysUntilNextDue}`);
    console.log(`  Is Due: ${it.isDue}`);
  });
  console.log('Inward Orders Count:', result.inwardOrders.length);
  console.log('Summary:', result.summary);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
