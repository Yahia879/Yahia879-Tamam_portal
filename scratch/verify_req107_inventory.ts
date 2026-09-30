import 'dotenv/config';
import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';

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
  const result = await caller.sedanaExecution.getVirtualInventory({ requestId: 107 });

  console.log('=== Request 107 Virtual Inventory ===');
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
  console.log('Available Stock Summary:', result.summary.totalAvailableStock);
}

main().catch(console.error);
