import 'dotenv/config';
import { appRouter } from '../server/routers';

async function main() {
  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  for (const reqId of [100, 101]) {
    console.log(`\n=================== REQUEST ${reqId} ===================`);
    const inv: any = await caller.sedanaExecution.getVirtualInventory({ requestId: reqId });
    console.log(inv.inventoryItems.map((i: any) => ({
      id: i.id,
      name: i.name,
      approvedQty: i.approvedQty,
      cycleQuantity: i.cycleQuantity,
      totalInward: i.totalInward,
      totalOutbound: i.totalOutbound,
      remainingToDisburse: i.remainingToDisburse,
      frequency: i.frequency,
      frequencyDays: i.frequencyDays,
      cycleStartDate: i.cycleStartDate,
      lastConfirmedOutboundDate: i.lastConfirmedOutboundDate,
      nextDueDate: i.nextDueDate,
      daysUntilNextDue: i.daysUntilNextDue,
      isDue: i.isDue,
      isAllCompleted: i.isAllCompleted,
    })));
  }
  process.exit(0);
}

main().catch(console.error);
