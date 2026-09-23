import 'dotenv/config';
import { appRouter } from '../server/routers';

async function main() {
  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  const res = await caller.sedanaExecution.getVirtualInventory({ requestId: 98 });
  console.log('--- ITEMS TIMING & STOCK ---');
  res.inventoryItems.forEach((it: any) => {
    console.log({
      id: it.id,
      name: it.itemName,
      availableStock: it.availableStock,
      approvedQty: it.approvedQty,
      cycleQuantity: it.cycleQuantity,
      frequency: it.frequency,
      frequencyDays: it.frequencyDays,
      cycleStartDate: it.cycleStartDate,
      lastConfirmedOutboundDate: it.lastConfirmedOutboundDate,
      nextDueDate: it.nextDueDate,
      daysUntilNextDue: it.daysUntilNextDue,
      currentCycleNumber: it.currentCycleNumber,
      totalCycles: it.totalCycles,
      isDue: it.isDue,
    });
  });
  console.log('--- OUTBOUND ORDERS COUNT ---', res.outboundOrders.length);
  res.outboundOrders.forEach((o: any) => {
    console.log(o.orderNumber, o.status, o.periodLabel, o.items);
  });
  process.exit(0);
}
main().catch(console.error);
