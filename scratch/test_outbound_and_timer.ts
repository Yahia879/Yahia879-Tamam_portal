import 'dotenv/config';
import { appRouter } from '../server/routers';

async function main() {
  const caller = appRouter.createCaller({
    user: { id: 1, role: 'admin', name: 'مدير النظام' } as any,
    req: {} as any,
    res: {} as any,
  });

  console.log("Simulating createOutboundOrder for Request 101 (1 worker, 4 soaps)...");
  const res = await caller.sedanaExecution.createOutboundOrder({
    requestId: 101,
    scheduledDate: "2026-09-23",
    periodLabel: "الدفعة الدورية - دفعة رقم 1",
    outboundMethod: "direct_imam",
    items: [
      {
        id: "488",
        itemName: "عامل نظافة متفرغ للمسجد",
        quantity: 1,
        unit: "شهر",
      },
      {
        id: "489",
        itemName: "صابون سائل للأيدي",
        quantity: 4,
        unit: "جالون",
      }
    ],
  });

  console.log("Order created:", res.order.orderNumber);

  console.log("Checking virtual inventory after outbound...");
  const inv: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 101 });
  console.log("Inventory items after outbound:");
  inv.inventoryItems.forEach((i: any) => {
    console.log({
      id: i.id,
      name: i.name,
      totalInward: i.totalInward,
      totalOutbound: i.totalOutbound,
      availableStock: i.availableStock,
      remainingToDisburse: i.remainingToDisburse,
      currentCycleNumber: i.currentCycleNumber,
      totalCycles: i.totalCycles,
      lastConfirmedOutboundDate: i.lastConfirmedOutboundDate,
      nextDueDate: i.nextDueDate,
      daysUntilNextDue: i.daysUntilNextDue,
      isDue: i.isDue,
      isAllCompleted: i.isAllCompleted,
    });
  });
  process.exit(0);
}

main().catch(console.error);
